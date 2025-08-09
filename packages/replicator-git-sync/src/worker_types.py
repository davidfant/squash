from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class BucketRef(BaseModel):
    bucket: str
    prefix: Optional[str] = None
    key: Optional[str] = None


class Person(BaseModel):
    name: str
    email: str


class CommitRequest(BaseModel):
    base_repo: BucketRef
    new_repo: BucketRef
    tar: BucketRef
    branch: str
    author: Person
    committer: Person
    message: str
    delete_paths: Optional[List[str]] = None
    allow_empty_commit: bool = False
    timestamp: Optional[int] = None


class CommitResponse(BaseModel):
    branch: str
    parent_commit_oid: Optional[str]
    new_commit_oid: str
    new_repo_prefix: str
    touched: Dict[str, List[str]]

