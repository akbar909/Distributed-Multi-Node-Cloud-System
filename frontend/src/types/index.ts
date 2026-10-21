/**
 * TypeScript type definitions for the CDC Image Processor.
 */

// ============================================================
// Task Types
// ============================================================

export type TaskStatus = "queued" | "processing" | "completed" | "failed" | "retrying";

export type ImageOperation =
  | "resize"
  | "thumbnail"
  | "compress"
  | "convert"
  | "rotate"
  | "grayscale"
  | "blur"
  | "metadata";

export type ImageFormat = "jpeg" | "png" | "webp";

export interface ProcessingConfig {
  width?: number;
  height?: number;
  thumbnail_size?: number;
  quality?: number;
  format?: ImageFormat;
  rotate_angle?: number;
  blur_radius?: number;
}

export interface TaskOutput {
  operation: ImageOperation;
  filename: string;
  path: string;
  size?: number;
  metadata?: Record<string, unknown>;
}

export interface Task {
  task_id: string;
  batch_id: string;
  filename: string;
  original_filename: string;
  original_path: string;
  status: TaskStatus;
  operations: ImageOperation[];
  config: ProcessingConfig;
  outputs: TaskOutput[];
  worker_name: string | null;
  error: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  processing_time: number | null;
}

// ============================================================
// Batch Types
// ============================================================

export interface Batch {
  batch_id: string;
  task_ids: string[];
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  status: "pending" | "processing" | "completed" | "partial" | "failed";
  created_at: string;
}

// ============================================================
// Worker Types
// ============================================================

export interface Worker {
  name: string;
  status: "online" | "offline";
  completed_tasks: number;
  failed_tasks: number;
  current_task: string | null;
  queue_length: number;
  processing_speed: number;
  last_heartbeat: string | null;
  uptime: number | null;
}

// ============================================================
// Metrics Types
// ============================================================

export interface Metrics {
  total_processed: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  active_workers: number;
  avg_processing_time: number;
  success_rate: number;
  processing_volume: { hour: string; count: number }[];
  worker_stats: { name: string; completed: number; failed: number }[];
}

// ============================================================
// Benchmark Types
// ============================================================

export interface BenchmarkRun {
  worker_count: number;
  wall_time: number;
  throughput: number;
  avg_duration: number;
  failures: number;
  speedup: number;
  efficiency: number;
}

export interface Benchmark {
  benchmark_id: string;
  status: "pending" | "running" | "completed" | "failed";
  runs: BenchmarkRun[];
  created_at: string;
  completed_at: string | null;
}

// ============================================================
// API Response Types
// ============================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UploadResponse {
  file_refs: {
    ref_id: string;
    filename: string;
    size: number;
    preview_url: string;
  }[];
}

export interface BatchResponse {
  batch_id: string;
  task_ids: string[];
  message: string;
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  deployment_mode: string;
  services: {
    api: { status: string };
    mongodb: { status: string; error?: string };
    redis: { status: string; error?: string };
  };
}
