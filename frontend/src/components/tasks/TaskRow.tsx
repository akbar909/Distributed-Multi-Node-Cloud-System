import type { Task } from "../../types";
import StatusBadge from "../common/StatusBadge";
import {
  FileImage,
  Eye,
  Download,
  RotateCcw,
} from "lucide-react";

interface TaskRowProps {
  task: Task;
  onSelect: (task: Task) => void;
  onRetry?: (taskId: string) => void;
  onDownload?: (taskId: string) => void;
}

export default function TaskRow({
  task,
  onSelect,
  onRetry,
  onDownload,
}: TaskRowProps) {
  const isFailed = task.status === "failed" || task.status === "retrying";
  const hasOutputs = task.outputs && task.outputs.length > 0;

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <tr
      onClick={() => onSelect(task)}
      className="hover:bg-gray-50/80 cursor-pointer transition-colors text-xs text-gray-700"
    >
      {/* File & ID */}
      <td className="py-3.5 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
            <FileImage className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 max-w-[160px] truncate" title={task.filename}>
              {task.filename}
            </p>
            <p className="font-mono text-[10px] text-gray-400">
              {task.task_id.slice(0, 8)}...
            </p>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="py-3.5 px-4 whitespace-nowrap">
        <StatusBadge status={task.status} />
      </td>

      {/* Operations */}
      <td className="py-3.5 px-4">
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {task.operations.map((op) => (
            <span
              key={op}
              className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-medium"
            >
              {op}
            </span>
          ))}
        </div>
      </td>

      {/* Worker */}
      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-gray-600">
        {task.worker_name ? (
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {task.worker_name.split("@")[0]}
          </span>
        ) : (
          <span className="text-gray-400 italic">Unassigned</span>
        )}
      </td>

      {/* Submission Time */}
      <td className="py-3.5 px-4 whitespace-nowrap text-gray-500">
        {formatDate(task.created_at)}
      </td>

      {/* Duration */}
      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-medium text-gray-800">
        {task.processing_time ? `${task.processing_time}s` : "-"}
      </td>

      {/* Actions */}
      <td
        className="py-3.5 px-4 text-right whitespace-nowrap"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onSelect(task)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="View Task Details"
          >
            <Eye className="w-4 h-4" />
          </button>

          {hasOutputs && onDownload && (
            <button
              type="button"
              onClick={() => onDownload(task.task_id)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Download Outputs"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {isFailed && onRetry && (
            <button
              type="button"
              onClick={() => onRetry(task.task_id)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-warning-600 hover:bg-warning-50 transition-colors"
              title="Retry Failed Task"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
