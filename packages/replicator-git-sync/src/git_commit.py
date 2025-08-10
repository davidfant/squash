from typing import Dict, List, Optional, Tuple
import time
from dulwich.objects import Blob, Commit
from tar_apply import PathEdit


class RepoLike:
    def __init__(self, object_store, refs):
        self.object_store = object_store
        self.refs = refs


async def build_tree_from_edits(
    repo: RepoLike,
    base_tree_id: Optional[bytes],
    edits: List[PathEdit],
) -> bytes:
    """Build a git tree by applying edits to a base tree."""
    from dulwich.objects import Tree, Blob
    from collections import defaultdict
    
    # Step 1: Build a flat map of all files (path -> (mode, sha))
    file_map: Dict[str, Tuple[int, bytes]] = {}
    
    # Load existing files from base tree if it exists
    if base_tree_id is not None:
        await _load_tree_recursive(repo, base_tree_id, "", file_map)
    
    # Apply edits (overwrites existing files or adds new ones)
    for edit in edits:
        # Create blob for the file content
        blob = Blob.from_string(edit.data)
        repo.object_store.add_object(blob)
        file_map[edit.path] = (edit.mode, blob.id)
    
    # Step 2: Build tree structure bottom-up
    return _build_tree_from_file_map(repo, file_map)


async def _load_tree_recursive(
    repo: RepoLike, 
    tree_id: bytes, 
    prefix: str, 
    file_map: Dict[str, Tuple[int, bytes]]
) -> None:
    """Recursively load all files from a git tree into file_map."""
    from dulwich.objects import Tree
    
    # Load tree object (handle async loading if needed)
    if hasattr(repo.object_store, '_get_object_async'):
        tree_obj = await repo.object_store._get_object_async(tree_id)
        if not tree_obj:
            return
    else:
        tree_obj = repo.object_store[tree_id]
    
    if not isinstance(tree_obj, Tree):
        return
        
    for name, mode, sha in tree_obj.iteritems():
        name_str = name.decode("utf-8") if isinstance(name, bytes) else name
        full_path = f"{prefix}/{name_str}" if prefix else name_str
        
        if mode & 0o40000:  # Directory
            await _load_tree_recursive(repo, sha, full_path, file_map)
        else:  # Regular file
            file_map[full_path] = (mode, sha)


def _build_tree_from_file_map(repo: RepoLike, file_map: Dict[str, Tuple[int, bytes]]) -> bytes:
    """Build git tree objects from a flat file map."""
    from dulwich.objects import Tree
    from collections import defaultdict
    
    # Group files by directory
    dir_contents: Dict[str, Dict[str, Tuple[int, bytes]]] = defaultdict(dict)
    
    for file_path, (mode, sha) in file_map.items():
        if "/" in file_path:
            dir_path, filename = file_path.rsplit("/", 1)
            dir_contents[dir_path][filename] = (mode, sha)
        else:
            # Root level file
            dir_contents[""][file_path] = (mode, sha)
    
    # Build trees bottom-up (deepest directories first)
    built_trees: Dict[str, bytes] = {}
    
    # Sort directories by depth (deepest first)
    sorted_dirs = sorted(dir_contents.keys(), key=lambda x: x.count("/"), reverse=True)
    
    for dir_path in sorted_dirs:
        tree = Tree()
        contents = dir_contents[dir_path]
        
        # Add files in this directory
        for name, (mode, sha) in sorted(contents.items()):
            tree.add(name.encode("utf-8"), mode, sha)
        
        # Add subdirectories that we've already built
        if dir_path == "":
            # Root directory - check for top-level subdirs
            subdirs = [d for d in built_trees.keys() if "/" not in d and d != ""]
        else:
            # Non-root directory - check for immediate children
            prefix = dir_path + "/"
            subdirs = [d for d in built_trees.keys() 
                      if d.startswith(prefix) and d.count("/") == dir_path.count("/") + 1]
        
        for subdir in sorted(subdirs):
            subdir_name = subdir.split("/")[-1] if dir_path != "" else subdir
            tree.add(subdir_name.encode("utf-8"), 0o040000, built_trees[subdir])
        
        # Store the tree object
        repo.object_store.add_object(tree)
        built_trees[dir_path] = tree.id
    
    # Return root tree ID
    return built_trees.get("", built_trees[sorted(built_trees.keys())[0]])


def create_commit(
    repo: RepoLike,
    branch_ref: bytes,
    parent_commit: Optional[bytes],
    root_tree: bytes,
    author: str,
    message: str,
) -> bytes:
    timestamp = int(time.time())

    commit = Commit()
    commit.tree = root_tree
    commit.parents = [parent_commit] if parent_commit else []
    commit.author = author.encode("utf-8")
    commit.committer = author.encode("utf-8")
    commit.commit_time = timestamp
    commit.author_time = timestamp
    commit.commit_timezone = 0
    commit.author_timezone = 0
    if not message.endswith("\n"):
        message = message + "\n"
    commit.message = message.encode("utf-8")

    repo.object_store.add_object(commit)
    # Update ref
    repo.refs[branch_ref] = commit.id
    return commit.id
