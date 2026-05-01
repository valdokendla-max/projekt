require("dotenv").config();
const express = require("express");
const authStore = {
  changePassword,
  getPool,
  getUserByToken,
  invalidateSession,
  issueTemporaryPassword,
  listPasswordResetRequests,
  listUsers,
  loginUser,
  normalizeEmail,
  requestPasswordReset,
  registerUser,
  resetPasswordWithToken,
  updateUserRole,
  verifyPasswordResetToken,
} = require("./auth-store");
const emailService = {
  getMailConfig,
  sendEmail,
  sendPasswordResetEmail,
  sendRegistrationNotifications,
} = require("./email-service");
const { KNOWLEDGE_CATEGORIES, knowledgeStore } = require("./knowledge-store");
const laserData = require("./laser-data");

function createApp(dependencies = {}) {
  const app = express();
  const auth = dependencies.authStore || authStore;
  const email = dependencies.emailService || emailService;
  const knowledge = dependencies.knowledgeStore || knowledgeStore;
  const lasers = dependencies.laserData || laserData;

  app.use(express.json({ limit: "1mb" }));

  const allowedOrigin = String(process.env.ALLOWED_ORIGIN || "*").trim();

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  });

const authRateLimitStore = new Map();

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "");
  return forwarded.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

function checkAuthRateLimit(req, res) {
  const ip = getClientIp(req);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 20;
  const entry = authRateLimitStore.get(ip) || { count: 0, windowStart: now };

  if (now - entry.windowStart > windowMs) {
    entry.count = 0;
    entry.windowStart = now;
  }

  entry.count += 1;
  authRateLimitStore.set(ip, entry);

  if (authRateLimitStore.size > 10000) {
    for (const [key, val] of authRateLimitStore) {
      if (now - val.windowStart > windowMs) {
        authRateLimitStore.delete(key);
      }
    }
  }

  if (entry.count > maxRequests) {
    res.status(429).json({ error: "Liiga palju katseid. Proovi 15 minuti pärast uuesti." });
    return false;
  }

  return true;
}

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

function runBackground(task, label) {
  Promise.resolve(task).catch((error) => {
    console.error(`${label}:`, error instanceof Error ? error.message : error);
  });
}

function isKnowledgeCategory(value) {
  return typeof value === "string" && KNOWLEDGE_CATEGORIES.includes(value);
}

async function resolveAuthenticatedUser(req) {
  const token = getBearerToken(req);

  if (!token) {
    throw Object.assign(new Error("Sessioon puudub."), { status: 401 });
  }

  const user = await auth.getUserByToken(token);
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
  if (!checkAuthRateLimit(req, res)) return;
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const emailAddress = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (name.length < 2) {
    res.status(400).json({ error: "Nimi peab olema vähemalt 2 tähemärki pikk." });
    return;
  }

  if (!/^\S+@\S+\.\S+$/.test(emailAddress)) {
    res.status(400).json({ error: "Sisesta korrektne e-posti aadress." });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Parool peab olema vähemalt 8 tähemärki pikk." });
    return;
  }

  try {
    const result = await auth.registerUser({ name, email: emailAddress, password });
    res.status(201).json(result);
    runBackground(email.sendRegistrationNotifications(result.user), "Registration email failed");
  } catch (error) {
    sendError(res, error, "Registreerimine ebaõnnestus.");
  }
});

app.post("/api/auth/login", async (req, res) => {
  if (!checkAuthRateLimit(req, res)) return;
  const body = req.body || {};
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (!email || !password) {
    res.status(400).json({ error: "E-post ja parool on kohustuslikud." });
    return;
  }

  try {
    const result = await auth.loginUser({ email, password });
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
    const user = await auth.getUserByToken(token);
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
      await auth.invalidateSession(token);
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
    const result = await auth.changePassword({ token, currentPassword, nextPassword });
    res.json(result);
  } catch (error) {
    sendError(res, error, "Parooli vahetamine ebaõnnestus.");
  }
});

app.post("/api/auth/request-password-reset", async (req, res) => {
  if (!checkAuthRateLimit(req, res)) return;
  const emailAddress = normalizeEmail(req.body?.email);

  if (!/^\S+@\S+\.\S+$/.test(emailAddress)) {
    res.status(400).json({ error: "Sisesta korrektne e-posti aadress." });
    return;
  }

  try {
    const result = await auth.requestPasswordReset({ email: emailAddress });
    if (result?.user && result?.resetToken) {
      runBackground(email.sendPasswordResetEmail(result.user, result.resetToken), "Password reset email failed");
    }
    res.json({
      success: true,
      message: "Kui konto on olemas, saadetakse e-postile parooli taastamise link.",
    });
  } catch (error) {
    sendError(res, error, "Parooli reseti taotluse loomine ebaõnnestus.");
  }
});

app.get("/api/auth/password-reset/verify", async (req, res) => {
  const token = String(req.query?.token || "").trim();

  if (!token) {
    res.status(400).json({ error: "Parooli taastamise token puudub." });
    return;
  }

  try {
    const user = await auth.verifyPasswordResetToken(token);
    if (!user) {
      res.status(400).json({ error: "Parooli taastamise link on aegunud või vigane." });
      return;
    }

    res.json({ ok: true, email: user.email });
  } catch (error) {
    sendError(res, error, "Parooli taastamise linki ei õnnestunud kontrollida.");
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const nextPassword = String(req.body?.nextPassword || "");

  if (!token) {
    res.status(400).json({ error: "Parooli taastamise token puudub." });
    return;
  }

  if (nextPassword.length < 8) {
    res.status(400).json({ error: "Uus parool peab olema vähemalt 8 tähemärki pikk." });
    return;
  }

  try {
    const result = await auth.resetPasswordWithToken({ token, nextPassword });
    res.json(result);
  } catch (error) {
    sendError(res, error, "Parooli taastamine ebaõnnestus.");
  }
});

app.get("/api/auth/email-status", async (_req, res) => {
  const config = email.getMailConfig();
  const from = String(config.from || "");
  const safeFrom = from.includes("@") ? from : "";
  res.json({
    configured: config.isConfigured,
    appBaseUrl: config.appBaseUrl,
    provider: config.provider,
    from: safeFrom,
  });
});

app.get("/api/auth/users", async (req, res) => {
  try {
    await requireAdminUser(req);
    const users = await auth.listUsers();
    res.json({ users });
  } catch (error) {
    sendError(res, error, "Kasutajate laadimine ebaõnnestus.");
  }
});

app.get("/api/auth/password-reset-requests", async (req, res) => {
  try {
    await requireAdminUser(req);
    const requests = await auth.listPasswordResetRequests();
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
    const result = await auth.issueTemporaryPassword({ actingUserId: actingUser.id, requestId });
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
    const user = await auth.updateUserRole({
      actingUserId: actingUser.id,
      targetUserId,
      role,
    });
    res.json({ user });
  } catch (error) {
    sendError(res, error, "Kasutaja rolli uuendamine ebaõnnestus.");
  }
});

app.get("/api/knowledge/context", async (_req, res) => {
  try {
    const items = await knowledge.getAll();
    const context = await knowledge.getContext();
    res.json({
      itemCount: items.length,
      context,
    });
  } catch (error) {
    sendError(res, error, "Teadmistebaasi laadimine ebaõnnestus.");
  }
});

app.get("/api/knowledge", async (req, res) => {
  try {
    await requireAdminUser(req);
    const items = await knowledge.getAll();
    res.json(items);
  } catch (error) {
    sendError(res, error, "Teadmistebaasi laadimine ebaõnnestus.");
  }
});

app.post("/api/knowledge", async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const content = String(req.body?.content || "").trim();
  const category = req.body?.category;

  if (!title || !content || !category) {
    res.status(400).json({ error: "Pealkiri, sisu ja kategooria on kohustuslikud." });
    return;
  }

  if (!isKnowledgeCategory(category)) {
    res.status(400).json({ error: "Kategooria peab olema üks väärtustest: juhis, naidis, fakt või stiil." });
    return;
  }

  try {
    await requireAdminUser(req);
    const item = await knowledge.add({ title, content, category });
    res.status(201).json(item);
  } catch (error) {
    sendError(res, error, "Teadmistebaasi salvestamine ebaõnnestus.");
  }
});

app.delete("/api/knowledge", async (req, res) => {
  const id = String(req.query?.id || "").trim();

  if (!id) {
    res.status(400).json({ error: "ID on kohustuslik" });
    return;
  }

  try {
    await requireAdminUser(req);
    const removed = await knowledge.remove(id);
    if (!removed) {
      res.status(404).json({ error: "Sellist kirjet ei leitud." });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    sendError(res, error, "Teadmistebaasi kustutamine ebaõnnestus.");
  }
});

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "laser-settings-api",
    message: "Lasergraveerimise API töötab.",
  });
});

app.post("/api/auth/test-email", async (req, res) => {
  try {
    await requireAdminUser(req);
  } catch (error) {
    sendError(res, error, "Admin õigused puuduvad.");
    return;
  }

  const config = email.getMailConfig();
  if (!config.isConfigured) {
    res.status(400).json({ ok: false, error: "E-post pole seadistatud (SMTP_HOST, SMTP_PORT, SMTP_FROM puuduvad).", config: { host: config.host, port: config.port, from: config.from } });
    return;
  }

  try {
    await email.sendEmail({
      to: config.from,
      subject: "Test e-kiri | Laser Graveerimine",
      text: "See on test e-kiri. Kui sa seda näed, töötab e-posti seadistus.",
    });
    res.json({ ok: true, message: "Test e-kiri saadetud.", to: config.from, from: config.from });
  } catch (error) {
    res.status(500).json({ ok: false, error: error?.message || String(error), code: error?.code });
  }
});

app.get("/api/health", async (req, res) => {
  const status = { ok: true, timestamp: new Date().toISOString(), db: "unknown" };
  try {
    const { Pool } = require("pg");
    const pool = global.__laserGraveerimineBackendPool;
    if (pool) {
      await pool.query("SELECT 1");
      status.db = "ok";
    } else {
      status.db = "not_initialized";
    }
  } catch {
    status.ok = false;
    status.db = "error";
  }
  res.status(status.ok ? 200 : 503).json(status);
});

app.get("/api/user/laser-settings", async (req, res) => {
  try {
    const user = await resolveAuthenticatedUser(req);
    const pool = getPool();
    const result = await pool.query(
      "SELECT settings FROM app_user_laser_settings WHERE user_id = $1",
      [user.id]
    );
    res.json(result.rows.length > 0 ? result.rows[0].settings : null);
  } catch (error) {
    sendError(res, error, "Seadistuste laadimine ebaõnnestus.");
  }
});

app.put("/api/user/laser-settings", async (req, res) => {
  try {
    const user = await resolveAuthenticatedUser(req);
    const settings = req.body;
    const pool = getPool();
    await pool.query(
      `INSERT INTO app_user_laser_settings (user_id, settings, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET settings = $2::jsonb, updated_at = NOW()`,
      [user.id, JSON.stringify(settings)]
    );
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error, "Seadistuste salvestamine ebaõnnestus.");
  }
});

app.get("/api/machines", (req, res) => {
  res.json(lasers.LASER_MACHINES);
});

app.get("/api/materials", (req, res) => {
  const compact = lasers.MATERIALS.map((m) => ({
    id: m.id,
    name: m.name,
    thicknessRangeMm: m.thicknessRangeMm,
    note: m.note,
    supportedLaserTypes: Object.keys(m.profiles),
  }));
  res.json(compact);
});

app.post("/api/recommendation", (req, res) => {
  const { machineId, materialId, thicknessMm, mode, widthMm, heightMm } = req.body || {};

  const result = lasers.getRecommendation({
    machineId: String(machineId || ""),
    materialId: String(materialId || ""),
    thicknessMm: Number(thicknessMm),
    mode: String(mode || ""),
    widthMm: Number(widthMm),
    heightMm: Number(heightMm),
  });

  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json(result);
});

  return app;
}

function startServer(dependencies = {}) {
  const port = Number(process.env.PORT) || 4000;
  const app = createApp(dependencies);
  const server = app.listen(port, () => {
    console.log(`Server töötab pordil ${port}`);
  });

  return { app, server };
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer,
};
