from typing import Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from worker_types import CommitRequest
from auth import verify_secret, AuthError
from r2_copy import ensure_empty_prefix, copy_prefix
from git_r2_store import GitR2Repo
from tar_apply import stream_tar_to_edits
from git_commit import build_tree_from_edits, create_commit, RepoLike


app = FastAPI()


@app.post("/")
async def create_commit_endpoint(req: CommitRequest, request: Request):
    try:
        env = request.scope["env"]

        if not verify_secret(request, env):
            return JSONResponse(status_code=401, content={"error": "missing_auth"})

        repos_bucket = getattr(env, "R2_REPOS_BUCKET")
        file_transfer_bucket = getattr(env, "R2_FILE_TRANSFER_BUCKET")

        # Guard: new repo prefix must be empty
        await ensure_empty_prefix(repos_bucket, req.new_repo.prefix)

        # Copy base repo prefix to new repo prefix
        await copy_prefix(repos_bucket, req.base_repo.prefix, req.new_repo.prefix)

        # Open repo at new prefix
        repo = GitR2Repo(bucket_binding=repos_bucket, repo_prefix=req.new_repo.prefix)
        await repo.load_refs_from_r2()

        tag_ref = f"refs/tags/{req.base_repo.ref}".encode("utf-8")
        parent_commit: Optional[bytes] = repo.refs.get(tag_ref)
        if not parent_commit:
            return JSONResponse(status_code=404, content={"error": "base_repo_tag_not_found"})
        parent_obj = repo.object_store[parent_commit]
        parent_tree = parent_obj.tree

        # Stream tar from R2
        tar_obj = await file_transfer_bucket.get(req.tar.key)
        if tar_obj is None:
            return JSONResponse(status_code=404, content={"error": "tar_not_found"})
        tar_stream = await tar_obj.readable()
        edits = stream_tar_to_edits(tar_stream)

        # Apply edits and deletes
        root_tree = build_tree_from_edits(
            RepoLike(object_store=repo.object_store, refs=repo.refs),
            base_tree_id=parent_tree,
            edits=edits,
            delete_paths=req.delete_paths,
        )

        author = f"{req.author.name} <{req.author.email}>"
        new_commit_id = create_commit(
            RepoLike(object_store=repo.object_store, refs=repo.refs),
            branch_ref=branch_ref,
            parent_commit=parent_commit,
            root_tree=root_tree,
            author=author,
            message=req.message,
        )

        await repo.write_refs_to_r2()

        touched = {
            "added_or_updated": [e.path for e in edits],
            "deleted": list(req.delete_paths or []),
        }

        return JSONResponse(status_code=200, content={
            "branch": req.branch,
            "parent_commit_oid": parent_commit.hex() if parent_commit else None,
            "new_commit_oid": new_commit_id.hex(),
            "new_repo_prefix": req.new_repo.prefix,
            "touched": touched,
        })

    except AuthError as e:
        return JSONResponse(status_code=401, content={"error": "unauthorized", "detail": str(e)})
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": "bad_request", "detail": str(e)})
    except Exception as e:  # noqa: BLE001
        return JSONResponse(status_code=500, content={"error": "internal", "detail": str(e)})


async def on_fetch(request, env):
    # Bridge Cloudflare Workers fetch handler to ASGI
    import asgi

    return await asgi.fetch(app, request, env)
