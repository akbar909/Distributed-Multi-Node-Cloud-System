# Cloud-Based Distributed Image Processing & Task Scheduling System

> **Subject**: Cloud and Distributed Computing (CDC)  
> **Architecture**: Distributed Multi-Node Cloud System  
> **Stack**: React 19 (TypeScript + Vite + Tailwind) · FastAPI · Celery · Redis · MongoDB · Docker · AWS EC2 · Amazon S3

---

## 1. Project Overview

This project is a production-minded **Cloud-Based Distributed Image Processing and Task Scheduling System** built for the university course **Cloud and Distributed Computing (CDC)**.

Instead of processing compute-intensive image operations synchronously on a web server (which freezes web applications, wastes CPU, and causes timeouts), this system uses an **asynchronous distributed message-queue architecture**. 

When a user uploads a batch of images:
1. The **API Gateway** validates the files and stores them in shared storage without blocking.
2. An individual **Task ID** is generated for every image and dispatched into a **Redis Message Queue**.
3. Multiple **Distributed Celery Worker Nodes** (running across local containers or separate AWS EC2 cloud instances) pull jobs from the queue in parallel.
4. Each worker processes the requested operations (resizing, filters, compression, format transcoding), saves outputs, records duration metrics, and updates **MongoDB**.
5. The **React Dashboard** visualizes real-time status, worker health, queue depth, throughput charts, and speedup benchmarks.

---

## 2. Core Distributed Computing (CDC) Concepts Demonstrated

| Concept | Implementation in this Project |
| :--- | :--- |
| **Asynchronous Task Decoupling** | FastAPI never processes images synchronously; jobs are enqueued in Redis with immediate non-blocking HTTP 201/202 responses. |
| **Horizontal Worker Scaling** | Add more worker nodes across EC2 instances or Docker containers (`--scale worker-1=4`) to increase throughput dynamically with zero downtime. |
| **Fair Load Distribution** | Celery is configured with `worker_prefetch_multiplier = 1` so fast-finishing workers instantly pull the next task from the broker rather than hoarding jobs. |
| **Fault Tolerance & Late ACKs** | Configured with `task_acks_late = True` and `task_reject_on_worker_lost = True`. If an EC2 worker node crashes mid-execution, the unacknowledged task is automatically re-queued and completed by a surviving worker. |
| **Idempotency** | Partial files from a failed attempt are cleared before re-running, ensuring no duplicate outputs or corrupted files on retry. |
| **Payload Discipline** | Binary image files are **never** stored in Redis; only task IDs are transmitted across the broker. Files are stored in shared storage (Docker Volume / Amazon S3). |
| **Amdahl's Law & Speedup** | An automated benchmark suite compares 1, 2, and 4 workers, calculating empirical wall-clock time ($T_N$), speedup ($S_N = T_1 / T_N$), and parallel efficiency ($E_N$). |

---

## 3. Distributed Architecture Diagram

```
                                      +------------------------------------+
                                      |          React 19 Frontend         |
                                      |   (Vite + TypeScript + Tailwind)   |
                                      +-----------------+------------------+
                                                        |
                                              HTTP / REST API Calls
                                                        |
                                                        v
                                      +-----------------+------------------+
                                      |         FastAPI Gateway            |
                                      |    (Validation + Auth + CRUD)      |
                                      +--------+--------+---------+--------+
                                               |        |         |
                          +--------------------+        |         +-------------------+
                          | Metadata & State            | Task Enqueue                | Binary Files
                          v                             v                             v
               +----------+---------+         +---------+---------+        +----------+---------+
               |      MongoDB       |         |   Redis Broker    |        |   Shared Storage   |
               | (Tasks, Batches,   |         |   (Task Queue     |        | (Docker Volume or  |
               |  Benchmarks)       |         |   & Results)      |        |  AWS S3 Bucket)    |
               +----------+---------+         +---------+---------+        +----------+---------+
                          ^                             |                             ^
                          |                             | Pull Jobs (Fair Prefetch)   | Read/Write
                          |                             v                             |
                          |                   +---------+---------+                   |
                          +-------------------|   Celery Worker   |-------------------+
                          | Updates State     |  Nodes (1..N)     |
                          +-------------------|  (Pillow Engine)  |-------------------+
```

---

## 4. Supported Image Processing Operations

The worker nodes support 8 independent operations via Pillow:

1. **Resize**: High-quality Lanczos resampling to explicit width and height.
2. **Thumbnail**: Proportional aspect-ratio constrained downsampling within a bounding box (default 256px).
3. **Compress**: Adjustable quality factor (1–100%) with format-specific optimizations.
4. **Convert Format**: Seamless transcoding between JPEG, PNG, and WebP (handles transparency).
5. **Rotate**: Geometric rotation (90°, 180°, 270°, or custom angle) with canvas expansion.
6. **Grayscale**: Color channel removal to 8-bit monochrome luminance (`L` mode).
7. **Gaussian Blur**: Convolution filter with customizable pixel blur radius.
8. **Metadata Extraction**: Extracts dimensions, color mode, aspect ratio, file size, and embedded EXIF tags into downloadable JSON artifacts.

---

## 5. Web Dashboard Features

- **Dashboard**: Real-time throughput cards, 24h processing volume area chart, worker utilization bar chart, recent task stream.
- **Upload & Process**: Accessible drag-and-drop zone, multi-image preview, operation selector, dynamic settings controls, upload progress bar.
- **Task Monitor**: Filterable and searchable task table, task inspection modal with original vs. processed previews, metadata viewer, retry action, and single/ZIP download triggers.
- **Worker Monitor**: Live Celery cluster inspection, Redis queue depth card, throughput gauges, worker heartbeats, and remote pause/resume controls.
- **Performance Benchmark**: Empirical benchmark comparison across 1, 2, and 4 workers, calculating wall-clock execution time ($T_N$), throughput ($\Theta$), speedup ($S_N$), and efficiency ($E_N$).
- **Task History**: Batch history cards with progress indicators, image preview strips, and complete batch ZIP downloads.

---

## 6. Cloud Deployment Architecture (AWS EC2)

In Cloud Mode, the system runs across separate AWS EC2 instances:

```
                      Internet
                         │
                         ▼ (Port 80 / 443)
              ┌───────────────────────┐
              │    EC2 Instance #1    │  <-- Master Node ("cdc-master-node")
              │  • React SPA (Nginx)  │      Public IP: e.g., 54.242.75.198
              │  • FastAPI Gateway    │
              │  • Redis Broker       │
              └──────────┬────────────┘
                         │
      Private VPC Subnet │ (Port 6379 - Private IP: 172.31.x.x)
      ───────────────────┴───────────────────────────
                         │
                         ▼
              ┌───────────────────────┐
              │    EC2 Instance #2    │  <-- Worker Node ("cdc-worker-1")
              │  • Celery Worker      │      Dedicated exclusively to CPU-bound
              │    (2 to 8 threads)   │      Pillow image transformations
              └──────────┬────────────┘
                         │
                         ▼
              ┌───────────────────────┐
              │   Shared Storage      │  <-- Docker Volume or Amazon S3 Bucket
              │ (Originals & Outputs) │
              └───────────────────────┘
```

- **`cdc-master-node`** (EC2 Instance 1): Runs the Nginx Frontend on Port 80, FastAPI Gateway on Port 8000, MongoDB, and Redis broker.
- **`cdc-worker-1`** (EC2 Instance 2): Dedicated worker machine connected to Master's Redis private IP.
- The sidebar displays a **"Cloud Deployment"** badge with a pulsing blue light when in cloud mode.

---

## 7. Repository Structure

```
project/
├── backend/
│   ├── app/
│   │   ├── api/                   # REST API routes (health, uploads, batches, tasks, workers, metrics, benchmarks)
│   │   ├── models/                # Pydantic schemas (Task, Batch, Benchmark, Worker)
│   │   ├── services/              # StorageService (local/S3) and Pillow ImageProcessor
│   │   ├── tasks/                 # Celery app configuration and image processing tasks
│   │   ├── config.py              # Environment configuration loader
│   │   ├── database.py            # Motor (async) and PyMongo (sync) database handlers
│   │   └── main.py                # FastAPI application entrypoint
│   ├── tests/                     # 21 automated pytest integration/unit tests
│   ├── Dockerfile                 # Backend Python 3.11 container
│   └── requirements.txt           # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── api/                   # Typed Axios API client
│   │   ├── components/            # UI components (dashboard, tasks, upload, history, benchmarks)
│   │   ├── hooks/                 # Reusable polling and state hooks
│   │   ├── pages/                 # Full dashboard pages
│   │   └── types/                 # TypeScript type interfaces
│   ├── Dockerfile                 # Multi-stage production Nginx container
│   ├── nginx.conf                 # SPA routing and API reverse-proxy configuration
│   └── package.json               # Node.js dependencies
├── docs/
│   ├── architecture.md            # Detailed system architecture
│   ├── api.md                     # Comprehensive REST API reference
│   ├── deployment-aws.md          # Step-by-step AWS EC2 deployment guide
│   ├── benchmark-procedure.md     # Benchmark & controlled failure procedure
│   └── project-report.md          # Academic CDC project report
├── docker-compose.yml             # Local multi-service orchestration
├── docker-compose.cloud.yml       # Cloud AWS production configuration
├── .env.example                   # Environment configuration template
└── README.md                      # Project documentation
```

---

## 8. Exact Start & Stop Commands

### A. Running on AWS Cloud (EC2)

#### 1. Starting on Master Node (`cdc-master-node`):
SSH into your Master EC2 instance:
```bash
ssh -i cdc-project-key.pem ubuntu@<MASTER_PUBLIC_IP>
```
Run all master services (Redis, MongoDB, API, Frontend, and local workers):
```bash
cd ~/project
docker compose up -d
```
Access the dashboard in your browser:
👉 **`http://<MASTER_PUBLIC_IP>`**

#### 2. Starting on Worker Node (`cdc-worker-1`):
SSH into your Worker EC2 instance:
```bash
ssh -i cdc-project-key.pem ubuntu@<WORKER_PUBLIC_IP>
```
Start the worker processes (pointing to Master's private Redis IP in `.env`):
```bash
cd ~/project
docker compose up -d worker-1 worker-2
```

#### 3. Stopping Services on AWS:
```bash
cd ~/project
docker compose stop
```

#### 4. Horizontally Scaling Workers on AWS:
Scale workers up to 8 parallel instances with a single command:
```bash
docker compose up --scale worker-1=8 -d
```

---

### B. Running Locally on Your PC (Windows / Linux)

#### 1. Start with Docker Compose (Recommended):
```powershell
cd d:\uni\CDC\project

# Start everything (Frontend, API, Redis, MongoDB, 2 Workers)
docker compose up -d
```
- **Web Dashboard**: [http://localhost](http://localhost)
- **FastAPI Interactive Docs**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

#### 2. Stop Local Docker:
```powershell
docker compose down
```

#### 3. Running Directly (Without Docker):
If running without Docker, open 3 separate terminals:

```powershell
# Terminal 1: Backend API
cd d:\uni\CDC\project\backend
$env:PYTHONPATH="."
py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Celery Worker
cd d:\uni\CDC\project\backend
$env:PYTHONPATH="."
py -m celery -A app.tasks.celery_app worker -Q default -c 2 -n worker-1@%h --loglevel=info -P threads

# Terminal 3: Frontend
cd d:\uni\CDC\project\frontend
npm run dev
# Accessible at: http://localhost:5173
```

---

### C. Running Automated Tests

Run the test suite verifying all 8 image operations, uploads, and endpoints:
```powershell
# Windows PowerShell
cd d:\uni\CDC\project
$env:PYTHONPATH="backend"
py -m pytest backend/tests -v

# Linux / EC2
cd ~/project
PYTHONPATH=backend pytest backend/tests -v
```
**Test Result**: `21 passed, 0 failed` (100% pass rate).
