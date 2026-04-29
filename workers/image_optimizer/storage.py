from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal
from urllib.parse import quote

import requests

StorageBackendName = Literal["local", "vercel-blob"]


@dataclass(slots=True)
class StoredAsset:
    location: str
    file_name: str
    content_type: str
    storage_backend: StorageBackendName
    pathname: str = ""
    download_url: str = ""
    etag: str = ""
    size: int = 0

    def to_dict(self) -> dict[str, str | int]:
        return asdict(self)


class CloudStorage:
    backend_name: StorageBackendName

    def save_bytes(self, relative_path: str, payload: bytes, content_type: str) -> StoredAsset:
        raise NotImplementedError


class LocalStorage(CloudStorage):
    backend_name: StorageBackendName = "local"

    def __init__(self, root_dir: str | Path, public_base_url: str | None = None) -> None:
        self.root_dir = Path(root_dir)
        self.root_dir.mkdir(parents=True, exist_ok=True)
        self.public_base_url = (public_base_url or "").rstrip("/")

    def save_bytes(self, relative_path: str, payload: bytes, content_type: str) -> StoredAsset:
        target_path = self.root_dir / Path(relative_path)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(payload)

        relative_url = quote(Path(relative_path).as_posix())
        location = str(target_path)
        if self.public_base_url:
            location = f"{self.public_base_url}/files/{relative_url}"

        return StoredAsset(
            location=location,
            file_name=target_path.name,
            content_type=content_type,
            storage_backend=self.backend_name,
            pathname=Path(relative_path).as_posix(),
            size=len(payload),
        )


class VercelBlobStorage(CloudStorage):
    backend_name: StorageBackendName = "vercel-blob"

    def __init__(
        self,
        token: str,
        *,
        access: Literal["private", "public"] = "private",
        api_base_url: str = "https://vercel.com/api/blob",
        add_random_suffix: bool = True,
        timeout_seconds: int = 60,
    ) -> None:
        self.token = token
        self.access = access
        self.api_base_url = api_base_url.rstrip("/")
        self.add_random_suffix = add_random_suffix
        self.timeout_seconds = timeout_seconds

    def save_bytes(self, relative_path: str, payload: bytes, content_type: str) -> StoredAsset:
        pathname = Path(relative_path).as_posix()
        response = requests.put(
            f"{self.api_base_url}/?pathname={quote(pathname, safe='/')}",
            data=payload,
            headers={
                "Authorization": f"Bearer {self.token}",
                "x-vercel-blob-access": self.access,
                "x-add-random-suffix": "1" if self.add_random_suffix else "0",
                "x-content-type": content_type,
                "content-type": "application/octet-stream",
            },
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        body = response.json()

        return StoredAsset(
            location=body["url"],
            file_name=Path(body["pathname"]).name,
            content_type=body.get("contentType") or content_type,
            storage_backend=self.backend_name,
            pathname=body.get("pathname", pathname),
            download_url=body.get("downloadUrl", ""),
            etag=body.get("etag", ""),
            size=len(payload),
        )


def stored_asset_to_json(asset: StoredAsset) -> str:
    return json.dumps(asset.to_dict())