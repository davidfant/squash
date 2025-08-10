from src.worker_types import CommitRequest, RepoRef, Person


def test_commit_request_minimal():
    req = CommitRequest(
        base_repo=RepoRef(prefix="repos/base/.git/", ref="v1.0.0"),
        new_repo=RepoRef(prefix="repos/new/.git/", ref="main"),
        tar="imports/x.tar",
        author=Person(name="a", email="a@x"),
        message="m",
    )
    assert req.base_repo.prefix == "repos/base/.git/"
    assert req.new_repo.ref == "main"
    assert req.author.name == "a"
