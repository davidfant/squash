export const ComposioToolkitLogo = ({
  toolkit,
  className,
}: {
  toolkit: string;
  className?: string;
}) => (
  <img
    src={`https://static.squash.build/logos/light/${toolkit.toLowerCase()}`}
    className={className}
  />
);
