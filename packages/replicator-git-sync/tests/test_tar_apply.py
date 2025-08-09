import io
import tarfile

from src.tar_apply import stream_tar_to_edits


def make_tar(files):
    bio = io.BytesIO()
    with tarfile.open(mode="w", fileobj=bio) as tf:
        for path, data, mode in files:
            info = tarfile.TarInfo(path)
            info.size = len(data)
            info.mode = mode
            tf.addfile(info, io.BytesIO(data))
    bio.seek(0)
    return bio


def test_stream_tar_to_edits_basic():
    bio = make_tar([
        ("a.txt", b"hello", 0o644),
        ("bin/run.sh", b"#!/bin/sh\n", 0o755),
    ])
    edits = stream_tar_to_edits(bio)
    paths = {e.path for e in edits}
    assert paths == {"a.txt", "bin/run.sh"}
    mode_map = {e.path: e.mode for e in edits}
    assert mode_map["a.txt"] == 0o100644
    assert mode_map["bin/run.sh"] == 0o100755
