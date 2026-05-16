# Laser Graveerimine Frontend

See frontend on Next.js rakendus lasergraveerimise assistendi jaoks. Avalehel on kolm peamist voogu:

- vestluspaneel, mis kasutab `/api/chat` route'i ja Groq API võtit
- laserseadete kalkulaator, mis küsib andmeid eraldi Express backendilt
- graveerimisoptimeerija, mis loob või töötleb pilti, käivitab optimeerimise ning valmistab ette ZIP-ekspordi

## Eeldused

- Node.js 20+
- töötav backend aadressil `http://localhost:4000` või `NEXT_PUBLIC_BACKEND_URL` kaudu määratud URL
- Groq API võti, kui soovid chat-funktsiooni kasutada
- OpenAI API võti, kui soovid kasutada pildigeneraatorit `/api/image-generation` route'i kaudu

## Paigaldus

Kui käivitad projekti workspace'i juurkaustast, paigalda sõltuvused kõigis kolmes paketis:

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

Loo fail `frontend/.env.local` faili `frontend/.env.example` põhjal ja määra vähemalt:

```bash
GROQ_API_KEY=...
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

Kui soovid pildigeneratsiooni kasutada, lisa samuti:

```bash
OPENAI_API_KEY=...
```

Windowsis võid `GROQ_API_KEY` asemel hoida võtme ka kasutaja keskkonnamuutujana. Frontendi `npm run dev` skript proovib selle sel juhul automaatselt kasutaja keskkonnast laadida, nii et võti ei pea projektifaili jääma.

Admin-konto jaoks on projektis vaikimisi lukustatud e-post `valdokendla@gmail.com`. Soovi korral saad lisada või muuta admin-e-posti loendit keskkonnamuutujaga `AUTH_ADMIN_EMAILS`, kus väärtused on komadega eraldatud.

Kui kasutaja unustab parooli, saab ta sisselogimisaknast saata reseti taotluse. Admin näeb ootel taotlusi teadmistepaneelis, loob kasutajale ajutise parooli ja kasutaja vahetab selle pärast sisselogimist kohe ära.

## Arendus

Workspace'i juurkaustast:

```bash
npm run dev
```

See käivitab korraga frontendi ja backendi.

Või eraldi:

```bash
npm run dev:frontend
npm run dev:backend
```

Kui käivitad ainult frontendi ilma `GROQ_API_KEY` väärtuseta, tagastab `/api/chat` route 500 vea. See on praeguse rakenduse ootuspärane käitumine.

## Kontrollkäsud

```bash
npm run lint --prefix frontend
npm run build --prefix frontend
```

## Mida frontend eeldab

- backend pakub route'e `/api/machines`, `/api/materials` ja `/api/recommendation`
- teadmistebaasi route `/api/knowledge` salvestab kirjed faili `frontend/data/knowledge-store.json`
- teadmiste kirjed püsivad ka pärast serveri restarti, kui rakendus töötab tavalises Node.js keskkonnas
- admin saab teadmistepaneelis hallata ka kasutajate rolle; teadmistebaasi muutmine on lubatud ainult admin-kontole

## Süsteemi olek

- route `/api/system-status` kontrollib frontendit, backendi tervist, teadmistebaasi püsisalvestust ja Groq AI ühendust
- avalehel ei ole enam püsivat süsteemi oleku paneeli; põhilised tööriistad avanevad ikoonipõhistest parempoolsetest nuppudest

## Ekspordid

- `/api/engraving-export` koostab ZIP-paketi, mis sisaldab LightBurn projekti, seadistuste JSON-i, manifesti ja optimeeritud varasid
- kui vektor-eksport on sisse lülitatud, genereerib route olemasolevast PNG-st deterministliku SVG ja DXF faili; kui see ei õnnestu, lisatakse paketti selgitav `vectorization-report.txt`

## Märkused

- kohandatud vealehed on olemas failides `app/error.tsx` ja `app/not-found.tsx`
