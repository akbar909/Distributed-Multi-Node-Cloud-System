import { useState } from "react";
import type { Task } from "../../types";
import StatusBadge from "../common/StatusBadge";
import { downloadTask, retryTask } from "../../api/client";
import { useToast } from "../common/Toast";
import {
  X,
  Download,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

interface TaskDetailProps {
  task: Task | null;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export default function TaskDetail({ task, onClose, onTaskUpdated }: TaskDetailProps) {
  const { addToast } = useToast();
  const [retrying, setRetrying] = useState(false);

  if (!task) return null;

  const handleDownload = async (operation?: string) => {
    try {
      const blob = await downloadTask(task.task_id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = operation
        ? `${task.filename}_${operation}`
        : `${task.filename}_outputs.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast("success", "Download initiated.");
    } catch {
      addToast("error", "Failed to download task outputs.");
    }
  };

  const handleRetry = async () => {
    try {
      setRetrying(true);
      await retryTask(task.task_id);
      addToast("success", `Task ${task.task_id.slice(0, 8)} resubmitted to queue.`);
      if (onTaskUpdated) onTaskUpdated();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to retry task.";
      addToast("error", msg);
    } finally {
      setRetrying(false);
    }
  };

  const isFailed = task.status === "failed" || task.status === "retrying";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-gray-100 overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-gray-900">Task Details</h3>
            <StatusBadge status={task.status} />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs">
            <div>
              <p className="text-gray-400 font-medium">Task ID</p>
              <p className="font-mono text-gray-800 font-semibold truncate" title={task.task_id}>
                {task.task_id}
              </p>
            </div>
            <div>
              <p className="text-gray-400 font-medium">Assigned Worker</p>
              <p className="font-mono text-gray-800 font-semibold truncate">
                {task.worker_name ? task.worker_name.split("@")[0] : "Pending"}
              </p>
            </div>
            <div>
              <p className="text-gray-400 font-medium">Processing Time</p>
              <p className="text-gray-800 font-semibold">
                {task.processing_time ? `${task.processing_time}s` : "In progress"}
              </p>
            </div>
            <div>
              <p className="text-gray-400 font-medium">Retry Count</p>
              <p className="text-gray-800 font-semibold">
                {task.retry_count} / {task.max_retries}
              </p>
            </div>
          </div>

          {/* Error Banner if Failed */}
          {task.error && (
            <div className="p-4 bg-danger-50 border border-danger-200 text-danger-700 rounded-2xl text-xs sm:text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-danger-500 mt-0.5" />
              <div>
                <p className="font-bold">Failure Log</p>
                <p className="mt-1 font-mono text-xs">{task.error}</p>
              </div>
            </div>
          )}

          {/* Original Image */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Original Image: {task.original_filename}
            </h4>
            <div className="relative rounded-2xl border border-gray-200 overflow-hidden bg-gray-100 max-h-60 flex items-center justify-center">
              <img
                src={`/storage/${task.original_path}`}
                alt="Original"
                className="max-h-60 object-contain w-auto"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
          </div>

          {/* Processed Outputs */}
          {task.outputs && task.outputs.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Processed Outputs ({task.outputs.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {task.outputs.map((out, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-600">
                        {out.operation}
                      </span>
                      {out.size && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {(out.size / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </div>

                    {out.operation === "metadata" && out.metadata ? (
                      <pre className="p-2.5 bg-gray-900 text-emerald-400 rounded-xl text-[10px] font-mono overflow-x-auto max-h-36">
                        {JSON.stringify(out.metadata, null, 2)}
                      </pre>
                    ) : (
                      <div className="rounded-xl border border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center max-h-40">
                        <img
                          src={`/storage/${out.path}`}
                          alt={out.filename}
                          className="max-h-40 object-contain"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[11px] font-medium text-gray-700 truncate max-w-[180px]">
                        {out.filename}
                      </p>
                      <a
                        href={`/storage/${out.path}`}
                        download={out.filename}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-800"
                      >
                        <span>Download</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <div>
            {isFailed && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="inline-flex items-center gap-2 px-4 py-2 bg-warning-500 hover:bg-warning-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors focus-ring"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
                <span>Retry Task</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {task.outputs && task.outputs.length > 0 && (
              <button
                onClick={() => handleDownload()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors focus-ring"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download All Outputs</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition-colors focus-ring"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
