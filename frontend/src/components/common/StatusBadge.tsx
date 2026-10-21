/**
 * Color-coded status badge for task statuses.
 */

import type { TaskStatus } from "../../types";

const statusStyles: Record<TaskStatus, string> = {
  queued:
    "bg-gray-100 text-gray-700 border border-gray-200",
  processing:
    "bg-brand-50 text-brand-700 border border-brand-200 animate-pulse",
  completed:
    "bg-success-50 text-success-600 border border-success-200",
  failed:
    "bg-danger-50 text-danger-600 border border-danger-200",
  retrying:
    "bg-warning-50 text-warning-500 border border-warning-400",
};

const statusLabels: Record<TaskStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  retrying: "Retrying",
};

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusStyles[status]} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "completed"
            ? "bg-success-500"
            : status === "failed"
            ? "bg-danger-500"
            : status === "processing"
            ? "bg-brand-500"
            : status === "retrying"
            ? "bg-warning-500"
            : "bg-gray-400"
        }`}
      />
      {statusLabels[status]}
    </span>
  );
}
