from dataclasses import dataclass
from typing import BinaryIO, List
import tarfile


@dataclass
class PathEdit:
    path: str
    data: bytes
    mode: int  # POSIX file mode (100644 or 100755)


def normalize_path(path: str) -> str:
    path = path.lstrip("./")
    while "//" in path:
        path = path.replace("//", "/")
    return path


def stream_tar_to_edits(fileobj: BinaryIO) -> List[PathEdit]:
    edits: List[PathEdit] = []
    with tarfile.open(fileobj=fileobj, mode="r|*") as tf:
        for member in tf:
            if not member:
                continue
            if not member.isfile():
                # Skip non-regular files in v1
                continue
            path = normalize_path(member.name)
            if path.endswith("/"):
                continue
            f = tf.extractfile(member)
            if f is None:
                continue
            data = f.read()
            exec_mode = 0o100755 if (member.mode & 0o111) else 0o100644
            edits.append(PathEdit(path=path, data=data, mode=exec_mode))
    return edits
