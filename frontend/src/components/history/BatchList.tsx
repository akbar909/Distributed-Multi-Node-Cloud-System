import type { Batch } from "../../types";
import { Layers, Calendar, ChevronRight } from "lucide-react";

interface BatchListProps {
  batches: Batch[];
  selectedBatchId: string | null;
  onSelectBatch: (batch: Batch) => void;
}

export default function BatchList({
  batches,
  selectedBatchId,
  onSelectBatch,
}: BatchListProps) {
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-3">
      {batches.map((batch) => {
        const isSelected = batch.batch_id === selectedBatchId;
        const progressPct =
          batch.total_tasks > 0
            ? Math.round(
                ((batch.completed_tasks + batch.failed_tasks) / batch.total_tasks) *
                  100
              )
            : 0;

        return (
          <div
            key={batch.batch_id}
            onClick={() => onSelectBatch(batch)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
              isSelected
                ? "bg-brand-50/50 border-brand-500 shadow-xs ring-1 ring-brand-500"
                : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-gray-800">
                  Batch #{batch.batch_id.slice(0, 8)}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    batch.status === "completed"
                      ? "bg-emerald-50 text-emerald-600"
                      : batch.status === "partial"
                      ? "bg-warning-50 text-warning-500"
                      : batch.status === "failed"
                      ? "bg-danger-50 text-danger-600"
                      : "bg-brand-50 text-brand-600"
                  }`}
                >
                  {batch.status}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-gray-400" />
                {batch.total_tasks} Images
              </span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {formatDate(batch.created_at)}
              </span>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-gray-400 mb-1">
                <span>
                  {batch.completed_tasks} done, {batch.failed_tasks} failed
                </span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    batch.failed_tasks > 0 && batch.completed_tasks === 0
                      ? "bg-danger-500"
                      : "bg-brand-600"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
