from dulwich.object_store import BaseObjectStore
from dulwich.refs import DictRefsContainer
from dulwich.objects import ShaFile
from typing import Optional, Dict, Iterator
import hashlib


class R2ObjectStore(BaseObjectStore):
    """Git object store backed by R2 storage."""
    
    def __init__(self, bucket, prefix: str):
        super().__init__()
        self.bucket = bucket
        self.prefix = prefix.rstrip("/") + "/"
        # Cache for loaded objects to avoid repeated R2 calls
        self._object_cache: Dict[bytes, ShaFile] = {}
    
    def _get_object_key(self, sha: bytes) -> str:
        """Convert git object SHA to R2 key path."""
        hex_sha = sha.hex()
        return f"{self.prefix}objects/{hex_sha[:2]}/{hex_sha[2:]}"
    
    async def _get_object_async(self, sha: bytes) -> Optional[ShaFile]:
        """Load a git object from R2."""
        if sha in self._object_cache:
            return self._object_cache[sha]
        
        key = self._get_object_key(sha)
        try:
            obj = await self.bucket.get(key)
            if obj is None:
                return None
            
            data = await obj.arrayBuffer()
            # Validate that it's a proper git object
            if not data:
                return None
                
            git_obj = ShaFile.from_raw_string(bytes(data))
            
            # Verify the SHA matches
            if git_obj.id != sha:
                print(f"Warning: SHA mismatch for object {sha.hex()}: expected {sha.hex()}, got {git_obj.id.hex()}")
                return None
                
            self._object_cache[sha] = git_obj
            return git_obj
        except Exception as e:
            print(f"Error loading object {sha.hex()}: {str(e)}")
            return None
    
    def __contains__(self, sha: bytes) -> bool:
        """Check if object exists in store."""
        if sha in self._object_cache:
            return True
        # For async operations, we'll need to implement this differently
        # For now, return False and let the caller handle missing objects
        return False
    
    def __getitem__(self, sha: bytes) -> ShaFile:
        """Get object from store (synchronous interface for dulwich compatibility)."""
        if sha in self._object_cache:
            return self._object_cache[sha]
        raise KeyError(f"Object {sha.hex()} not found in cache")
    
    def __iter__(self) -> Iterator[ShaFile]:
        """Iterate over all objects."""
        return iter(self._object_cache.values())
    
    def add_object(self, obj: ShaFile) -> None:
        """Add object to store (will be persisted when write_objects_to_r2 is called)."""
        self._object_cache[obj.id] = obj
    
    async def preload_objects(self, shas: list[bytes]) -> None:
        """Preload multiple objects into cache."""
        for sha in shas:
            if sha not in self._object_cache:
                await self._get_object_async(sha)

    async def write_objects_to_r2(self) -> None:
        """Persist all cached objects to R2."""
        for sha, obj in self._object_cache.items():
            key = self._get_object_key(sha)
            try:
                # Check if object already exists to avoid unnecessary writes
                existing = await self.bucket.get(key)
                if existing is None:
                    await self.bucket.put(key, obj.as_raw_string())
            except Exception as e:
                raise Exception(f"Failed to write object {sha.hex()} to R2: {str(e)}")


class GitR2Repo:
    def __init__(self, bucket_binding, repo_prefix: str):
        self.bucket = bucket_binding
        self.prefix = repo_prefix.rstrip("/") + "/"
        self.object_store = R2ObjectStore(bucket_binding, repo_prefix)
        self.refs = DictRefsContainer({})

    async def load_refs_from_r2(self) -> None:
        """Load git refs from R2 storage."""
        refs_prefix = f"{self.prefix}refs/"
        
        try:
            # Load packed-refs if it exists
            packed_refs_key = f"{self.prefix}packed-refs"
            packed_refs_obj = await self.bucket.get(packed_refs_key)
            if packed_refs_obj is not None:
                packed_refs_data = await packed_refs_obj.text()
                self._parse_packed_refs(packed_refs_data)
            
            # Load individual ref files (these override packed-refs)
            resp = await self.bucket.list(prefix=refs_prefix)
            if hasattr(resp, "objects"):
                ref_objects = resp.objects
            elif hasattr(resp, "keys"):
                ref_objects = [{"key": k} for k in resp.keys]
            else:
                ref_objects = []
            
            for ref_obj in ref_objects:
                key = ref_obj["key"] if isinstance(ref_obj, dict) else ref_obj.key
                ref_name = key[len(self.prefix):].encode("utf-8")
                
                obj = await self.bucket.get(key)
                if obj is not None:
                    ref_value = (await obj.text()).strip()
                    if ref_value.startswith("ref: "):
                        # Symbolic ref
                        target = ref_value[5:].encode("utf-8")
                        self.refs.set_symbolic_ref(ref_name, target)
                    else:
                        # Direct ref
                        self.refs[ref_name] = bytes.fromhex(ref_value)
            
            # Load HEAD
            head_key = f"{self.prefix}HEAD"
            head_obj = await self.bucket.get(head_key)
            if head_obj is not None:
                head_value = (await head_obj.text()).strip()
                if head_value.startswith("ref: "):
                    target = head_value[5:].encode("utf-8")
                    self.refs.set_symbolic_ref(b"HEAD", target)
                else:
                    self.refs[b"HEAD"] = bytes.fromhex(head_value)
                    
        except Exception as e:
            # If we can't load refs, start with empty refs
            print(f"Warning: Could not load refs from R2: {str(e)}")

    def _parse_packed_refs(self, packed_refs_data: str) -> None:
        """Parse packed-refs file format."""
        for line in packed_refs_data.split('\n'):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            parts = line.split(' ', 1)
            if len(parts) == 2:
                sha_hex, ref_name = parts
                try:
                    sha = bytes.fromhex(sha_hex)
                    self.refs[ref_name.encode("utf-8")] = sha
                except ValueError:
                    continue

    async def write_refs_to_r2(self) -> None:
        """Persist git refs to R2 storage."""
        try:
            # Write individual ref files
            for ref_name, ref_value in self.refs.as_dict().items():
                if ref_name == b"HEAD":
                    key = f"{self.prefix}HEAD"
                else:
                    key = f"{self.prefix}{ref_name.decode('utf-8')}"
                
                if isinstance(ref_value, bytes) and len(ref_value) == 20:
                    # Direct ref (SHA)
                    await self.bucket.put(key, ref_value.hex())
                else:
                    # Symbolic ref
                    await self.bucket.put(key, f"ref: {ref_value.decode('utf-8')}")
            
            # Write objects to R2
            await self.object_store.write_objects_to_r2()
            
        except Exception as e:
            raise Exception(f"Failed to write refs to R2: {str(e)}")
