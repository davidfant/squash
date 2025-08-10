from typing import AsyncIterator, Optional


class R2Error(Exception):
    pass


async def prefix_has_any(env_bucket, prefix: str) -> bool:
    it = await env_bucket.list(prefix=prefix, limit=1)
    # Python Workers API is evolving; normalize a minimal contract
    if hasattr(it, "objects"):
        return len(it.objects) > 0
    if hasattr(it, "keys"):
        return len(it.keys) > 0
    return False


async def ensure_empty_prefix(env_bucket, prefix: str) -> None:
    if await prefix_has_any(env_bucket, prefix):
        raise R2Error(f"Target prefix not empty: {prefix}")


async def iter_list(env_bucket, prefix: str) -> AsyncIterator[str]:
    cursor: Optional[str] = None
    while True:
        resp = await env_bucket.list(prefix=prefix, cursor=cursor)
        keys = []
        if hasattr(resp, "objects"):
            keys = [o.key for o in resp.objects]
        elif hasattr(resp, "keys"):
            keys = list(resp.keys)
        for k in keys:
            yield k
        if not getattr(resp, "truncated", False):
            break
        cursor = getattr(resp, "cursor", None)
        if not cursor:
            break


async def copy_prefix(bucket, src_prefix: str, dst_prefix: str) -> int:
    """Copy all objects from src_prefix to dst_prefix within the same bucket."""
    count = 0
    async for key in iter_list(bucket, src_prefix):
        suffix = key[len(src_prefix) :]
        dst_key = f"{dst_prefix}{suffix}"
        
        try:
            # Try server-side copy first (more efficient)
            if hasattr(bucket, "copy"):
                await bucket.copy(src_bucket=bucket, src_key=key, key=dst_key)
            else:
                # Fallback: download & re-upload (not ideal, but keeps logic testable)
                obj = await bucket.get(key)
                if obj is None:
                    continue
                body = await obj.arrayBuffer()
                await bucket.put(dst_key, body)
            count += 1
        except Exception as e:
            raise R2Error(f"Failed to copy {key} to {dst_key}: {str(e)}")
    return count
