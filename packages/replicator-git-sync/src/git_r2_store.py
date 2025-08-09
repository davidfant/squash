from dulwich.object_store import MemoryObjectStore
from dulwich.refs import DictRefsContainer


class GitR2Repo:
    def __init__(self, bucket_binding, repo_prefix: str):
        # For v1, use in-memory object store as placeholder; extend to R2-backed store.
        # TODO: Replace with a BucketBasedObjectStore subclass that reads/writes to R2 `repo_prefix`.
        self.object_store = MemoryObjectStore()
        self.refs = DictRefsContainer({})
        self.bucket = bucket_binding
        self.prefix = repo_prefix.rstrip("/") + "/"

    async def load_refs_from_r2(self) -> None:
        # TODO: Read `refs/**`, `HEAD`, `packed-refs` from R2 and populate self.refs
        return None

    async def write_refs_to_r2(self) -> None:
        # TODO: Persist self.refs updates to R2
        return None
