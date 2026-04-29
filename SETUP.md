# Async optimizer setup

See juhend kirjeldab uut asünkroonset pildioptimeerimise voogu, kus Next.js võtab töö vastu, QStash käivitab tausttöö ja FastAPI worker töötleb pildi ning salvestab tulemused local storage'isse või Vercel Blob'i.

## 1. Eeldused

- Node.js 20+
- Python 3.11+
- Docker Desktop või Docker Engine
- PostgreSQL andmebaas koos `DATABASE_URL` ühendusstringiga
- Vercel Blob projekt koos `BLOB_READ_WRITE_TOKEN` väärtusega
- Upstash QStash projekt koos `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY` ja `QSTASH_NEXT_SIGNING_KEY` väärtustega

## 2. Frontendi keskkonnamuutujad

Lisa faili `frontend/.env.local` vähemalt järgmised väärtused:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
OPENAI_API_KEY=...
GROQ_API_KEY=...
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/laser_graveerimine

BLOB_READ_WRITE_TOKEN=...
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...
QSTASH_CALLBACK_BASE_URL=https://sinu-avalik-next-rakendus.vercel.app
RESULTS_API_TOKEN=sea_siia_pikk_sisemine_callback_token

IMAGE_OPTIMIZER_WORKER_URL=http://127.0.0.1:8000
OPTIMIZER_ASSET_BLOB_ACCESS=public
```

Märkused:

- `QSTASH_CALLBACK_BASE_URL` peab olema avalik URL. `localhost` ei tööta ilma tunnelita.
- Kui `QSTASH_TOKEN` või callback URL puudub, siis uus `/api/optimize-image` route langeb automaatselt direct fallback režiimi ja töötleb töö kohe ära.
- `RESULTS_API_TOKEN` on `/api/results` callback route fallback-auth. Sama token saadetakse QStash publish sammus `Authorization: Bearer ...` headerina.
- Kui `QSTASH_CURRENT_SIGNING_KEY` ja/või `QSTASH_NEXT_SIGNING_KEY` on seadistatud ning callback tuleb korrektse `Upstash-Signature` päisega, töötab `/api/results` route ka ilma bearer fallbackita.
- Kui `BLOB_READ_WRITE_TOKEN` puudub, salvestatakse binaarsed optimizer assetid lokaalsesse storage'isse, kuid job metadata jääb PostgreSQL-i.

## 3. Workeri käivitamine lokaalselt

### Variant A: Python otse masinas

```powershell
cd workers/image_optimizer
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:IMAGE_OPTIMIZER_STORAGE = "local"
$env:IMAGE_OPTIMIZER_PUBLIC_BASE_URL = "http://localhost:8000"
uvicorn app:app --host 0.0.0.0 --port 8000
```

### Variant B: Docker Compose

```powershell
docker compose up --build image-optimizer-worker
```

See kasutab juurkataloogi `docker-compose.yml` faili ning loob volume'i `worker-storage`.

## 4. Workeri deploy Railway'sse

### Soovituslik samm-sammult

1. Loo Railway projekt ainult worker service jaoks.
2. Sea service root kaustaks `workers/image_optimizer`.
3. Railway loeb faili `workers/image_optimizer/railway.json`.
4. Lisa Railway environment muutujad:

```env
IMAGE_OPTIMIZER_STORAGE=vercel-blob
IMAGE_OPTIMIZER_BLOB_ACCESS=public
BLOB_READ_WRITE_TOKEN=...
```

5. Pärast deploy'd kopeeri Railway avalik URL ja pane see Next.js keskkonda `IMAGE_OPTIMIZER_WORKER_URL` muutujasse.

## 5. Next.js route'ide voog

### `POST /api/optimize-image`

- võtab vastu pildi data URL kujul
- arvutab sünkroonselt pipeline tulemuse ja soovitatud töörežiimi
- salvestab job kirje
- kui QStash on seadistatud, paneb töö järjekorda
- kui QStash ei ole seadistatud, teeb direct fallback töötluse kohe ära

### `GET /api/optimize-image?jobId=...`

- tagastab jooksva job oleku
- loeb job kirje Blob'ist või lokaalsest failist

### `POST /api/results`

- verifitseerib QStash signatuuri, kui signing key'd on olemas
- kui signatuur puudub või seda ei kasutata, nõuab `Authorization: Bearer <RESULTS_API_TOKEN>` fallback-authi
- loeb job kirje
- kutsub FastAPI workeri `/process` endpointi
- salvestab töö lõpptulemuse tagasi job kirjesse

## 6. Soovituslik testimise järjekord

1. Käivita backend: `npm run dev --prefix backend`
2. Käivita frontend: `npm run dev --prefix frontend`
3. Käivita worker: `docker compose up --build image-optimizer-worker`
4. Kontrolli workeri health endpointi:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health | Select-Object -ExpandProperty Content
```

5. Saada test request Next route'i vastu.

Näide PowerShellis:

```powershell
$body = @{
  sourceImageDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn7LxQAAAAASUVORK5CYII="
  source = @{
    width = 1
    height = 1
    mimeType = "image/png"
    sourceKind = "uploaded-image"
  }
} | ConvertTo-Json -Depth 5

Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/api/optimize-image -Method POST -ContentType 'application/json' -Body $body | Select-Object -ExpandProperty Content
```

## 7. Olulised piirangud

- QStash ei saa `localhost` callback URL-i tabada ilma tunnelita.
- Direct fallback töötab ka ilma QStashita, aga siis pole queue/retry kasu.
- Praegune lahendus hoiab originaalset `sourceImageDataUrl` job kirjes, et worker ei sõltuks sisendfaili avalikust URL-ist. See on MVP jaoks praktiline, aga suurte failide jaoks tasub järgmises iteratsioonis liikuda stream/presigned flow peale.
