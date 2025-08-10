from typing import List, Optional, Dict, Any
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
    branch: str
    parent_commit_oid: Optional[str]
    new_commit_oid: str
    new_repo_prefix: str
    touched: Dict[str, List[str]]

