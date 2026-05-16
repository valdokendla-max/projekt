from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Literal

from PIL import Image, ImageFilter, ImageOps, ImageStat

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
    source_path: str
    target_path: str
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
    normalized_path: str
    optimized_path: str
    preview_path: str
    width: int
    height: int
    notes: list[str] = field(default_factory=list)


def load_source_image(source_path: str) -> Image.Image:
    image = Image.open(source_path)
    image = ImageOps.exif_transpose(image)

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


def execute_job(job: WorkerJob) -> WorkerResult:
    source_image = load_source_image(job.source_path)
    normalized = normalize_image(source_image)
    optimized, process_notes = process_for_mode(normalized, job.requested_mode)
    preview = build_preview_image(optimized)

    output_dir = Path(job.target_path)
    output_dir.mkdir(parents=True, exist_ok=True)

    normalized_path = output_dir / "normalized.png"
    optimized_path = output_dir / "optimized.png"
    preview_path = output_dir / "preview.png"

    normalized.save(normalized_path, format="PNG")
    optimized.save(optimized_path, format="PNG")
    preview.save(preview_path, format="PNG")

    notes = [
        "Deterministic preprocessing completed with Pillow.",
        *process_notes,
    ]

    return WorkerResult(
        job_id=job.job_id,
        normalized_path=str(normalized_path),
        optimized_path=str(optimized_path),
        preview_path=str(preview_path),
        width=source_image.width,
        height=source_image.height,
        notes=notes,
    )


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
        requested_mode=args.requested_mode,
    )


if __name__ == "__main__":
    job = parse_args()
    result = execute_job(job)
    print(json.dumps(asdict(result)))
