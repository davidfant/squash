import { FeatureCardSkeleton } from "./card-skeleton";

export const FeatureCardGrid = ({
  children,
  empty,
}: {
  children: React.ReactNode[] | undefined;
  empty?: string;
}) =>
  children?.length === 0 ? (
    <p className="text-sm text-muted-foreground">{empty}</p>
  ) : (
    <div className="@container">
      <div className="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4 gap-4">
        {children ??
          [...Array(6)].map((_, i) => (
            <FeatureCardSkeleton key={i} index={i} />
          ))}
      </div>
    </div>
  );
