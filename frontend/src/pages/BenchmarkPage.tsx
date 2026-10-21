import { useState, useEffect } from "react";
import BenchmarkRunner from "../components/benchmarks/BenchmarkRunner";
import BenchmarkResults from "../components/benchmarks/BenchmarkResults";
import SpeedupChart from "../components/benchmarks/SpeedupChart";
import { getBenchmark } from "../api/client";
import type { Benchmark } from "../types";
import { BarChart3, Clock } from "lucide-react";

export default function BenchmarkPage() {
  const [activeBenchmarkId, setActiveBenchmarkId] = useState<string | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<Benchmark | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!activeBenchmarkId) return;

    setIsRunning(true);
    const interval = setInterval(async () => {
      try {
        const res = await getBenchmark(activeBenchmarkId);
        setBenchmarkData(res);
        if (res.status === "completed" || res.status === "failed") {
          setIsRunning(false);
          clearInterval(interval);
        }
      } catch {
        setIsRunning(false);
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeBenchmarkId]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-brand-600" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Performance Benchmarks
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Measure parallel speedup and horizontal scaling efficiency across 1, 2, and 4 concurrent worker nodes
        </p>
      </div>

      {/* Benchmark Workload Runner */}
      <BenchmarkRunner
        onBenchmarkStarted={(id) => setActiveBenchmarkId(id)}
        isRunning={isRunning}
      />

      {/* Progress Notification */}
      {isRunning && (
        <div className="p-4 bg-brand-50 border border-brand-200 rounded-2xl flex items-center gap-3 text-brand-800 text-xs sm:text-sm animate-pulse">
          <Clock className="w-5 h-5 flex-shrink-0 text-brand-600" />
          <div>
            <p className="font-bold">Benchmarking in progress...</p>
            <p className="text-brand-600">
              Running identical workload through 1-worker, 2-worker, and 4-worker thread pools and measuring wall-clock times.
            </p>
          </div>
        </div>
      )}

      {/* Visual Charts */}
      {benchmarkData && benchmarkData.runs.length > 0 && (
        <>
          <SpeedupChart runs={benchmarkData.runs} />
          <BenchmarkResults
            runs={benchmarkData.runs}
            completedAt={benchmarkData.completed_at}
          />
        </>
      )}
    </div>
  );
}
