import { usePolling } from "../hooks/usePolling";
import { getWorkers } from "../api/client";
import WorkerGrid from "../components/workers/WorkerGrid";
import { SkeletonCard } from "../components/common/Skeleton";
import {
  Monitor,
  RefreshCw,
  Layers,
  Terminal,
  Activity,
  ShieldCheck,
} from "lucide-react";

export default function WorkerMonitorPage() {
  const { data, loading, refetch, lastUpdated } = usePolling(getWorkers, {
    interval: 3500,
  });

  const queueLength = data?.queue_length || 0;
  const workers = data?.workers || [];
  const onlineCount = workers.filter((w) => w.status === "online").length;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Monitor className="w-6 h-6 text-brand-600" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Worker Monitor & Scheduling
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Real-time Celery node health checks, Redis queue depth, and horizontal scaling
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg border border-gray-200 shadow-2xs transition-colors focus-ring"
            title="Inspect workers now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Queue & Cluster Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Redis Broker Queue
            </p>
            <p className="text-2xl font-extrabold text-gray-900">{queueLength}</p>
            <p className="text-[11px] text-gray-500">Tasks waiting in default queue</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Online Worker Nodes
            </p>
            <p className="text-2xl font-extrabold text-gray-900">
              {onlineCount} <span className="text-sm font-medium text-gray-400">/ {workers.length}</span>
            </p>
            <p className="text-[11px] text-emerald-600 font-medium">
              Health check ping verified
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Fault Tolerance
            </p>
            <p className="text-sm font-bold text-gray-800">Late ACKs Enabled</p>
            <p className="text-[11px] text-gray-500">Auto re-queue on node failure</p>
          </div>
        </div>
      </div>

      {/* Horizontal Scaling Command Box */}
      <div className="bg-navy-950 text-white rounded-2xl p-5 shadow-lg border border-navy-800">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-4 h-4 text-brand-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
            Horizontal Worker Scaling Command
          </h3>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Scale worker containers instantly with zero downtime using Docker Compose:
        </p>
        <div className="bg-black/50 p-3 rounded-xl font-mono text-xs text-brand-300 border border-white/5 flex items-center justify-between">
          <code>docker compose up --scale worker-1=4 -d</code>
        </div>
      </div>

      {/* Worker Cards Grid */}
      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <WorkerGrid workers={workers} onRefresh={() => refetch()} />
      )}
    </div>
  );
}
