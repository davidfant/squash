from pydantic import BaseModel

class RepoRef(BaseModel):
    prefix: str
    ref: str

class Person(BaseModel):
    name: str
    email: str


class CommitRequest(BaseModel):
    base_repo: RepoRef
    new_repo: RepoRef
    tar: str
    author: Person
    message: str


class CommitResponse(BaseModel):
    new_repo: RepoRef
    commit_oid: str

