import { Resend } from "resend"

const resendApiKey = process.env.RESEND_API_KEY

export function getResendClient(): Resend | null {
  if (!resendApiKey) return null
  return new Resend(resendApiKey)
}

export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

interface SendFormEmailParams {
  to: string
  recipientName?: string
  formTitle: string
  agencyName: string
  formUrl: string
}

export async function sendFormInvitationEmail({
  to,
  recipientName,
  formTitle,
  agencyName,
  formUrl,
}: SendFormEmailParams): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient()
  if (!resend) {
    return { success: false, error: "Email service not configured. Set RESEND_API_KEY." }
  }

  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,"

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${formTitle}</title>
  </head>
  <body style="margin:0;padding:0;background:#f9fafb;font-family:'Inter',system-ui,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
            <tr>
              <td style="padding:32px 40px 0;">
                <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">${agencyName}</p>
                <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${formTitle}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 32px;">
                <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${greeting}</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  You've been asked to fill out a form: <strong>${formTitle}</strong>.
                  Please click the button below to get started.
                </p>
                <a href="${formUrl}"
                   style="display:inline-block;padding:12px 28px;background:#111827;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">
                  Fill Out Form
                </a>
                <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">
                  Or copy this link: <a href="${formUrl}" style="color:#6b7280;">${formUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;border-top:1px solid #f3f4f6;">
                <p style="margin:0;font-size:11px;color:#9ca3af;">Sent via Nessa CRM &middot; ${agencyName}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "forms@nessacrm.com"
    await resend.emails.send({
      from: `${agencyName} via Nessa CRM <${fromEmail}>`,
      to,
      subject: `Action Required: ${formTitle}`,
      html,
    })
    return { success: true }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Email send failed"
    return { success: false, error: message }
  }
}
