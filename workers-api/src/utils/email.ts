// Resend HTTP API client. Workers can't do SMTP, so we use Resend's REST endpoint.
// All sends are best-effort; failures log but never throw, so user flows aren't blocked.

interface SendArgs {
  to: string | string[]
  subject: string
  text: string
  html?: string
}

export async function sendEmail(env: { RESEND_API_KEY?: string; RESEND_FROM_ADDRESS?: string }, args: SendArgs): Promise<boolean> {
  const apiKey = (env.RESEND_API_KEY || '').trim()
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set; skipping send to', args.to)
    return false
  }

  const from = env.RESEND_FROM_ADDRESS || 'Laser Graveerimine <noreply@vkengraveai.eu>'
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(args.to) ? args.to : [args.to],
        subject: args.subject,
        text: args.text,
        html: args.html,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[email] Resend send failed:', res.status, body)
      return false
    }

    return true
  } catch (error) {
    console.error('[email] Resend send error:', error)
    return false
  }
}

export function buildPasswordResetUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, '')}/parooli-taastamine?token=${encodeURIComponent(token)}`
}

export async function sendPasswordResetEmail(
  env: { RESEND_API_KEY?: string; RESEND_FROM_ADDRESS?: string; PASSWORD_RESET_BASE_URL?: string },
  user: { name: string; email: string },
  resetToken: string,
): Promise<boolean> {
  const baseUrl = env.PASSWORD_RESET_BASE_URL || 'https://vkengraveai.eu'
  const resetUrl = buildPasswordResetUrl(baseUrl, resetToken)
  return sendEmail(env, {
    to: user.email,
    subject: 'Parooli taastamine | Laser Graveerimine',
    text: [
      `Tere, ${user.name}!`,
      '',
      'Saime parooli taastamise taotluse.',
      'Uue parooli saad määrata selle lingi kaudu:',
      resetUrl,
      '',
      'Link aegub 30 minuti pärast.',
      'Kui sina seda taotlust ei esitanud, võid selle kirja tähelepanuta jätta.',
    ].join('\n'),
    html: `
      <p>Tere, ${user.name}!</p>
      <p>Saime parooli taastamise taotluse.</p>
      <p><a href="${resetUrl}">Ava parooli taastamise leht</a></p>
      <p>Kui link ei avane, kasuta seda aadressi:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Link aegub 30 minuti pärast.</p>
      <p>Kui sina seda taotlust ei esitanud, võid selle kirja tähelepanuta jätta.</p>
    `,
  })
}

export async function sendRegistrationNotification(
  env: { RESEND_API_KEY?: string; RESEND_FROM_ADDRESS?: string; ADMIN_NOTIFY_EMAIL?: string },
  user: { name: string; email: string; role: string },
): Promise<void> {
  await sendEmail(env, {
    to: user.email,
    subject: 'Konto loodud | Laser Graveerimine',
    text: [
      `Tere, ${user.name}!`,
      '',
      'Sinu konto Laser Graveerimine keskkonnas on edukalt loodud.',
      'Saad nüüd sisse logida oma e-posti ja parooliga.',
    ].join('\n'),
    html: `
      <p>Tere, ${user.name}!</p>
      <p>Sinu konto <strong>Laser Graveerimine</strong> keskkonnas on edukalt loodud.</p>
      <p>Saad nüüd sisse logida oma e-posti ja parooliga.</p>
    `,
  })

  const adminEmail = (env.ADMIN_NOTIFY_EMAIL || '').trim()
  if (adminEmail && adminEmail !== user.email) {
    await sendEmail(env, {
      to: adminEmail,
      subject: 'Uus kasutaja registreerus | Laser Graveerimine',
      text: [
        'Süsteemis registreeriti uus kasutaja.',
        `Nimi: ${user.name}`,
        `E-post: ${user.email}`,
        `Roll: ${user.role}`,
      ].join('\n'),
      html: `
        <p>Süsteemis registreeriti uus kasutaja.</p>
        <ul>
          <li><strong>Nimi:</strong> ${user.name}</li>
          <li><strong>E-post:</strong> ${user.email}</li>
          <li><strong>Roll:</strong> ${user.role}</li>
        </ul>
      `,
    })
  }
}
