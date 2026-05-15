const express = require("express");
const {
  changePassword,
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
} = require("./auth-store");
const { LASER_MACHINES, MATERIALS, getRecommendation } = require("./laser-data");
const { getUserConversations, upsertConversation, deleteConversation } = require("./conversations-store");

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(express.json({ limit: "1mb" }));

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

app.listen(port, () => {
  console.log(`Server töötab pordil ${port}`);
});
