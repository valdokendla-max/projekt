from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from worker import execute_service_job, resolve_service_storage


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


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "ok": True,
        "storageRoot": str(local_storage_root),
    }


@app.post("/process")
def process_image(payload: ProcessRequest) -> dict[str, object]:
    storage = resolve_service_storage(
        local_storage_root=local_storage_root,
        storage_backend=payload.storage_backend,
    )
    result = execute_service_job(
        job_id=payload.job_id,
        requested_mode=payload.requested_mode,
        output_prefix=payload.output_prefix,
        source_url=payload.source_url,
        source_data_url=payload.source_data_url,
        storage=storage,
    )
    return result.to_dict()