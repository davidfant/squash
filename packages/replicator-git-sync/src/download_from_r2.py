async def download_from_r2(bucket, key: str) -> bytes:
  obj = await bucket.get(key)
  if not obj:
    raise Exception(f"Object not found: {key}")
  return bytes(await obj.to_py().bytes())
