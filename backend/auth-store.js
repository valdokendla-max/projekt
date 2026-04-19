const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const AUTH_STORE_PATH = path.join(__dirname, "data", "auth-store.json");
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const DEFAULT_ADMIN_EMAILS = ["valdokendla@gmail.com"];
let operationQueue = Promise.resolve();

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function enqueueStoreOperation(operation) {
  const result = operationQueue.then(operation, operation);
  operationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
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
    return normalizeStore(parsed);
  } catch {
    return { users: [], sessions: [] };
  }
}

async function writeStore(store) {
  await ensureStoreFile();
  const nextStore = normalizeStore(store);
  const tempFilePath = `${AUTH_STORE_PATH}.tmp`;

  await fs.writeFile(tempFilePath, JSON.stringify(nextStore, null, 2), "utf8");
  await fs.rename(tempFilePath, AUTH_STORE_PATH);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeUserRole(role) {
  return role === "admin" ? "admin" : "user";
}

function readConfiguredAdminEmails() {
  const configuredEmails = new Set(
    DEFAULT_ADMIN_EMAILS.map((email) => normalizeEmail(email)).filter(Boolean)
  );

  for (const email of String(process.env.AUTH_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter(Boolean)) {
    configuredEmails.add(email);
  }

  return configuredEmails;
}

function isValidRole(role) {
  return role === "admin" || role === "user";
}

function normalizeUsersWithRoles(users) {
  const configuredAdminEmails = readConfiguredAdminEmails();
  let hasAdmin = false;

  const normalizedUsers = users.map((user) => {
    const normalizedEmail = normalizeEmail(user.email);
    const role = configuredAdminEmails.has(normalizedEmail)
      ? "admin"
      : normalizeUserRole(user.role);

    if (role === "admin") {
      hasAdmin = true;
    }

    return {
      ...user,
      email: normalizedEmail,
      role,
    };
  });

  if (!hasAdmin && configuredAdminEmails.size === 0 && normalizedUsers.length > 0) {
    normalizedUsers[0] = {
      ...normalizedUsers[0],
      role: "admin",
    };
  }

  return normalizedUsers;
}

function normalizeStore(store) {
  return {
    users: normalizeUsersWithRoles(Array.isArray(store?.users) ? store.users : []),
    sessions: Array.isArray(store?.sessions) ? store.sessions : [],
    passwordResetRequests: Array.isArray(store?.passwordResetRequests)
      ? store.passwordResetRequests
      : [],
  };
}

function determineRoleForNewUser(store, email) {
  const configuredAdminEmails = readConfiguredAdminEmails();

  if (configuredAdminEmails.size > 0) {
    return configuredAdminEmails.has(email) ? "admin" : "user";
  }

  return store.users.some((user) => user.role === "admin") ? "user" : "admin";
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
    role: normalizeUserRole(user.role),
    createdAt: user.createdAt,
  };
}

function sortUsers(users) {
  return [...users].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

function sortPasswordResetRequests(requests) {
  return [...requests].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function sanitizePasswordResetRequest(request) {
  return {
    id: request.id,
    userId: request.userId,
    email: request.email,
    name: request.name,
    note: typeof request.note === "string" ? request.note : "",
    createdAt: request.createdAt,
  };
}

function generateTemporaryPassword() {
  return `LG-${crypto.randomBytes(9).toString("base64url")}`;
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

function resolveSessionFromStore(store, token) {
  const tokenHash = hashToken(token);
  return store.sessions.find((item) => item.tokenHash === tokenHash) || null;
}

async function registerUser({ name, email, password }) {
  return enqueueStoreOperation(async () => {
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
      role: determineRoleForNewUser(store, normalizedEmail),
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    const { token, session } = createSession(user.id);

    store.users.push(user);
    store.sessions.push(session);
    await writeStore(store);

    return { user: sanitizeUser(user), token };
  });
}

async function loginUser({ email, password }) {
  return enqueueStoreOperation(async () => {
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
  });
}

async function getUserByToken(token) {
  if (!token) {
    return null;
  }

  return enqueueStoreOperation(async () => {
    const store = await readStore();
    const changed = pruneExpiredSessions(store);
    const session = resolveSessionFromStore(store, token);

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
  });
}

async function invalidateSession(token) {
  if (!token) {
    return false;
  }

  return enqueueStoreOperation(async () => {
    const store = await readStore();
    const tokenHash = hashToken(token);
    const before = store.sessions.length;
    store.sessions = store.sessions.filter((item) => item.tokenHash !== tokenHash);

    if (store.sessions.length === before) {
      return false;
    }

    await writeStore(store);
    return true;
  });
}

async function changePassword({ token, currentPassword, nextPassword }) {
  if (!token) {
    throw createHttpError(401, "Sessioon puudub.");
  }

  return enqueueStoreOperation(async () => {
    const store = await readStore();
    const changed = pruneExpiredSessions(store);
    const session = resolveSessionFromStore(store, token);

    if (!session) {
      if (changed) {
        await writeStore(store);
      }
      throw createHttpError(401, "Sessioon on aegunud või vigane.");
    }

    const user = store.users.find((item) => item.id === session.userId);
    if (!user) {
      store.sessions = store.sessions.filter((item) => item.id !== session.id);
      await writeStore(store);
      throw createHttpError(401, "Sessioon on aegunud või vigane.");
    }

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      if (changed) {
        await writeStore(store);
      }
      throw createHttpError(401, "Praegune parool on vale.");
    }

    if (verifyPassword(nextPassword, user.passwordHash)) {
      if (changed) {
        await writeStore(store);
      }
      throw createHttpError(400, "Uus parool peab erinema praegusest paroolist.");
    }

    user.passwordHash = hashPassword(nextPassword);
    store.sessions = store.sessions.filter((item) => item.userId !== user.id);

    const { token: nextToken, session: nextSession } = createSession(user.id);
    store.sessions.push(nextSession);
    await writeStore(store);

    return { user: sanitizeUser(user), token: nextToken };
  });
}

async function requestPasswordReset({ email, note }) {
  return enqueueStoreOperation(async () => {
    const store = await readStore();
    const normalizedEmail = normalizeEmail(email);
    const user = store.users.find((item) => item.email === normalizedEmail);

    if (!user) {
      return { success: true };
    }

    const trimmedNote = String(note || "").trim().slice(0, 500);

    store.passwordResetRequests = store.passwordResetRequests.filter(
      (request) => request.userId !== user.id
    );

    store.passwordResetRequests.push({
      id: crypto.randomUUID(),
      userId: user.id,
      email: user.email,
      name: user.name,
      note: trimmedNote,
      createdAt: new Date().toISOString(),
    });

    await writeStore(store);
    return { success: true };
  });
}

async function listPasswordResetRequests() {
  return enqueueStoreOperation(async () => {
    const store = await readStore();

    return sortPasswordResetRequests(store.passwordResetRequests).map((request) =>
      sanitizePasswordResetRequest(request)
    );
  });
}

async function issueTemporaryPassword({ actingUserId, requestId }) {
  return enqueueStoreOperation(async () => {
    const store = await readStore();
    const actingUser = store.users.find((user) => user.id === actingUserId);

    if (!actingUser || normalizeUserRole(actingUser.role) !== "admin") {
      throw createHttpError(403, "Selle toimingu jaoks on vaja admin-õigusi.");
    }

    const requestIndex = store.passwordResetRequests.findIndex((request) => request.id === requestId);
    if (requestIndex === -1) {
      throw createHttpError(404, "Parooli reseti taotlust ei leitud.");
    }

    const request = store.passwordResetRequests[requestIndex];
    const user = store.users.find((item) => item.id === request.userId);

    if (!user) {
      store.passwordResetRequests.splice(requestIndex, 1);
      await writeStore(store);
      throw createHttpError(404, "Kasutajat ei leitud.");
    }

    const temporaryPassword = generateTemporaryPassword();
    user.passwordHash = hashPassword(temporaryPassword);
    store.sessions = store.sessions.filter((session) => session.userId !== user.id);
    store.passwordResetRequests.splice(requestIndex, 1);
    await writeStore(store);

    return {
      request: sanitizePasswordResetRequest(request),
      temporaryPassword,
      user: sanitizeUser(user),
    };
  });
}

async function listUsers() {
  return enqueueStoreOperation(async () => {
    const store = await readStore();
    const changed = pruneExpiredSessions(store);

    if (changed) {
      await writeStore(store);
    }

    return sortUsers(store.users).map((user) => sanitizeUser(user));
  });
}

async function updateUserRole({ actingUserId, targetUserId, role }) {
  if (!isValidRole(role)) {
    throw createHttpError(400, "Roll peab olema kas admin või user.");
  }

  return enqueueStoreOperation(async () => {
    const store = await readStore();
    const changed = pruneExpiredSessions(store);

    if (changed) {
      await writeStore(store);
    }

    const actingUser = store.users.find((user) => user.id === actingUserId);
    if (!actingUser || normalizeUserRole(actingUser.role) !== "admin") {
      throw createHttpError(403, "Selle toimingu jaoks on vaja admin-õigusi.");
    }

    const targetUser = store.users.find((user) => user.id === targetUserId);
    if (!targetUser) {
      throw createHttpError(404, "Kasutajat ei leitud.");
    }

    if (actingUser.id === targetUser.id && role !== normalizeUserRole(targetUser.role)) {
      throw createHttpError(400, "Oma aktiivset rolli ei saa sellest vaatest muuta.");
    }

    const configuredAdminEmails = readConfiguredAdminEmails();
    if (configuredAdminEmails.has(targetUser.email) && role !== "admin") {
      throw createHttpError(400, "Selle e-posti aadressiga konto on lukustatud adminiks.");
    }

    const currentRole = normalizeUserRole(targetUser.role);
    if (currentRole === role) {
      return sanitizeUser(targetUser);
    }

    if (currentRole === "admin" && role !== "admin") {
      const adminCount = store.users.filter((user) => normalizeUserRole(user.role) === "admin").length;
      if (adminCount <= 1) {
        throw createHttpError(400, "Süsteemis peab alati olema vähemalt üks admin.");
      }
    }

    targetUser.role = role;
    await writeStore(store);

    return sanitizeUser(targetUser);
  });
}

module.exports = {
  AUTH_STORE_PATH,
  changePassword,
  createHttpError,
  getUserByToken,
  invalidateSession,
  issueTemporaryPassword,
  listUsers,
  listPasswordResetRequests,
  loginUser,
  normalizeEmail,
  requestPasswordReset,
  registerUser,
  updateUserRole,
};