import { Link } from "react-router";

export function BranchCard({
  branch,
  index,
  onDelete,
}: {
  branch: {
    id: string;
    title: string;
    updatedAt: string;
    imageUrl: string | null;
  };
  index: number;
  onDelete: () => void;
}) {
  const formattedDate = new Date(branch.updatedAt).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
  );

  return (
    <Link to={`/branches/${branch.id}`}>
      <div
        className="aspect-[4/3] w-full relative rounded-xl flex flex-col overflow-hidden shadow-sm"
        style={{
          backgroundImage: `url(/preview-gradients/${index % 4}.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex-1 min-h-0 flex items-center justify-center p-[10%]">
          {branch.imageUrl && (
            <img
              src={branch.imageUrl}
              alt={branch.title}
              className="h-full object-contain rounded-lg border-[3px] border-white/30 shadow-lg"
            />
          )}
        </div>
        <div className="flex p-3 pt-0">
          <p className="text-sm text-primary-foreground flex-1 truncate">
            {branch.title}
          </p>
          <p className="text-sm text-primary-foreground/70">{formattedDate}</p>
        </div>
      </div>
    </Link>
  );
}
