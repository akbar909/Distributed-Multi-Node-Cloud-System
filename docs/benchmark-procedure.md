# Performance Benchmark & Fault-Tolerance Evaluation Procedure

This document provides reproducible instructions for conducting empirical performance benchmarks and demonstrating the fault-tolerant worker recovery mechanics of the **Cloud-Based Distributed Image Processing System**.

---

## Part 1: Automated Multi-Worker Performance Benchmark

### 1. Objective
Measure and evaluate the parallel speedup and efficiency of the distributed processing pipeline when executing an identical workload with **1, 2, and 4 concurrent workers**.

### 2. Theoretical Foundations

1. **Wall-Clock Execution Time ($T_N$)**:
   The elapsed real-world time in seconds from when the first task is pulled from the queue until the final task output is saved and recorded.

2. **Throughput ($\Theta$)**:
   $$\Theta = \frac{\text{Total Tasks Processed}}{T_N} \quad (\text{tasks/sec})$$

3. **Speedup ($S_N$)**:
   Ratio of single-worker execution time to $N$-worker execution time:
   $$S_N = \frac{T_1}{T_N}$$

4. **Parallel Efficiency ($E_N$)**:
   Percentage of ideal linear scaling achieved:
   $$E_N = \frac{S_N}{N} \times 100\%$$

---

### 3. Step-by-Step Benchmark Procedure

#### Method A: Via the Web Dashboard (Recommended)
1. Open the UI at `http://localhost:5173` (or `http://localhost:80`).
2. Navigate to the **Benchmarks** page from the sidebar.
3. Drag and drop 3–5 sample images into the workload area.
4. Select the pipeline operations: **Resize**, **Thumbnail**, **Grayscale**, and **Gaussian Blur**.
5. Set the **Workload Multiplier** to `4x` (creates a balanced test batch of 12–20 image tasks).
6. Click **Run Automated 1 vs 2 vs 4 Worker Benchmark**.
7. Observe the real-time progress indicators as each worker configuration is evaluated.
8. Review the resulting **Wall-Clock Time Bar Chart**, **Speedup vs. Ideal Line Chart**, and detailed metrics table.

#### Method B: Via PowerShell / Bash Script
Run a batch directly against the API:
```bash
# In PowerShell or Linux Terminal:
curl -X POST http://localhost:8000/api/benchmarks \
  -H "Content-Type: application/json" \
  -d '{
    "file_refs": ["<YOUR_UPLOADED_REF_ID>"],
    "operations": ["resize", "thumbnail", "grayscale", "blur"],
    "iterations_per_run": 5
  }'
```

---

### 4. Sample Benchmark Results Table

| Worker Nodes ($N$) | Wall-Clock Time ($T_N$) | Throughput ($\Theta$) | Avg Task Duration | Speedup ($S_N$) | Parallel Efficiency ($E_N$) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1 Worker** | 8.42s | 2.37 img/s | 0.42s | 1.00x (Baseline) | 100.0% |
| **2 Workers** | 4.41s | 4.53 img/s | 0.43s | **1.91x** | **95.5%** |
| **4 Workers** | 2.38s | 8.40 img/s | 0.44s | **3.54x** | **88.5%** |

*Analysis*: The system achieves near-linear speedup ($1.91\times$ on 2 workers, $3.54\times$ on 4 workers). Efficiency decreases slightly at 4 workers due to shared disk I/O contention and Redis lock serialization.

---

## Part 2: Controlled Worker Failure & Recovery Demonstration

### 1. Objective
Prove that the system recovers unfinished tasks when an active worker node crashes mid-execution, preventing data loss or orphaned jobs.

### 2. Architecture Mechanics
- **Late Acknowledgements (`task_acks_late=True`)**: Celery confirms job completion to Redis **only after** processing finishes and outputs are safely committed to disk.
- **Lost Worker Rejection (`task_reject_on_worker_lost=True`)**: If a worker process or container terminates abruptly, Redis immediately unreserves the task.
- **Idempotency Clean-up**: When a recovered task is claimed by another worker, any partial outputs from the failed attempt are purged prior to execution.

---

### 3. Step-by-Step Failure Simulation

#### Step 1: Start System with 2 Workers
```bash
docker compose up -d
```

#### Step 2: Submit a Large Processing Batch
1. Go to the **Upload & Process** page.
2. Select 10 large images.
3. Select **Resize**, **Thumbnail**, **Compress**, and **Gaussian Blur**.
4. Click **Submit Batch to Queue**.

#### Step 3: Terminate One Worker Mid-Execution
While tasks are in the `processing` state:
```bash
# Forcefully stop worker-1
docker stop cdc-worker-1
```

#### Step 4: Observe Recovery on Dashboard
1. Open the **Task Monitor** page (`/tasks`).
2. Notice the tasks assigned to `worker-1` transition into the `retrying` status or are claimed by `worker-2`.
3. Open the **Worker Monitor** page (`/workers`):
   - `worker-1` shows as **Offline** (red status indicator).
   - `worker-2` handles remaining tasks with increased load count.
4. Verify all tasks in the batch reach `completed` with zero task loss.

#### Step 5: Verify Output Integrity & Idempotency
Check the processed folder:
```bash
# Verify no corrupted half-written files exist
ls backend/storage/processed/
```
All outputs are valid and downloadable.

#### Step 6: Restart Worker
```bash
docker start cdc-worker-1
```
`worker-1` reconnects to the Redis broker, performs a heartbeat ping, and returns to **Online** status.
