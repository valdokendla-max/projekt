export interface SeoSection {
  title: string
  body: string
}

export interface SeoFaq {
  question: string
  answer: string
}

export interface SeoPageContent {
  slug: string
  title: string
  description: string
  intro: string
  sections: SeoSection[]
  faqs: SeoFaq[]
}

export interface SeoGuideSummary {
  slug: string
  title: {
    et: string
    en: string
  }
  description: {
    et: string
    en: string
  }
}

export const SEO_GUIDE_SUMMARIES: SeoGuideSummary[] = [
  {
    slug: 'laser-graveerimine-puidule',
    title: {
      et: 'Laser graveerimine puidule',
      en: 'Laser engraving on wood',
    },
    description: {
      et: 'Seadistused, materjal, testimine ja pildi ettevalmistus puidule graveerimiseks.',
      en: 'Settings, materials, testing, and image preparation for engraving on wood.',
    },
  },
  {
    slug: 'laser-graveerimine-metallile',
    title: {
      et: 'Laser graveerimine metallile',
      en: 'Laser engraving on metal',
    },
    description: {
      et: 'Praktiline ülevaade metallile märgistuse ja graveerimise ettevalmistusest.',
      en: 'A practical overview for preparing metal marking and engraving jobs.',
    },
  },
  {
    slug: 'logo-graveerimine',
    title: {
      et: 'Logo graveerimine',
      en: 'Logo engraving',
    },
    description: {
      et: 'Kuidas valmistada logo fail lasergraveerimiseks ette ja valida õige formaat.',
      en: 'How to prepare a logo file for laser engraving and choose the right format.',
    },
  },
  {
    slug: 'lightburn-eksport',
    title: {
      et: 'LightBurn eksport',
      en: 'LightBurn export',
    },
    description: {
      et: 'Millal kasutada PNG, SVG või DXF faili ning kuidas vältida ekspordivigu.',
      en: 'When to use PNG, SVG, or DXF and how to avoid export mistakes.',
    },
  },
  {
    slug: 'foto-lasergraveerimiseks',
    title: {
      et: 'Foto lasergraveerimiseks',
      en: 'Photo for laser engraving',
    },
    description: {
      et: 'Kontrast, threshold, tausta puhastus ja detaili säilitamine fotograveerimisel.',
      en: 'Contrast, threshold, background cleanup, and detail preservation for photo engraving.',
    },
  },
  {
    slug: 'lasergraveerimise-seadistused',
    title: {
      et: 'Lasergraveerimise seadistused',
      en: 'Laser engraving settings',
    },
    description: {
      et: 'Kiiruse, võimsuse, passide ja töörežiimi valik praktilise lähteseadistusena.',
      en: 'Choosing speed, power, passes, and engraving mode as practical starting settings.',
    },
  },
]

export const SEO_GUIDES: Record<string, SeoPageContent> = {
  'laser-graveerimine-puidule': {
    slug: 'laser-graveerimine-puidule',
    title: 'Laser graveerimine puidule',
    description: 'Praktiline juhend lasergraveerimiseks puidule: seadistused, kiirus, võimsus, pildi ettevalmistus ja töövoog.',
    intro: 'Lasergraveerimine puidule vajab õiget kiiruse, võimsuse, passide ja kontrasti tasakaalu. Selle lehe eesmärk on anda selge lähtekoht, kuidas valmistada puitmaterjalile töö ette nii testimiseks kui tootmiseks.',
    sections: [
      {
        title: 'Millest alustada',
        body: 'Puidu puhul sõltub tulemus liigist, niiskusest, pinnatöötlusest ja masina optikast. Hea lähtepunkt on valida sobiv materjal, alustada konservatiivsete seadistustega ja teha väike testkaart enne lõplikku graveerimist.',
      },
      {
        title: 'Pildi ettevalmistus',
        body: 'Fotode ja logode puhul tuleb puidule graveerimiseks pöörata tähelepanu kontrastile, taustale ja detaili tihedusele. Puhas threshold või korrektne dither aitab puidul hoida detaili ilma liigse põletuseta.',
      },
      {
        title: 'Tootmisvoog',
        body: 'Praktiline töövoog on: vali masin ja puiduliik, loo testseaded, puhasta kujundus, tee proovigraveering ja ekspordi töö sobivasse formaati nagu PNG, SVG või DXF sõltuvalt töö tüübist.',
      },
    ],
    faqs: [
      {
        question: 'Milline puit sobib lasergraveerimiseks?',
        answer: 'Tavaliselt sobivad hästi ühtlase pinnaga vineer, kasepuit, vaher ja teised stabiilsed puitmaterjalid. Tulemus sõltub alati materjali koostisest ja pinnakihist.',
      },
      {
        question: 'Kas puidule graveerides peab enne testima?',
        answer: 'Jah. Puidu toon, niiskus ja vaigusus muudavad tulemust tugevalt, seega on testkaart enne lõputööd praktiliselt kohustuslik.',
      },
    ],
  },
  'laser-graveerimine-metallile': {
    slug: 'laser-graveerimine-metallile',
    title: 'Laser graveerimine metallile',
    description: 'Praktiline juhend lasergraveerimiseks metallile: märgistus, kontrast, faili ettevalmistus ja tööplaneerimine.',
    intro: 'Metallile lasergraveerimine nõuab korrektselt ettevalmistatud faili, sobivat märgistuse strateegiat ja kontrollitud seadistusi. See leht aitab mõista, kuidas planeerida metallile graveerimist nii, et tulemus oleks puhas ja loetav.',
    sections: [
      {
        title: 'Materjal ja märgistuse eesmärk',
        body: 'Erinevad metallid reageerivad erinevalt. Oluline on aru saada, kas eesmärk on pindmine märgistus, visuaalne kontrast või püsiv tähistus ning kohandada faili ja seadistusi selle järgi.',
      },
      {
        title: 'Faili lihtsustamine',
        body: 'Metallile graveeritavad märgised ja logod peaksid olema selged, kõrge kontrastiga ja ilma liigse detailita. Väga peened jooned või mürane raster vähendavad loetavust.',
      },
      {
        title: 'Kontrollitud tööprotsess',
        body: 'Praktiline töövoog on: vali metall ja töö eesmärk, lihtsusta kujundus, testi väikesel alal ja seejärel ekspordi fail õiges formaadis edasiseks kasutuseks.',
      },
    ],
    faqs: [
      {
        question: 'Kas metallile graveerimiseks sobib sama fail nagu puidule?',
        answer: 'Mitte alati. Metall vajab sageli puhtamat kontrasti ja lihtsamat detaili, sest eesmärk on enamasti loetav märgistus või identifitseerimine.',
      },
      {
        question: 'Kas metallile graveerides tuleb kindlasti testida?',
        answer: 'Jah. Erinev metallitüüp ja pinnakate mõjutavad kontrasti tugevalt, seega on testimine vajalik enne lõplikku tööd.',
      },
    ],
  },
  'logo-graveerimine': {
    slug: 'logo-graveerimine',
    title: 'Logo graveerimine',
    description: 'Logo graveerimise juhend: kuidas valmistada logo fail ette lasergraveerimiseks, valida formaat ja hoida detail puhas.',
    intro: 'Logo graveerimine nõuab selget faili, puhast kontuuri ja õigesti valitud väljundit. Selle lehe eesmärk on kirjeldada, kuidas valmistada logo ette märgistuseks, tootebrändinguks või detailseks graveeringuks.',
    sections: [
      {
        title: 'Õige faili valik',
        body: 'Logo graveerimise puhul on oluline eristada raster- ja vektorgraafikat. Kui töö nõuab puhast kontuuri või lõikust, on SVG või DXF tavaliselt parem. Kui töö on pigem tooniline või fotolaadne, võib PNG olla sobivam.',
      },
      {
        title: 'Kontrasti ja detaili säilitamine',
        body: 'Hea graveeritav logo väldib liiga peeneid joonekesi, ülemäärast müra ja ebaühtlast tausta. Enne eksporti tasub eemaldada visuaalne prügi ja kontrollida, et väiksed detailid püsiksid loetavad.',
      },
      {
        title: 'Rakendused tootmises',
        body: 'Logo graveerimist kasutatakse sageli puidust toodetel, metallplaatidel, nahal ja märgistuses. Kõige parem tulemus tuleb siis, kui kujundus, materjal ja masina seadistus on koos läbi mõeldud.',
      },
    ],
    faqs: [
      {
        question: 'Kas logo jaoks on parem SVG või PNG?',
        answer: 'Kui logo koosneb selgetest joontest ja kujunditest, on SVG tavaliselt parem. Kui tegemist on keerukama või fotolaadse kujundiga, võib PNG sobida paremini.',
      },
      {
        question: 'Kas logo graveerimine vajab tausta eemaldamist?',
        answer: 'Enamasti jah. Puhas läbipaistev või ühtlane taust aitab saada parema ja prognoositavama graveerimistulemuse.',
      },
    ],
  },
  'lightburn-eksport': {
    slug: 'lightburn-eksport',
    title: 'LightBurn eksport',
    description: 'LightBurni ekspordi juhend lasergraveerimiseks: failiformaadid, töö ettevalmistus, pildi puhastus ja praktiline väljundivalik.',
    intro: 'LightBurni eksport on viimane oluline samm enne töö masinasse saatmist. See leht aitab mõista, millal kasutada PNG, SVG või DXF faili ning kuidas valmistada kujundus ette nii, et eksport oleks praktiline ja tootmiskindel.',
    sections: [
      {
        title: 'Millal kasutada PNG, SVG või DXF',
        body: 'PNG sobib hästi rastergraveerimiseks ja fotodeks. SVG sobib joonisele ja puhtale kontuurile. DXF on levinud siis, kui töö tuleb ühendada CAD-põhise või tehnilise joonise töövooga.',
      },
      {
        title: 'Ekspordi eelkontroll',
        body: 'Enne eksporti tuleb kontrollida mõõtkava, kontrasti, joonepaksust, tausta ja kihte. Kui need on valed, kandub probleem LightBurni ja tulemuseks võib olla vale põletus või vigane lõikejoon.',
      },
      {
        title: 'Praktiline töövoog',
        body: 'Hea töövoog on: puhasta kujundus, sobita see materjaliga, vali õige formaat, kontrolli mõõdud ja tee LightBurnis viimane test enne tootmist. See vähendab raiskamist ja parandab korduvust.',
      },
    ],
    faqs: [
      {
        question: 'Kas LightBurni jaoks peab alati kasutama vektorfaili?',
        answer: 'Ei. Rastergraveerimiseks kasutatakse sageli PNG faili, samal ajal kui kontuurid ja lõikused sobivad paremini SVG või DXF formaadis.',
      },
      {
        question: 'Miks eksport on tähtis?',
        answer: 'Õige eksport aitab säilitada mõõtkava, detaili, kontrasti ja töö loogika. Vale formaat või halvasti ettevalmistatud fail võib rikkuda kogu graveerimise tulemuse.',
      },
    ],
  },
  'foto-lasergraveerimiseks': {
    slug: 'foto-lasergraveerimiseks',
    title: 'Foto lasergraveerimiseks',
    description: 'Kuidas valmistada foto lasergraveerimiseks ette: kontrast, threshold, taust, resolutsioon ja detaili säilitamine.',
    intro: 'Foto lasergraveerimiseks ettevalmistus määrab suure osa lõpptulemusest. Õige kontrast, tausta puhastus, toonide lihtsustamine ja sobiv väljund aitavad vältida porist ja liiga tumedat graveeringut.',
    sections: [
      {
        title: 'Kontrasti juhtimine',
        body: 'Fotograveerimise puhul tuleb kõigepealt saavutada loetav põhikontrast. Liiga pehme või liiga mürane foto kaotab graveerides detaili, seega tuleb oluline sisu taustast selgelt eraldada.',
      },
      {
        title: 'Threshold ja dither',
        body: 'Mõne pildi puhul töötab puhas threshold paremini, teisel juhul aitab dither säilitada varjundit. Valik sõltub materjalist, masinast ja sellest, kui palju detaili on vaja alles hoida.',
      },
      {
        title: 'Praktiline väljund',
        body: 'Parim tulemus tuleb siis, kui foto puhastatakse enne eksporti, taust eemaldatakse või lihtsustatakse, ning töö kontrollitakse väikese prooviga enne lõplikku graveerimist.',
      },
    ],
    faqs: [
      {
        question: 'Kas iga foto sobib lasergraveerimiseks?',
        answer: 'Ei. Kõige paremini töötavad fotod, kus objekt eristub taustast ja olulised detailid ei kao juba algses pildis ära.',
      },
      {
        question: 'Kas taust tuleb eemaldada?',
        answer: 'Paljudel juhtudel jah. Liigne taust lisab müra ja võib muuta graveeringu liiga tumedaks või segaseks.',
      },
    ],
  },
  'lasergraveerimise-seadistused': {
    slug: 'lasergraveerimise-seadistused',
    title: 'Lasergraveerimise seadistused',
    description: 'Lasergraveerimise seadistused algajale ja tootmisele: kiirus, võimsus, passid, režiim ja praktiline testimise loogika.',
    intro: 'Lasergraveerimise seadistused ei ole üks kindel number, vaid kombinatsioon masina võimsusest, materjalist, töö eesmärgist ja faili omadustest. Selle lehe eesmärk on anda loogiline lähtekoht, kuidas sobivate seadistusteni jõuda.',
    sections: [
      {
        title: 'Kiirus ja võimsus',
        body: 'Kiirus ja võimsus mõjutavad korraga nii sügavust, tumedust kui detaili. Liiga aeglane või liiga võimas seadistus võib põletada, liiga nõrk seadistus jätab tulemuse heledaks või ebaühtlaseks.',
      },
      {
        title: 'Passid ja töörežiim',
        body: 'Mõni töö vajab ühte kiiret läbimist, teine mitu rahulikumat passi. Samuti tuleb valida, kas töö on tooniline raster, threshold, dither või puhas vektorkontuur.',
      },
      {
        title: 'Kuidas õigete seadistusteni jõuda',
        body: 'Kõige praktilisem viis on kasutada testkaarti, salvestada tulemused ja liikuda väikeste muudatustega. Nii tekib oma masina ja materjalide jaoks usaldusväärne lähtebaas.',
      },
    ],
    faqs: [
      {
        question: 'Kas on olemas universaalsed lasergraveerimise seadistused?',
        answer: 'Ei. Seadistused sõltuvad masinast, materjalist, optikast, faili tüübist ja töö eesmärgist. Universaalse numbri asemel on vaja head lähtebaasi ja testimist.',
      },
      {
        question: 'Miks testkaart on oluline?',
        answer: 'Testkaart aitab kiiresti näha, kuidas kiirus ja võimsus konkreetse materjali peal käituvad ning vähendab eksimusi enne lõputööd.',
      },
    ],
  },
}