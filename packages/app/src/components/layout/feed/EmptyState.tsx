interface EmptyStateProps {
  searchQuery: string;
}

export function EmptyState({ searchQuery }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <p className="text-sm text-muted-foreground">
        {searchQuery
          ? "No branches found matching your search."
          : "No branches yet. Start by creating your first branch above."}
      </p>
    </div>
  );
} 