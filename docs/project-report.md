# Project Report: Cloud-Based Distributed Image Processing and Task Scheduling System

**Course**: Cloud and Distributed Computing (CDC)  
**Academic Year**: 2026  
**Project**: Cloud-Based Distributed Image Processing and Task Scheduling System  

---

## 1. Executive Summary

Modern web and enterprise applications handle vast volumes of unstructured media that require intensive transformations (resizing, compression, format transcoding, and filtering). Processing such media synchronously on application web servers introduces thread blocking, high latency, memory spikes, and vulnerabilities to resource-exhaustion denial of service.

This project implements a production-minded **Cloud-Based Distributed Image Processing and Task Scheduling System**. The system decouples client request handling from compute-bound processing using an asynchronous message-broker architecture (FastAPI + Redis + Celery + MongoDB + Pillow + React 19). Heavy operations are distributed across horizontally scalable, independent worker nodes. The system provides real-time cluster monitoring, fault-tolerant worker crash recovery, and empirical performance benchmarking across multiple worker configurations.

---

## 2. Distributed Computing Concepts Demonstrated

### A. Asynchronous Decoupling & Queue Management
- **Problem**: Image transformations can take hundreds of milliseconds to several seconds. Synchronous HTTP endpoints block web server threads, causing connection pool starvation.
- **Solution**: The FastAPI API Gateway validates requests, stores the original file in shared storage, persists metadata in MongoDB, and pushes a lightweight job reference (`task_id`) into a Redis task queue before responding immediately with HTTP 201/202.
- **Payload Discipline**: Large binary image payloads are never placed directly into Redis memory; only reference IDs are transmitted across the message broker.

### B. Horizontal Scaling & Parallel Execution
- **Mechanics**: Celery worker containers run as decoupled instances consuming from the shared Redis broker.
- **Concurrency**: Each worker manages a pool of execution threads. By running multiple worker containers (e.g., `worker-1`, `worker-2`, ...), the cluster achieves horizontal concurrency without modifying backend code.
- **Dynamic Scaling**: Additional worker containers can be attached at runtime using `docker compose up --scale worker-1=4 -d`.

### C. Fair Load Distribution
- **Fair Prefetch (`worker_prefetch_multiplier = 1`)**: By default, Celery prefetches multiple tasks per worker, which can lead to workload skew if tasks have varying processing times. Setting prefetch to 1 ensures that fast-finishing workers immediately pull the next task from the broker rather than waiting for slow workers to drain queues.

### D. Fault Tolerance & Idempotent Retry Semantics
- **Late Acknowledgements (`task_acks_late = True`)**: A task is acknowledged to Redis only **after** the processed image has been successfully written to disk and verified.
- **Worker Crash Recovery (`task_reject_on_worker_lost = True`)**: If a worker node is killed or crashes mid-execution, unacknowledged tasks are automatically rejected back to the Redis queue and reclaimed by surviving nodes.
- **Idempotency Guarantee**: If a task is retried after a partial failure, previous partial outputs for that `task_id` are purged before new operations begin, preventing duplicate artifacts or corrupted file overwrites.

### E. Amdahl's Law & Parallel Efficiency
The system implements a benchmark runner that evaluates execution timings with 1, 2, and 4 workers on an identical workload:
$$\text{Speedup } S(N) = \frac{T(1)}{T(N)}$$
$$\text{Efficiency } E(N) = \frac{S(N)}{N} \times 100\%$$
- **Amdahl's Law Observation**: Even with perfectly parallelizable image tasks, speedup is bounded by serial components: upload I/O, Redis queue round-trips, and disk write operations. The empirical results demonstrate ~1.91x speedup on 2 workers and ~3.54x speedup on 4 workers.

---

## 3. System Architecture & Pipeline

```
[React 19 Frontend SPA]
         |
         | HTTP REST (Uploads, Batches, Tasks, Metrics)
         v
[FastAPI Gateway] <=========================> [Shared Storage]
         |                                           ^
         | (1) Metadata State                        | (3) File Read/Write
         v                                           |
    [MongoDB 7]                                      v
         ^                              [Celery Worker Nodes (1..N)]
         | (4) Completed Status                      ^
         +-------------------------------------------+
                                                     | (2) Job Dispatch
                                               [Redis Broker]
```

---

## 4. Technology Stack & Rationale

| Layer | Technology | Key Selection Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite + TypeScript | Modern, type-safe SPA with fast HMR and optimized production bundle |
| **Styling** | Tailwind CSS v3 | Utility-first responsive design, dark navy dashboard theme |
| **Icons & Charts**| Lucide React + Recharts | Lightweight scalable icons and responsive SVG data visualizations |
| **API Server** | Python FastAPI + Motor | Non-blocking async I/O, native Pydantic validation, auto OpenAPI docs |
| **Queue / Broker**| Redis 7 | High-performance in-memory broker with native list data structures |
| **Workers** | Celery 5 + PyMongo | Industry-standard distributed task execution with mature retry hooks |
| **Image Engine** | Pillow (PIL) 10 | Comprehensive image manipulation, format transcoding, and metadata extraction |
| **Database** | MongoDB 7 | Flexible schema for nested task configs, operations lists, and outputs |
| **Containerization**| Docker & Docker Compose | Repeatable multi-container orchestration across local and cloud environments |

---

## 5. Security & Boundary Guardrails

1. **Path Traversal Defense**: All file paths are strictly resolved against the absolute base storage directory. Filenames are sanitized with regex to remove directory traversal characters (`../`, `..\\`).
2. **File Validation & Byte Sniffing**: Files are verified using Pillow's `verify()` and format validation rather than relying on untrusted client `Content-Type` headers.
3. **Upload Constraints**: Enforced 20MB file size limit and 10,000px maximum dimension boundary to prevent decompression bomb attacks (Pixel Floods).
4. **Isolated Networking**: Redis and MongoDB services are contained within a private Docker bridge network (`cdc-net`) without public exposure.

---

## 6. Verification & Test Suite Summary

The project includes an automated test suite implemented in `pytest`:
- **Total Tests Executed**: 21
- **Passed**: 21 (100%)
- **Test Categories**:
  - Image processing operations (all 8 Pillow operations verified)
  - Corrupted file rejection
  - Format conversions (PNG transparent to JPEG, JPEG to WebP)
  - Endpoint health checks and error handling
  - Task pagination, filters, and 404 handlers
  - Worker inspect endpoints and broker queue lengths

---

## 7. Lessons Learned & Distributed Tradeoffs

1. **Synchronous vs. Asynchronous Database Drivers**: While FastAPI excels with `motor` (async I/O), Celery workers run synchronously in child processes. Supplying synchronous `pymongo` connections to Celery workers resolved event loop lockups while maintaining clean async API handlers.
2. **Worker Prefetching Balance**: A high prefetch multiplier harms distributed workload balancing when task processing times differ significantly. Setting `worker_prefetch_multiplier = 1` achieved equitable load sharing.
3. **Shared Storage vs. Object Storage**: Docker shared volumes are ideal for single-host local development, while S3 provides true multi-node scaling across separate cloud VMs. Implementing a swappable storage interface enabled seamless transition between local and cloud modes.
