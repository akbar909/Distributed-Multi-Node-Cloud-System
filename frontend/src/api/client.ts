/**
 * Axios API client with typed request functions.
 */

import axios from "axios";
import type { AxiosProgressEvent } from "axios";
import type {
  Task,
  Batch,
  Metrics,
  Worker,
  Benchmark,
  HealthResponse,
  UploadResponse,
  BatchResponse,
  PaginatedResponse,
  ImageOperation,
  ProcessingConfig,
} from "../types";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================
// Health
// ============================================================

export const getHealth = () => api.get<HealthResponse>("/health").then((r) => r.data);

// ============================================================
// Uploads
// ============================================================

export const uploadImages = (
  files: File[],
  onProgress?: (progress: number) => void
) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  return api
    .post<UploadResponse>("/uploads", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    })
    .then((r) => r.data);
};

// ============================================================
// Batches
// ============================================================

export const createBatch = (data: {
  file_refs: string[];
  operations: ImageOperation[];
  config: ProcessingConfig;
}) => api.post<BatchResponse>("/batches", data).then((r) => r.data);

export const getBatches = (page = 1, pageSize = 20) =>
  api
    .get<PaginatedResponse<Batch>>("/batches", {
      params: { page, page_size: pageSize },
    })
    .then((r) => r.data);

export const getBatch = (batchId: string) =>
  api.get<Batch>(`/batches/${batchId}`).then((r) => r.data);

export const downloadBatch = (batchId: string) =>
  api
    .get(`/batches/${batchId}/download`, { responseType: "blob" })
    .then((r) => r.data);

// ============================================================
// Tasks
// ============================================================

export const getTasks = (params: {
  page?: number;
  page_size?: number;
  status?: string;
  search?: string;
  sort_by?: string;
  sort_order?: string;
}) =>
  api
    .get<PaginatedResponse<Task>>("/tasks", { params })
    .then((r) => r.data);

export const getTask = (taskId: string) =>
  api.get<Task>(`/tasks/${taskId}`).then((r) => r.data);

export const retryTask = (taskId: string) =>
  api.post<Task>(`/tasks/${taskId}/retry`).then((r) => r.data);

export const downloadTask = (taskId: string) =>
  api
    .get(`/tasks/${taskId}/download`, { responseType: "blob" })
    .then((r) => r.data);

// ============================================================
// Workers
// ============================================================

export const getWorkers = () =>
  api
    .get<{ workers: Worker[]; total: number; queue_length: number }>("/workers")
    .then((r) => r.data);

// ============================================================
// Metrics
// ============================================================

export const getMetrics = () => api.get<Metrics>("/metrics").then((r) => r.data);

// ============================================================
// Benchmarks
// ============================================================

export const createBenchmark = (data: {
  file_refs: string[];
  operations: ImageOperation[];
  config: ProcessingConfig;
}) => api.post<{ benchmark_id: string }>("/benchmarks", data).then((r) => r.data);

export const getBenchmark = (benchmarkId: string) =>
  api.get<Benchmark>(`/benchmarks/${benchmarkId}`).then((r) => r.data);

export default api;
