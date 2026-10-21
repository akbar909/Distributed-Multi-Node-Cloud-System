"""Performance benchmarking API for measuring parallel execution speedup and efficiency."""

import time
import uuid
import asyncio
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from app.database import get_database, get_sync_database
from app.models.task import ImageOperation, ProcessingConfig
from app.models.benchmark import BenchmarkStatus, BenchmarkRun
from app.services.storage import storage_service
from app.services.image_processor import image_processor

router = APIRouter()


class BenchmarkRequest(BaseModel):
    file_refs: List[str]
    operations: List[ImageOperation]
    config: ProcessingConfig = ProcessingConfig()
    iterations_per_run: int = 4  # Repeat workload to get reliable execution timings


def execute_workload_worker(args):
    """Worker task executed in benchmark worker thread/process."""
    rel_path, operations, config_dict = args
    abs_path = storage_service.get_file_absolute_path(rel_path)
    if not abs_path.exists():
        return False, 0.0

    with open(abs_path, "rb") as f:
        img_bytes = f.read()

    t0 = time.perf_counter()
    for op in operations:
        if op == ImageOperation.RESIZE:
            image_processor.resize(img_bytes, config_dict.get("width") or 800, config_dict.get("height") or 600)
        elif op == ImageOperation.THUMBNAIL:
            image_processor.thumbnail(img_bytes, config_dict.get("thumbnail_size") or 256)
        elif op == ImageOperation.COMPRESS:
            image_processor.compress(img_bytes, config_dict.get("quality") or 80)
        elif op == ImageOperation.CONVERT:
            image_processor.convert_format(img_bytes, config_dict.get("format") or "webp")
        elif op == ImageOperation.ROTATE:
            image_processor.rotate(img_bytes, config_dict.get("rotate_angle") or 90)
        elif op == ImageOperation.GRAYSCALE:
            image_processor.grayscale(img_bytes)
        elif op == ImageOperation.BLUR:
            image_processor.blur(img_bytes, float(config_dict.get("blur_radius") or 2.0))
        elif op == ImageOperation.METADATA:
            image_processor.extract_metadata(img_bytes)

    duration = time.perf_counter() - t0
    return True, duration


def run_benchmark_job(benchmark_id: str, file_rel_paths: List[str], operations: List[str], config_dict: dict, iterations: int):
    """Run real parallel benchmark comparing 1, 2, and 4 concurrent workers."""
    from concurrent.futures import ThreadPoolExecutor

    db = get_sync_database()
    runs = []

    # Build test workload items (repeat file refs to create a sufficient workload)
    workload = []
    for _ in range(iterations):
        for path in file_rel_paths:
            workload.append((path, operations, config_dict))

    total_tasks = len(workload)
    base_wall_time = None

    for worker_count in [1, 2, 4]:
        t_start = time.perf_counter()
        durations = []
        failures = 0

        # Execute using real thread pool matching worker count
        with ThreadPoolExecutor(max_workers=worker_count) as executor:
            results = list(executor.map(execute_workload_worker, workload))

        wall_time = round(time.perf_counter() - t_start, 3)
        if wall_time <= 0:
            wall_time = 0.001

        for success, dur in results:
            if success:
                durations.append(dur)
            else:
                failures += 1

        avg_dur = round(sum(durations) / len(durations), 3) if durations else 0.0
        throughput = round(total_tasks / wall_time, 2)

        if worker_count == 1:
            base_wall_time = wall_time
            speedup = 1.0
            efficiency = 100.0
        else:
            speedup = round(base_wall_time / wall_time, 2) if base_wall_time and wall_time > 0 else 1.0
            efficiency = round((speedup / worker_count) * 100.0, 1)

        runs.append({
            "worker_count": worker_count,
            "wall_time": wall_time,
            "throughput": throughput,
            "avg_duration": avg_dur,
            "failures": failures,
            "speedup": speedup,
            "efficiency": efficiency,
        })

    # Save completed benchmark
    db.benchmarks.update_one(
        {"benchmark_id": benchmark_id},
        {
            "$set": {
                "status": BenchmarkStatus.COMPLETED,
                "runs": runs,
                "completed_at": datetime.now(timezone.utc),
            }
        },
    )


@router.post("/benchmarks", status_code=status.HTTP_202_ACCEPTED)
async def create_benchmark(
    request: BenchmarkRequest,
    background_tasks: BackgroundTasks,
):
    """Start a real multi-worker performance benchmark (1, 2, 4 workers) on the uploaded images."""
    if not request.file_refs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file references provided for benchmark.",
        )
    if not request.operations:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one image operation must be specified for benchmark.",
        )

    db = get_database()
    file_rel_paths = []

    for ref_id in request.file_refs:
        ref_dir = storage_service.originals_dir / ref_id
        if ref_dir.exists():
            files = list(ref_dir.iterdir())
            if files:
                file_rel_paths.append(f"originals/{ref_id}/{files[0].name}")

    if not file_rel_paths:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded files could not be found.",
        )

    benchmark_id = str(uuid.uuid4())
    doc = {
        "benchmark_id": benchmark_id,
        "status": BenchmarkStatus.RUNNING,
        "runs": [],
        "created_at": datetime.now(timezone.utc),
        "completed_at": None,
    }
    await db.benchmarks.insert_one(doc)

    # Launch benchmark in background task
    background_tasks.add_task(
        run_benchmark_job,
        benchmark_id,
        file_rel_paths,
        [op.value for op in request.operations],
        request.config.model_dump(),
        max(1, min(request.iterations_per_run, 10)),
    )

    return {
        "benchmark_id": benchmark_id,
        "status": "running",
        "message": "Benchmark initiated across 1, 2, and 4 worker configurations.",
    }


@router.get("/benchmarks")
async def list_benchmarks():
    """List recent performance benchmarks."""
    db = get_database()
    cursor = db.benchmarks.find({}, {"_id": 0}).sort("created_at", -1).limit(20)
    benchmarks = await cursor.to_list(length=20)
    for b in benchmarks:
        if isinstance(b.get("created_at"), datetime):
            b["created_at"] = b["created_at"].isoformat()
        if isinstance(b.get("completed_at"), datetime):
            b["completed_at"] = b["completed_at"].isoformat()
    return {"items": benchmarks}


@router.get("/benchmarks/{benchmark_id}")
async def get_benchmark(benchmark_id: str):
    """Retrieve benchmark results and speedup/efficiency metrics."""
    db = get_database()
    benchmark = await db.benchmarks.find_one({"benchmark_id": benchmark_id}, {"_id": 0})
    if not benchmark:
        raise HTTPException(status_code=404, detail="Benchmark not found.")

    if isinstance(benchmark.get("created_at"), datetime):
        benchmark["created_at"] = benchmark["created_at"].isoformat()
    if isinstance(benchmark.get("completed_at"), datetime):
        benchmark["completed_at"] = benchmark["completed_at"].isoformat()

    return benchmark
