import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Filter, Search } from "lucide-react";

interface FeedHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterByMe: boolean;
  onFilterByMeChange: (value: boolean) => void;
}

export function FeedHeader({
  searchQuery,
  onSearchChange,
  filterByMe,
  onFilterByMeChange,
}: FeedHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lg font-semibold">Feed</h2>

      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search branches..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 w-[200px] h-9"
          />
        </div>

        {/* Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="h-3.5 w-3.5 mr-2" />
              Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Filter by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={filterByMe}
              onCheckedChange={onFilterByMeChange}
            >
              Created by me
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem>
              Recent activity
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
} 