import { usePolling } from "../hooks/usePolling";
import { getMetrics, getTasks } from "../api/client";
import StatsGrid from "../components/dashboard/StatsGrid";
import ProcessingChart from "../components/dashboard/ProcessingChart";
import WorkerChart from "../components/dashboard/WorkerChart";
import RecentTasks from "../components/dashboard/RecentTasks";
import { SkeletonCard, SkeletonChart, SkeletonTable } from "../components/common/Skeleton";
import { RefreshCw, LayoutDashboard, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const {
    data: metrics,
    loading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
    lastUpdated,
  } = usePolling(getMetrics, { interval: 4000 });

  const {
    data: tasksData,
    loading: tasksLoading,
    refetch: refetchTasks,
  } = usePolling(
    () => getTasks({ page: 1, page_size: 8, sort_by: "created_at", sort_order: "desc" }),
    { interval: 4000 }
  );

  const handleManualRefresh = () => {
    refetchMetrics();
    refetchTasks();
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-brand-600" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              System Dashboard
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Real-time throughput, distributed queue metrics, and worker node health
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleManualRefresh}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg border border-gray-200 shadow-2xs transition-colors focus-ring"
            title="Refresh metrics now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {metricsError && (
        <div className="p-4 bg-danger-50 border border-danger-200 text-danger-700 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Failed to connect to backend API: {metricsError}</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      {metricsLoading && !metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : metrics ? (
        <StatsGrid metrics={metrics} />
      ) : null}

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {metricsLoading && !metrics ? (
          <>
            <SkeletonChart />
            <SkeletonChart />
          </>
        ) : metrics ? (
          <>
            <ProcessingChart data={metrics.processing_volume || []} />
            <WorkerChart data={metrics.worker_stats || []} />
          </>
        ) : null}
      </div>

      {/* Recent Activity Table */}
      {tasksLoading && !tasksData ? (
        <SkeletonTable rows={5} />
      ) : tasksData ? (
        <RecentTasks tasks={tasksData.items || []} />
      ) : null}
    </div>
  );
}
