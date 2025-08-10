import io
import tarfile
from download_from_r2 import download_from_r2

async def download_and_extract_tar(bucket, tar_key: str) -> dict:
  try:
    tar_data = await download_from_r2(bucket, tar_key)
    extracted_files = {}
    with tarfile.open(fileobj=io.BytesIO(tar_data), mode='r:*') as tar:
      for member in tar.getmembers():
        if member.isfile():
          file_content = tar.extractfile(member)
          if file_content:
            extracted_files[member.name] = file_content.read()
    
    return extracted_files
    
  except Exception as e:
    print(e)
    raise Exception(f"Failed to download and extract tar: {str(e)}")