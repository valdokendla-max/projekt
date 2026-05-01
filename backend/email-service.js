const nodemailer = require("nodemailer");

const DEFAULT_APP_BASE_URL = "https://vkengraveai.eu";
const DEFAULT_ADMIN_EMAILS = [];

let cachedTransporter = null;

function normalize(value) {
  return String(value || "").trim();
}

function getConfiguredAdminEmails() {
  const emails = new Set(
    DEFAULT_ADMIN_EMAILS.map((email) => normalize(email).toLowerCase()).filter(Boolean)
  );

  for (const email of normalize(process.env.ADMIN_EMAILS)
    .split(",")
    .map((value) => normalize(value).toLowerCase())
    .filter(Boolean)) {
    emails.add(email);
  }

  return [...emails];
}

function getAppBaseUrl() {
  return normalize(
    process.env.APP_BASE_URL || process.env.QSTASH_CALLBACK_BASE_URL || DEFAULT_APP_BASE_URL
  ).replace(/\/$/, "");
}

function getResendConfig() {
  const apiKey = normalize(process.env.RESEND_API_KEY);
  const from = normalize(process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.MAIL_FROM) || "onboarding@resend.dev";
  return {
    apiKey,
    from,
    isConfigured: Boolean(apiKey),
  };
}

function getMailConfig() {
  const host = normalize(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT || 587);
  const user = normalize(process.env.SMTP_USER);
  const pass = normalize(process.env.SMTP_PASS);
  const from = normalize(process.env.SMTP_FROM || process.env.MAIL_FROM);
  const secure = normalize(process.env.SMTP_SECURE) === "true" || port === 465;
  const resend = getResendConfig();
  const appBaseUrl = getAppBaseUrl();

  return {
    host,
    port,
    secure,
    user,
    pass,
    from: resend.isConfigured ? resend.from : from,
    appBaseUrl,
    isConfigured: resend.isConfigured || Boolean(host && port && from),
    provider: resend.isConfigured ? "resend" : "smtp",
  };
}

function getTransporter() {
  const config = getMailConfig();
  if (config.provider !== "smtp" || !config.isConfigured) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: !config.secure,
      family: 4,
      auth: config.user && config.pass
        ? { user: config.user, pass: config.pass }
        : undefined,
    });
  }

  return cachedTransporter;
}

async function sendViaResend(message) {
  const resend = getResendConfig();

  const to = Array.isArray(message.to) ? message.to : [message.to];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resend.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resend.from,
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
}

async function sendEmail(message) {
  const config = getMailConfig();

  if (!config.isConfigured) {
    return { sent: false, skipped: true };
  }

  if (config.provider === "resend") {
    await sendViaResend(message);
    return { sent: true };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false, skipped: true };
  }

  try {
    await transporter.sendMail({ from: config.from, ...message });
  } catch (error) {
    cachedTransporter = null;
    throw error;
  }

  return { sent: true };
}

function buildPasswordResetUrl(resetToken) {
  return `${getAppBaseUrl()}/parooli-taastamine?token=${encodeURIComponent(resetToken)}`;
}

async function sendRegistrationNotifications(user) {
  const adminEmails = getConfiguredAdminEmails().filter((email) => email !== user.email);

  await sendEmail({
    to: user.email,
    subject: "Konto loodud | Laser Graveerimine",
    text: [
      `Tere, ${user.name}!`,
      "",
      "Sinu konto Laser Graveerimine keskkonnas on edukalt loodud.",
      "Saad nüüd sisse logida oma e-posti ja parooliga.",
    ].join("\n"),
    html: `
      <p>Tere, ${user.name}!</p>
      <p>Sinu konto <strong>Laser Graveerimine</strong> keskkonnas on edukalt loodud.</p>
      <p>Saad nüüd sisse logida oma e-posti ja parooliga.</p>
    `,
  });

  if (adminEmails.length > 0) {
    await sendEmail({
      to: adminEmails,
      subject: "Uus kasutaja registreerus | Laser Graveerimine",
      text: [
        "Süsteemis registreeriti uus kasutaja.",
        `Nimi: ${user.name}`,
        `E-post: ${user.email}`,
        `Roll: ${user.role}`,
      ].join("\n"),
      html: `
        <p>Süsteemis registreeriti uus kasutaja.</p>
        <ul>
          <li><strong>Nimi:</strong> ${user.name}</li>
          <li><strong>E-post:</strong> ${user.email}</li>
          <li><strong>Roll:</strong> ${user.role}</li>
        </ul>
      `,
    });
  }
}

async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = buildPasswordResetUrl(resetToken);

  await sendEmail({
    to: user.email,
    subject: "Parooli taastamine | Laser Graveerimine",
    text: [
      `Tere, ${user.name}!`,
      "",
      "Saime parooli taastamise taotluse.",
      "Uue parooli saad määrata selle lingi kaudu:",
      resetUrl,
      "",
      "Link aegub 30 minuti pärast.",
      "Kui sina seda taotlust ei esitanud, võid selle kirja tähelepanuta jätta.",
    ].join("\n"),
    html: `
      <p>Tere, ${user.name}!</p>
      <p>Saime parooli taastamise taotluse.</p>
      <p><a href="${resetUrl}">Ava parooli taastamise leht</a></p>
      <p>Kui link ei avane, kasuta seda aadressi:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Link aegub 30 minuti pärast.</p>
      <p>Kui sina seda taotlust ei esitanud, võid selle kirja tähelepanuta jätta.</p>
    `,
  });
}

module.exports = {
  buildPasswordResetUrl,
  getMailConfig,
  sendEmail,
  sendPasswordResetEmail,
  sendRegistrationNotifications,
};
