import { Link } from "react-router";

export const BranchHeader = ({
  title,
  inlineAction,
  extra,
}: {
  title: string;
  inlineAction?: React.ReactNode;
  extra?: React.ReactNode;
}) => (
  <header className="flex items-center justify-between p-2">
    <div className="flex items-center gap-2">
      <Link to="/" className="flex items-center">
        <img
          src="/preview/gradients/0.jpg"
          alt="Squash"
          className="size-6 hover:opacity-80 transition-opacity rounded-full"
        />
      </Link>
      <span className="font-medium text-sm">{title}</span>
      {inlineAction}
    </div>

    {extra}
  </header>
);
