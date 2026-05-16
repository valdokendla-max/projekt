from __future__ import annotations

import base64
import os
import tempfile
from pathlib import Path
from urllib.request import urlopen

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from storage import CloudStorage, LocalStorage, VercelBlobStorage
from worker import WorkerJob, execute_job


class ProcessRequest(BaseModel):
    job_id: str = Field(..., alias="jobId")
    requested_mode: str = Field(default="threshold", alias="requestedMode")
    output_prefix: str | None = Field(default=None, alias="outputPrefix")
    source_url: str | None = Field(default=None, alias="sourceUrl")
    source_data_url: str | None = Field(default=None, alias="sourceDataUrl")
    storage_backend: str | None = Field(default=None, alias="storageBackend")

    model_config = {
        "populate_by_name": True,
    }


local_storage_root = Path(
    os.getenv(
        "IMAGE_OPTIMIZER_LOCAL_STORAGE_DIR",
        Path(__file__).resolve().parent / "storage",
    )
)
local_storage_root.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Image Optimizer Worker", version="1.0.0")
app.mount("/files", StaticFiles(directory=local_storage_root), name="files")


def resolve_storage(storage_backend: str | None, local_root: Path) -> CloudStorage:
    if storage_backend == "vercel-blob":
        token = os.getenv("BLOB_READ_WRITE_TOKEN", "")
        return VercelBlobStorage(token=token)
    return LocalStorage(
        root_dir=local_root,
        public_base_url=os.getenv("WORKER_PUBLIC_URL", ""),
    )


def load_source_bytes(source_url: str | None, source_data_url: str | None) -> bytes:
    if source_data_url:
        data = source_data_url.split(",", 1)[1] if "," in source_data_url else source_data_url
        return base64.b64decode(data)
    if source_url:
        with urlopen(source_url, timeout=30) as response:  # noqa: S310
            return response.read()
    raise ValueError("Either sourceUrl or sourceDataUrl must be provided.")


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "ok": True,
        "storageRoot": str(local_storage_root),
    }


@app.post("/process")
def process_image(payload: ProcessRequest) -> dict[str, object]:
    source_bytes = load_source_bytes(payload.source_url, payload.source_data_url)
    storage = resolve_storage(payload.storage_backend, local_storage_root)
    prefix = payload.output_prefix or payload.job_id

    with tempfile.TemporaryDirectory() as tmp_dir:
        source_path = Path(tmp_dir) / "source.png"
        output_dir = Path(tmp_dir) / "output"
        source_path.write_bytes(source_bytes)

        job = WorkerJob(
            job_id=payload.job_id,
            source_path=str(source_path),
            target_path=str(output_dir),
            requested_mode=payload.requested_mode,
        )
        result = execute_job(job)

        normalized = storage.save_bytes(
            f"{prefix}/normalized.png",
            Path(result.normalized_path).read_bytes(),
            "image/png",
        )
        optimized = storage.save_bytes(
            f"{prefix}/optimized.png",
            Path(result.optimized_path).read_bytes(),
            "image/png",
        )
        preview = storage.save_bytes(
            f"{prefix}/preview.png",
            Path(result.preview_path).read_bytes(),
            "image/png",
        )

    return {
        "ok": True,
        "jobId": result.job_id,
        "width": result.width,
        "height": result.height,
        "notes": result.notes,
        "normalizedUrl": normalized.location,
        "optimizedUrl": optimized.location,
        "previewUrl": preview.location,
    }
