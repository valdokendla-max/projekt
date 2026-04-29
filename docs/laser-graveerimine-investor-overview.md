# Laser Graveerimine

## Investoritele suunatud projektiülevaade

Selle dokumendi eesmärk on anda ühte faili koondatud, sisuliselt täpne ja investorile arusaadav vastus kolmele küsimusele:

- mis projekt see on
- mida see teeb
- kuidas see seda teeb

Dokument on koostatud olemasoleva koodibaasi, tehnilise dokumentatsiooni ja reaalse rakendusstruktuuri põhjal seisuga 24.04.2026. Sihtkeskkond on Windows/Linux Node server ning teadmistebaas on teadlikult admin-only ligipääsuga.

## 1. Lühikokkuvõte

Laser Graveerimine on AI-toega vertikaalne tarkvaratoode lasergraveerimise ja lihtsama laserlõikamise ettevalmistuseks. See ei ole ainult vestlusrobot ega ainult pildigeneraator. Tegemist on tervikliku töövooga, mis seob kokku masina, materjali, seadistusreeglid, AI nõuandluse, pilditöötluse, kvaliteedikontrolli ja tootmiseks sobiva ekspordi.

Platvormi peamine väärtuspakkumine on muuta idee või olemasolev pilt reaalse masina jaoks sobivaks tootmisvalmis väljundiks. Kasutaja saab valida masina, materjali, paksuse ja töörežiimi, kirjeldada soovitud tulemust või laadida pildi, ning süsteem tagastab:

- masinapõhise ja materjalipõhise seadistussoovituse
- AI abil optimeeritud juhised ja vajadusel genereeritud algpildi
- deterministlikult töödeldud graveerimisversiooni
- simulatsiooni ja riskihinnangu
- ekspordipaketi LightBurni ja muude tootmisvahendite jaoks

Sisuliselt lahendab projekt lõhe loova sisendi ja reaalse lasermasina vahel.

## 2. Millist probleemi projekt lahendab

Lasergraveerimise turul esineb kolm korduvat probleemi.

- Loov sisend ei ole otse tootmisvalmis. Tavaline AI-pilt või kliendi saadetud fail võib visuaalselt hea välja näha, kuid ei ole lasergraveerimiseks sobiv.
- Masina- ja materjaliteadmine on killustatud. Operaator peab eraldi teadma masina võimsust, laseritüüpi, materjali käitumist, paksust, faili ettevalmistust ja ekspordiformaate.
- Vigade hind on reaalne. Vale kontrast, liigne detail, vale joonevahe või ebasobiv võimsus toovad kaasa riknenud tooriku, lisakulu ja ajakao.

Laser Graveerimine koondab need probleemid ühte liidesesse ning annab masinapõhise otsustusabi enne, kui töö reaalselt masinasse saadetakse.

## 3. Mida projekt teeb kasutaja vaatest

Kasutaja vaatest koosneb toode viiest peamisest voost.

### A. Laserseadete kalkulaator

Kasutaja valib masina, materjali, materjali paksuse ja töörežiimi. Süsteem arvutab soovitusliku kiiruse, võimsuse, passide arvu, joonevahe ning air assist kasutuse. Tulemusele lisatakse hoiatused ja soovituslikud ekspordiformaadid.

### B. AI vestlusabiline

Kasutaja saab esitada küsimusi masina, materjali, ohutuse, faili ettevalmistuse, pildi puhastamise, tootmisloogika ja töövoogude kohta. Kui seadistused on salvestatud, kasutatakse neid vaikimisi taustkontekstina.

### C. Pildi genereerimine

Kui kasutajal ei ole veel sobivat graafikat, saab ta kirjeldada soovitud graveerimispilti tekstina. Süsteem optimeerib prompti graveerimise jaoks sobivamaks ning kutsub pildigeneraatori, mis tagastab esialgse toorlahendi edasiseks töötluseks.

### D. Graveerimisoptimeerimine

Kui kasutajal on olemas pilt või genereeritud mustand, juhib süsteem selle optimeerimispipeline'i. Seal normaliseeritakse pilt, hinnatakse selle sobivust, valitakse töötlusrežiim, arvutatakse joontihedus ja koostatakse simulatsioonipõhine hinnang.

### E. Ekspordi pakendamine

Lõpuks koostatakse ZIP-pakett, mis võib sisaldada rasterfaile, vektorfaile, seadistuste JSON-i, manifesti ning LightBurni projektiandmeid.

## 4. Toote peamised sihtkasutajad

Projekt sobib kõige paremini järgmistele kliendisegmentidele.

- väikesed ja keskmised lasergraveerimise töökojad
- personaaltoodete, meenete ja markeerimisteenuste pakkujad
- maker-space'id ja prototüüpimise laborid
- sildi- ja branding-toodete tootjad
- e-poed, kes tahavad kliendi sisendi alusel kiiresti valmistada kohandatud graveeringuid
- tootmisettevõtted, kellel on vaja lihtsustada operaatori eeltööd ja standardiseerida ettevalmistust

## 5. Toote unikaalne väärtus investorivaates

Projekt ei paku lihtsalt AI teksti ega lihtsalt pildi loomist. Selle eristuvus on selles, et AI ja tootmisreeglid on seotud reaalse lasertehnika kontekstiga.

- Süsteem on preset-aware. Vastused ja otsused muutuvad vastavalt valitud masinale, laseritüübile, materjalile ja töörežiimile.
- Süsteem on production-aware. Eesmärgiks ei ole visuaalselt ilus fail, vaid graveeritav fail.
- Süsteem on hybrid-AI. Loov osa tuleb AI-st, kuid tootmise kvaliteedikriitilised sammud on deterministlikud.
- Süsteem on export-aware. Tulemuseks ei ole ainult soovitus, vaid valmis artefaktipakett.
- Süsteem loob silla eksperdi teadmiste ja algaja operaatori vahele.

## 6. Mida projekt tehniliselt juba täna sisaldab

Koodibaasis on reaalselt olemas järgmised moodulid ja võimekused.

- eraldi Next.js frontend ja Express backend
- 70 lasermasinat 16 brändist koosnev masinakataloog
- 24 materjaliprofiili sisaldav materjalikataloog
- failipõhine autentimine koos rollidega admin ja user
- admin-only teadmistebaas püsisalvestusega
- AI chat route tekstile ja pildikontekstile
- OpenAI-põhine pildigeneraatori integratsioon
- graveerimisoptimeerimise pipeline TypeScriptis
- eraldi Python worker deterministlikuks pilditöötluseks
- LightBurn projekti ja ZIP-ekspordi generaator
- SVG ja DXF vektorjälgimise võime PNG rasteri põhjal

See tähendab, et tegemist ei ole ainult ideedokumendiga. Põhifunktsioonid ja koormusjaotus on juba implementeeritud.

## 7. Kuidas süsteem otsast lõpuni töötab

### Vool 1: tekstist graveerimisfailini

1. Kasutaja valib masina, materjali, paksuse ja režiimi.
2. Süsteem arvutab soovituslikud laserseaded.
3. Kasutaja kirjeldab soovitud motiivi tekstina.
4. Prompt optimizer muudab sisendi graveerimissobivaks, suunates selle monokroomsuse, kontrasti ja puhta serva poole.
5. Image generation route kutsub pildigeneraatori ning tagastab algse pildi.
6. Optimizer pipeline analüüsib pildi sobivust graveerimiseks.
7. Süsteem valib töötlusloogika, näiteks threshold, dither või vector.
8. Python worker toodab normaliseeritud, optimeeritud ja eelvaatepildi.
9. Simulatsiooni moodul annab pass, warn või fail hinnangu.
10. Export route loob ZIP-paketi koos piltide, seadistuste ja LightBurni manifestiga.

### Vool 2: olemasolevast pildist graveerimisfailini

1. Kasutaja laeb pildi üles.
2. Pilt normaliseeritakse serveripoolselt.
3. Süsteem hindab kontrasti, servade kvaliteeti, detaili tihedust ja tausta keerukust.
4. Preset-aware loogika otsustab, kas kasutada binaarset threshold'i, ditheringut või vektorjälgimist.
5. Python worker toodab pildi graveerimiseks sobivamaks.
6. Export route pakib tulemuse tootmisvalmis kujul kokku.

### Vool 3: teadmistega rikastatud nõuandlus

1. Admin haldab teadmistebaasi sisu.
2. Chat route loeb teadmistebaasi konteksti ja lisab selle system prompti.
3. Kasutaja saab vastused, mis arvestavad nii presetit kui ka admini sisestatud juhiseid.

## 8. Kuidas projekt seda tehniliselt teeb

### Frontend

Frontend on ehitatud Next.js 16 ja React 19 peale. See haldab kasutajaliidest, töötleb vestluse, seadistusmooduli, optimeerija paneeli ja ekspordi algatamise.

Peamised vastutusalad frontendis:

- kasutaja sisendi koondamine
- masinate ja materjalide valik
- chat-liidese ja pildi uploadi haldus
- optimeerimise ja ekspordi töötluse kuvamine
- admini teadmistepaneel

### Backend

Backend on ehitatud Expressi peale ning pakub järgmisi teenuseid:

- autentimine ja sessioonihaldus
- kasutajate rollihaldus
- parooli vahetus ja admin-assisted password reset
- masinate ja materjalide API
- laseriseadete soovitusmootor

### AI kiht

AI kiht on jagatud kaheks.

- chat ja vision kasutavad Groq või OpenAI-põhist chat completions integraatsiooni
- pildigeneratsioon kasutab OpenAI-compatible image generation integraatsiooni

Selline eristus võimaldab kasutada AI-d loova sisendi jaoks, kuid jätta tootmise kvaliteedikriitilised otsused kontrollitud koodi teha.

### Deterministlik töötluskiht

TypeScripti ja Pythoni kooslus moodustab tootmisloogika tuuma.

- preset-engine parsib salvestatud seadistuse ühtseks presetiks
- prompt-optimizer parandab sisendit graveerimissobivamaks
- image-normalization planeerib töötluse standardid
- image-analyzer hindab pildi liiki ja sobivust
- engraving-mode otsustab, millist töötlusviisi kasutada
- laser-simulation annab kvaliteedihinnangu
- vector-engraving loob vajadusel SVG ja DXF jälgimise
- zip-export koostab lõplahenduse paketi
- Python worker toodab Pillow abil normaliseeritud ja optimeeritud pildi

### Püsisalvestus

Praeguses faasis kasutab projekt kahte JSON-põhist püsisalvestust.

- backend/data/auth-store.json hoiab kasutajaid, sessioone ja reset-taotlusi
- frontend/data/knowledge-store.json hoiab admini teadmistebaasi sisu

See lahendus sobib MVP, sisemise piloodi ja varajase kasutuse jaoks. Hilisemas skaleerimisetapis on selge migratsioonitee relatsioonilisse andmebaasi.

## 9. Reaalsed tehnilised tõenduspinnad koodibaasis

Järgmised failid kinnitavad, et projekti peamised väited on koodis olemas.

- backend/server.js: autentimine, kasutajahaldus, masinate API, materjalide API ja soovitusmootori route'id
- backend/laser-data.js: masinakataloog, materjalikataloog ja soovitusloogika
- backend/auth-store.js: failipõhine kasutaja- ja sessioonihaldus
- frontend/app/api/chat/route.ts: AI chat ja vision orkestreerimine
- frontend/app/api/image-generation/route.ts: pildigeneratsiooni route
- frontend/app/api/engraving-optimize/route.ts: optimeerimispipeline'i route
- frontend/app/api/engraving-export/route.ts: ZIP ja LightBurn ekspordi route
- frontend/lib/engraving/optimizer-pipeline.ts: tootmisotsuste orkestreerimine
- frontend/lib/engraving/lightburn-project.ts: LightBurn manifesti loogika
- frontend/lib/engraving/vector-engraving.ts: SVG ja DXF töötlusvoog
- frontend/lib/knowledge-store.ts: admin-only teadmistebaasi püsisalvestus
- workers/image_optimizer/worker.py: Pythoni pilditöötlusworker

## 10. Mis seisus projekt praegu on

Kõige täpsem kirjeldus praegusele seisule on: töötav arenenud MVP.

See hinnang põhineb sellel, et:

- rakendusel on toimiv frontend ja backend eraldi teenustena
- core workflowd on koodis olemas, mitte ainult plaanina kirjas
- frontend build läheb edukalt läbi
- backend health endpoint vastab korrektselt
- OpenAI-pildigeneratsiooni konfiguratsioon oli kontrolli hetkel toimiv
- AI vestluse, preset-konteksti, optimeerimise ja ekspordi loogika on koostoimes olemas

Samas on aus investorivaates öelda, et enne laiemat kommertsialiseerimist on vaja veel järgmised sammud läbi teha.

- frontend lint cleanup ja React reeglite puhastus
- automatiseeritud testid kriitilistele workflowdele
- production deployment skriptid ja monitooring
- workeri job queue, kui kasutuskoormus kasvab
- andmebaasipõhine püsisalvestus juhul, kui kasutajate maht suureneb

## 11. Miks see projekt võib olla atraktiivne investeerimisobjekt

Investorivaates on tugevus selles, et projekt asub selges nišis, kus AI lisab väärtust ainult siis, kui see on seotud reaalse tootmispiiranguga. Siin ei konkureerita lihtsalt üldise AI-chatiga, vaid ehitatakse vertikaalne tööriist kindla tootmisprotsessi jaoks.

Potentsiaalne tugevus tuleb järgmisest kombinatsioonist.

- kitsas, selge probleem ja selge sihtkasutaja
- olemasolev MVP, mis demonstreerib tehnilist teostatavust
- võimalus muuta ekspertteadmine standardiseeritud tarkvarafunktsiooniks
- võimalus siduda tarkvara masina- ja materjalipõhiste presetitega
- võimalus luua korduvtulu tarkvaralitsentsi, kasutuspakettide või B2B juurutuse kaudu

## 12. Võimalikud ärimudelid

Järgmised ärimudelid sobivad selle projekti olemusega.

- kuupõhine SaaS lasergraveerimise töökodadele
- usage-based hinnastus AI pildigeneratsiooni ja optimeerimise mahu järgi
- premium paketid suurema masinakataloogi, team workflowde ja admin-funktsioonidega
- B2B white-label lahendus graveerimisteenuse pakkujatele või masinamüüjatele
- enterprise juurutus tootmisettevõtetele, kes soovivad sisemist standardiseerimist

## 13. Soovituslik arenguplaan järgmise 6-12 kuu jaoks

### Etapp 1: tootmiskindel MVP

- lint ja testide puhastus
- deploy hardening Windows/Linux Node serverile
- logimine, alerting ja tervisekontrollid
- andmete varundus ja rollback protseduurid

### Etapp 2: pilootklientide faas

- pilootprojektid 3-5 sihtkasutajaga
- toorikute, materjalide ja masinaklasside põhine presetite täitmine
- ekspordi ja simulatsiooni kvaliteedimetoodika valideerimine päris kasutuses

### Etapp 3: skaleerimisvalmidus

- JSON -> andmebaasi migratsioon
- worker queue ja asünkroonne job orchestration
- kasutajapõhine usage metering
- CRM, tellimuste ja arveldusloogika lisamine

## 14. Kokkuvõte investorile

Laser Graveerimine on vertikaalne AI + manufacturing software projekt, mille eesmärk on muuta lasergraveerimise eeltöö kiiremaks, turvalisemaks ja standardiseeritumaks. Projekti tugevus on selles, et see ei looda ainult AI loovusele, vaid seob selle masinapõhiste reeglite, deterministliku pilditöötluse ja eksporditava tootmisväljundiga.

Praegune seis ei ole pelgalt kontseptsioon. Koodibaasis on olemas toimiv arenenud MVP, mille peamised ehituskivid on:

- masinapõhine soovitusmootor
- AI chat ja pildigeneratsioon
- preset-aware graveerimisoptimeerimine
- Python-põhine deterministlik töötlus
- LightBurn ja ZIP eksport
- adminipõhine teadmistejuhtimine

Investorivaates on tegemist projektiga, millel on tugev tehniline loogika, selge kasutusjuht ja realistlik tee piloodist kommertstooteni.