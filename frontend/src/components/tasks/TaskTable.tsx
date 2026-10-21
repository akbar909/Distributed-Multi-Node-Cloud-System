import type { Task } from "../../types";
import TaskRow from "./TaskRow";
import EmptyState from "../common/EmptyState";
import { ListTodo } from "lucide-react";

interface TaskTableProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onRetryTask?: (taskId: string) => void;
  onDownloadTask?: (taskId: string) => void;
}

export default function TaskTable({
  tasks,
  onSelectTask,
  onRetryTask,
  onDownloadTask,
}: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xs">
        <EmptyState
          icon={ListTodo}
          title="No tasks match the filter criteria"
          description="Try selecting a different status or clearing your search query."
        />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <th className="py-3 px-4">Image / Task ID</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Operations</th>
              <th className="py-3 px-4">Assigned Worker</th>
              <th className="py-3 px-4">Submitted</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <TaskRow
                key={task.task_id}
                task={task}
                onSelect={onSelectTask}
                onRetry={onRetryTask}
                onDownload={onDownloadTask}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
