const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const AUTH_STORE_PATH = path.join(__dirname, "data", "auth-store.json");
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function ensureStoreFile() {
  await fs.mkdir(path.dirname(AUTH_STORE_PATH), { recursive: true });

  try {
    await fs.access(AUTH_STORE_PATH);
  } catch {
    await fs.writeFile(
      AUTH_STORE_PATH,
      JSON.stringify({ users: [], sessions: [] }, null, 2),
      "utf8"
    );
  }
}

async function readStore() {
  await ensureStoreFile();
  const raw = await fs.readFile(AUTH_STORE_PATH, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return { users: [], sessions: [] };
  }
}

async function writeStore(store) {
  await ensureStoreFile();
  await fs.writeFile(AUTH_STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

function verifyPassword(password, storedHash) {
  const [salt, digest] = String(storedHash || "").split(":");
  if (!salt || !digest) {
    return false;
  }

  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const left = Buffer.from(candidate, "hex");
  const right = Buffer.from(digest, "hex");

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function pruneExpiredSessions(store) {
  const now = Date.now();
  const before = store.sessions.length;
  store.sessions = store.sessions.filter(
    (session) => new Date(session.expiresAt).getTime() > now
  );
  return before !== store.sessions.length;
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const createdAt = new Date().toISOString();

  return {
    token,
    session: {
      id: crypto.randomUUID(),
      userId,
      tokenHash: hashToken(token),
      createdAt,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    },
  };
}

async function registerUser({ name, email, password }) {
  const store = await readStore();
  pruneExpiredSessions(store);

  const normalizedEmail = normalizeEmail(email);
  if (store.users.some((user) => user.email === normalizedEmail)) {
    throw createHttpError(409, "Selle e-postiga konto on juba olemas.");
  }

  const user = {
    id: crypto.randomUUID(),
    name: String(name || "").trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  const { token, session } = createSession(user.id);

  store.users.push(user);
  store.sessions.push(session);
  await writeStore(store);

  return { user: sanitizeUser(user), token };
}

async function loginUser({ email, password }) {
  const store = await readStore();
  pruneExpiredSessions(store);

  const normalizedEmail = normalizeEmail(email);
  const user = store.users.find((item) => item.email === normalizedEmail);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw createHttpError(401, "Vale e-post või parool.");
  }

  const { token, session } = createSession(user.id);
  store.sessions.push(session);
  await writeStore(store);

  return { user: sanitizeUser(user), token };
}

async function getUserByToken(token) {
  if (!token) {
    return null;
  }

  const store = await readStore();
  const changed = pruneExpiredSessions(store);
  const tokenHash = hashToken(token);
  const session = store.sessions.find((item) => item.tokenHash === tokenHash);

  if (!session) {
    if (changed) {
      await writeStore(store);
    }
    return null;
  }

  const user = store.users.find((item) => item.id === session.userId);
  if (!user) {
    store.sessions = store.sessions.filter((item) => item.id !== session.id);
    await writeStore(store);
    return null;
  }

  if (changed) {
    await writeStore(store);
  }

  return sanitizeUser(user);
}

async function invalidateSession(token) {
  if (!token) {
    return false;
  }

  const store = await readStore();
  const tokenHash = hashToken(token);
  const before = store.sessions.length;
  store.sessions = store.sessions.filter((item) => item.tokenHash !== tokenHash);

  if (store.sessions.length === before) {
    return false;
  }

  await writeStore(store);
  return true;
}

module.exports = {
  AUTH_STORE_PATH,
  createHttpError,
  getUserByToken,
  invalidateSession,
  loginUser,
  normalizeEmail,
  registerUser,
};