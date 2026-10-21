# REST API Specification

The CDC Distributed Image Processing System exposes a RESTful API powered by FastAPI with interactive Swagger UI docs available at `/api/docs` and ReDoc at `/api/redoc`.

Base URL: `http://localhost:8000/api`

---

## 1. Health & Status

### `GET /health`
Returns connection status of the API, MongoDB, Redis broker, and active deployment mode.

**Response `200 OK`**:
```json
{
  "status": "healthy",
  "timestamp": "2026-10-21T11:40:00Z",
  "version": "1.0.0",
  "deployment_mode": "local",
  "services": {
    "api": { "status": "healthy" },
    "mongodb": { "status": "healthy" },
    "redis": { "status": "healthy" }
  }
}
```

---

## 2. Image Uploads

### `POST /uploads`
Uploads raw image files for validation and staged storage.

- **Content-Type**: `multipart/form-data`
- **Body**: `files` (array of image files, up to 20MB each)
- **Validations**: Extension in `[jpg, jpeg, png, webp, bmp, tiff]`, Pillow integrity verification, dimensions <= 10,000px.

**Response `201 Created`**:
```json
{
  "file_refs": [
    {
      "ref_id": "c1f7a40b-71a2-4a0f-93d3-138385e0bc05",
      "filename": "sample.jpg",
      "size": 245100,
      "preview_url": "/storage/originals/c1f7a40b-71a2-4a0f-93d3-138385e0bc05/sample.jpg",
      "width": 1920,
      "height": 1080,
      "format": "jpeg"
    }
  ]
}
```

---

## 3. Batch Management

### `POST /batches`
Creates an image processing batch from uploaded file references, stores tasks in MongoDB, and dispatches them asynchronously to the Redis queue.

**Request Body**:
```json
{
  "file_refs": ["c1f7a40b-71a2-4a0f-93d3-138385e0bc05"],
  "operations": ["resize", "thumbnail", "compress", "grayscale"],
  "config": {
    "width": 800,
    "height": 600,
    "thumbnail_size": 256,
    "quality": 85,
    "format": "webp",
    "rotate_angle": 90,
    "blur_radius": 2.0
  }
}
```

**Response `201 Created`**:
```json
{
  "batch_id": "3b684784-fc17-4861-bb1d-8547ca62c452",
  "task_ids": ["9f018d45-2be9-4503-b097-42f53443831b"],
  "message": "Successfully queued 1 image tasks for processing."
}
```

### `GET /batches`
Retrieves a paginated list of previous batches.
- **Query Params**: `page` (default 1), `page_size` (default 20)

### `GET /batches/{batch_id}`
Returns full details of a specific batch, including all child tasks.

### `GET /batches/{batch_id}/download`
Streams a dynamically generated ZIP archive containing all completed outputs across the batch.

---

## 4. Task Monitoring & Management

### `GET /tasks`
Retrieves tasks with filtering, search, and pagination.
- **Query Params**:
  - `page`: Page index (default: 1)
  - `page_size`: Items per page (default: 20)
  - `status`: Optional filter (`queued`, `processing`, `completed`, `failed`, `retrying`)
  - `search`: Filter by filename, task ID, or assigned worker
  - `sort_by`: Field name (default: `created_at`)
  - `sort_order`: Direction (`desc` or `asc`)

### `GET /tasks/{task_id}`
Retrieves complete details of a single task.

### `POST /tasks/{task_id}/retry`
Resubmits an eligible failed or retrying task back to the Celery queue.

### `GET /tasks/{task_id}/download`
Downloads the processed image, or a ZIP archive if multiple outputs were produced.
- **Query Param**: `operation` (optional specific output filter)

---

## 5. Metrics & Analytics

### `GET /metrics`
Returns aggregate statistics from MongoDB and Celery broker:
- `total_processed`: Number of completed and failed tasks.
- `queued`: Tasks waiting in Redis queue.
- `processing`: Tasks currently executing on worker nodes.
- `completed`: Successfully processed tasks.
- `failed`: Tasks that failed all retries.
- `active_workers`: Live Celery nodes detected.
- `avg_processing_time`: Average processing wall time in seconds.
- `success_rate`: Percentage of successful tasks.
- `processing_volume`: 24-hour hourly throughput array.
- `worker_stats`: Task count breakdown per worker node.

---

## 6. Worker Monitoring

### `GET /workers`
Inspects all active Celery workers, their status, completed/failed tasks, current job, queue length, and last heartbeat.

### `POST /workers/control`
Executes remote control commands on workers:
- **Body**:
  ```json
  {
    "worker_name": "worker-1@cdc",
    "action": "pause"  // "pause" | "resume" | "shutdown"
  }
  ```

---

## 7. Performance Benchmarks

### `POST /benchmarks`
Triggers an automated benchmark workload comparing 1, 2, and 4 concurrent workers.
- **Body**:
  ```json
  {
    "file_refs": ["c1f7a40b-71a2-4a0f-93d3-138385e0bc05"],
    "operations": ["resize", "thumbnail", "grayscale"],
    "iterations_per_run": 4
  }
  ```

### `GET /benchmarks/{benchmark_id}`
Returns wall-clock execution times, throughput, speedup factor, and parallel efficiency.
