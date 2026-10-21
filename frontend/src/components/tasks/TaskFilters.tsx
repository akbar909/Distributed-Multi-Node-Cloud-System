import { Search, Filter, ArrowUpDown } from "lucide-react";

interface TaskFiltersProps {
  status: string;
  onStatusChange: (status: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  sortBy: string;
  onSortByChange: (sortBy: string) => void;
  sortOrder: string;
  onSortOrderChange: (order: string) => void;
}

export default function TaskFilters({
  status,
  onStatusChange,
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
}: TaskFiltersProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by filename, task ID, or worker..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus-ring"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-1.5">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-transparent text-xs text-gray-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="retrying">Retrying</option>
          </select>
        </div>

        {/* Sort Field */}
        <div className="flex items-center gap-1.5 bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="bg-transparent text-xs text-gray-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="created_at">Created Time</option>
            <option value="processing_time">Duration</option>
            <option value="filename">Filename</option>
          </select>
        </div>

        {/* Sort Order */}
        <button
          type="button"
          onClick={() => onSortOrderChange(sortOrder === "desc" ? "asc" : "desc")}
          className="px-3 py-2 bg-gray-50/50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition-colors focus-ring"
          title="Toggle sort direction"
        >
          {sortOrder.toUpperCase()}
        </button>
      </div>
    </div>
  );
}
