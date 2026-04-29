# Deploy plaan domeenile vkengraveai.eu

See juhend paneb projekti üles nii, et kasutaja näeb ainult üht avalikku domeeni: `https://vkengraveai.eu`.

## Soovituslik arhitektuur

- `vkengraveai.eu` -> Vercel Next.js frontend + Next API route'id
- Railway backend service -> Express API
- Railway worker service -> Python FastAPI image optimizer
- Vercel proxy -> suunab `https://vkengraveai.eu/backend/*` päringud Railway backendi

Tulemus:

- kasutaja avab ainult `https://vkengraveai.eu`
- brauseri auth ja calculator päringud lähevad `https://vkengraveai.eu/backend/api/...`
- Next.js enda route'id jäävad `https://vkengraveai.eu/api/...`
- worker jääb brauseri eest peitu ja seda kasutavad server-side route'id

## 1. Domeeni DNS

Sea domeen registrarist või Cloudflare'ist järgmiselt:

- apex/root domain `vkengraveai.eu` -> Vercel
- soovi korral `www.vkengraveai.eu` -> redirect `vkengraveai.eu`

Kui kasutad Vercelit:

- lisa domeen `vkengraveai.eu` Verceli projecti
- lisa Verceli poolt antud A või nameserver kirjed
- sea `www` CNAME Verceli sihtmärgile, kui tahad ka `www` alamdomeeni

## 2. Vercel frontend project

Deploy source:

- project root: `frontend`
- framework: Next.js

Verceli environment muutujad:

```env
GROQ_API_KEY=...
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_IMAGE_MODEL=gpt-image-1-mini
OPENAI_IMAGE_QUALITY=medium

NEXT_PUBLIC_BACKEND_URL=/backend
BACKEND_PROXY_TARGET=https://your-backend-service.up.railway.app

BLOB_READ_WRITE_TOKEN=...
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...
QSTASH_CALLBACK_BASE_URL=https://vkengraveai.eu

IMAGE_OPTIMIZER_WORKER_URL=https://your-worker-service.up.railway.app
OPTIMIZER_ASSET_BLOB_ACCESS=public
```

Oluline:

- `NEXT_PUBLIC_BACKEND_URL` peaks olema `/backend`, et frontend jääks domeenist sõltumatuks
- `BACKEND_PROXY_TARGET` peab olema Railway backendi otse-URL
- `QSTASH_CALLBACK_BASE_URL` peab olema avalik Next rakenduse URL ehk `https://vkengraveai.eu`
- `IMAGE_OPTIMIZER_WORKER_URL` peab olema workeri avalik URL, mitte localhost

Selles repos lisatud rewrite teeb selle tee võimalikuks:

- `/backend/:path*` -> `BACKEND_PROXY_TARGET/:path*`

## 3. Railway backend service

Loo Railway service kaustast `backend`.

Railway environment muutujad:

```env
PORT=4000
AUTH_ADMIN_EMAILS=valdokendla@gmail.com
AUTH_STORE_DIR=/data
APP_BASE_URL=https://vkengraveai.eu
SMTP_HOST=smtp.your-provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=Laser Graveerimine <no-reply@vkengraveai.eu>
```

Oluline kasutajate säilimiseks:

- lisa backend service'ile Railway Volume
- mount path võib olla ka olemasolev `/app/data`; selles projektis töötab see nüüd samuti
- hoia `AUTH_STORE_DIR=/data` või kasuta Railway enda `RAILWAY_VOLUME_MOUNT_PATH` väärtust
- esimesel käivitumisel kopeerib backend olemasoleva `backend/auth-store.seed.json` sisu sinna püsivasse faili; edaspidi kasutatakse ainult seda püsivat faili
- `APP_BASE_URL` määrab, millisele domeenile suunab parooli taastamise link
- SMTP muutujad on vajalikud, et registreerimise teavitus ja “Unustasin parooli” e-kirjad päriselt välja läheksid

Kui tahad admini meiliaadresse rohkem kui ühe:

```env
AUTH_ADMIN_EMAILS=valdokendla@gmail.com,teine@vkengraveai.eu
```

Railway käsk:

- start command: `npm start`

Backend jääb avalikult Railway URL alla kättesaadavaks, aga kasutaja brauser peaks kasutama ainult `https://vkengraveai.eu/backend/...` aadresse.

## 4. Railway worker service

Loo teine Railway service kaustast `workers/image_optimizer`.

Railway environment muutujad:

```env
IMAGE_OPTIMIZER_STORAGE=vercel-blob
IMAGE_OPTIMIZER_BLOB_ACCESS=public
BLOB_READ_WRITE_TOKEN=...
```

Railway config on juba olemas failis [workers/image_optimizer/railway.json](../workers/image_optimizer/railway.json).

Pärast deploy'd kopeeri workeri URL ja pane see Vercelis väärtuseks:

```env
IMAGE_OPTIMIZER_WORKER_URL=https://your-worker-service.up.railway.app
```

## 5. QStash callback

Upstash QStash peab kutsuma tagasi Next rakendust, mitte backendi ega workerit.

Kasuta:

```env
QSTASH_CALLBACK_BASE_URL=https://vkengraveai.eu
```

See tähendab, et callback läheb route'i:

- `https://vkengraveai.eu/api/results`

## 6. Soovituslik lõppvaade kasutajale

Kasutaja jaoks jääb alles ainult üks nähtav domeen:

- `https://vkengraveai.eu`

Sisemine liiklus:

- `https://vkengraveai.eu/backend/api/auth/...` -> Railway backend
- `https://vkengraveai.eu/api/optimize-image` -> Next route Vercelis
- Next route -> Railway worker server-to-server

## 7. Pärast deploy'd kontrolli neid aadresse

- `https://vkengraveai.eu/`
- `https://vkengraveai.eu/api/system-status`
- `https://vkengraveai.eu/backend/api/health`

Kui need kolm töötavad, siis põhiline routing on korras.

## 8. Kui tahad null avalikku backend URL-i

Praegune lahendus peidab backendi sama domeeni taha, aga backendi Railway URL on tehniliselt siiski olemas.

Kui tahad, et brauser ei teeks ühtegi backendi-kutset isegi `/backend` prefixi kaudu, siis järgmine samm on tõsta auth, masinad, materjalid ja recommendation route'id täielikult Next route'idesse ümber. See oleks järgmine iteratsioon, mitte vajalik esimese production deploy jaoks.