const express = require("express");
const defaultAuthStore = require("./auth-store");
const defaultLaserData = require("./laser-data");
const defaultConversationsStore = require("./conversations-store");
const defaultKnowledgeStore = require("./knowledge-store");

function createApp(dependencies = {}) {
const {
  changePassword,
  deleteUser,
  getUserByToken,
  invalidateSession,
  issueTemporaryPassword,
  listPasswordResetRequests,
  listUsers,
  loginUser,
  normalizeEmail,
  requestPasswordReset,
  registerUser,
  updateUserRole,
} = dependencies.authStore || defaultAuthStore;
const { LASER_MACHINES, MATERIALS, getRecommendation } = dependencies.laserData || defaultLaserData;
const { getUserConversations, upsertConversation, deleteConversation } = dependencies.conversationsStore || defaultConversationsStore;
const { KNOWLEDGE_CATEGORIES, knowledgeStore } = dependencies.knowledgeStore || defaultKnowledgeStore;
const app = express();

app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
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

async function resolveAuthenticatedUser(req) {
  const token = getBearerToken(req);

  if (!token) {
    throw Object.assign(new Error("Sessioon puudub."), { status: 401 });
  }

  const user = await getUserByToken(token);
  if (!user) {
    throw Object.assign(new Error("Sessioon on aegunud või vigane."), { status: 401 });
  }

  return user;
}

async function requireAdminUser(req) {
  const user = await resolveAuthenticatedUser(req);

  if (user.role !== "admin") {
    throw Object.assign(new Error("Selle toimingu jaoks on vaja admin-õigusi."), { status: 403 });
  }

  return user;
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

app.post("/api/auth/change-password", async (req, res) => {
  const token = getBearerToken(req);
  const currentPassword = String(req.body?.currentPassword || "");
  const nextPassword = String(req.body?.nextPassword || "");

  if (!token) {
    res.status(401).json({ error: "Sessioon puudub." });
    return;
  }

  if (!currentPassword || !nextPassword) {
    res.status(400).json({ error: "Praegune ja uus parool on kohustuslikud." });
    return;
  }

  if (nextPassword.length < 8) {
    res.status(400).json({ error: "Uus parool peab olema vähemalt 8 tähemärki pikk." });
    return;
  }

  try {
    const result = await changePassword({ token, currentPassword, nextPassword });
    res.json(result);
  } catch (error) {
    sendError(res, error, "Parooli vahetamine ebaõnnestus.");
  }
});

app.post("/api/auth/request-password-reset", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const note = String(req.body?.note || "");

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    res.status(400).json({ error: "Sisesta korrektne e-posti aadress." });
    return;
  }

  try {
    await requestPasswordReset({ email, note });
    res.json({
      success: true,
      message: "Kui konto on olemas, jõuab parooli reseti taotlus adminini.",
    });
  } catch (error) {
    sendError(res, error, "Parooli reseti taotluse loomine ebaõnnestus.");
  }
});

app.get("/api/auth/users", async (req, res) => {
  try {
    await requireAdminUser(req);
    const users = await listUsers();
    res.json({ users });
  } catch (error) {
    sendError(res, error, "Kasutajate laadimine ebaõnnestus.");
  }
});

app.get("/api/auth/password-reset-requests", async (req, res) => {
  try {
    await requireAdminUser(req);
    const requests = await listPasswordResetRequests();
    res.json({ requests });
  } catch (error) {
    sendError(res, error, "Parooli reseti taotluste laadimine ebaõnnestus.");
  }
});

app.post("/api/auth/password-reset-requests/:requestId/issue-temp-password", async (req, res) => {
  const requestId = String(req.params.requestId || "").trim();

  if (!requestId) {
    res.status(400).json({ error: "Taotluse ID on kohustuslik." });
    return;
  }

  try {
    const actingUser = await requireAdminUser(req);
    const result = await issueTemporaryPassword({ actingUserId: actingUser.id, requestId });
    res.json(result);
  } catch (error) {
    sendError(res, error, "Ajutise parooli loomine ebaõnnestus.");
  }
});

app.post("/api/auth/users/:userId/role", async (req, res) => {
  const targetUserId = String(req.params.userId || "").trim();
  const role = String(req.body?.role || "").trim();

  if (!targetUserId) {
    res.status(400).json({ error: "Kasutaja ID on kohustuslik." });
    return;
  }

  try {
    const actingUser = await requireAdminUser(req);
    const user = await updateUserRole({
      actingUserId: actingUser.id,
      targetUserId,
      role,
    });
    res.json({ user });
  } catch (error) {
    sendError(res, error, "Kasutaja rolli uuendamine ebaõnnestus.");
  }
});

app.delete("/api/auth/users/:userId", async (req, res) => {
  const targetUserId = String(req.params.userId || "").trim();

  if (!targetUserId) {
    res.status(400).json({ error: "Kasutaja ID on kohustuslik." });
    return;
  }

  try {
    const actingUser = await requireAdminUser(req);
    const result = await deleteUser({ actingUserId: actingUser.id, targetUserId });
    res.json(result);
  } catch (error) {
    sendError(res, error, "Kasutaja kustutamine ebaõnnestus.");
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
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? "configured" : "not-configured",
  });
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

app.get("/api/conversations", async (req, res) => {
  try {
    const user = await resolveAuthenticatedUser(req);
    const conversations = await getUserConversations(user.id);
    res.json({ ok: true, conversations });
  } catch (error) {
    sendError(res, error, "Vestluste laadimine ebaõnnestus.");
  }
});

app.put("/api/conversations/:id", async (req, res) => {
  const convId = String(req.params.id || "").trim();
  const { name, messages, createdAt } = req.body || {};
  if (!convId || !name || !Array.isArray(messages)) {
    res.status(400).json({ error: "Vigased vestluse andmed." });
    return;
  }
  try {
    const user = await resolveAuthenticatedUser(req);
    await upsertConversation(user.id, { id: convId, name, messages, createdAt });
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error, "Vestluse salvestamine ebaõnnestus.");
  }
});

app.delete("/api/conversations/:id", async (req, res) => {
  const convId = String(req.params.id || "").trim();
  try {
    const user = await resolveAuthenticatedUser(req);
    await deleteConversation(user.id, convId);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error, "Vestluse kustutamine ebaõnnestus.");
  }
});

app.get("/api/knowledge", async (_req, res) => {
  try {
    const items = await knowledgeStore.getAll();
    res.json(items);
  } catch (error) {
    sendError(res, error, "Teadmistebaasi laadimine ebaõnnestus.");
  }
});

app.get("/api/knowledge/context", async (_req, res) => {
  try {
    const context = await knowledgeStore.getContext();
    res.json({ context });
  } catch (error) {
    sendError(res, error, "Teadmistebaasi konteksti laadimine ebaõnnestus.");
  }
});

app.post("/api/knowledge", async (req, res) => {
  const body = req.body || {};
  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  const category = body.category;

  if (!title || !content || !category) {
    res.status(400).json({ error: "Pealkiri, sisu ja kategooria on kohustuslikud." });
    return;
  }

  if (!KNOWLEDGE_CATEGORIES.includes(category)) {
    res.status(400).json({ error: "Kategooria peab olema üks väärtustest: juhis, naidis, fakt või stiil." });
    return;
  }

  try {
    await requireAdminUser(req);
    const item = await knowledgeStore.add({ title, content, category });
    res.status(201).json(item);
  } catch (error) {
    sendError(res, error, "Kirje lisamine ebaõnnestus.");
  }
});

app.delete("/api/knowledge", async (req, res) => {
  const id = String(req.query.id || "").trim();

  if (!id) {
    res.status(400).json({ error: "ID on kohustuslik." });
    return;
  }

  try {
    await requireAdminUser(req);
    const removed = await knowledgeStore.remove(id);
    if (!removed) {
      res.status(404).json({ error: "Sellist kirjet ei leitud." });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    sendError(res, error, "Kirje kustutamine ebaõnnestus.");
  }
});

const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

function buildTattooPrompt(subjectText, hasReference) {
  const subject = subjectText.trim() ? subjectText.trim() : "a detailed subject";
  const base =
    `Black and grey realistic tattoo design of ${subject}, created in a highly detailed neo-traditional illustrative tattoo style. ` +
    "Stylized layered textures and intricate ornamental detailing adapted naturally to the subject. " +
    "Sharp overlapping detail patterns, smooth whip shading, soft gradient transitions, dense dotwork stippling, and crisp fine-line contour work. " +
    "Strong contrast between deep black shadows and soft grey highlights. " +
    "Piercing realistic eyes with subtle bright reflections. " +
    "Highly detailed illustrative tattoo art with elegant flow, realistic anatomy, cinematic shading, and refined ornamental realism. " +
    "Professional tattoo flash artwork, centered subject, isolated on a completely clean white background. " +
    "No composition elements, no scenery, no decorative background, no branches, no vines, no leaves, no smoke, no rocks, no frame, no border, no mandala, no floral wreath, no geometric background, no skin, no body placement, no extra objects outside the subject. " +
    "Negative prompt: low quality, blurry, bad anatomy, distorted proportions, extra limbs, duplicate elements, cartoon, anime, watercolor, colorful background, messy composition, low detail, flat shading, oversaturated, text, watermark, frame, border, mandala, floral wreath, glowing neon, realistic environment, photo background, unfinished lines, rough sketch";
  return hasReference ? base + " Base the design on the uploaded reference image." : base;
}

function buildTattooOnBodyPrompt(hasReference) {
  const base =
    "Professional tattoo photography, black and grey realistic tattoo visible on the upper arm or forearm of a person, " +
    "close-up shot focusing on the tattoo, natural skin texture, soft studio lighting, shallow depth of field, " +
    "DSLR photography style, sharp focus on tattoo details, warm ambient tones, cinematic composition. " +
    "The tattoo features neo-traditional black-and-grey realism style, intricate linework, smooth shading, " +
    "strong contrast between deep black and soft grey, fine detailed artwork. " +
    "Professional tattoo studio setting, high resolution, 8K detail, realistic skin with visible pores, " +
    "centered composition, the tattoo fully visible and unobstructed.";
  return hasReference ? base + " Base the design on the uploaded reference image." : base;
}

app.post("/api/tattoo-generation", async (req, res) => {
  const { subjectText = "", sourceImageDataUrl, mode = "eskiis" } = req.body || {};
  const apiKey = (process.env.OPENAI_API_KEY || "").trim();

  if (!apiKey) {
    res.status(503).json({ ok: false, error: "OPENAI_API_KEY puudub." });
    return;
  }

  const prompt = mode === "kehal"
    ? buildTattooOnBodyPrompt(Boolean(sourceImageDataUrl))
    : buildTattooPrompt(subjectText, Boolean(sourceImageDataUrl));

  try {
    let imageDataUrl;

    if (sourceImageDataUrl && mode !== "kehal") {
      const base64 = sourceImageDataUrl.includes(",") ? sourceImageDataUrl.split(",")[1] : sourceImageDataUrl;
      const mediaType = sourceImageDataUrl.startsWith("data:") ? sourceImageDataUrl.split(";")[0].slice(5) : "image/png";
      const buffer = Buffer.from(base64, "base64");

      const { FormData, Blob } = await import("node:buffer").then(() => globalThis).catch(() => ({}));
      const formData = new (globalThis.FormData || (await import("undici")).FormData)();
      formData.append("model", OPENAI_IMAGE_MODEL);
      formData.append("image", new Blob([buffer], { type: mediaType }), "reference.png");
      formData.append("prompt", prompt);
      formData.append("n", "1");
      formData.append("size", "1024x1024");

      const apiRes = await fetch(`${OPENAI_BASE_URL}/images/edits`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });
      const payload = await apiRes.json().catch(() => null);
      if (!apiRes.ok) throw new Error(payload?.error?.message || `OpenAI edits viga ${apiRes.status}`);
      const first = payload?.data?.[0];
      if (first?.b64_json) imageDataUrl = `data:image/png;base64,${first.b64_json}`;
      else if (first?.url) {
        const imgRes = await fetch(first.url);
        const buf = Buffer.from(await imgRes.arrayBuffer());
        imageDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
      } else throw new Error("Tatoo genereerimine ei tagastanud väljundit.");
    } else {
      const imageQuality = process.env.OPENAI_IMAGE_QUALITY || "medium";
      const apiRes = await fetch(`${OPENAI_BASE_URL}/images/generations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: OPENAI_IMAGE_MODEL, prompt, n: 1, size: "1024x1024", quality: imageQuality }),
      });
      const payload = await apiRes.json().catch(() => null);
      if (!apiRes.ok) throw new Error(payload?.error?.message || `OpenAI generations viga ${apiRes.status}`);
      const first = payload?.data?.[0];
      if (first?.b64_json) imageDataUrl = `data:image/png;base64,${first.b64_json}`;
      else if (first?.url) {
        const imgRes = await fetch(first.url);
        const buf = Buffer.from(await imgRes.arrayBuffer());
        imageDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
      } else throw new Error("Tatoo genereerimine ei tagastanud väljundit.");
    }

    res.json({ ok: true, imageDataUrl });
  } catch (error) {
    res.status(502).json({ ok: false, error: error?.message || "Tatoo loomine ebaõnnestus." });
  }
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: `Marsruut ei leitud: ${req.method} ${req.path}` });
});

app.use((err, req, res, _next) => {
  console.error("Käsitlemata viga:", err);
  res.status(500).json({ ok: false, error: err?.message || "Serveri viga" });
});

return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 4000;
  createApp().listen(port, () => {
  console.log(`Server töötab pordil ${port}`);
  });
}

module.exports = { createApp };
