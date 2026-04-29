from __future__ import annotations

import argparse
import base64
import io
import json
import os
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Literal

import requests
from PIL import Image, ImageFile, ImageFilter, ImageOps, ImageStat

from storage import CloudStorage, LocalStorage, StoredAsset, VercelBlobStorage

StageName = Literal[
    "normalize",
    "denoise",
    "contrast",
    "classify",
    "select_mode",
    "process_branch",
    "line_density",
    "simulate",
    "export_preview",
]


@dataclass(slots=True)
class WorkerJob:
    job_id: str
    source_path: str = ""
    source_url: str = ""
    source_data_url: str = ""
    target_path: str = ""
    output_prefix: str = ""
    preset_summary: str = ""
    requested_mode: str = "auto"


@dataclass(slots=True)
class WorkerPlan:
    job_id: str
    stages: list[StageName] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


@dataclass(slots=True)
class WorkerResult:
    job_id: str
    normalized_asset: StoredAsset
    optimized_asset: StoredAsset
    preview_asset: StoredAsset
    normalized_path: str
    optimized_path: str
    preview_path: str
    width: int
    height: int
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, object]:
        payload = asdict(self)
        payload["normalized_asset"] = self.normalized_asset.to_dict()
        payload["optimized_asset"] = self.optimized_asset.to_dict()
        payload["preview_asset"] = self.preview_asset.to_dict()
        return payload


def decode_data_url(data_url: str) -> tuple[str, bytes]:
    header, encoded = data_url.split(",", 1)
    media_type = header.split(";", 1)[0].split(":", 1)[1] if ":" in header else "application/octet-stream"
    return media_type, base64.b64decode(encoded)


def load_source_bytes(job: WorkerJob) -> bytes:
    if job.source_data_url:
        _, payload = decode_data_url(job.source_data_url)
        return payload

    if job.source_url:
        response = requests.get(job.source_url, timeout=60)
        response.raise_for_status()
        return response.content

    if job.source_path:
        return Path(job.source_path).read_bytes()

    raise ValueError("Source input is missing.")


def load_source_image(payload: bytes) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(payload))
        image = ImageOps.exif_transpose(image)
    except OSError as error:
        if "broken data stream" not in str(error).lower():
            raise

        previous_setting = ImageFile.LOAD_TRUNCATED_IMAGES
        try:
            ImageFile.LOAD_TRUNCATED_IMAGES = True
            image = Image.open(io.BytesIO(payload))
            image = ImageOps.exif_transpose(image)
        finally:
            ImageFile.LOAD_TRUNCATED_IMAGES = previous_setting

    if image.mode in {"RGBA", "LA"} or (image.mode == "P" and "transparency" in image.info):
        background = Image.new("RGBA", image.size, (255, 255, 255, 255))
        image = Image.alpha_composite(background, image.convert("RGBA")).convert("RGB")
    else:
        image = image.convert("RGB")

    return image


def normalize_image(image: Image.Image) -> Image.Image:
    grayscale = ImageOps.grayscale(image)
    denoised = grayscale.filter(ImageFilter.MedianFilter(size=3))
    return ImageOps.autocontrast(denoised)


def resolve_threshold(image: Image.Image) -> int:
    stats = ImageStat.Stat(image)
    mean = stats.mean[0]
    stdev = stats.stddev[0]
    threshold = int(max(96, min(184, mean + stdev * 0.18)))
    return threshold


def process_for_mode(image: Image.Image, requested_mode: str) -> tuple[Image.Image, list[str]]:
    notes: list[str] = []
    if requested_mode == "dither":
        notes.append("Applied Floyd-Steinberg dithering for photographic tonal retention.")
        return image.convert("1", dither=Image.FLOYDSTEINBERG).convert("L"), notes

    threshold = resolve_threshold(image)
    thresholded = image.point(lambda pixel: 255 if pixel >= threshold else 0, mode="L")

    if requested_mode == "vector":
        notes.append("Applied hard threshold preview for vector-friendly edge isolation.")
    else:
        notes.append(f"Applied deterministic threshold at {threshold}.")

    return thresholded, notes


def build_preview_image(image: Image.Image) -> Image.Image:
    return image.filter(ImageFilter.SHARPEN)


def serialize_png(image: Image.Image) -> bytes:
    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def execute_job(job: WorkerJob, storage: CloudStorage) -> WorkerResult:
    source_image = load_source_image(load_source_bytes(job))
    normalized = normalize_image(source_image)
    optimized, process_notes = process_for_mode(normalized, job.requested_mode)
    preview = build_preview_image(optimized)

    output_prefix = (job.output_prefix or job.job_id).strip("/") or job.job_id
    normalized_asset = storage.save_bytes(
        f"{output_prefix}/normalized.png",
        serialize_png(normalized),
        "image/png",
    )
    optimized_asset = storage.save_bytes(
        f"{output_prefix}/optimized.png",
        serialize_png(optimized),
        "image/png",
    )
    preview_asset = storage.save_bytes(
        f"{output_prefix}/preview.png",
        serialize_png(preview),
        "image/png",
    )

    notes = [
        "Deterministic preprocessing completed with Pillow.",
        *process_notes,
    ]

    return WorkerResult(
        job_id=job.job_id,
        normalized_asset=normalized_asset,
        optimized_asset=optimized_asset,
        preview_asset=preview_asset,
        normalized_path=normalized_asset.location,
        optimized_path=optimized_asset.location,
        preview_path=preview_asset.location,
        width=source_image.width,
        height=source_image.height,
        notes=notes,
    )


def resolve_service_storage(
    *,
    local_storage_root: str | Path,
    storage_backend: str | None = None,
) -> CloudStorage:
    resolved_backend = storage_backend or os.getenv("IMAGE_OPTIMIZER_STORAGE")
    blob_token = os.getenv("BLOB_READ_WRITE_TOKEN", "")

    if resolved_backend == "vercel-blob" or (not resolved_backend and blob_token):
        if not blob_token:
            raise ValueError("BLOB_READ_WRITE_TOKEN is required for vercel-blob storage.")
        return VercelBlobStorage(
            token=blob_token,
            access=os.getenv("IMAGE_OPTIMIZER_BLOB_ACCESS", "private"),
            api_base_url=os.getenv("IMAGE_OPTIMIZER_BLOB_API_URL", "https://vercel.com/api/blob"),
            add_random_suffix=os.getenv("IMAGE_OPTIMIZER_ADD_RANDOM_SUFFIX", "true").lower() != "false",
        )

    return LocalStorage(
        root_dir=local_storage_root,
        public_base_url=os.getenv("IMAGE_OPTIMIZER_PUBLIC_BASE_URL", "http://localhost:8000"),
    )


def execute_service_job(
    *,
    job_id: str,
    requested_mode: str,
    output_prefix: str | None,
    source_url: str | None,
    source_data_url: str | None,
    storage: CloudStorage,
) -> WorkerResult:
    if not source_url and not source_data_url:
        raise ValueError("Either sourceUrl or sourceDataUrl must be provided.")

    job = WorkerJob(
        job_id=job_id,
        source_url=source_url or "",
        source_data_url=source_data_url or "",
        requested_mode=requested_mode,
        output_prefix=output_prefix or job_id,
    )
    return execute_job(job, storage)


def parse_args() -> WorkerJob:
    parser = argparse.ArgumentParser(description="Deterministic image optimizer worker")
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--requested-mode", default="threshold")
    args = parser.parse_args()

    return WorkerJob(
        job_id=args.job_id,
        source_path=args.input,
        target_path=args.output_dir,
        output_prefix=args.output_dir,
        requested_mode=args.requested_mode,
    )


if __name__ == "__main__":
    job = parse_args()
    storage = LocalStorage(job.target_path)
    result = execute_job(job, storage)
    print(json.dumps(result.to_dict()))
