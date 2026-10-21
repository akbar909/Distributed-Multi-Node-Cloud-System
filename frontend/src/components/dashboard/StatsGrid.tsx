import MetricCard from "../common/MetricCard";
import type { Metrics } from "../../types";
import {
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  Cpu,
  Zap,
} from "lucide-react";

interface StatsGridProps {
  metrics: Metrics;
}

export default function StatsGrid({ metrics }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <MetricCard
        icon={Layers}
        label="Total Processed"
        value={metrics.total_processed}
        subtitle="Images completed or failed"
        color="blue"
      />
      <MetricCard
        icon={Clock}
        label="Queued / In Flight"
        value={metrics.queued + metrics.processing}
        subtitle={`${metrics.queued} queued, ${metrics.processing} processing`}
        color="orange"
      />
      <MetricCard
        icon={CheckCircle2}
        label="Completed"
        value={metrics.completed}
        subtitle={`${metrics.success_rate}% success rate`}
        color="green"
      />
      <MetricCard
        icon={XCircle}
        label="Failed Tasks"
        value={metrics.failed}
        subtitle="Eligible for retry"
        color="red"
      />
      <MetricCard
        icon={Cpu}
        label="Active Workers"
        value={metrics.active_workers}
        subtitle="Distributed worker nodes"
        color="purple"
      />
      <MetricCard
        icon={Zap}
        label="Avg Processing"
        value={`${metrics.avg_processing_time}s`}
        subtitle="Wall clock per image"
        color="gray"
      />
    </div>
  );
}
