const express = require("express");
const {
  getUserByToken,
  invalidateSession,
  loginUser,
  normalizeEmail,
  registerUser,
} = require("./auth-store");
const { LASER_MACHINES, MATERIALS, getRecommendation } = require("./laser-data");

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

function getBearerToken(req) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) {
    return "";
  }
  return header.slice(7).trim();
}

function sendError(res, error, fallbackMessage) {
  res.status(error?.status || 500).json({ error: error?.message || fallbackMessage });
}

app.post("/api/auth/register", async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (name.length < 2) {
    res.status(400).json({ error: "Nimi peab olema vähemalt 2 tähemärki pikk." });
    return;
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    res.status(400).json({ error: "Sisesta korrektne e-posti aadress." });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Parool peab olema vähemalt 8 tähemärki pikk." });
    return;
  }

  try {
    const result = await registerUser({ name, email, password });
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error, "Registreerimine ebaõnnestus.");
  }
});

app.post("/api/auth/login", async (req, res) => {
  const body = req.body || {};
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) {
    res.status(400).json({ error: "E-post ja parool on kohustuslikud." });
    return;
  }

  try {
    const result = await loginUser({ email, password });
    res.json(result);
  } catch (error) {
    sendError(res, error, "Sisselogimine ebaõnnestus.");
  }
});

app.get("/api/auth/me", async (req, res) => {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401).json({ error: "Sessioon puudub." });
    return;
  }

  try {
    const user = await getUserByToken(token);
    if (!user) {
      res.status(401).json({ error: "Sessioon on aegunud või vigane." });
      return;
    }

    res.json({ user });
  } catch (error) {
    sendError(res, error, "Kasutaja laadimine ebaõnnestus.");
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const token = getBearerToken(req);

  try {
    if (token) {
      await invalidateSession(token);
    }
    res.json({ success: true });
  } catch (error) {
    sendError(res, error, "Väljalogimine ebaõnnestus.");
  }
});

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "laser-settings-api",
    message: "Lasergraveerimise API töötab.",
  });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get("/api/machines", (req, res) => {
  res.json(LASER_MACHINES);
});

app.get("/api/materials", (req, res) => {
  const compact = MATERIALS.map((m) => ({
    id: m.id,
    name: m.name,
    thicknessRangeMm: m.thicknessRangeMm,
    note: m.note,
    supportedLaserTypes: Object.keys(m.profiles),
  }));
  res.json(compact);
});

app.post("/api/recommendation", (req, res) => {
  const { machineId, materialId, thicknessMm, mode } = req.body || {};

  const result = getRecommendation({
    machineId: String(machineId || ""),
    materialId: String(materialId || ""),
    thicknessMm: Number(thicknessMm),
    mode: String(mode || ""),
  });

  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json(result);
});

app.listen(port, () => {
  console.log(`Server töötab pordil ${port}`);
});
