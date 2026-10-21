import { useState, useEffect } from "react";
import { getBatch, downloadBatch } from "../../api/client";
import { useToast } from "../common/Toast";
import StatusBadge from "../common/StatusBadge";
import type { Task } from "../../types";
import { Download, Loader2, FileImage } from "lucide-react";

interface BatchDetailProps {
  batchId: string;
}

export default function BatchDetail({ batchId }: BatchDetailProps) {
  const { addToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getBatch(batchId)
      .then((res) => {
        setTasks((res as unknown as { tasks?: Task[] }).tasks || []);
      })
      .catch(() => {
        addToast("error", "Failed to load batch tasks.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [batchId]);

  const handleDownloadBatchZip = async () => {
    try {
      setDownloading(true);
      const blob = await downloadBatch(batchId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `batch_${batchId.slice(0, 8)}_outputs.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast("success", "Batch ZIP archive downloaded.");
    } catch {
      addToast("error", "No processed files ready to package for this batch.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600 mx-auto mb-2" />
        <p className="text-xs text-gray-400">Loading batch tasks...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Batch #{batchId.slice(0, 8)} Content
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {tasks.length} total tasks executed in this batch
          </p>
        </div>

        <button
          onClick={handleDownloadBatchZip}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors focus-ring"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>Download All Outputs (.ZIP)</span>
        </button>
      </div>

      {/* Task Output Previews */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tasks.map((task) => (
          <div
            key={task.task_id}
            className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-800 truncate max-w-[140px]" title={task.filename}>
                  {task.filename}
                </span>
              </div>
              <StatusBadge status={task.status} />
            </div>

            {/* Original vs Processed strip */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-gray-200 bg-white p-1 text-center">
                <p className="text-[10px] text-gray-400 mb-1">Original</p>
                <div className="h-24 flex items-center justify-center overflow-hidden rounded bg-gray-100">
                  <img
                    src={`/storage/${task.original_path}`}
                    alt="Original"
                    className="max-h-24 object-contain"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-1 text-center">
                <p className="text-[10px] text-gray-400 mb-1">
                  Outputs ({task.outputs?.length || 0})
                </p>
                <div className="h-24 flex items-center justify-center overflow-hidden rounded bg-gray-100">
                  {task.outputs && task.outputs.length > 0 && task.outputs[0].operation !== "metadata" ? (
                    <img
                      src={`/storage/${task.outputs[0].path}`}
                      alt="Output"
                      className="max-h-24 object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-gray-400">
                      {task.status === "completed" ? "Metadata" : "In Queue"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
              <span>Duration: {task.processing_time ? `${task.processing_time}s` : "-"}</span>
              <span className="font-mono text-gray-400">
                {task.worker_name ? task.worker_name.split("@")[0] : "-"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
