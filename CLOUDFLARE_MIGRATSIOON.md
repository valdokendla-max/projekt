# Projekti migreerimine Cloudflare'ile

**Eesmärk:** Viia kogu projekt Cloudflare ühe konto alla. Lõpptulemus: **$0/kuu** (ainult OpenAI chat ~$2-5/kuu).

**Omanik:** Valdo Kendla
**Sait:** vkengraveai.eu
**Koostatud:** 2026-05-23

---

## 1. Mida sait peab tegema (nõuded)

1. Kasutaja registreerib ja logib sisse
2. Kasutaja salvestab oma laser graveerimise masina (tüüp, võimsus, kiirus, töötamise ala)
3. Kasutaja salvestab materjale (vineer, akrüül, nahk jne) koos soovitatavate seadetega
4. Saidil on mõned eelnevalt määratud ikoonid koos pildi muutjaga
5. Sait pakub chati (OpenAI/Claude) ja pildi üleslaadimist
6. **Pildi muutmine toimub tarkvaraga (Sharp, Potrace), MITTE AI-ga**
7. Sait genereerib soovitatud LightBurn seaded vastavalt kasutaja masinale ja materjalile
8. Kasutaja saab alla laadida valmis **LightBurn faili (.lbrn2)**

---

## 2. Vana vs uus arhitektuur

### Vana (Netlify + Railway + 4 muud teenust)
```
- Netlify (frontend)              → KREDIIDID OTSAS
- Railway (backend + PostgreSQL)  → $5-10/kuu
- Vercel Blob (failid)            → $5+/kuu
- Upstash QStash (queue)          → $5+/kuu
- Groq API                        → $5+/kuu
- OpenAI (DALL-E + chat)          → $10-50/kuu
- Docker + Python worker          → keerukus
─────────────────────────────────────────
KOKKU: $30-100+/kuu
```

### Uus (kõik Cloudflare's)
```
- Cloudflare Pages    (frontend)          → TASUTA
- Cloudflare Workers  (backend)           → TASUTA (100k/päev)
- Cloudflare D1       (andmebaas)         → TASUTA (5GB)
- Cloudflare R2       (failid)            → TASUTA (10GB)
- Cloudflare Access   (autentimine)       → TASUTA
- OpenAI (ainult chat)                    → $2-5/kuu
─────────────────────────────────────────────────
KOKKU: $2-5/kuu (95% kokkuhoid)
```

---

## 3. Mida KUSTUTADA

### Teenused (lõpetada/üle minna)
- ❌ **Netlify konto** (deploy katki, krediidid otsas)
- ❌ **Railway konto** (kustutada pärast migratsiooni)
- ❌ **Vercel Blob** (kustutada)
- ❌ **Upstash QStash** (kustutada)
- ❌ **Groq API** (kustutada)
- ❌ **OpenAI DALL-E** kõned (jätta ainult chat)

### Failid projektist
- ❌ `netlify.toml`
- ❌ `docker-compose.yml`
- ❌ Kogu `workers/image_optimizer/` kaust (Python worker)
- ❌ `.netlify/` kaust
- ❌ Kõik Railway-spetsiifilised configid

### Paketid (`package.json`-ist)
- ❌ `@netlify/plugin-nextjs`
- ❌ `@vercel/blob`
- ❌ `@upstash/qstash`
- ❌ `groq-sdk`
- ❌ Kõik DALL-E/OpenAI image generation viited

---

## 4. Mida LISADA

### Cloudflare-spetsiifilised paketid
- ✅ `wrangler` (Cloudflare CLI) — globaalne
- ✅ `@cloudflare/workers-types` — TypeScript tüübid
- ✅ `hono` — kerge web framework Workers'ile (parem kui Express seal)
- ✅ `drizzle-orm` — ORM D1 andmebaasi jaoks
- ✅ `@auth/d1-adapter` — autentimine D1-iga

### Pildi töötlus (jääb samaks)
- ✅ `sharp` — pildi töötlus (kontrast, mustvalge, suuruse muutmine)
- ✅ `potrace` — SVG vektoriseerimine

**TÄHELEPANU:** Sharp ja Potrace ei tööta Workers V8 isolaadis. Need tuleb panna **eraldi Worker'isse** või kasutada **Cloudflare Images** teenust. Üks variantidest:

- **Variant A:** Pildi töötlus kliendipoolne (brauseris) — kasutada `wasm-imagemagick` või `@imagemagick/magick-wasm`
- **Variant B:** Eraldi Worker pildi töötluseks (võib vajada Workers Paid plaani $5/kuu, kui ületab CPU limiidi)
- **Variant C:** Cloudflare Images ($5/kuu — 100 000 pildi muutust)

**Soovitus:** Alustada Variandiga A (kliendipoolne) — kasutaja brauser teeb töö, sait jääb tõeliselt tasuta.

### LightBurn generaator (oma kood)
- ✅ `backend/src/lightburn-generator.js` — XML genereerimine

---

## 5. Uus arhitektuur (detailne)

```
┌──────────────────────────────────────────────────┐
│  CLOUDFLARE PAGES (frontend)                     │
│  - Next.js app (static export)                   │
│  - Tailwind CSS                                  │
│  - vkengraveai.eu domeen                         │
│                                                  │
│  Lehed:                                          │
│  ├── / (avaleht)                                 │
│  ├── /login, /register                           │
│  ├── /dashboard                                  │
│  ├── /machines (CRUD)                            │
│  ├── /materials (CRUD)                           │
│  ├── /upload (pildi üleslaadimine)               │
│  ├── /editor (pildi muutmine brauseris)          │
│  └── /chat                                       │
└──────────────────┬───────────────────────────────┘
                   │
                   │ /api/* päringud
                   │
┌──────────────────▼───────────────────────────────┐
│  CLOUDFLARE WORKERS (backend, üks Worker)        │
│  - Hono framework                                │
│  - /api/auth (login, register, session)          │
│  - /api/machines (CRUD masinad)                  │
│  - /api/materials (CRUD materjalid)              │
│  - /api/images/save (pildi metadata salv)        │
│  - /api/lightburn/generate (SVG → .lbrn2)        │
│  - /api/chat (OpenAI proxy)                      │
└──────┬───────────────────────┬───────────────────┘
       │                       │
┌──────▼─────────┐    ┌────────▼──────────┐
│  D1 DATABASE   │    │  R2 STORAGE       │
│  (SQLite)      │    │  (S3-compatible)  │
│  - users       │    │  - originaal pildid│
│  - machines    │    │  - SVG-d          │
│  - materials   │    │  - LightBurn fail │
│  - images meta │    │                   │
│  - chat hist   │    │                   │
└────────────────┘    └───────────────────┘
```

---

## 6. Andmebaas D1 (SQLite, Cloudflare omas)

D1 on **SQLite Cloudflare's**. Sarnane PostgreSQL-iga, aga lihtsam.

```sql
-- Kasutajad
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Masinad
CREATE TABLE machines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT, -- 'CO2', 'Diode', 'Fiber'
  max_power_watts INTEGER,
  max_speed_mm_min INTEGER,
  work_area_mm TEXT, -- '400x400'
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Materjalid
CREATE TABLE materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  recommended_power_pct INTEGER,
  recommended_speed INTEGER,
  recommended_dpi INTEGER,
  passes INTEGER DEFAULT 1,
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Pildid (metadata)
CREATE TABLE images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT,
  r2_key_original TEXT, -- R2 võti originaalile
  r2_key_processed TEXT, -- R2 võti SVG-le
  status TEXT, -- 'uploaded', 'processed', 'done'
  created_at INTEGER DEFAULT (unixepoch())
);

-- Chat ajalugu
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id TEXT,
  role TEXT, -- 'user', 'assistant'
  content TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Indeksid (jõudluse jaoks)
CREATE INDEX idx_machines_user ON machines(user_id);
CREATE INDEX idx_materials_user ON materials(user_id);
CREATE INDEX idx_images_user ON images(user_id);
CREATE INDEX idx_chat_user ON chat_messages(user_id, conversation_id);
```

**Suurus:** 5GB tasuta, sina kasutad alguses <100MB.

---

## 7. R2 storage (failid)

R2 on **S3-ühilduv objektisalvestus, ilma egress tasudeta** (Vercel Blob ja AWS S3 võtavad raha iga allalaadimise eest, R2 mitte).

**Tasuta tier:**
- 10GB storage
- 1 miljon Class A operatsiooni/kuu (kirjutamine)
- 10 miljonit Class B operatsiooni/kuu (lugemine)

**Struktuur:**
```
vkengraveai-bucket/
├── users/
│   └── {user_id}/
│       ├── originals/
│       │   └── {image_id}.png
│       ├── processed/
│       │   └── {image_id}.svg
│       └── lightburn/
│           └── {image_id}.lbrn2
```

---

## 8. LightBurn .lbrn2 generaator

**Asukoht:** `backend/src/lightburn-generator.ts` (Worker'is)

**Funktsioon:**
```typescript
function generateLightBurnFile(
  svgPaths: SVGPath[],
  machine: Machine,
  material: Material,
  options: { width_mm: number, height_mm: number }
): string {
  // Genereeri XML
  // Sea CutSetting vastavalt material seadetele
  // Konverdi SVG path andmed LightBurn shape'ideks
  // Tagasta XML string
}
```

**Minimaalne XML:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<LightBurnProject AppVersion="1.7.00" FormatVersion="1">
  <CutSetting type="Cut">
    <index Value="0"/>
    <name Value="{material.name}"/>
    <minPower Value="{material.power_min}"/>
    <maxPower Value="{material.power_max}"/>
    <speed Value="{material.speed}"/>
    <numPasses Value="{material.passes}"/>
  </CutSetting>
  <Shape Type="Path" CutIndex="0">
    <!-- SVG path data konverteerituna -->
  </Shape>
</LightBurnProject>
```

---

## 9. Migratsiooni sammud

### ETAPP 1: Cloudflare konto ettevalmistus ✅ VALMIS (2026-05-23)
- [x] Loo Cloudflare konto (valdokendla@gmail.com, Account ID `960eee4367abcab10b4649108fc001e4`)
- [x] Lisa domeen `vkengraveai.eu` Cloudflare'i (Free plan, nimeserverid `bella` + `simon` — DNS pole veel vahetatud, ootame Etapp 9)
- [x] Paigalda Wrangler CLI 4.94.0
- [x] `wrangler login` — autenditud
- [x] Backup Railway PostgreSQL: `C:\Users\Admin\Downloads\railway_postgres_backup_2026-05-23.sql` (37.67 KB, 8 tabelit)

### ETAPP 2: Cloudflare Pages (frontend) ✅ VALMIS (2026-05-23)
**Strateegia:** `@cloudflare/next-on-pages` (pragmaatiline — säilitab olemasolevad Next.js API route'd edge runtime'is)
**Live URL:** https://laser-graveerimine.pages.dev (custom domain vkengraveai.eu pole veel ühendatud)

**Tehtud:**
- [x] Kustutatud: `netlify.toml`, `frontend/.env.netlify.example`, GitHub Actions Netlify workflow
- [x] Lisatud: `@cloudflare/next-on-pages` + `vercel` devDeps, `frontend/wrangler.toml`, `zod@^3.25.76`
- [x] Kõik 8 API route'i → edge runtime
- [x] `node:crypto` → Web Crypto API (`lib/api-security.ts` `hashActorKey` nüüd async)
- [x] `logo-generation` route: nodejs → edge, Buffer → Uint8Array+btoa
- [x] `engraving-export` route: eemaldatud server-side raster→vector tracing (pngjs ei ühildu edge'iga; lisada tagasi Etapp 5-s)
- [x] Build: lokaalselt WSL Ubuntu'is (Windows + bash kombo ei tööta), deploy CLI-ga
- [x] Pages secret'id: `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL=gpt-image-1`, `OPENAI_IMAGE_QUALITY=medium`
- [x] Build env (lokaalselt): `NEXT_PUBLIC_BACKEND_URL` + `BACKEND_PROXY_TARGET` mõlemad = `https://backend-production-24e5a.up.railway.app`

**Lahendatud probleemid sessiooni jooksul:**
- ❌→✅ **Chat 500 (Invalid URL):** PowerShelli pipe `"..." | wrangler pages secret put` lisab UTF-16 BOM (U+FEFF) väärtuse ette → secret rikutud. **Lahendus:** kasuta bash `printf` või `echo -n` (ei lisa BOM-i).
- ❌→✅ **Chat 400 (assistant image_url):** `localStorage`-st laetud vestluse ajalugu sisaldas assistant'i pildiosi (logo, photo-enhance, tattoo previewid). Meie route saatis need OpenAI'le `image_url` kujul → OpenAI keelab assistant'i sõnumites pilte. **Lahendus:** `frontend/app/api/chat/route.ts:88` `toModelContent()` filtreerib pildiosi assistant rollide puhul välja.
- ❌→✅ **Tattoo eskiis (img2img) kadunud:** vana `/api/tattoo-generation` route (commit `8e87164`) eemaldas line-art → realistlik teisendamise. **Lahendus:** taastatud edge runtime'is uue route'iga `frontend/app/api/tattoo-generation/route.ts` + brauseri Canvas resize 1024×1024 (sharp ei tööta edge'is) + `handleLogoCreate` hargneb (pildiga = OpenAI realistlik, ilma pildita = Pollinations.ai line-art).
- ⚠️ **Chat stream formaat (kahtlustatav, edasi lükatud):** AI SDK v6 `useChat` võib oodata UI Message Stream SSE formaati, kuid route emiteerib vana v1 data stream formaati (`0:"text"`). Praegune `text/event-stream` polematused võivad põhjustada sõnumite mitterenderimist. Backlogis Variant B taasvaatluseks.

**Mida ei tehtud (`output: 'export'` plaani versus pragmaatiline tee):**
- Plaan ütles `output: 'export'` static export. Tegime hoopis `@cloudflare/next-on-pages` mis säilitab kõik Next.js API route'd edge Functions'idena. Tulemus sama — frontend töötab Cloudflare's tasuta tier'is.

### ETAPP 3: D1 andmebaas (1 tund)
- [ ] Loo D1 andmebaas: `wrangler d1 create vkengraveai-db`
- [ ] Käivita SQL skeem (vt sektsioon 6)
- [ ] Lisa Drizzle ORM: `npm install drizzle-orm`
- [ ] Migreeri olemasolevad andmed Railway PostgreSQL-ist (kui on)

### ETAPP 4: R2 storage (30 min)
- [ ] Loo R2 bucket: `wrangler r2 bucket create vkengraveai-files`
- [ ] Migreeri olemasolevad failid Vercel Blob'ist (kui on)
- [ ] Seadista CORS

### ETAPP 5: Workers (backend) (4-6 tundi)
- [ ] Loo Workers projekt: `wrangler init backend-worker`
- [ ] Paigalda Hono: `npm install hono`
- [ ] Implementeeri endpointid:
  - [ ] POST `/api/auth/register`
  - [ ] POST `/api/auth/login`
  - [ ] GET/POST `/api/machines`
  - [ ] PATCH/DELETE `/api/machines/:id`
  - [ ] GET/POST `/api/materials`
  - [ ] PATCH/DELETE `/api/materials/:id`
  - [ ] POST `/api/images/save`
  - [ ] POST `/api/lightburn/generate`
  - [ ] POST `/api/chat` (OpenAI proxy)
- [ ] Lisa D1 ja R2 bindingud `wrangler.toml`-i
- [ ] Deploy: `wrangler deploy`

### ETAPP 6: Pildi töötlus kliendipoolselt (2-3 tundi)
- [ ] Frontend-i lisada **kliendipoolne pildi muutmine**:
  - Tausta eemaldamine: `@imgly/background-removal`
  - Mustvalgeks tegemine, kontrast: brauseri Canvas API
  - SVG vektoriseerimine: `imagetracerjs`
- [ ] Kasutaja näeb tulemust kohe brauseris
- [ ] Saadab valmis SVG R2-le

### ETAPP 7: LightBurn generaator (3-4 tundi)
- [ ] Implementeeri `lightburn-generator.ts` Worker'is
- [ ] Lisa endpoint: `POST /api/lightburn/generate`
- [ ] Frontend: "Lae LightBurn fail alla" nupp
- [ ] Testi: ava genereeritud fail LightBurnis

### ETAPP 8: Autentimine (2 tundi)
- [ ] Lisa Lucia Auth või @auth/core (D1 adapteri abil)
- [ ] Lehed: `/login`, `/register`, `/logout`
- [ ] Sessiooni cookie haldus

### ETAPP 9: DNS migratsioon (15 min)
- [ ] Suuna `vkengraveai.eu` Cloudflare Pages'ile
- [ ] Vana Netlify DNS kirjed eemaldada
- [ ] Oota DNS propagatsiooni (15-60 min)

### ETAPP 10: Vanade teenuste kustutamine (30 min)
- [ ] Veendu, et uus sait töötab täielikult
- [ ] Eksporteeri Railway PostgreSQL andmed (varuks)
- [ ] Lülita välja: Netlify, Railway, Upstash QStash, Vercel Blob
- [ ] Tühista API võtmed: Groq

---

## 10. Hinnanguline ajakulu

| Etapp | Aeg |
|-------|-----|
| 1. Cloudflare konto | 30 min |
| 2. Pages (frontend) | 1-2 tundi |
| 3. D1 andmebaas | 1 tund |
| 4. R2 storage | 30 min |
| 5. Workers (backend) | 4-6 tundi |
| 6. Pildi töötlus | 2-3 tundi |
| 7. LightBurn generaator | 3-4 tundi |
| 8. Autentimine | 2 tundi |
| 9. DNS migratsioon | 15 min |
| 10. Vanade kustutamine | 30 min |
| **KOKKU** | **15-20 tundi** |

Realistlik ajakulu: **3-5 päeva**, kui teha päevas 3-4 tundi.

---

## 11. Hinnad pärast migratsiooni

| Teenus | Hind kuus |
|--------|-----------|
| Cloudflare Pages | $0 |
| Cloudflare Workers | $0 (100k päringut/päev) |
| Cloudflare D1 | $0 (5GB) |
| Cloudflare R2 | $0 (10GB) |
| Cloudflare Access | $0 |
| OpenAI (chat) | ~$2-5 |
| **KOKKU** | **~$2-5/kuu** |

**Säästetud:** ~$25-95/kuu = **$300-1140/aastas**

---

## 12. Riskid ja mida silmas pidada

### ⚠️ Workers piirangud
- Vaba tier: **100 000 päringut päevas** (täiesti piisav alguses)
- CPU aeg: **10ms tasuta**, **30s makstes** ($5/kuu)
- Mälu: **128MB**
- Suure pildi töötlus ei pruugi tasuta tieri sisse mahtuda → seetõttu **kliendipoolne pildi töötlus**

### ⚠️ Next.js Cloudflare'is
- **Static export** töötab kõige paremini
- Server-side rendering (SSR) on piiratud
- Mõnda Next.js API-d ei pruugi olla
- Kui see liiga piirav, võib kasutada lihtsalt **React + Vite**

### ⚠️ D1 piirangud
- SQLite, mitte PostgreSQL — mõned süntaksi erinevused
- Maksimum andmebaasi suurus: 10GB
- Mõned funktsioonid puuduvad (PostgreSQL omad)

### ✅ Eelised
- Üks konto, üks dashboard
- Pole "krediidi limiiti"
- Päris tasuta
- Kiireim globaalne CDN

---

## 13. Tähtsad märkused Claude Code'ile

1. **Tee iga etapp eraldi commit'iga** — vajadusel saad tagasi keerata
2. **Ära kustuta vana koodi kohe** — kommenteeri välja, et oleks võimalik võrrelda
3. **Säilita vanad konfigid** kaustas `_old/` enne lõplikku kustutamist
4. **Testi Workers lokaalselt** enne deploy'i: `wrangler dev`
5. **D1 andmebaasi migratsioonid** käivita läbi `wrangler d1 migrations`
6. **LightBurn fail** — testi alati LightBurnis avada
7. **Säilita kasutajate andmed** — migratsiooni ajal ekspordi/impordi hoolikalt

---

## 14. Mida teha praegu (esimesed sammud)

**Enne kui Claude Code'iga jätkad:**

1. **Backup praegune projekt** — `projekt.zip` Google Drive'i või välisele kettale
2. **Lae alla Railway andmebaasi sisu** (kui seal on tähtsaid andmeid)
3. **Lae alla Vercel Blob failid** (kui seal on faile)
4. **Loo Cloudflare konto** (15 min) — https://dash.cloudflare.com/sign-up

**Kui need kolm asja on tehtud, käivita Claude Code'ile:**

> "Loe fail MIGRATSIOON_PLAAN.md läbi. Anna kokkuvõte ja oma arvamus. Ära veel midagi muuda. Pärast minu kinnitust hakkame Etapp 1-ga."

---

**LÕPP**

Lihtsam projekt, tasuta hosting, vähem peavalu, samade võimalustega sait.

---

## 15. Hilisemaks (backlog) — pärast Etapp 2 lõpetamist (2026-05-23)

**Järgmise sessiooni prioriteedid (järjekorras):**

1. **Custom domain `vkengraveai.eu` ühendamine Cloudflare Pages'ile**
   - Cloudflare dashboard → Pages → laser-graveerimine → Custom domains → Add `vkengraveai.eu`
   - Cloudflare väljastab automaatselt SSL sertifikaadi
   - Veebimajutus.ee juures vahetada nimeserverid: `bella.ns.cloudflare.com` + `simon.ns.cloudflare.com`
   - DNS propagatsioon ~15-60 min
   - **MÄRKUS:** Cloudflare juures domeen on juba lisatud, ainult NS vahetus + Pages binding puudub

2. **Etapp 3: D1 andmebaas (1-2 tundi)**
   - `wrangler d1 create vkengraveai-db`
   - Skeemi loomine plaani sektsioonist 6 (users, machines, materials, images, chat_messages)
   - Andmete migreerimine `railway_postgres_backup_2026-05-23.sql`-st D1-le

3. **Etapp 4-10:** R2 storage, Workers backend (Hono), Lucia Auth, vanade teenuste kustutamine — plaani järgi

**Tehniline võlg (mitte-blokeeriv, kuid soovitatav):**

- **Chat stream formaat — Variant B taasvaatlus**
  - Praegune route emiteerib AI SDK v1 data stream'i (`0:"text"`)
  - AI SDK v6 `useChat` võib eeldada UI Message Stream SSE formaati
  - Lahendus: vahetada `streamText` + `.toUIMessageStreamResponse()` helperile (`@ai-sdk/openai` pakett, ~50KB)
  - Praegu kasutaja kinnitanud, et chat töötab — võimalik et v3.x `useChat` aktsepteerib veel vana formaati. Kontrollida brauseri devtools'is, kas assistant messages renderivad korralikult.

- **Tattoo kehal funktsioon** (eemaldatud commit `8e87164`-s koos eskiisiga)
  - Vana kood git ajaloos: `git show 8e87164^:frontend/app/api/tattoo-generation/route.ts` `mode: 'kehal'` haru
  - Kasutab `/v1/images/generations` (text-to-image, mitte edits)
  - Prompt: `buildTattooOnBodyPrompt()` — "Professional tattoo photography, black and grey realistic tattoo visible on upper arm or forearm..."
  - Lisamine: uus nupp, eraldi käsitleja, sama edge route'i laiendamine `mode` paramteriga
  - **Hinnang:** ~1-2h töö

- **`engraving-export` server-side raster→vector tracing**
  - Eemaldatud Cloudflare migratsiooni käigus (pngjs ei tööta edge'is)
  - Plaanitud taastada Etapp 5-s Workers backendis (eraldi Worker, kus pngjs või wasm-based PNG decoder)
  - Praegune käitumine: kasutaja peab pre-traced SVG/DXF kaasa panema või kasutama threshold režiimi

- **`OPENAI_API_KEY` rotateerimine (turvalisus)**
  - Võti tuli nähtavale tool output'is praeguse sessiooni jooksul
  - Soovitus: OpenAI dashboard'is loo uus võti, asenda `wrangler pages secret put OPENAI_API_KEY ...` käsuga (bash kaudu, MITTE PowerShell pipe!) ja `wrangler pages deploy ...` (secret bind toimub uue deploy ajal)
  - Vana võti dashboard'is revoke

- **Cost optimization — pildi genereerimise odavam alternatiiv (~10× kulude vähendus)**

  Vahetada OpenAI pildi genereerimine odavama alternatiivi vastu:

  **Eelistatud: Replicate API** (FLUX.1 schnell = $0.003/pilt vs OpenAI $0.04/pilt)
  - Minimaalne kood muutus — POST `https://api.replicate.com/v1/predictions` `black-forest-labs/flux-schnell` mudeliga
  - Pole oma serverit vaja
  - **Test esmalt tattoo eskiis route'is** (`frontend/app/api/tattoo-generation/route.ts`), seejärel logo-generation
  - Edge runtime ühilduvus OK (ainult `fetch`)
  - Vajab `REPLICATE_API_TOKEN` Pages secret'ina

  **Tulevikuks: Cloudflare Tunnel + lokaalne AMUSE/ComfyUI**
  - Kasutaja AMD GPU peal (AMD Radeon RX 6700 XT)
  - Täiesti tasuta peale elektri
  - Vajab PC 24/7 üleval
  - Eelistatav kui kasutajate arv kasvab oluliselt (>1000 päringut/päev)
  - Cloudflare Tunnel ühendab lokaalse ComfyUI HTTP API turvaliselt Cloudflare Worker'iga

- **Lokaalne dev keskkond Cloudflare jaoks**
  - Praegu `npm run build:cf` ei tööta Windows/PowerShell + bash kombos (`@cloudflare/next-on-pages` shellac'i probleem). Töötab ainult WSL Ubuntu'is.
  - Variant: Cloudflare Pages git integration (auto-deploy push'i pealt, Linux builder)
  - Variant: GitHub Actions workflow (vajab `CLOUDFLARE_API_TOKEN` ja `CLOUDFLARE_ACCOUNT_ID` repo secret'idesse)
