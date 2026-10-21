import { useState, useCallback } from "react";
import { usePolling } from "../hooks/usePolling";
import { getTasks, retryTask, downloadTask } from "../api/client";
import TaskFilters from "../components/tasks/TaskFilters";
import TaskTable from "../components/tasks/TaskTable";
import TaskDetail from "../components/tasks/TaskDetail";
import Pagination from "../components/common/Pagination";
import { SkeletonTable } from "../components/common/Skeleton";
import { useToast } from "../components/common/Toast";
import type { Task } from "../types";
import { ListTodo, RefreshCw } from "lucide-react";

export default function TaskMonitorPage() {
  const { addToast } = useToast();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasksFn = useCallback(() => {
    return getTasks({
      page,
      page_size: pageSize,
      status: status !== "all" ? status : undefined,
      search: search.trim() ? search.trim() : undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    });
  }, [page, pageSize, status, search, sortBy, sortOrder]);

  const {
    data: tasksResponse,
    loading,
    refetch,
    lastUpdated,
  } = usePolling(fetchTasksFn, { interval: 3000 });

  const handleRetryTask = async (taskId: string) => {
    try {
      await retryTask(taskId);
      addToast("success", `Task ${taskId.slice(0, 8)} re-queued successfully.`);
      refetch();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to retry task.";
      addToast("error", msg);
    }
  };

  const handleDownloadTask = async (taskId: string) => {
    try {
      const blob = await downloadTask(taskId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `task_${taskId}_outputs.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast("success", "Download started.");
    } catch {
      addToast("error", "Failed to download task outputs.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-brand-600" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Task Monitor
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Real-time status tracking, worker assignment, and download hub
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Auto-refreshing (3s) · Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg border border-gray-200 shadow-2xs transition-colors focus-ring"
            title="Refresh tasks now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <TaskFilters
        status={status}
        onStatusChange={(newStatus) => {
          setStatus(newStatus);
          setPage(1);
        }}
        search={search}
        onSearchChange={(newSearch) => {
          setSearch(newSearch);
          setPage(1);
        }}
        sortBy={sortBy}
        onSortByChange={(newSort) => {
          setSortBy(newSort);
          setPage(1);
        }}
        sortOrder={sortOrder}
        onSortOrderChange={(newOrder) => {
          setSortOrder(newOrder);
          setPage(1);
        }}
      />

      {/* Task Table */}
      {loading && !tasksResponse ? (
        <SkeletonTable rows={8} />
      ) : (
        <TaskTable
          tasks={tasksResponse?.items || []}
          onSelectTask={(task) => setSelectedTask(task)}
          onRetryTask={handleRetryTask}
          onDownloadTask={handleDownloadTask}
        />
      )}

      {/* Pagination */}
      {tasksResponse && (
        <Pagination
          page={page}
          totalPages={tasksResponse.total_pages}
          pageSize={pageSize}
          total={tasksResponse.total}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      {/* Task Detail Modal */}
      <TaskDetail
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={() => refetch()}
      />
    </div>
  );
}
