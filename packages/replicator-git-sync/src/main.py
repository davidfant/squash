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
    """Create a git commit by applying tar file changes to a base repository."""
    try:
        env = request.scope["env"]

        # Authentication
        if not verify_secret(request, env):
            return JSONResponse(status_code=401, content={"error": "missing_auth"})

        # Input validation
        if not req.base_repo.prefix or not req.new_repo.prefix:
            return JSONResponse(status_code=400, content={"error": "empty_repo_prefix"})
        
        if not req.base_repo.ref or not req.new_repo.ref:
            return JSONResponse(status_code=400, content={"error": "empty_repo_ref"})
        
        if not req.tar:
            return JSONResponse(status_code=400, content={"error": "empty_tar_path"})
        
        if not req.author.name or not req.author.email:
            return JSONResponse(status_code=400, content={"error": "invalid_author"})
        
        if not req.message:
            return JSONResponse(status_code=400, content={"error": "empty_commit_message"})

        repos_bucket = getattr(env, "R2_REPOS_BUCKET")
        file_transfer_bucket = getattr(env, "R2_FILE_TRANSFER_BUCKET")
        
        if not repos_bucket or not file_transfer_bucket:
            return JSONResponse(status_code=500, content={"error": "missing_r2_buckets"})

        # Guard: new repo prefix must be empty
        try:
            await ensure_empty_prefix(repos_bucket, req.new_repo.prefix)
        except Exception as e:
            return JSONResponse(status_code=409, content={"error": "new_repo_not_empty", "detail": str(e)})

        # Copy base repo prefix to new repo prefix
        try:
            copy_count = await copy_prefix(repos_bucket, req.base_repo.prefix, req.new_repo.prefix)
            print(f"Copied {copy_count} objects from {req.base_repo.prefix} to {req.new_repo.prefix}")
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": "repo_copy_failed", "detail": str(e)})

        # Open repo at new prefix
        repo = GitR2Repo(bucket_binding=repos_bucket, repo_prefix=req.new_repo.prefix)
        await repo.load_refs_from_r2()

        tag_ref = f"refs/tags/{req.base_repo.ref}".encode("utf-8")
        parent_commit: Optional[bytes] = repo.refs.get(tag_ref)
        if not parent_commit:
            return JSONResponse(status_code=404, content={"error": "base_repo_tag_not_found"})
        
        # Load the parent commit object from R2
        parent_obj = await repo.object_store._get_object_async(parent_commit)
        if not parent_obj:
            return JSONResponse(status_code=404, content={"error": "parent_commit_not_found"})
        
        # Validate that it's actually a commit object
        from dulwich.objects import Commit
        if not isinstance(parent_obj, Commit):
            return JSONResponse(status_code=400, content={"error": "parent_ref_not_commit"})
            
        parent_tree = parent_obj.tree
        
        # Preload the parent tree object to ensure it exists
        parent_tree_obj = await repo.object_store._get_object_async(parent_tree)
        if not parent_tree_obj:
            return JSONResponse(status_code=404, content={"error": "parent_tree_not_found"})

        # Stream tar from R2
        tar_obj = await file_transfer_bucket.get(req.tar)
        if tar_obj is None:
            return JSONResponse(status_code=404, content={"error": "tar_not_found"})
        tar_stream = await tar_obj.readable()
        
        # Extract edits from tar
        try:
            edits = stream_tar_to_edits(tar_stream)
        except Exception as e:
            return JSONResponse(status_code=400, content={"error": "invalid_tar", "detail": str(e)})
        
        # Validate edits
        if not edits:
            return JSONResponse(status_code=400, content={"error": "empty_tar"})
        
        # Check for suspicious paths
        for edit in edits:
            if ".." in edit.path or edit.path.startswith("/") or edit.path.startswith("\\"):
                return JSONResponse(status_code=400, content={"error": "invalid_path", "path": edit.path})

        # Apply edits
        try:
            root_tree = await build_tree_from_edits(
                RepoLike(object_store=repo.object_store, refs=repo.refs),
                base_tree_id=parent_tree,
                edits=edits,
            )
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": "tree_build_failed", "detail": str(e)})

        # Create commit
        try:
            author = f"{req.author.name} <{req.author.email}>"
            new_commit_id = create_commit(
                RepoLike(object_store=repo.object_store, refs=repo.refs),
                branch_ref=req.new_repo.ref.encode("utf-8"),
                parent_commit=parent_commit,
                root_tree=root_tree,
                author=author,
                message=req.message,
            )
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": "commit_creation_failed", "detail": str(e)})

        # Persist to R2
        try:
            await repo.write_refs_to_r2()
            print(f"Successfully created commit {new_commit_id.hex()} on {req.new_repo.ref}")
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": "r2_write_failed", "detail": str(e)})

        touched = {
            "added_or_updated": [e.path for e in edits],
            "deleted": [],
        }

        return JSONResponse(status_code=200, content={
            "parent_commit_oid": parent_commit.hex() if parent_commit else None,
            "new_commit_oid": new_commit_id.hex(),
            "new_repo_prefix": req.new_repo.prefix,
            "new_repo_ref": req.new_repo.ref,
            "touched": touched,
        })

    except AuthError as e:
        print(f"Authentication error: {str(e)}")
        return JSONResponse(status_code=401, content={"error": "unauthorized", "detail": str(e)})
    except ValueError as e:
        print(f"Validation error: {str(e)}")
        return JSONResponse(status_code=400, content={"error": "bad_request", "detail": str(e)})
    except Exception as e:  # noqa: BLE001
        print(f"Unexpected error in create_commit_endpoint: {str(e)}")
        return JSONResponse(status_code=500, content={"error": "internal", "detail": str(e)})


async def on_fetch(request, env):
    # Bridge Cloudflare Workers fetch handler to ASGI
    import asgi

    return await asgi.fetch(app, request, env)
