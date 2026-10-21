import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { BenchmarkRun } from "../../types";

interface SpeedupChartProps {
  runs: BenchmarkRun[];
}

export default function SpeedupChart({ runs }: SpeedupChartProps) {
  const chartData = runs.map((r) => ({
    name: `${r.worker_count} Worker${r.worker_count > 1 ? "s" : ""}`,
    workers: r.worker_count,
    wallTime: r.wall_time,
    speedup: r.speedup,
    idealSpeedup: r.worker_count, // Ideal linear speedup
    efficiency: r.efficiency,
    throughput: r.throughput,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Wall Clock Execution Time (Bar Chart) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Wall-Clock Execution Time (Lower is Better)
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Total elapsed seconds to complete identical batch workload
          </p>
        </div>

        <div className="h-64 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                unit="s"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f1923",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                }}
                formatter={(val: unknown) => [`${val}s`, "Wall-Clock Time"]}
              />
              <Bar
                dataKey="wallTime"
                name="Wall Time (s)"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Speedup vs Ideal (Line Chart) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Speedup Scaling vs. Ideal Linear
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Amdahl's law comparison: Speedup = T(1) / T(N)
          </p>
        </div>

        <div className="h-64 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="x" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f1923",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Line
                type="monotone"
                dataKey="speedup"
                name="Measured Speedup"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="idealSpeedup"
                name="Ideal Linear (Nx)"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
