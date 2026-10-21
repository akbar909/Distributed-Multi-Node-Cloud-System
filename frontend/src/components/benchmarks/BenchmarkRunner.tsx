import { useState } from "react";
import DropZone from "../upload/DropZone";
import ImagePreview, { type PreviewFile } from "../upload/ImagePreview";
import { uploadImages, createBenchmark } from "../../api/client";
import { useToast } from "../common/Toast";
import type { ImageOperation } from "../../types";
import { Play, Loader2, Gauge } from "lucide-react";

interface BenchmarkRunnerProps {
  onBenchmarkStarted: (benchmarkId: string) => void;
  isRunning: boolean;
}

export default function BenchmarkRunner({
  onBenchmarkStarted,
  isRunning,
}: BenchmarkRunnerProps) {
  const { addToast } = useToast();
  const [files, setFiles] = useState<PreviewFile[]>([]);
  const [selectedOps, setSelectedOps] = useState<ImageOperation[]>([
    "resize",
    "thumbnail",
    "grayscale",
    "blur",
  ]);
  const [iterations, setIterations] = useState(4);
  const [uploading, setUploading] = useState(false);

  const handleFilesSelected = (newFiles: File[]) => {
    const previews: PreviewFile[] = newFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setFiles((prev) => [...prev, ...previews]);
  };

  const handleRemove = (index: number) => {
    setFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleStartBenchmark = async () => {
    if (files.length === 0) {
      addToast("error", "Please add at least one image for the benchmark workload.");
      return;
    }

    try {
      setUploading(true);
      // 1. Upload files
      const rawFiles = files.map((f) => f.file);
      const uploadRes = await uploadImages(rawFiles);
      const fileRefs = uploadRes.file_refs.map((r) => r.ref_id);

      // 2. Start benchmark
      const res = await createBenchmark({
        file_refs: fileRefs,
        operations: selectedOps,
        config: {
          width: 800,
          height: 600,
          thumbnail_size: 256,
          blur_radius: 2.0,
        },
      });

      addToast("success", "Benchmark test initiated across 1, 2, and 4 worker nodes.");
      onBenchmarkStarted(res.benchmark_id);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to initiate benchmark.";
      addToast("error", msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <Gauge className="w-5 h-5 text-brand-600" />
        <h3 className="text-base font-semibold text-gray-900">
          Configure Benchmark Workload
        </h3>
      </div>

      <div className="space-y-4">
        <DropZone onFilesSelected={handleFilesSelected} />
        <ImagePreview files={files} onRemove={handleRemove} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Operations in Benchmark */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
            Workload Pipeline Operations
          </label>
          <div className="flex flex-wrap gap-2">
            {(["resize", "thumbnail", "grayscale", "blur", "compress", "rotate"] as ImageOperation[]).map(
              (op) => {
                const checked = selectedOps.includes(op);
                return (
                  <button
                    key={op}
                    type="button"
                    onClick={() => {
                      if (checked) {
                        if (selectedOps.length > 1) {
                          setSelectedOps(selectedOps.filter((o) => o !== op));
                        }
                      } else {
                        setSelectedOps([...selectedOps, op]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                      checked
                        ? "bg-brand-600 text-white border-brand-600 shadow-2xs"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {op}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Workload Scale / Iterations */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
            Workload Multiplier (Repetitions): {iterations}x
          </label>
          <input
            type="range"
            min="2"
            max="10"
            value={iterations}
            onChange={(e) => setIterations(parseInt(e.target.value))}
            className="w-full accent-brand-600"
          />
          <p className="text-[11px] text-gray-400">
            Total workload items = {files.length || 1} image(s) × {iterations} reps ={" "}
            {(files.length || 1) * iterations} tasks per run
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100 flex justify-end">
        <button
          type="button"
          onClick={handleStartBenchmark}
          disabled={isRunning || uploading || files.length === 0}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all focus-ring"
        >
          {isRunning || uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Running Benchmark Pipeline...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Run Automated 1 vs 2 vs 4 Worker Benchmark</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
