import type { Worker } from "../../types";
import WorkerCard from "./WorkerCard";
import EmptyState from "../common/EmptyState";
import { Cpu } from "lucide-react";

interface WorkerGridProps {
  workers: Worker[];
  onRefresh?: () => void;
}

export default function WorkerGrid({ workers, onRefresh }: WorkerGridProps) {
  if (workers.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xs">
        <EmptyState
          icon={Cpu}
          title="No Celery workers detected"
          description="Ensure Celery worker containers are running and connected to the Redis broker."
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {workers.map((worker) => (
        <WorkerCard key={worker.name} worker={worker} onRefresh={onRefresh} />
      ))}
    </div>
  );
}
