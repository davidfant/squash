from typing import Dict, List, Optional, Tuple
import time
from dulwich.objects import Blob, Commit
from tar_apply import PathEdit


class RepoLike:
    def __init__(self, object_store, refs):
        self.object_store = object_store
        self.refs = refs


def build_tree_from_edits(
    repo: RepoLike,
    base_tree_id: Optional[bytes],
    edits: List[PathEdit],
) -> bytes:
    # Naive implementation: reconstruct by walking existing tree lazily and applying edits
    # For v1: only file inserts/updates and deletions of files
    from dulwich.objects import Tree
    from dulwich.object_store import tree_lookup_path

    # Helper to get subtree
    def get_tree(tree_id: Optional[bytes]) -> Tree:
        if tree_id is None:
            return Tree()
        return repo.object_store[tree_id]

    # Build a dict of path->(mode, sha)
    paths: Dict[str, Tuple[int, bytes]] = {}

    # If base tree exists, recursively enumerate
    def walk_tree(prefix: str, tree_id: bytes) -> None:
        t: Tree = repo.object_store[tree_id]
        for name, mode, sha in t.iteritems():
            name_str = name.decode("utf-8") if isinstance(name, bytes) else name
            full = f"{prefix}{name_str}" if prefix == "" else f"{prefix}/{name_str}"
            if mode & 0o40000:  # dir
                walk_tree(full, sha)
            else:
                paths[full] = (mode, sha)

    if base_tree_id is not None:
        walk_tree("", base_tree_id)

    # Apply edits
    for e in edits:
        blob = Blob.from_string(e.data)
        repo.object_store.add_object(blob)
        paths[e.path] = (e.mode, blob.id)

    # Rebuild trees bottom-up
    # Group by directory
    from collections import defaultdict

    children: Dict[str, Dict[str, Tuple[int, bytes]]] = defaultdict(dict)
    for p, (mode, sha) in paths.items():
        if "/" in p:
            parent, name = p.rsplit("/", 1)
        else:
            parent, name = "", p
        children[parent][name] = (mode, sha)

    built: Dict[str, bytes] = {}

    def ensure_tree_for_dir(dirpath: str) -> bytes:
        if dirpath in built:
            return built[dirpath]
        entries = children.get(dirpath, {})
        tree = Tree()
        for name in sorted(entries.keys()):
            mode, sha = entries[name]
            tree.add(name.encode("utf-8"), mode, sha)
        # Add subtrees
        subdirs = [d for d in children.keys() if d.startswith(dirpath + "/")] if dirpath != "" else [d for d in children.keys() if "/" not in d]
        for subdir in sorted(set(d for d in children.keys() if (d == "" and dirpath == "") or (d.startswith(dirpath + "/") and d.count("/") == dirpath.count("/") + 1))):
            if subdir == dirpath:
                continue
            name = subdir.split("/")[-1] if dirpath != "" else subdir
            subtree_id = ensure_tree_for_dir(subdir)
            tree.add(name.encode("utf-8"), 0o040000, subtree_id)
        repo.object_store.add_object(tree)
        built[dirpath] = tree.id
        return tree.id

    root_id = ensure_tree_for_dir("")
    return root_id


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
