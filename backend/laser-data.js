const LASER_MACHINES = [
  {
    id: "xtool-d1-pro-10w",
    brand: "xTool",
    model: "D1 Pro 10W",
    laserType: "diode",
    powerW: 10,
  },
  {
    id: "xtool-d1-pro-20w",
    brand: "xTool",
    model: "D1 Pro 20W",
    laserType: "diode",
    powerW: 20,
  },
  {
    id: "ortur-lm3-10w",
    brand: "Ortur",
    model: "Laser Master 3 10W",
    laserType: "diode",
    powerW: 10,
  },
  {
    id: "omtech-k40",
    brand: "OMTech",
    model: "K40 40W",
    laserType: "co2",
    powerW: 40,
  },
  {
    id: "omtech-60w",
    brand: "OMTech",
    model: "60W CO2",
    laserType: "co2",
    powerW: 60,
  },
  {
    id: "raycus-fiber-30w",
    brand: "Raycus",
    model: "30W Fiber",
    laserType: "fiber",
    powerW: 30,
  },
  {
    id: "mecpow-m1-3-5w",
    brand: "Mecpow",
    model: "M1 3.5W Laser Engraver",
    laserType: "diode",
    powerW: 3.5,
  },
  {
    id: "mecpow-m1-5w",
    brand: "Mecpow",
    model: "M1 5W Laser Engraver",
    laserType: "diode",
    powerW: 5,
  },
  {
    id: "mecpow-x1-10w-blue",
    brand: "Mecpow",
    model: "X1 Dual Laser 10W (Blue)",
    laserType: "diode",
    powerW: 10,
  },
  {
    id: "mecpow-x1-2w-ir",
    brand: "Mecpow",
    model: "X1 Dual Laser 2W (IR)",
    laserType: "infrared",
    powerW: 2,
  },
  {
    id: "mecpow-x3-5w",
    brand: "Mecpow",
    model: "X3 5W Laser Engraver",
    laserType: "diode",
    powerW: 5,
  },
  {
    id: "mecpow-x3-pro-10w",
    brand: "Mecpow",
    model: "X3 Pro 10W Laser Engraver",
    laserType: "diode",
    powerW: 10,
  },
  {
    id: "mecpow-x4-22w",
    brand: "Mecpow",
    model: "X4 22W Laser Engraver",
    laserType: "diode",
    powerW: 22,
  },
  {
    id: "mecpow-x4-pro-22w",
    brand: "Mecpow",
    model: "X4 Pro 22W Laser Engraver",
    laserType: "diode",
    powerW: 22,
  },
  {
    id: "mecpow-x4-pro-40w-20w-mode",
    brand: "Mecpow",
    model: "X4 Pro-40W 20W Mode",
    laserType: "diode",
    powerW: 20,
  },
  {
    id: "mecpow-x4-pro-40w-40w-mode",
    brand: "Mecpow",
    model: "X4 Pro-40W 40W Mode",
    laserType: "diode",
    powerW: 40,
  },
  {
    id: "mecpow-x5-22w",
    brand: "Mecpow",
    model: "X5 22W Laser Engraver",
    laserType: "diode",
    powerW: 22,
  },
  {
    id: "mecpow-x5-pro-33w",
    brand: "Mecpow",
    model: "X5 Pro 33W Laser Engraver",
    laserType: "diode",
    powerW: 33,
  },
  {
    id: "xtool-f2-15w-blue",
    brand: "xTool",
    model: "F2 Dual Laser 15W (Blue)",
    laserType: "diode",
    powerW: 15,
  },
  {
    id: "xtool-f2-5w-ir",
    brand: "xTool",
    model: "F2 Dual Laser 5W (IR)",
    laserType: "infrared",
    powerW: 5,
  },
  {
    id: "ortur-h10-20w",
    brand: "Ortur",
    model: "Laser Master H10 20W",
    laserType: "diode",
    powerW: 20,
  },
  {
    id: "ortur-h20-10w-blue",
    brand: "Ortur",
    model: "H20 10W (Blue)",
    laserType: "diode",
    powerW: 10,
  },
  {
    id: "ortur-h20-2w-ir",
    brand: "Ortur",
    model: "H20 2W (IR)",
    laserType: "infrared",
    powerW: 2,
  },
  {
    id: "omtech-polar-lite-55w",
    brand: "OMTech",
    model: "Polar Lite 55W Desktop CO2",
    laserType: "co2",
    powerW: 55,
  },
  {
    id: "omtech-pronto-40-90w",
    brand: "OMTech",
    model: "Pronto 40 90W CO2",
    laserType: "co2",
    powerW: 90,
  },
  {
    id: "omtech-galvo-30w",
    brand: "OMTech",
    model: "Galvo 30W Fiber",
    laserType: "fiber",
    powerW: 30,
  },
  {
    id: "atomstack-a20-pro-v2-20w",
    brand: "AtomStack",
    model: "A20 Pro V2 20W",
    laserType: "diode",
    powerW: 20,
  },
  {
    id: "atomstack-a40-pro-v2-40w",
    brand: "AtomStack",
    model: "A40 Pro V2 40W",
    laserType: "diode",
    powerW: 40,
  },
  {
    id: "atomstack-a20-pro-1064-20w",
    brand: "AtomStack",
    model: "A20 Pro 1064nm 20W Fiber",
    laserType: "fiber",
    powerW: 20,
  },
  {
    id: "longer-ray5-20w",
    brand: "Longer",
    model: "Ray5 20W",
    laserType: "diode",
    powerW: 20,
  },
  {
    id: "longer-b1-30w",
    brand: "Longer",
    model: "B1 30W",
    laserType: "diode",
    powerW: 30,
  },
  {
    id: "longer-nano-pro-12w",
    brand: "Longer",
    model: "Nano Pro 12W",
    laserType: "diode",
    powerW: 12,
  },
  {
    id: "creality-falcon-a1-10w",
    brand: "Creality Falcon",
    model: "Falcon A1 10W",
    laserType: "diode",
    powerW: 10,
  },
  {
    id: "creality-falcon-a1-pro-20w-blue",
    brand: "Creality Falcon",
    model: "Falcon A1 Pro 20W (Blue)",
    laserType: "diode",
    powerW: 20,
  },
  {
    id: "creality-falcon-a1-pro-2w-ir",
    brand: "Creality Falcon",
    model: "Falcon A1 Pro 2W (IR)",
    laserType: "infrared",
    powerW: 2,
  },
  {
    id: "creality-falcon2-40w",
    brand: "Creality Falcon",
    model: "Falcon2 40W",
    laserType: "diode",
    powerW: 40,
  },
  {
    id: "glowforge-aura-6w",
    brand: "Glowforge",
    model: "Aura 6W",
    laserType: "diode",
    powerW: 6,
  },
  {
    id: "glowforge-plus-40w",
    brand: "Glowforge",
    model: "Plus 40W",
    laserType: "co2",
    powerW: 40,
  },
  {
    id: "glowforge-pro-hd-45w",
    brand: "Glowforge",
    model: "Pro HD 45W",
    laserType: "co2",
    powerW: 45,
  },
  {
    id: "epilog-fusion-ascent-24-60w",
    brand: "Epilog",
    model: "Fusion Ascent 24 60W",
    laserType: "co2",
    powerW: 60,
  },
  {
    id: "epilog-fusion-pro-36-80w",
    brand: "Epilog",
    model: "Fusion Pro 36 80W",
    laserType: "co2",
    powerW: 80,
  },
  {
    id: "epilog-fusion-galvo-g100-60w",
    brand: "Epilog",
    model: "Fusion Galvo G100 60W",
    laserType: "fiber",
    powerW: 60,
  },
  {
    id: "trotec-speedy-400-120w",
    brand: "Trotec",
    model: "Speedy 400 120W",
    laserType: "co2",
    powerW: 120,
  },
  {
    id: "trotec-r400-120w",
    brand: "Trotec",
    model: "R400 120W",
    laserType: "co2",
    powerW: 120,
  },
  {
    id: "trotec-u300-20w",
    brand: "Trotec",
    model: "U300 20W Fiber",
    laserType: "fiber",
    powerW: 20,
  },
  {
    id: "sculpfun-icube-ultra-12w",
    brand: "SCULPFUN",
    model: "iCube Ultra 12W",
    laserType: "diode",
    powerW: 12,
  },
  {
    id: "sculpfun-g9-10w-blue",
    brand: "SCULPFUN",
    model: "G9 10W (Blue)",
    laserType: "diode",
    powerW: 10,
  },
  {
    id: "sculpfun-g9-2w-ir",
    brand: "SCULPFUN",
    model: "G9 2W (IR)",
    laserType: "infrared",
    powerW: 2,
  },
  {
    id: "sculpfun-s40-max-48w",
    brand: "SCULPFUN",
    model: "S40 MAX 48W",
    laserType: "diode",
    powerW: 48,
  },
  {
    id: "sculpfun-s70-max-70w",
    brand: "SCULPFUN",
    model: "S70 MAX 70W",
    laserType: "diode",
    powerW: 70,
  },
  {
    id: "sculpfun-a9-ultra-40w-blue",
    brand: "SCULPFUN",
    model: "A9 Ultra 40W (Blue)",
    laserType: "diode",
    powerW: 40,
  },
  {
    id: "sculpfun-a9-ultra-20w-fiber",
    brand: "SCULPFUN",
    model: "A9 Ultra 20W Fiber",
    laserType: "fiber",
    powerW: 20,
  },
  {
    id: "laserpecker-lp2-plus-10w",
    brand: "LaserPecker",
    model: "LP2 Plus 10W",
    laserType: "diode",
    powerW: 10,
  },
  {
    id: "laserpecker-lp4-10w-blue",
    brand: "LaserPecker",
    model: "LP4 10W (Blue)",
    laserType: "diode",
    powerW: 10,
  },
  {
    id: "laserpecker-lp4-2w-ir",
    brand: "LaserPecker",
    model: "LP4 2W (IR)",
    laserType: "infrared",
    powerW: 2,
  },
  {
    id: "laserpecker-lp5-20w-diode",
    brand: "LaserPecker",
    model: "LP5 20W Diode",
    laserType: "diode",
    powerW: 20,
  },
  {
    id: "laserpecker-lp5-20w-fiber",
    brand: "LaserPecker",
    model: "LP5 20W Fiber",
    laserType: "fiber",
    powerW: 20,
  },
  {
    id: "laserpecker-lp3-1w-ir",
    brand: "LaserPecker",
    model: "LP3 1W IR",
    laserType: "infrared",
    powerW: 1,
  },
  {
    id: "monport-reno45-pro-45w",
    brand: "Monport",
    model: "Reno45 Pro Vision 45W",
    laserType: "co2",
    powerW: 45,
  },
  {
    id: "monport-effi13s-130w",
    brand: "Monport",
    model: "Effi13S 130W",
    laserType: "co2",
    powerW: 130,
  },
  {
    id: "monport-gt-30w",
    brand: "Monport",
    model: "GT 30W Fiber",
    laserType: "fiber",
    powerW: 30,
  },
  {
    id: "monport-ga-100w",
    brand: "Monport",
    model: "GA 100W MOPA",
    laserType: "fiber",
    powerW: 100,
  },
  {
    id: "flux-ador-20w-blue",
    brand: "FLUX",
    model: "Ador 20W Diode",
    laserType: "diode",
    powerW: 20,
  },
  {
    id: "flux-ador-2w-ir",
    brand: "FLUX",
    model: "Ador 2W Infrared",
    laserType: "infrared",
    powerW: 2,
  },
  {
    id: "flux-beamo-30w",
    brand: "FLUX",
    model: "beamo 30W CO2",
    laserType: "co2",
    powerW: 30,
  },
  {
    id: "flux-beambox-40w",
    brand: "FLUX",
    model: "Beambox 40W CO2",
    laserType: "co2",
    powerW: 40,
  },
  {
    id: "flux-beambox-pro-50w",
    brand: "FLUX",
    model: "Beambox Pro 50W CO2",
    laserType: "co2",
    powerW: 50,
  },
  {
    id: "flux-hexa-60w",
    brand: "FLUX",
    model: "HEXA 60W CO2",
    laserType: "co2",
    powerW: 60,
  },
  {
    id: "snapmaker-2-0-20w",
    brand: "Snapmaker",
    model: "2.0 20W Laser Module",
    laserType: "diode",
    powerW: 20,
  },
  {
    id: "snapmaker-2-0-40w",
    brand: "Snapmaker",
    model: "2.0 40W Laser Module",
    laserType: "diode",
    powerW: 40,
  },
];

function createOrganicMaterial({ id, name, thicknessRangeMm, note, diode, co2 }) {
  return {
    id,
    name,
    thicknessRangeMm,
    note,
    profiles: {
      diode: {
        engrave: {
          speed: diode.engraveSpeed,
          power: diode.engravePower,
          passes: diode.engravePasses ?? 1,
          lineIntervalMm: 0.1,
          referenceThicknessMm: diode.referenceThicknessMm ?? 3,
          referencePowerW: diode.referencePowerW ?? 10,
          airAssist: diode.airAssist ?? true,
        },
        cut: {
          speed: diode.cutSpeed,
          power: diode.cutPower ?? 100,
          passes: diode.cutPasses,
          lineIntervalMm: 0.1,
          referenceThicknessMm: diode.referenceThicknessMm ?? 3,
          referencePowerW: diode.referencePowerW ?? 10,
          airAssist: diode.airAssist ?? true,
        },
      },
      co2: {
        engrave: {
          speed: co2.engraveSpeed,
          power: co2.engravePower,
          passes: co2.engravePasses ?? 1,
          lineIntervalMm: 0.08,
          referenceThicknessMm: co2.referenceThicknessMm ?? 3,
          referencePowerW: co2.referencePowerW ?? 40,
          airAssist: co2.airAssist ?? true,
        },
        cut: {
          speed: co2.cutSpeed,
          power: co2.cutPower,
          passes: co2.cutPasses ?? 1,
          lineIntervalMm: 0.1,
          referenceThicknessMm: co2.referenceThicknessMm ?? 3,
          referencePowerW: co2.referencePowerW ?? 40,
          airAssist: co2.airAssist ?? true,
        },
      },
    },
  };
}

const WOOD_MATERIALS = [
  createOrganicMaterial({
    id: "wood-birch",
    name: "Puit - Kask",
    thicknessRangeMm: [1, 15],
    note: "Hea universaalne lehtpuit selge kontrasti ja mõõduka tihedusega.",
    diode: { engraveSpeed: 3200, engravePower: 55, cutSpeed: 420, cutPasses: 3 },
    co2: { engraveSpeed: 380, engravePower: 30, cutSpeed: 18, cutPower: 62 },
  }),
  createOrganicMaterial({
    id: "wood-basswood",
    name: "Puit - Pärn (basswood)",
    thicknessRangeMm: [1, 12],
    note: "Väga pehme ja ühtlane puit, sobib detailseks graveerimiseks.",
    diode: { engraveSpeed: 3400, engravePower: 50, cutSpeed: 500, cutPasses: 2 },
    co2: { engraveSpeed: 420, engravePower: 25, cutSpeed: 22, cutPower: 58 },
  }),
  createOrganicMaterial({
    id: "wood-pine",
    name: "Puit - Mänd",
    thicknessRangeMm: [1, 15],
    note: "Vaigune okaspuit. Kontrolli põletusjälgi ja vaigu suitsemist.",
    diode: { engraveSpeed: 3000, engravePower: 50, cutSpeed: 380, cutPasses: 3 },
    co2: { engraveSpeed: 340, engravePower: 28, cutSpeed: 16, cutPower: 60 },
  }),
  createOrganicMaterial({
    id: "wood-oak",
    name: "Puit - Tamm",
    thicknessRangeMm: [1, 18],
    note: "Kõvem lehtpuit, vajab lõikamisel aeglasemat kiirust.",
    diode: { engraveSpeed: 2500, engravePower: 65, cutSpeed: 280, cutPasses: 5 },
    co2: { engraveSpeed: 260, engravePower: 38, cutSpeed: 10, cutPower: 75 },
  }),
  createOrganicMaterial({
    id: "wood-maple",
    name: "Puit - Vaher",
    thicknessRangeMm: [1, 15],
    note: "Tihe ja hele puit, annab puhta graveerimisjoone.",
    diode: { engraveSpeed: 2700, engravePower: 60, cutSpeed: 320, cutPasses: 4 },
    co2: { engraveSpeed: 300, engravePower: 34, cutSpeed: 13, cutPower: 70 },
  }),
  createOrganicMaterial({
    id: "wood-beech",
    name: "Puit - Pöök",
    thicknessRangeMm: [1, 15],
    note: "Ühtlane ja kõva puit, sobib hästi graveeringuteks.",
    diode: { engraveSpeed: 2600, engravePower: 62, cutSpeed: 300, cutPasses: 4 },
    co2: { engraveSpeed: 290, engravePower: 35, cutSpeed: 12, cutPower: 71 },
  }),
  createOrganicMaterial({
    id: "wood-ash",
    name: "Puit - Saar",
    thicknessRangeMm: [1, 18],
    note: "Tugev ja elastne lehtpuit väljendunud süüga.",
    diode: { engraveSpeed: 2700, engravePower: 60, cutSpeed: 320, cutPasses: 4 },
    co2: { engraveSpeed: 300, engravePower: 34, cutSpeed: 13, cutPower: 70 },
  }),
  createOrganicMaterial({
    id: "wood-walnut",
    name: "Puit - Pähkel",
    thicknessRangeMm: [1, 15],
    note: "Tume puit, graveering paistab hästi välja ka madalama võimsusega.",
    diode: { engraveSpeed: 2800, engravePower: 52, cutSpeed: 300, cutPasses: 4 },
    co2: { engraveSpeed: 320, engravePower: 28, cutSpeed: 13, cutPower: 68 },
  }),
  createOrganicMaterial({
    id: "wood-cherry",
    name: "Puit - Kirss",
    thicknessRangeMm: [1, 15],
    note: "Sile ja peeneteraline puit, sobib puhta viimistlusega töödeks.",
    diode: { engraveSpeed: 2900, engravePower: 52, cutSpeed: 340, cutPasses: 3 },
    co2: { engraveSpeed: 330, engravePower: 28, cutSpeed: 15, cutPower: 65 },
  }),
  createOrganicMaterial({
    id: "wood-cedar",
    name: "Puit - Seeder",
    thicknessRangeMm: [1, 12],
    note: "Pehme aromaatne okaspuit, lõikub kergesti kuid võib jätta tahma.",
    diode: { engraveSpeed: 3600, engravePower: 42, cutSpeed: 600, cutPasses: 2 },
    co2: { engraveSpeed: 460, engravePower: 20, cutSpeed: 24, cutPower: 50 },
  }),
];

const PLYWOOD_MATERIALS = [
  createOrganicMaterial({
    id: "plywood-poplar",
    name: "Vineer - Paplivineer",
    thicknessRangeMm: [1, 8],
    note: "Kerge ja pehme vineer, sobib kiireks lõikamiseks.",
    diode: { engraveSpeed: 3300, engravePower: 50, cutSpeed: 520, cutPasses: 2 },
    co2: { engraveSpeed: 400, engravePower: 28, cutSpeed: 20, cutPower: 58 },
  }),
  createOrganicMaterial({
    id: "plywood-basswood",
    name: "Vineer - Pärnavineer (basswood)",
    thicknessRangeMm: [1, 8],
    note: "Väga ühtlane hobiajaline laservineer detailsete tööde jaoks.",
    diode: { engraveSpeed: 3400, engravePower: 48, cutSpeed: 540, cutPasses: 2 },
    co2: { engraveSpeed: 420, engravePower: 24, cutSpeed: 21, cutPower: 56 },
  }),
  createOrganicMaterial({
    id: "plywood-pine",
    name: "Vineer - Männivineer",
    thicknessRangeMm: [1, 10],
    note: "Vaigune vineer, servad võivad vajada lisapuhastust.",
    diode: { engraveSpeed: 3000, engravePower: 55, cutSpeed: 400, cutPasses: 3 },
    co2: { engraveSpeed: 340, engravePower: 30, cutSpeed: 16, cutPower: 62 },
  }),
  createOrganicMaterial({
    id: "plywood-spruce",
    name: "Vineer - Kuusevineer",
    thicknessRangeMm: [1, 10],
    note: "Kerge okaspuuvineer, hea suurte plaatide ja makettide jaoks.",
    diode: { engraveSpeed: 3200, engravePower: 52, cutSpeed: 450, cutPasses: 3 },
    co2: { engraveSpeed: 360, engravePower: 28, cutSpeed: 18, cutPower: 60 },
  }),
  createOrganicMaterial({
    id: "plywood-douglas-fir",
    name: "Vineer - Douglase kuuse vineer",
    thicknessRangeMm: [1, 12],
    note: "Tugevam ehitusvineer, vajab rohkem energiat kui hobi-laservineer.",
    diode: { engraveSpeed: 2900, engravePower: 58, cutSpeed: 360, cutPasses: 4 },
    co2: { engraveSpeed: 320, engravePower: 32, cutSpeed: 15, cutPower: 66 },
  }),
  createOrganicMaterial({
    id: "plywood-okoume",
    name: "Vineer - Okoume merevineer",
    thicknessRangeMm: [1, 10],
    note: "Niiskuskindel vineer, kvaliteet ja liimikihid võivad tootjati erineda.",
    diode: { engraveSpeed: 3000, engravePower: 58, cutSpeed: 350, cutPasses: 4 },
    co2: { engraveSpeed: 300, engravePower: 34, cutSpeed: 14, cutPower: 68 },
  }),
  createOrganicMaterial({
    id: "plywood-meranti",
    name: "Vineer - Meranti vineer",
    thicknessRangeMm: [1, 10],
    note: "Tihedam troopiline vineer, lõikub aeglasemalt kui kask või pappel.",
    diode: { engraveSpeed: 2600, engravePower: 65, cutSpeed: 280, cutPasses: 5 },
    co2: { engraveSpeed: 260, engravePower: 38, cutSpeed: 11, cutPower: 75 },
  }),
  createOrganicMaterial({
    id: "plywood-maple",
    name: "Vineer - Vahtravineer",
    thicknessRangeMm: [1, 8],
    note: "Kõva ja sile pealispind, sobib nähtava pinnaga detailidele.",
    diode: { engraveSpeed: 2800, engravePower: 60, cutSpeed: 320, cutPasses: 4 },
    co2: { engraveSpeed: 300, engravePower: 34, cutSpeed: 13, cutPower: 70 },
  }),
  createOrganicMaterial({
    id: "plywood-oak",
    name: "Vineer - Tammevineer",
    thicknessRangeMm: [1, 8],
    note: "Dekoratiivne kõvapuidu spooniga vineer, vajab lõikamisel ettevaatust.",
    diode: { engraveSpeed: 2500, engravePower: 66, cutSpeed: 260, cutPasses: 5 },
    co2: { engraveSpeed: 250, engravePower: 40, cutSpeed: 10, cutPower: 78 },
  }),
];

const SPECIAL_MATERIALS = [
  {
    id: "birch-plywood",
    name: "Vineer - Balti kasevineer",
    thicknessRangeMm: [1, 8],
    note: "Kõige levinum universaalne laservineer graveerimiseks ja lõikamiseks.",
    profiles: {
      diode: {
        engrave: {
          speed: 3200,
          power: 55,
          passes: 1,
          lineIntervalMm: 0.1,
          referenceThicknessMm: 3,
          referencePowerW: 10,
          airAssist: true,
        },
        cut: {
          speed: 420,
          power: 100,
          passes: 3,
          lineIntervalMm: 0.1,
          referenceThicknessMm: 3,
          referencePowerW: 10,
          airAssist: true,
        },
      },
      co2: {
        engrave: {
          speed: 380,
          power: 30,
          passes: 1,
          lineIntervalMm: 0.08,
          referenceThicknessMm: 3,
          referencePowerW: 40,
          airAssist: true,
        },
        cut: {
          speed: 18,
          power: 62,
          passes: 1,
          lineIntervalMm: 0.1,
          referenceThicknessMm: 3,
          referencePowerW: 40,
          airAssist: true,
        },
      },
    },
  },
  {
    id: "mdf",
    name: "MDF",
    thicknessRangeMm: [1, 6],
    note: "MDF toodab palju suitsu. Kasuta ventilatsiooni.",
    profiles: {
      diode: {
        engrave: {
          speed: 2600,
          power: 65,
          passes: 1,
          lineIntervalMm: 0.1,
          referenceThicknessMm: 3,
          referencePowerW: 10,
          airAssist: true,
        },
        cut: {
          speed: 300,
          power: 100,
          passes: 4,
          lineIntervalMm: 0.1,
          referenceThicknessMm: 3,
          referencePowerW: 10,
          airAssist: true,
        },
      },
      co2: {
        engrave: {
          speed: 300,
          power: 35,
          passes: 1,
          lineIntervalMm: 0.08,
          referenceThicknessMm: 3,
          referencePowerW: 40,
          airAssist: true,
        },
        cut: {
          speed: 14,
          power: 68,
          passes: 1,
          lineIntervalMm: 0.1,
          referenceThicknessMm: 3,
          referencePowerW: 40,
          airAssist: true,
        },
      },
    },
  },
  {
    id: "leather",
    name: "Naturaalne nahk",
    thicknessRangeMm: [1, 4],
    note: "Alusta alati testiga, sest põletusjäljed võivad erineda.",
    profiles: {
      diode: {
        engrave: {
          speed: 2200,
          power: 38,
          passes: 1,
          lineIntervalMm: 0.1,
          referenceThicknessMm: 2,
          referencePowerW: 10,
          airAssist: true,
        },
      },
      co2: {
        engrave: {
          speed: 240,
          power: 18,
          passes: 1,
          lineIntervalMm: 0.08,
          referenceThicknessMm: 2,
          referencePowerW: 40,
          airAssist: true,
        },
      },
    },
  },
  {
    id: "acrylic-black",
    name: "Akrüül (must)",
    thicknessRangeMm: [1, 8],
    note: "Diode-laser lõikab tumedat akrüüli, läbipaistev vajab CO2.",
    profiles: {
      diode: {
        engrave: {
          speed: 1600,
          power: 45,
          passes: 1,
          lineIntervalMm: 0.1,
          referenceThicknessMm: 3,
          referencePowerW: 10,
          airAssist: true,
        },
        cut: {
          speed: 220,
          power: 100,
          passes: 4,
          lineIntervalMm: 0.1,
          referenceThicknessMm: 3,
          referencePowerW: 10,
          airAssist: true,
        },
      },
      infrared: {
        engrave: {
          speed: 900,
          power: 70,
          passes: 1,
          lineIntervalMm: 0.06,
          referenceThicknessMm: 3,
          referencePowerW: 2,
          airAssist: false,
        },
      },
      co2: {
        engrave: {
          speed: 220,
          power: 20,
          passes: 1,
          lineIntervalMm: 0.08,
          referenceThicknessMm: 3,
          referencePowerW: 40,
          airAssist: true,
        },
        cut: {
          speed: 10,
          power: 72,
          passes: 1,
          lineIntervalMm: 0.1,
          referenceThicknessMm: 3,
          referencePowerW: 40,
          airAssist: true,
        },
      },
    },
  },
  {
    id: "anodized-aluminum",
    name: "Anodeeritud alumiinium",
    thicknessRangeMm: [0.5, 5],
    note: "Tüüpiliselt graveerimine, mitte lõikamine. Infrapuna või fiber annab metallil puhtama tulemuse.",
    profiles: {
      fiber: {
        engrave: {
          speed: 1800,
          power: 40,
          passes: 1,
          lineIntervalMm: 0.03,
          referenceThicknessMm: 1,
          referencePowerW: 30,
          airAssist: false,
        },
      },
      infrared: {
        engrave: {
          speed: 2400,
          power: 65,
          passes: 1,
          lineIntervalMm: 0.04,
          referenceThicknessMm: 1,
          referencePowerW: 2,
          airAssist: false,
        },
      },
      diode: {
        engrave: {
          speed: 450,
          power: 90,
          passes: 1,
          lineIntervalMm: 0.08,
          referenceThicknessMm: 1,
          referencePowerW: 10,
          airAssist: false,
        },
      },
    },
  },
];

const BIRCH_PLYWOOD = SPECIAL_MATERIALS.find((material) => material.id === "birch-plywood");
const OTHER_SPECIAL_MATERIALS = SPECIAL_MATERIALS.filter((material) => material.id !== "birch-plywood");

const MATERIALS = [
  ...WOOD_MATERIALS,
  BIRCH_PLYWOOD,
  ...PLYWOOD_MATERIALS,
  ...OTHER_SPECIAL_MATERIALS,
];

function round(value) {
  return Math.round(value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatExports(mode, laserType) {
  const base = ["png", "svg", "dxf", "settings.json"];
  const machineFormats = laserType === "fiber" ? ["ezcad"] : ["gcode", "lbrn2"];
  if (mode === "cut") {
    return [...base, ...machineFormats, "toolpath-preview.png"];
  }
  return [...base, ...machineFormats];
}

function getRecommendation({ machineId, materialId, thicknessMm, mode }) {
  const machine = LASER_MACHINES.find((m) => m.id === machineId);
  if (!machine) {
    return { error: "Valitud masinat ei leitud." };
  }

  const material = MATERIALS.find((m) => m.id === materialId);
  if (!material) {
    return { error: "Valitud materjali ei leitud." };
  }

  if (!Number.isFinite(thicknessMm) || thicknessMm <= 0) {
    return { error: "Paksus peab olema positiivne arv." };
  }

  if (mode !== "engrave" && mode !== "cut") {
    return { error: "Režiim peab olema 'engrave' või 'cut'." };
  }

  const typeProfiles = material.profiles[machine.laserType];
  if (!typeProfiles || !typeProfiles[mode]) {
    return {
      error: `Materjal '${material.name}' ei toeta režiimi '${mode}' laseritüübiga '${machine.laserType}'.`,
    };
  }

  const profile = typeProfiles[mode];
  const thicknessFactor = thicknessMm / profile.referenceThicknessMm;
  const powerFactor = profile.referencePowerW / machine.powerW;

  const powerPct = clamp(round(profile.power * thicknessFactor * powerFactor), 8, 100);
  const speedMmpm = Math.max(
    1,
    round(profile.speed * (machine.powerW / profile.referencePowerW) * (1 / Math.max(0.35, thicknessFactor)))
  );
  const passes = Math.max(
    1,
    round(profile.passes * thicknessFactor * clamp(profile.referencePowerW / machine.powerW, 0.6, 1.8))
  );

  const warnings = [];
  const [minT, maxT] = material.thicknessRangeMm;
  if (thicknessMm < minT || thicknessMm > maxT) {
    warnings.push(
      `Paksus ${thicknessMm} mm on väljaspool tavavahemikku (${minT}-${maxT} mm). Tee alati testruut.`
    );
  }
  if (mode === "cut" && material.id === "anodized-aluminum") {
    warnings.push("Anodeeritud alumiiniumi lõikamine pole soovituslik. Kasuta graveerimist.");
  }

  return {
    machine: {
      id: machine.id,
      label: `${machine.brand} ${machine.model}`,
      laserType: machine.laserType,
      powerW: machine.powerW,
    },
    material: {
      id: material.id,
      label: material.name,
      thicknessMm,
      note: material.note,
    },
    mode,
    settings: {
      speedMmpm,
      powerPct,
      passes,
      lineIntervalMm: profile.lineIntervalMm,
      airAssist: profile.airAssist,
    },
    exports: formatExports(mode, machine.laserType),
    warnings,
  };
}

module.exports = {
  LASER_MACHINES,
  MATERIALS,
  getRecommendation,
};
