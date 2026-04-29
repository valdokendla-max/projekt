# Faas 1: Kontod ja Teenused

## Eesmärk

Selle faasi eesmärk on luua kõik välised kontod ja teenused, mida projektil võib vaja minna järgmistes etappides, isegi kui need ei ole veel tänases koodibaasis täielikult integreeritud.

Praeguse repo seisuga:

- Vercel Blob ei ole veel koodi külge ühendatud
- Railway ei ole veel deploy sihtkohaks konfigureeritud
- Upstash QStash ei ole veel taustatööde jaoks kasutusel

See tähendab, et käesolev faas on infrastruktuuri ettevalmistusfaas, mitte veel rakenduse integratsioonifaas.

## Miks neid teenuseid üldse vaja on

### Vercel

Vercelit on selles projektis mõistlik kasutada kahel põhjusel:

- kiireks õppimiseks ja testdeployde tegemiseks Next.js frontendi jaoks
- Vercel Blob Storage kasutuselevõtuks failide, piltide või ekspordiartefaktide hoidmiseks

Märkus: projekti sihtkeskkond on endiselt Windows/Linux Node server. Vercel ei ole siin põhiline production-platform, vaid abiplatvorm frontendi, Blob Storage'i ja võimalike tulevaste edge/serverless voogude jaoks.

### Railway

Railway on kasulik, kui soovime hiljem:

- teha kiire staging- või demo-deploy
- jooksutada Node teenuseid hallatud keskkonnas
- katsetada alternatiivset deploy mudelit ilma oma VPS-i käsitsi haldamata

### Upstash QStash

QStash sobib siia projekti eriti hästi siis, kui viime pikemad või ajakulukamad tööd request-response voost välja. Näited:

- pildi optimeerimine taustatööna
- ekspordi pakkimine taustatööna
- webhookide retry-loogika
- partiitöötlus ja ajastatud tööde käivitamine

## Mida tuleb selles faasis kätte saada

Selle faasi lõpus peab sul olema olemas järgmine info.

- Vercel konto, seotud GitHubiga
- vähemalt üks testdeploy tehtud
- Vercel Blob store loodud
- Blob store read/write token kopeeritud
- Railway konto loodud ja GitHubiga seotud
- Railway projekt või vähemalt ligipääs deploy voole kinnitatud
- Upstash konto loodud
- QStash token kopeeritud
- kui plaanime QStash callback-verifitseerimist, siis ka signing key'd kopeeritud

## 1. Vercel konto loomine

### Eesmärk

Luua Vercel konto, siduda see GitHubiga ja teha üks lihtne testdeploy, et hiljem oleks deploy voog selge.

### Sammud

1. Ava `https://vercel.com/`.
2. Vajuta `Sign Up` või `Continue with GitHub`.
3. Autoriseeri Vercel GitHubi kontoga.
4. Kui Vercel küsib scope'i või team'i loomist, alusta isikliku Hobby scope'iga.
5. Pärast sisselogimist ava dashboard.
6. Tee üks testdeploy, mitte kohe selle projekti production-deploy.

### Soovitus testdeploy jaoks

Kõige lihtsam õppimise viis:

1. Dashboardis vajuta `Add New...` -> `Project`.
2. Impordi mõni väike testrepo või Verceli enda Next.js template.
3. Lase deploy lõpuni joosta.
4. Ava genereeritud URL ja veendu, et aru saad, kust näeb:
   - build logisid
   - environment variables seadistust
   - deployment history't
   - project settings lehte

### Alternatiiv

Kui tahad kohe selle repo peal harjutada:

1. Impordi sama GitHub repo Vercelisse.
2. Määra `Root Directory` väärtuseks `frontend`.
3. Ära kasuta seda veel production truth'ina, kuna projekt eeldab reaalses töös ka backendi ja Python workeri olemasolu.

### Selle sammu tulemus

Sul peab olema:

- töötav Vercel konto
- GitHub integratsioon kinnitatud
- vähemalt üks edukas deploy nähtud dashboardis

## 2. Vercel Blob Storage loomine

### Eesmärk

Luua Blob store, mida saab hiljem kasutada failide, genereeritud piltide, ekspordipakettide või muude suurte binaarsete artefaktide hoidmiseks.

### Mida Blob selles projektis võiks tulevikus hoida

- AI genereeritud lähtepildid
- optimeeritud graveerimispildid
- ZIP-ekspordid
- SVG ja DXF väljundid
- kasutaja üles laaditud pildid, kui me ei taha neid requestis data URL-na hoida

### Sammud dashboardis

1. Ava Verceli dashboard.
2. Vasakust menüüst ava `Storage`.
3. Vali `Create` või `Create Database/Storage`.
4. Vali `Blob`.
5. Vali scope ehk konto või team, mille alla store luuakse.
6. Vali store tüüp:
   - `public`, kui failid võivad olla otse URL-iga loetavad
   - `private`, kui loeme faile ainult serveri kaudu
7. Vali regioon.
8. Loo store.

### Milline access mode valida

Selle projekti jaoks on vaikimisi mõistlikum alustada `private` Blob store'iga, kui sinna hakkavad minema:

- kasutaja lähtefailid
- töödeldud vahefailid
- tasulised või piiratud ligipääsuga ekspordid

Kui eesmärk on jagada avalikke lõppfaile otse URL-iga, siis võib hiljem luua eraldi `public` store'i.

### Token, mis tuleb kopeerida

Selle projekti jaoks salvesta Blob token nimega:

`BLOB_READ_WRITE_TOKEN`

See on võtmekujuline serveri saladus, mida hiljem kasutab `@vercel/blob` SDK.

### Mida kohe talletada

Salvesta turvalisse kohta järgmine info:

- store nimi
- scope/team nimi
- store regioon
- kas store on `public` või `private`
- `BLOB_READ_WRITE_TOKEN`

### Selle sammu tulemus

Sul peab olema:

- loodud vähemalt üks Blob store
- kopeeritud `BLOB_READ_WRITE_TOKEN`

## 3. Railway konto loomine

### Eesmärk

Luua Railway konto, siduda see GitHubiga ja kinnitada, et repo on deployitav Railway dashboardi kaudu.

### Mida Railway selles projektis võiks hiljem teha

- jooksutada frontendi staging-keskkonda
- jooksutada backendi eraldi teenusena
- pakkuda hallatud alternatiivi käsitsi serveri deployle
- võimaldada monorepo-põhist CI/CD katsetamist

### Sammud

1. Ava `https://railway.app/`.
2. Vali `Login` või `Start a New Project`.
3. Kasuta `Continue with GitHub` sisselogimist.
4. Anna Railwayle ligipääs vajalikule GitHub kontole või organisatsioonile.
5. Ava Railway dashboard.
6. Vajuta `New Project`.
7. Vali `Deploy from GitHub repo`.
8. Vali oma repo.
9. Kui küsitakse, vali alguses `Deploy Now` või `Add Variables`.

### Tähtis märkus selle repo puhul

Kuna repo on monorepo, siis ära eelda, et üks Railway deploy lahendab kohe kogu süsteemi ära. Hilisemas deploy-faasis tuleb otsustada vähemalt järgmine jaotus:

- kas frontend ja backend deployitakse eraldi teenustena
- kas Python worker jääb sama teenuse sisse või eraldatakse eraldi töötlusteenuseks
- kas kasutatakse Dockerfile'i või Railway standard build/start loogikat

### Mis on praegu piisav

Faas 1 jaoks piisab sellest, et:

- konto on loodud
- GitHub link töötab
- repo on Railway dashboardis nähtav
- oskad avada Project Canvas vaate

### Selle sammu tulemus

Sul peab olema:

- Railway konto
- GitHub integratsioon
- kinnitatud, et repo on Railway kaudu valitav deployks

## 4. Upstash konto ja QStash võtmed

### Eesmärk

Luua Upstash konto ja võtta välja QStashi võtmed, et hiljem saaksime teha usaldusväärseid taustatöid ja retry-ga sõnumijärjekordi.

### Mida QStash selles projektis võiks hiljem teha

- pildi optimeerimise tööde queue
- ZIP-ekspordi taustatööde käivitamine
- webhookide retry ja dead-letter laadne töökindlus
- ajastatud tööde käivitamine

### Sammud

1. Ava `https://upstash.com/`.
2. Logi sisse või loo konto.
3. Ava console.
4. Liigu QStashi sektsiooni.
5. Ava olemasolev QStashi projekt või loo uus.

### Võtmed, mis tuleb kindlasti kopeerida

Kohe on vaja vähemalt järgmist võtit:

`QSTASH_TOKEN`

See on vajalik selleks, et rakendus saaks QStashi kaudu sõnumeid publish'ida.

### Võtmed, mis tasub kohe kaasa võtta

Kui plaanime, et QStash hakkab kutsuma meie enda endpoint'e ja me verifitseerime saatjat, siis kopeeri kohe ka:

- `QSTASH_CURRENT_SIGNING_KEY`
- `QSTASH_NEXT_SIGNING_KEY`

Need võtmed on vajalikud selleks, et meie endpoint saaks kontrollida, kas sissetulev callback tuli päriselt QStashilt.

### Selle sammu tulemus

Sul peab olema:

- Upstash konto
- QStash teenus nähtav dashboardis
- kopeeritud `QSTASH_TOKEN`
- soovitatavalt ka `QSTASH_CURRENT_SIGNING_KEY` ja `QSTASH_NEXT_SIGNING_KEY`

## 5. Kuidas neid saladusi selles projektis hoida

Need väärtused ei tohiks minna commit'itavasse faili. Kasuta kas:

- kohaliku arenduse jaoks `frontend/.env.local`
- serveri keskkonnamuutujaid productionis
- secrets manager'it, kui deploy keskkond seda toetab

### Soovituslikud keskkonnamuutujad selle repo jaoks

Praegu kasutab repo juba neid võtmeid:

- `GROQ_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_IMAGE_MODEL`
- `OPENAI_IMAGE_QUALITY`
- `NEXT_PUBLIC_BACKEND_URL`

Kui lisame tulevikus Blob ja QStash toe, siis hoia samas võtmeformaadis ka neid:

- `BLOB_READ_WRITE_TOKEN`
- `QSTASH_TOKEN`
- `QSTASH_CURRENT_SIGNING_KEY`
- `QSTASH_NEXT_SIGNING_KEY`

### Mida mitte teha

- ära pane neid võtmeid Git commit'isse
- ära saada neid chatis või e-kirjas toortekstina
- ära hoia neid README failis päris väärtustega

## 6. Faas 1 kontrollnimekiri

Kasuta seda kui valmisoleku checklist'i.

- [ ] Vercel konto loodud GitHub sisselogimisega
- [ ] Vähemalt üks Verceli testdeploy tehtud
- [ ] Vercel Blob store loodud
- [ ] `BLOB_READ_WRITE_TOKEN` turvaliselt salvestatud
- [ ] Railway konto loodud ja GitHubiga seotud
- [ ] Repo on Railway dashboardis valitav
- [ ] Upstash konto loodud
- [ ] `QSTASH_TOKEN` kopeeritud
- [ ] `QSTASH_CURRENT_SIGNING_KEY` kopeeritud
- [ ] `QSTASH_NEXT_SIGNING_KEY` kopeeritud

## 7. Mida teeme järgmises faasis

Kui see faas on tehtud, siis järgmine mõistlik samm ei ole enam kontode loomine, vaid tehniline integratsioon. Selle projekti puhul soovituslik järjekord on järgmine:

1. otsustada, kas Vercel Blob võtab üle piltide ja ekspordiartefaktide hoidmise
2. otsustada, kas QStash võtab üle pikemad optimizer/export taustatööd
3. otsustada, kas Railwayt kasutatakse staginguks või täielikuks alternatiivseks deployks
4. seejärel lisada vastavad SDK-d, env võtmed ja route'id koodibaasi

## Kokkuvõte

Faas 1 ei muuda veel rakenduse funktsionaalsust, kuid eemaldab kõige tavalisema infrastruktuurilise pudelikaela: olukorra, kus arendus on valmis, aga vajalikud kontod, tokenid ja välisteenused puuduvad.

Selle projekti jaoks on kõige kriitilisemad tulevikuvõtmed selles faasis:

- `BLOB_READ_WRITE_TOKEN`
- `QSTASH_TOKEN`
- `QSTASH_CURRENT_SIGNING_KEY`
- `QSTASH_NEXT_SIGNING_KEY`

Railway konto on selles faasis peamiselt deploy-valmiduse ettevalmistus.