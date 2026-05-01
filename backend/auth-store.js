const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { Pool } = require("pg");

const AUTH_STORE_SEED_PATH = path.join(__dirname, "auth-store.seed.json");
const BUNDLED_AUTH_STORE_PATH = path.join(__dirname, "data", "auth-store.json");
const AUTH_STORE_PATH = "postgresql";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;
const DEFAULT_ADMIN_EMAILS = [];

let authInitializationPromise = null;
let authInitialized = false;

function normalizeStorePath(value) {
  return String(value || "").trim();
}

function getDatabaseUrl() {
  const databaseUrl =
    normalizeStorePath(process.env.DATABASE_URL) ||
    normalizeStorePath(process.env.POSTGRES_URL) ||
    normalizeStorePath(process.env.POSTGRES_PRISMA_URL);

  if (!databaseUrl) {
    throw new Error("DATABASE_URL puudub. Lisa PostgreSQL ühendusstring serveri keskkonnamuutujatesse.");
  }

  return databaseUrl;
}

function shouldUseSsl(databaseUrl) {
  const explicitMode = normalizeStorePath(process.env.PGSSLMODE).toLowerCase();
  if (explicitMode === "disable") {
    return false;
  }

  const explicitSsl = normalizeStorePath(process.env.DATABASE_SSL).toLowerCase();
  if (explicitSsl === "false" || explicitSsl === "0") {
    return false;
  }

  try {
    const parsed = new URL(databaseUrl);
    return !["localhost", "127.0.0.1"].includes(parsed.hostname) &&
      !parsed.hostname.endsWith(".railway.internal");
  } catch {
    return true;
  }
}

function getSslConfig(databaseUrl) {
  if (!shouldUseSsl(databaseUrl)) {
    return undefined;
  }
  const rejectUnauthorized = normalizeStorePath(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED).toLowerCase();
  return { rejectUnauthorized: rejectUnauthorized !== "false" };
}

function getPool() {
  if (!global.__laserGraveerimineBackendPool) {
    const databaseUrl = getDatabaseUrl();
    global.__laserGraveerimineBackendPool = new Pool({
      connectionString: databaseUrl,
      ssl: getSslConfig(databaseUrl),
      max: 10,
    });
  }

  return global.__laserGraveerimineBackendPool;
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function withTransaction(operation) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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

  for (const email of String(process.env.ADMIN_EMAILS || "")
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
    createdAt: new Date(user.created_at || user.createdAt).toISOString(),
  };
}

function sanitizePasswordResetRequest(request) {
  return {
    id: request.id,
    userId: request.user_id || request.userId,
    email: request.email,
    name: request.name,
    note: typeof request.note === "string" ? request.note : "",
    createdAt: new Date(request.created_at || request.createdAt).toISOString(),
  };
}

function generateTemporaryPassword() {
  return `LG-${crypto.randomBytes(9).toString("base64url")}`;
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

function createPasswordResetToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const createdAt = new Date().toISOString();

  return {
    token,
    resetToken: {
      id: crypto.randomUUID(),
      userId,
      tokenHash: hashToken(token),
      createdAt,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString(),
    },
  };
}

function normalizeUsersWithRoles(users) {
  const configuredAdminEmails = readConfiguredAdminEmails();
  let hasAdmin = false;

  const normalizedUsers = users.map((user) => {
    const normalizedEmail = normalizeEmail(user.email);
    const role = configuredAdminEmails.size > 0
      ? (configuredAdminEmails.has(normalizedEmail) ? "admin" : "user")
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

function normalizeBootstrapStore(store) {
  return {
    users: normalizeUsersWithRoles(Array.isArray(store?.users) ? store.users : []),
    sessions: Array.isArray(store?.sessions) ? store.sessions : [],
    passwordResetTokens: Array.isArray(store?.passwordResetTokens)
      ? store.passwordResetTokens
      : [],
    passwordResetRequests: Array.isArray(store?.passwordResetRequests)
      ? store.passwordResetRequests
      : [],
    meta: {
      appliedRecoveryFingerprint:
        typeof store?.meta?.appliedRecoveryFingerprint === "string"
          ? store.meta.appliedRecoveryFingerprint
          : "",
    },
  };
}

async function readBootstrapStoreFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return normalizeBootstrapStore(JSON.parse(raw));
}

async function loadBootstrapStore() {
  const candidates = [BUNDLED_AUTH_STORE_PATH, AUTH_STORE_SEED_PATH];

  for (const candidate of candidates) {
    try {
      return await readBootstrapStoreFile(candidate);
    } catch {
      // Continue to the next bootstrap source.
    }
  }

  return normalizeBootstrapStore({ users: [], sessions: [] });
}

async function ensureAuthSchema() {
  if (authInitialized) {
    return;
  }

  if (!authInitializationPromise) {
    authInitializationPromise = withTransaction(async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS app_auth_users (
          id text PRIMARY KEY,
          name text NOT NULL,
          email text NOT NULL UNIQUE,
          role text NOT NULL CHECK (role IN ('admin', 'user')),
          password_hash text NOT NULL,
          created_at timestamptz NOT NULL
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS app_auth_sessions (
          id text PRIMARY KEY,
          user_id text NOT NULL REFERENCES app_auth_users(id) ON DELETE CASCADE,
          token_hash text NOT NULL UNIQUE,
          created_at timestamptz NOT NULL,
          expires_at timestamptz NOT NULL
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS app_auth_password_reset_tokens (
          id text PRIMARY KEY,
          user_id text NOT NULL REFERENCES app_auth_users(id) ON DELETE CASCADE,
          token_hash text NOT NULL UNIQUE,
          created_at timestamptz NOT NULL,
          expires_at timestamptz NOT NULL
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS app_auth_password_reset_requests (
          id text PRIMARY KEY,
          user_id text NOT NULL REFERENCES app_auth_users(id) ON DELETE CASCADE,
          email text NOT NULL,
          name text NOT NULL,
          note text NOT NULL DEFAULT '',
          created_at timestamptz NOT NULL
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS app_auth_meta (
          key text PRIMARY KEY,
          value text NOT NULL
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS app_user_laser_settings (
          user_id text PRIMARY KEY REFERENCES app_auth_users(id) ON DELETE CASCADE,
          settings jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT NOW()
        )
      `);

      const countResult = await client.query("SELECT COUNT(*)::text AS count FROM app_auth_users");
      const userCount = Number(countResult.rows[0]?.count || "0");

      if (userCount > 0) {
        return;
      }

      const bootstrapStore = await loadBootstrapStore();

      for (const user of bootstrapStore.users) {
        await client.query(
          `
            INSERT INTO app_auth_users (id, name, email, role, password_hash, created_at)
            VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
            ON CONFLICT (id) DO NOTHING
          `,
          [
            user.id,
            String(user.name || "").trim(),
            normalizeEmail(user.email),
            normalizeUserRole(user.role),
            user.passwordHash,
            user.createdAt,
          ]
        );
      }

      for (const session of bootstrapStore.sessions) {
        await client.query(
          `
            INSERT INTO app_auth_sessions (id, user_id, token_hash, created_at, expires_at)
            VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz)
            ON CONFLICT (id) DO NOTHING
          `,
          [session.id, session.userId, session.tokenHash, session.createdAt, session.expiresAt]
        );
      }

      for (const token of bootstrapStore.passwordResetTokens) {
        await client.query(
          `
            INSERT INTO app_auth_password_reset_tokens (id, user_id, token_hash, created_at, expires_at)
            VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz)
            ON CONFLICT (id) DO NOTHING
          `,
          [token.id, token.userId, token.tokenHash, token.createdAt, token.expiresAt]
        );
      }

      for (const request of bootstrapStore.passwordResetRequests) {
        await client.query(
          `
            INSERT INTO app_auth_password_reset_requests (id, user_id, email, name, note, created_at)
            VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
            ON CONFLICT (id) DO NOTHING
          `,
          [
            request.id,
            request.userId,
            normalizeEmail(request.email),
            String(request.name || "").trim(),
            typeof request.note === "string" ? request.note : "",
            request.createdAt,
          ]
        );
      }

      if (bootstrapStore.meta.appliedRecoveryFingerprint) {
        await client.query(
          `
            INSERT INTO app_auth_meta (key, value)
            VALUES ('appliedRecoveryFingerprint', $1)
            ON CONFLICT (key) DO UPDATE
              SET value = EXCLUDED.value
          `,
          [bootstrapStore.meta.appliedRecoveryFingerprint]
        );
      }
    })
      .then(() => {
        authInitialized = true;
      })
      .finally(() => {
        authInitializationPromise = null;
      });
  }

  await authInitializationPromise;
}

async function pruneExpiredSessions(client) {
  await client.query("DELETE FROM app_auth_sessions WHERE expires_at <= NOW()");
}

async function pruneExpiredPasswordResetTokens(client) {
  await client.query("DELETE FROM app_auth_password_reset_tokens WHERE expires_at <= NOW()");
}

async function syncConfiguredAdminUsers(client) {
  const configuredAdminEmails = [...readConfiguredAdminEmails()];

  if (configuredAdminEmails.length > 0) {
    await client.query(
      `
        UPDATE app_auth_users
        SET role = CASE
          WHEN email = ANY($1::text[]) THEN 'admin'
          ELSE 'user'
        END
      `,
      [configuredAdminEmails]
    );
    return;
  }

  const adminCountResult = await client.query(
    "SELECT COUNT(*)::text AS count FROM app_auth_users WHERE role = 'admin'"
  );
  const adminCount = Number(adminCountResult.rows[0]?.count || "0");

  if (adminCount > 0) {
    return;
  }

  const firstUserResult = await client.query(
    `
      SELECT id
      FROM app_auth_users
      ORDER BY created_at ASC
      LIMIT 1
    `
  );

  const firstUserId = firstUserResult.rows[0]?.id;
  if (firstUserId) {
    await client.query("UPDATE app_auth_users SET role = 'admin' WHERE id = $1", [firstUserId]);
  }
}

function getRecoveryConfiguration() {
  const password = String(process.env.AUTH_RECOVERY_PASSWORD || "").trim();
  const configuredAdminEmails = [...readConfiguredAdminEmails()];
  const email = normalizeEmail(
    process.env.AUTH_RECOVERY_EMAIL || configuredAdminEmails[0] || ""
  );

  if (!password || !email) {
    return null;
  }

  return {
    email,
    password,
    fingerprint: hashToken(`${email}:${password}`),
  };
}

async function applyRecoveryConfiguration(client) {
  const recovery = getRecoveryConfiguration();
  if (!recovery) {
    return;
  }

  const metaResult = await client.query(
    "SELECT value FROM app_auth_meta WHERE key = 'appliedRecoveryFingerprint' LIMIT 1"
  );
  const appliedFingerprint = metaResult.rows[0]?.value || "";

  if (appliedFingerprint === recovery.fingerprint) {
    return;
  }

  const userResult = await client.query(
    `
      SELECT id
      FROM app_auth_users
      WHERE email = $1
      LIMIT 1
    `,
    [recovery.email]
  );

  let userId = userResult.rows[0]?.id || "";

  if (!userId) {
    userId = crypto.randomUUID();
    await client.query(
      `
        INSERT INTO app_auth_users (id, name, email, role, password_hash, created_at)
        VALUES ($1, $2, $3, 'admin', $4, $5::timestamptz)
      `,
      [
        userId,
        recovery.email.split("@")[0] || "Admin",
        recovery.email,
        hashPassword(recovery.password),
        new Date().toISOString(),
      ]
    );
  } else {
    await client.query(
      `
        UPDATE app_auth_users
        SET email = $2,
            role = 'admin',
            password_hash = $3
        WHERE id = $1
      `,
      [userId, recovery.email, hashPassword(recovery.password)]
    );
  }

  await client.query("DELETE FROM app_auth_sessions WHERE user_id = $1", [userId]);
  await client.query("DELETE FROM app_auth_password_reset_tokens WHERE user_id = $1", [userId]);
  await client.query("DELETE FROM app_auth_password_reset_requests WHERE user_id = $1", [userId]);
  await client.query(
    `
      INSERT INTO app_auth_meta (key, value)
      VALUES ('appliedRecoveryFingerprint', $1)
      ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value
    `,
    [recovery.fingerprint]
  );
}

async function withPreparedAuthTransaction(operation) {
  await ensureAuthSchema();

  return withTransaction(async (client) => {
    await syncConfiguredAdminUsers(client);
    await applyRecoveryConfiguration(client);
    await pruneExpiredSessions(client);
    await pruneExpiredPasswordResetTokens(client);
    return operation(client);
  });
}

async function determineRoleForNewUser(client, email) {
  const configuredAdminEmails = readConfiguredAdminEmails();

  if (configuredAdminEmails.size > 0) {
    return configuredAdminEmails.has(email) ? "admin" : "user";
  }

  const adminCountResult = await client.query(
    "SELECT COUNT(*)::text AS count FROM app_auth_users WHERE role = 'admin'"
  );
  const adminCount = Number(adminCountResult.rows[0]?.count || "0");

  return adminCount > 0 ? "user" : "admin";
}

async function registerUser({ name, email, password }) {
  return withPreparedAuthTransaction(async (client) => {
    const normalizedEmail = normalizeEmail(email);
    const existingUserResult = await client.query(
      "SELECT id FROM app_auth_users WHERE email = $1 LIMIT 1",
      [normalizedEmail]
    );

    if (existingUserResult.rowCount > 0) {
      throw createHttpError(409, "Selle e-postiga konto on juba olemas.");
    }

    const user = {
      id: crypto.randomUUID(),
      name: String(name || "").trim(),
      email: normalizedEmail,
      role: await determineRoleForNewUser(client, normalizedEmail),
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    await client.query(
      `
        INSERT INTO app_auth_users (id, name, email, role, password_hash, created_at)
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
      `,
      [user.id, user.name, user.email, user.role, user.passwordHash, user.createdAt]
    );

    const { token, session } = createSession(user.id);
    await client.query(
      `
        INSERT INTO app_auth_sessions (id, user_id, token_hash, created_at, expires_at)
        VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz)
      `,
      [session.id, session.userId, session.tokenHash, session.createdAt, session.expiresAt]
    );

    return { user: sanitizeUser({ ...user, created_at: user.createdAt }), token };
  });
}

async function loginUser({ email, password }) {
  return withPreparedAuthTransaction(async (client) => {
    const normalizedEmail = normalizeEmail(email);
    const userResult = await client.query(
      `
        SELECT id, name, email, role, password_hash, created_at
        FROM app_auth_users
        WHERE email = $1
        LIMIT 1
      `,
      [normalizedEmail]
    );

    const user = userResult.rows[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      throw createHttpError(401, "Vale e-post või parool.");
    }

    const { token, session } = createSession(user.id);
    await client.query(
      `
        INSERT INTO app_auth_sessions (id, user_id, token_hash, created_at, expires_at)
        VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz)
      `,
      [session.id, session.userId, session.tokenHash, session.createdAt, session.expiresAt]
    );

    return { user: sanitizeUser(user), token };
  });
}

async function getUserByToken(token) {
  if (!token) {
    return null;
  }

  return withPreparedAuthTransaction(async (client) => {
    const tokenHash = hashToken(token);
    const result = await client.query(
      `
        SELECT u.id, u.name, u.email, u.role, u.created_at
        FROM app_auth_sessions s
        JOIN app_auth_users u ON u.id = s.user_id
        WHERE s.token_hash = $1
          AND s.expires_at > NOW()
        LIMIT 1
      `,
      [tokenHash]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return sanitizeUser(result.rows[0]);
  });
}

async function invalidateSession(token) {
  if (!token) {
    return false;
  }

  return withPreparedAuthTransaction(async (client) => {
    const tokenHash = hashToken(token);
    const result = await client.query(
      "DELETE FROM app_auth_sessions WHERE token_hash = $1 RETURNING id",
      [tokenHash]
    );
    return result.rowCount > 0;
  });
}

async function changePassword({ token, currentPassword, nextPassword }) {
  if (!token) {
    throw createHttpError(401, "Sessioon puudub.");
  }

  return withPreparedAuthTransaction(async (client) => {
    const tokenHash = hashToken(token);
    const userResult = await client.query(
      `
        SELECT u.id, u.name, u.email, u.role, u.password_hash, u.created_at
        FROM app_auth_sessions s
        JOIN app_auth_users u ON u.id = s.user_id
        WHERE s.token_hash = $1
          AND s.expires_at > NOW()
        LIMIT 1
      `,
      [tokenHash]
    );

    const user = userResult.rows[0];
    if (!user) {
      throw createHttpError(401, "Sessioon on aegunud või vigane.");
    }

    if (!verifyPassword(currentPassword, user.password_hash)) {
      throw createHttpError(401, "Praegune parool on vale.");
    }

    if (verifyPassword(nextPassword, user.password_hash)) {
      throw createHttpError(400, "Uus parool peab erinema praegusest paroolist.");
    }

    const nextPasswordHash = hashPassword(nextPassword);
    await client.query(
      "UPDATE app_auth_users SET password_hash = $2 WHERE id = $1",
      [user.id, nextPasswordHash]
    );
    await client.query("DELETE FROM app_auth_sessions WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM app_auth_password_reset_tokens WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM app_auth_password_reset_requests WHERE user_id = $1", [user.id]);

    const { token: nextToken, session: nextSession } = createSession(user.id);
    await client.query(
      `
        INSERT INTO app_auth_sessions (id, user_id, token_hash, created_at, expires_at)
        VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz)
      `,
      [
        nextSession.id,
        nextSession.userId,
        nextSession.tokenHash,
        nextSession.createdAt,
        nextSession.expiresAt,
      ]
    );

    return {
      user: sanitizeUser(user),
      token: nextToken,
    };
  });
}

async function requestPasswordReset({ email, note }) {
  return withPreparedAuthTransaction(async (client) => {
    const normalizedEmail = normalizeEmail(email);
    const userResult = await client.query(
      `
        SELECT id, name, email, role, created_at
        FROM app_auth_users
        WHERE email = $1
        LIMIT 1
      `,
      [normalizedEmail]
    );

    const user = userResult.rows[0];
    if (!user) {
      return { success: true };
    }

    const trimmedNote = String(note || "").trim().slice(0, 500);
    const { token, resetToken } = createPasswordResetToken(user.id);

    await client.query("DELETE FROM app_auth_password_reset_tokens WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM app_auth_password_reset_requests WHERE user_id = $1", [user.id]);

    await client.query(
      `
        INSERT INTO app_auth_password_reset_requests (id, user_id, email, name, note, created_at)
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
      `,
      [crypto.randomUUID(), user.id, user.email, user.name, trimmedNote, new Date().toISOString()]
    );

    await client.query(
      `
        INSERT INTO app_auth_password_reset_tokens (id, user_id, token_hash, created_at, expires_at)
        VALUES ($1, $2, $3, $4::timestamptz, $5::timestamptz)
      `,
      [
        resetToken.id,
        resetToken.userId,
        resetToken.tokenHash,
        resetToken.createdAt,
        resetToken.expiresAt,
      ]
    );

    return {
      success: true,
      resetToken: token,
      user: sanitizeUser(user),
    };
  });
}

async function verifyPasswordResetToken(token) {
  if (!token) {
    return null;
  }

  return withPreparedAuthTransaction(async (client) => {
    const tokenHash = hashToken(token);
    const result = await client.query(
      `
        SELECT u.id, u.name, u.email, u.role, u.created_at
        FROM app_auth_password_reset_tokens t
        JOIN app_auth_users u ON u.id = t.user_id
        WHERE t.token_hash = $1
          AND t.expires_at > NOW()
        LIMIT 1
      `,
      [tokenHash]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return sanitizeUser(result.rows[0]);
  });
}

async function resetPasswordWithToken({ token, nextPassword }) {
  if (!token) {
    throw createHttpError(400, "Parooli taastamise token puudub.");
  }

  return withPreparedAuthTransaction(async (client) => {
    const tokenHash = hashToken(token);
    const result = await client.query(
      `
        SELECT u.id, u.name, u.email, u.role, u.password_hash, u.created_at
        FROM app_auth_password_reset_tokens t
        JOIN app_auth_users u ON u.id = t.user_id
        WHERE t.token_hash = $1
          AND t.expires_at > NOW()
        LIMIT 1
      `,
      [tokenHash]
    );

    const user = result.rows[0];
    if (!user) {
      throw createHttpError(400, "Parooli taastamise link on aegunud või vigane.");
    }

    if (verifyPassword(nextPassword, user.password_hash)) {
      await client.query("DELETE FROM app_auth_password_reset_tokens WHERE token_hash = $1", [tokenHash]);
      throw createHttpError(400, "Uus parool peab erinema praegusest paroolist.");
    }

    await client.query("UPDATE app_auth_users SET password_hash = $2 WHERE id = $1", [
      user.id,
      hashPassword(nextPassword),
    ]);
    await client.query("DELETE FROM app_auth_sessions WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM app_auth_password_reset_tokens WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM app_auth_password_reset_requests WHERE user_id = $1", [user.id]);

    return { success: true, user: sanitizeUser(user) };
  });
}

async function listPasswordResetRequests() {
  return withPreparedAuthTransaction(async (client) => {
    const result = await client.query(
      `
        SELECT id, user_id, email, name, note, created_at
        FROM app_auth_password_reset_requests
        ORDER BY created_at DESC
      `
    );

    return result.rows.map((request) => sanitizePasswordResetRequest(request));
  });
}

async function issueTemporaryPassword({ actingUserId, requestId }) {
  return withPreparedAuthTransaction(async (client) => {
    const actingUserResult = await client.query(
      "SELECT id, role FROM app_auth_users WHERE id = $1 LIMIT 1",
      [actingUserId]
    );
    const actingUser = actingUserResult.rows[0];

    if (!actingUser || normalizeUserRole(actingUser.role) !== "admin") {
      throw createHttpError(403, "Selle toimingu jaoks on vaja admin-õigusi.");
    }

    const requestResult = await client.query(
      `
        SELECT id, user_id, email, name, note, created_at
        FROM app_auth_password_reset_requests
        WHERE id = $1
        LIMIT 1
      `,
      [requestId]
    );
    const request = requestResult.rows[0];

    if (!request) {
      throw createHttpError(404, "Parooli reseti taotlust ei leitud.");
    }

    const userResult = await client.query(
      `
        SELECT id, name, email, role, created_at
        FROM app_auth_users
        WHERE id = $1
        LIMIT 1
      `,
      [request.user_id]
    );
    const user = userResult.rows[0];

    if (!user) {
      await client.query("DELETE FROM app_auth_password_reset_requests WHERE id = $1", [request.id]);
      throw createHttpError(404, "Kasutajat ei leitud.");
    }

    const temporaryPassword = generateTemporaryPassword();
    await client.query("UPDATE app_auth_users SET password_hash = $2 WHERE id = $1", [
      user.id,
      hashPassword(temporaryPassword),
    ]);
    await client.query("DELETE FROM app_auth_sessions WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM app_auth_password_reset_tokens WHERE user_id = $1", [user.id]);
    await client.query("DELETE FROM app_auth_password_reset_requests WHERE user_id = $1", [user.id]);

    return {
      request: sanitizePasswordResetRequest(request),
      temporaryPassword,
      user: sanitizeUser(user),
    };
  });
}

async function listUsers() {
  return withPreparedAuthTransaction(async (client) => {
    const result = await client.query(
      `
        SELECT id, name, email, role, created_at
        FROM app_auth_users
        ORDER BY created_at ASC
      `
    );

    return result.rows.map((user) => sanitizeUser(user));
  });
}

async function updateUserRole({ actingUserId, targetUserId, role }) {
  if (!isValidRole(role)) {
    throw createHttpError(400, "Roll peab olema kas admin või user.");
  }

  return withPreparedAuthTransaction(async (client) => {
    const actingUserResult = await client.query(
      `
        SELECT id, name, email, role, created_at
        FROM app_auth_users
        WHERE id = $1
        LIMIT 1
      `,
      [actingUserId]
    );
    const actingUser = actingUserResult.rows[0];

    if (!actingUser || normalizeUserRole(actingUser.role) !== "admin") {
      throw createHttpError(403, "Selle toimingu jaoks on vaja admin-õigusi.");
    }

    const targetUserResult = await client.query(
      `
        SELECT id, name, email, role, created_at
        FROM app_auth_users
        WHERE id = $1
        LIMIT 1
      `,
      [targetUserId]
    );
    const targetUser = targetUserResult.rows[0];

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
      const adminCountResult = await client.query(
        "SELECT COUNT(*)::text AS count FROM app_auth_users WHERE role = 'admin'"
      );
      const adminCount = Number(adminCountResult.rows[0]?.count || "0");
      if (adminCount <= 1) {
        throw createHttpError(400, "Süsteemis peab alati olema vähemalt üks admin.");
      }
    }

    await client.query("UPDATE app_auth_users SET role = $2 WHERE id = $1", [targetUser.id, role]);

    return sanitizeUser({
      ...targetUser,
      role,
    });
  });
}

module.exports = {
  AUTH_STORE_PATH,
  changePassword,
  createHttpError,
  getPool,
  getUserByToken,
  invalidateSession,
  issueTemporaryPassword,
  listUsers,
  listPasswordResetRequests,
  loginUser,
  normalizeEmail,
  requestPasswordReset,
  registerUser,
  resetPasswordWithToken,
  updateUserRole,
  verifyPasswordResetToken,
};
