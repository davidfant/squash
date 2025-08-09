from src.types import parse_commit_request


def test_parse_commit_request_minimal():
    data = {
        "job_id": "ulid-1",
        "base_repo": {"bucket": "git", "prefix": "repos/base/.git/"},
        "new_repo": {"bucket": "git", "prefix": "repos/new/.git/"},
        "tar": {"bucket": "git", "key": "imports/x.tar"},
        "branch": "main",
        "author": {"name": "a", "email": "a@x"},
        "committer": {"name": "c", "email": "c@x"},
        "message": "m",
    }
    req = parse_commit_request(data)
    assert req.job_id == "ulid-1"
    assert req.branch == "main"
