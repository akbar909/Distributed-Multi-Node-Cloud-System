import { Link } from "react-router-dom";
import StatusBadge from "../common/StatusBadge";
import type { Task } from "../../types";
import { ArrowUpRight, Clock, FileImage } from "lucide-react";

interface RecentTasksProps {
  tasks: Task[];
}

export default function RecentTasks({ tasks }: RecentTasksProps) {
  const formatTime = (isoString: string | null) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Recent Task Activity</h3>
          <p className="text-xs text-gray-400">Latest jobs submitted to the distributed queue</p>
        </div>
        <Link
          to="/tasks"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
        >
          <span>View All Tasks</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="py-12 text-center text-xs text-gray-400">
          No tasks recorded yet. Upload an image batch to see real-time task executions.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 uppercase font-semibold">
                <th className="pb-3 pr-4">Task ID / File</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 px-4">Operations</th>
                <th className="pb-3 px-4">Worker</th>
                <th className="pb-3 px-4">Submitted</th>
                <th className="pb-3 pl-4 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.map((task) => (
                <tr key={task.task_id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center text-gray-500">
                        <FileImage className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 max-w-[140px] truncate" title={task.filename}>
                          {task.filename}
                        </p>
                        <p className="font-mono text-[10px] text-gray-400">
                          {task.task_id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
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
                  <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                    {task.worker_name ? task.worker_name.split("@")[0] : "-"}
                  </td>
                  <td className="py-3 px-4 text-gray-500 flex items-center gap-1 mt-3">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>{formatTime(task.created_at)}</span>
                  </td>
                  <td className="py-3 pl-4 text-right font-medium text-gray-700">
                    {task.processing_time ? `${task.processing_time}s` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
