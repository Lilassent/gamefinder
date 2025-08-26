import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT ?? 465),
  secure: String(SMTP_SECURE ?? 'true') === 'true', // 465=true, 587=false
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export const FROM_EMAIL = SMTP_FROM || SMTP_USER;

// check connection at startup
export async function verifySmtp() {
  try {
    await transporter.verify();
    console.log('[SMTP] OK:', SMTP_HOST, SMTP_USER);
    return true;
  } catch (e) {
    console.error('[SMTP] VERIFY FAILED:', e);
    return false;
  }
}
