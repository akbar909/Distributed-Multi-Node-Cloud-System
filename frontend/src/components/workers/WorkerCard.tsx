import { useState } from "react";
import type { Worker } from "../../types";
import api from "../../api/client";
import { useToast } from "../common/Toast";
import {
  Cpu,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  Play,
} from "lucide-react";

interface WorkerCardProps {
  worker: Worker;
  onRefresh?: () => void;
}

export default function WorkerCard({ worker, onRefresh }: WorkerCardProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const isOnline = worker.status === "online";

  const handleAction = async (action: "pause" | "resume") => {
    try {
      setLoading(true);
      await api.post("/workers/control", {
        worker_name: worker.name,
        action: action,
      });
      addToast(
        "success",
        `Worker ${worker.name.split("@")[0]} command '${action}' dispatched.`
      );
      if (onRefresh) onRefresh();
    } catch {
      addToast("info", `Signal '${action}' simulated on ${worker.name.split("@")[0]}`);
    } finally {
      setLoading(false);
    }
  };

  const formatHeartbeat = (hb: string | null) => {
    if (!hb) return "Never";
    const d = new Date(hb);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div
      className={`bg-white border rounded-2xl p-6 shadow-xs transition-all duration-200 relative overflow-hidden ${
        isOnline
          ? "border-gray-200 hover:shadow-md"
          : "border-gray-200 opacity-75 bg-gray-50/50"
      }`}
    >
      {/* Top Banner & Status Indicator */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${
              isOnline
                ? "bg-purple-50 text-purple-600 ring-1 ring-purple-100"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 truncate max-w-[170px]" title={worker.name}>
              {worker.name.split("@")[0]}
            </h3>
            <p className="text-[11px] font-mono text-gray-400 truncate max-w-[170px]">
              {worker.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
            }`}
          />
          <span className={isOnline ? "text-emerald-700" : "text-gray-500"}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-gray-100 text-xs">
        <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Completed</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{worker.completed_tasks}</p>
        </div>

        <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1">
            <XCircle className="w-3.5 h-3.5 text-danger-500" />
            <span>Failed</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{worker.failed_tasks}</p>
        </div>
      </div>

      {/* Active Workload & Heartbeat */}
      <div className="mt-4 space-y-2 text-xs">
        <div className="flex items-center justify-between py-1 border-b border-gray-50">
          <span className="text-gray-400">Current Task</span>
          <span className="font-mono text-gray-800 font-medium">
            {worker.current_task ? worker.current_task.slice(0, 8) + "..." : "Idle"}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-gray-50">
          <span className="text-gray-400">Est. Throughput</span>
          <span className="text-gray-800 font-semibold">
            {worker.processing_speed > 0 ? `${worker.processing_speed} tasks/min` : "Dynamic"}
          </span>
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-gray-400">Last Heartbeat</span>
          <span className="text-gray-600 flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-400" />
            {formatHeartbeat(worker.last_heartbeat)}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="mt-5 pt-3 border-t border-gray-100 flex gap-2">
        <button
          onClick={() => handleAction("pause")}
          disabled={loading || !isOnline}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-xs font-semibold text-gray-700 transition-colors focus-ring"
        >
          <Pause className="w-3.5 h-3.5" />
          <span>Pause Worker</span>
        </button>
        <button
          onClick={() => handleAction("resume")}
          disabled={loading || !isOnline}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-xs font-semibold text-brand-600 transition-colors focus-ring"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Resume Worker</span>
        </button>
      </div>
    </div>
  );
}
