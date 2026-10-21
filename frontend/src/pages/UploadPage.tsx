import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DropZone from "../components/upload/DropZone";
import ImagePreview, { type PreviewFile } from "../components/upload/ImagePreview";
import OperationSelector from "../components/upload/OperationSelector";
import ProcessingConfigPanel from "../components/upload/ProcessingConfig";
import { useToast } from "../components/common/Toast";
import { uploadImages, createBatch } from "../api/client";
import type { ImageOperation, ProcessingConfig } from "../types";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

export default function UploadPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [selectedFiles, setSelectedFiles] = useState<PreviewFile[]>([]);
  const [selectedOps, setSelectedOps] = useState<ImageOperation[]>([
    "resize",
    "thumbnail",
    "metadata",
  ]);
  const [config, setConfig] = useState<ProcessingConfig>({
    width: 800,
    height: 600,
    thumbnail_size: 256,
    quality: 85,
    format: "webp",
    rotate_angle: 90,
    blur_radius: 2.0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [submissionStep, setSubmissionStep] = useState<string>("");

  const handleFilesSelected = (files: File[]) => {
    const newPreviews: PreviewFile[] = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setSelectedFiles((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmitBatch = async () => {
    if (selectedFiles.length === 0) {
      addToast("error", "Please select at least one image to upload.");
      return;
    }
    if (selectedOps.length === 0) {
      addToast("error", "Please select at least one processing operation.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmissionStep("Uploading images to shared storage...");

      // 1. Upload files
      const rawFiles = selectedFiles.map((f) => f.file);
      const uploadRes = await uploadImages(rawFiles, (progress) => {
        setUploadProgress(progress);
      });

      const fileRefs = uploadRes.file_refs.map((r) => r.ref_id);

      // 2. Dispatch batch to Redis task queue
      setSubmissionStep("Dispatching tasks to distributed Celery queue...");
      const batchRes = await createBatch({
        file_refs: fileRefs,
        operations: selectedOps,
        config: config,
      });

      addToast(
        "success",
        `Batch created successfully! ${batchRes.task_ids.length} tasks dispatched to distributed workers.`
      );

      // Clean up object URLs
      selectedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));

      // Navigate to task monitor
      navigate("/tasks");
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ||
        (err instanceof Error ? err.message : "Failed to submit batch.");
      addToast("error", errorMsg);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
      setSubmissionStep("");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Upload & Distributed Processing
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload image batches and schedule parallel tasks across Celery worker nodes
        </p>
      </div>

      {/* Upload Zone & Previews */}
      <div className="space-y-6">
        <DropZone onFilesSelected={handleFilesSelected} />
        <ImagePreview files={selectedFiles} onRemove={handleRemoveFile} />
      </div>

      {/* Operations Selector */}
      <OperationSelector selectedOps={selectedOps} onChange={setSelectedOps} />

      {/* Processing Settings Panel */}
      <ProcessingConfigPanel
        selectedOps={selectedOps}
        config={config}
        onChange={setConfig}
      />

      {/* Progress & Submit Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {selectedFiles.length} {selectedFiles.length === 1 ? "Image" : "Images"} Ready
            </p>
            <p className="text-xs text-gray-500">
              {selectedOps.length} operations will execute concurrently across active worker nodes
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-4">
          {isSubmitting && (
            <div className="w-full sm:w-60">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span className="truncate">{submissionStep}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmitBatch}
            disabled={isSubmitting || selectedFiles.length === 0 || selectedOps.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-semibold shadow-md shadow-brand-500/20 transition-all focus-ring"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Submit Batch to Queue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
