/**
 * emailService.ts — Platform email sender via Gmail API + Service Account JWT
 *
 * Authentication: Service Account with Domain-Wide Delegation (DWD).
 * The service account impersonates PLATFORM_SENDER_EMAIL to send on behalf
 * of the platform domain without any user interaction.
 *
 * Required Doppler secrets:
 *   GOOGLE_SERVICE_ACCOUNT_JSON  — full JSON content of the service account key file
 *   PLATFORM_SENDER_EMAIL        — e.g. agent@gatewayglobal.ai
 */

import { google } from 'googleapis';

export interface OnboardingEmailParams {
  to: string;
  customerName: string;
  businessName: string;
  planName: string;
  platformId: string;
  agentName?: string;
  siteUrl?: string;
}

function buildMimeMessage(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): string {
  const boundary = `----=_Part_${Date.now()}`;
  const lines = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    params.html,
    '',
    `--${boundary}--`,
  ];
  return lines.join('\r\n');
}

function renderOnboardingTemplate(params: OnboardingEmailParams): string {
  const {
    customerName,
    businessName,
    planName,
    platformId,
    agentName = 'Your AI Business Agent',
    siteUrl = '',
  } = params;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
    .section { margin: 28px 0; }
    .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6366f1; margin-bottom: 12px; border-bottom: 2px solid #e0e7ff; padding-bottom: 6px; }
    .platform-id-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 13px; color: #0f172a; word-break: break-all; }
    .platform-id-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 6px; }
    .feature-list { list-style: none; padding: 0; margin: 0; }
    .feature-list li { padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; display: flex; align-items: flex-start; gap: 10px; }
    .feature-list li:last-child { border-bottom: none; }
    .check { color: #10b981; font-weight: 700; flex-shrink: 0; }
    .steps-list { counter-reset: steps; list-style: none; padding: 0; margin: 0; }
    .steps-list li { counter-increment: steps; padding: 10px 0 10px 40px; position: relative; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
    .steps-list li:last-child { border-bottom: none; }
    .steps-list li::before { content: counter(steps); position: absolute; left: 0; top: 10px; background: #4f46e5; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
    .cta-button { display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 8px 0; }
    .footer { background: #f8fafc; padding: 24px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${businessName}</h1>
      <p>Your ${planName} plan is now active</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${customerName},</p>
      <p style="font-size:14px;color:#475569;">
        It's great to have you on board! Your <strong>${planName}</strong> plan for
        <strong>${businessName}</strong> is officially activated. Below is your complete
        Onboarding Kit — everything you need to get your AI-powered business operations running.
      </p>

      <div class="section">
        <div class="section-title">1. Your Business Identity Anchor</div>
        <p style="font-size:13px;color:#475569;margin:0 0 10px;">
          Reference this unique identifier for all support, configuration, and integrations.
        </p>
        <div class="platform-id-box">
          <div class="platform-id-label">Platform ID (UUID)</div>
          ${platformId}
        </div>
      </div>

      <div class="section">
        <div class="section-title">2. ${planName} Capability Activation</div>
        <ul class="feature-list">
          <li><span class="check">✓</span> Deep Intelligence Search powered by SerpApi</li>
          <li><span class="check">✓</span> Multimodal Interaction — real-time maps and interactive tools</li>
          <li><span class="check">✓</span> Advanced Grounding via Gemini 2.5 Flash Native Audio</li>
          <li><span class="check">✓</span> Lead Qualifier and Sales Closer agents unlocked</li>
        </ul>
      </div>

      <div class="section">
        <div class="section-title">3. Next Steps</div>
        <ol class="steps-list">
          <li${siteUrl ? ` style="padding-left:40px;"` : ''}>
            <strong>Review your live site</strong>${siteUrl ? ` at <a href="${siteUrl}" style="color:#4f46e5;">${siteUrl}</a>` : ' by logging in to your dashboard'} to see your agent in action.
          </li>
          <li>
            <strong>Configure your agent skills</strong> — log in to your Admin Dashboard using
            your Platform ID to toggle Empathy Mode, Aggressive Closing, and tool limits.
          </li>
          <li>
            <strong>Monitor your agents</strong> — review the Tool Call Activity log in the
            Admin Agent Tab to see exactly how your AI is reasoning through each interaction.
          </li>
        </ol>
      </div>

      <div style="text-align:center;margin:32px 0;">
        <p style="font-size:13px;color:#64748b;margin-bottom:16px;">
          Questions? Simply reply to this email or start a voice session with your agent.
        </p>
        <strong style="font-size:15px;">Welcome to the future of business operations.</strong>
      </div>
    </div>
    <div class="footer">
      <p>Sent by <strong>${agentName}</strong> &bull; ${businessName}</p>
      <p style="margin-top:8px;">This email was generated by your AI Business Agent following a verified plan upgrade.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends the platform onboarding kit email using the Gmail API.
 * Uses a Service Account with Domain-Wide Delegation — no user OAuth required.
 * Returns { sent: true } on success or { sent: false, error } on failure (never throws).
 */
export async function sendPlatformEmail(params: OnboardingEmailParams): Promise<{ sent: boolean; error?: string }> {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const senderEmail = process.env.PLATFORM_SENDER_EMAIL;

  if (!serviceAccountJson || !senderEmail) {
    const missing = [
      !serviceAccountJson && 'GOOGLE_SERVICE_ACCOUNT_JSON',
      !senderEmail && 'PLATFORM_SENDER_EMAIL',
    ].filter(Boolean).join(', ');
    console.error(`[EmailService] Missing Doppler secrets: ${missing}. Email not sent.`);
    return { sent: false, error: `Missing configuration: ${missing}` };
  }

  try {
    const credentials = JSON.parse(serviceAccountJson);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/gmail.send'],
      // Domain-Wide Delegation: impersonate the platform sender address
      clientOptions: { subject: senderEmail },
    });

    const gmail = google.gmail({ version: 'v1', auth });

    const subject = `Welcome to ${params.businessName} – Your Onboarding Kit & Next Steps`;
    const html = renderOnboardingTemplate(params);
    const raw = buildMimeMessage({ from: senderEmail, to: params.to, subject, html });

    // Gmail API requires base64url encoding with no padding
    const encoded = Buffer.from(raw)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encoded },
    });

    console.log(`[EmailService] Onboarding kit sent → ${params.to} (platform: ${params.platformId})`);
    return { sent: true };
  } catch (err: any) {
    console.error(`[EmailService] Failed to send onboarding email to ${params.to}:`, err.message);
    return { sent: false, error: err.message };
  }
}
