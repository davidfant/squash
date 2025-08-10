
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from worker_types import CommitRequest
from auth import verify_secret, AuthError
from download_and_extract_tar import download_and_extract_tar
from clone_repo_from_r2 import clone_repo_from_r2


app = FastAPI()


@app.post("/")
async def clone_git_repo_and_apply_tar(req: CommitRequest, request: Request):
  """Create a git commit by applying tar file changes to a base repository."""
  try:
    env = request.scope["env"]

    # Authentication
    if not verify_secret(request, env):
      return JSONResponse(status_code=401, content={"error": "missing_auth"})

    repos_bucket = getattr(env, "R2_REPOS_BUCKET")
    file_transfer_bucket = getattr(env, "R2_FILE_TRANSFER_BUCKET")

    await clone_repo_from_r2(repos_bucket, req.base_repo.prefix, req.base_repo.ref)
    
    # extracted_files = await download_and_extract_tar(file_transfer_bucket, req.tar)
    # print(extracted_files.keys())


  except AuthError as e:
    print(f"Authentication error: {str(e)}")
    return JSONResponse(status_code=401, content={"error": "unauthorized", "detail": str(e)})


async def on_fetch(request, env):
  import asgi
  return await asgi.fetch(app, request, env)
