import type { BenchmarkRun } from "../../types";
import { Info } from "lucide-react";

interface BenchmarkResultsProps {
  runs: BenchmarkRun[];
  completedAt: string | null;
}

export default function BenchmarkResults({
  runs,
  completedAt,
}: BenchmarkResultsProps) {
  if (runs.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Benchmark Performance Evaluation
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Empirical speedup and efficiency measurements
          </p>
        </div>
        {completedAt && (
          <span className="text-xs text-gray-400 font-mono">
            Recorded: {new Date(completedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
              <th className="py-3 px-4">Worker Count</th>
              <th className="py-3 px-4">Wall-Clock Time</th>
              <th className="py-3 px-4">Throughput</th>
              <th className="py-3 px-4">Avg Duration</th>
              <th className="py-3 px-4">Speedup</th>
              <th className="py-3 px-4">Parallel Efficiency</th>
              <th className="py-3 px-4 text-right">Failures</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {runs.map((run) => (
              <tr key={run.worker_count} className="hover:bg-gray-50/60">
                <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center font-mono">
                    {run.worker_count}
                  </span>
                  <span>{run.worker_count === 1 ? "Baseline (1 Node)" : `${run.worker_count} Nodes`}</span>
                </td>
                <td className="py-3 px-4 font-mono font-bold text-gray-800">
                  {run.wall_time}s
                </td>
                <td className="py-3 px-4 font-mono text-gray-600">
                  {run.throughput} img/s
                </td>
                <td className="py-3 px-4 font-mono text-gray-600">
                  {run.avg_duration}s
                </td>
                <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                  {run.speedup}x
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-brand-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(run.efficiency, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-gray-700">{run.efficiency}%</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono text-gray-500">
                  {run.failures}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Distributed Computing Theoretical Insights */}
      <div className="p-4 bg-brand-50/60 border border-brand-100 rounded-xl text-xs text-brand-900 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-brand-800">
          <Info className="w-4 h-4 text-brand-600" />
          <span>Distributed Computing Insights (Amdahl's Law & Communication Overhead)</span>
        </div>
        <p className="text-brand-700 leading-relaxed">
          Parallel speedup demonstrates the benefits of horizontal scaling. As worker nodes increase from 1 to 4,
          wall-clock execution time decreases substantially. Notice that efficiency typically remains under 100% due to
          message serialization in Redis, network I/O, and disk file reads.
        </p>
      </div>
    </div>
  );
}
