import os
import asyncio
import tempfile
from download_from_r2 import download_from_r2
from dulwich.repo import Repo
from dulwich.index import build_index_from_tree

async def clone_repo_from_r2(bucket, prefix: str, ref: str) -> str:
  """
  Step 1: Clone a git repository from R2 storage to local temp directory.
  
  Args:
    bucket: R2 bucket instance
    prefix: Repository prefix in R2
    ref: Git reference (branch/tag)
  
  Returns:
    str: Path to local cloned repository
  """
  try:
    # Create temporary directory for the repo
    temp_dir = tempfile.mkdtemp(prefix="git_clone_")
    repo_path = os.path.join(temp_dir, "repo")
    
    # Download git objects from R2 bucket
    # R2 stores git repositories as collections of objects
    # We need to reconstruct the .git directory structure
    
    # List all objects in the repository prefix
    # objects = await bucket.list({ "prefix": f"{prefix}/objects/" })
    objects = await bucket.list(prefix=prefix)
    print('WOWZ', len(objects.objects))
    
    # Create .git directory structure
    git_dir = os.path.join(repo_path, ".git")
    os.makedirs(git_dir, exist_ok=True)
    os.makedirs(os.path.join(git_dir, "objects"), exist_ok=True)
    os.makedirs(os.path.join(git_dir, "refs"), exist_ok=True)

    # Download and reconstruct git objects
    for obj in objects.objects:
      obj_content = await download_from_r2(bucket, obj.key)
      local_path = os.path.join(git_dir, obj.key.replace(f"{prefix}/", ""))
      os.makedirs(os.path.dirname(local_path), exist_ok=True)
      print('writing...', local_path)
      with open(local_path, "wb") as f:
        f.write(obj_content)
    
    # Download HEAD and config files if they exist
    head_content = await download_from_r2(bucket, f"{prefix}/HEAD")
    with open(os.path.join(git_dir, "HEAD"), "wb") as f:
      f.write(head_content)
    
    # Initialize dulwich repo object
    print('ZZZ')
    repo = Repo(repo_path)
    print('ZZZ1', repo)
    print('ZZZ1.1', repo.refs, ref)
    # for ref in repo.refs:
    #   print('ZZZ1.1.1', ref)
    print('ZZZ1.2', dir(repo.refs))
    print('ZZZ1.2', repo.refs.keys())
    
    # Checkout the specified ref
    if ref.encode('utf-8') in repo.refs:
      print('ZZZ2')
      commit_id = repo.refs[f"refs/heads/{ref}".encode()]
      print('ZZZ3')
      # Checkout working directory
      index = repo.open_index()
      print('ZZZ4')
      tree = repo[commit_id].tree
      print('ZZZ5')
      build_index_from_tree(repo.path, index, repo.object_store, tree)
      print('ZZZ6')
      
    return repo_path
  except Exception as e:
    print(e)
    raise Exception(f"Failed to clone repo from R2: {str(e)}")