import { useParams } from "react-router";
import { BranchFeed } from "../landing/BranchFeed";

export const RepoPage = () => <BranchFeed repoId={useParams().repoId!} />;
