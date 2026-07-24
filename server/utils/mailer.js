// Password-reset email dispatch via Nodemailer (Gmail SMTP).
//
// The 6-digit code is sent ONLY to the user's registered email. It is never
// logged, never returned to the client, and never rendered in the UI. Configure
// EMAIL_USER + EMAIL_PASS (a Gmail App Password) in server/.env; see
// server/.env.example.

let cachedTransporter;
let transporterFailed = false;

function isEmailConfigured() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

function getTransporter() {
  if (transporterFailed) return null;
  if (cachedTransporter) return cachedTransporter;
  try {
    const nodemailer = require('nodemailer');
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    return cachedTransporter;
  } catch (err) {
    transporterFailed = true;
    console.error('Mailer: nodemailer transport could not be created:', err.message);
    return null;
  }
}

// Clean, centered card with the code emphasised. Georgian copy.
function resetEmailHtml(code) {
  return `<!doctype html>
<html lang="ka"><body style="margin:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,Arial,sans-serif;padding:32px 16px;">
  <div style="max-width:460px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
    <div style="background:#4F46E5;padding:24px 32px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Teacher Connection</h1>
    </div>
    <div style="padding:32px;text-align:center;">
      <p style="margin:0;color:#111827;font-size:15px;line-height:1.7;">
        გამარჯობა! Teacher Connection-ის ანგარიშის პაროლის აღდგენის კოდია:
      </p>
      <p style="margin:20px 0;">
        <strong style="font-size: 24px; letter-spacing: 4px; color: #4F46E5;">${code}</strong>
      </p>
      <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">
        კოდი მოქმედებს 15 წუთის განმავლობაში.
      </p>
    </div>
  </div>
</body></html>`;
}

/**
 * Sends the reset code to the user's email via Gmail SMTP. SMTP errors are
 * caught and logged here (never thrown, never exposing the code) so the request
 * stays graceful.
 * @returns {Promise<{delivered: boolean}>}
 */
async function sendPasswordResetEmail(userEmail, code) {
  if (!isEmailConfigured()) {
    console.warn(
      `Mailer: EMAIL_USER/EMAIL_PASS not set — a password-reset email for ${userEmail} was NOT sent. ` +
        `Add them to server/.env to enable delivery.`,
    );
    return { delivered: false };
  }

  const transporter = getTransporter();
  if (!transporter) return { delivered: false };

  try {
    await transporter.sendMail({
      from: `Teacher Connection <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: 'პაროლის აღდგენის კოდი - Teacher Connection',
      html: resetEmailHtml(code),
      text: `თქვენი პაროლის აღდგენის კოდია: ${code} (მოქმედებს 15 წუთი).`,
    });
    console.log('Reset email sent successfully via Nodemailer to:', userEmail);
    return { delivered: true };
  } catch (err) {
    console.error('Nodemailer dispatch error for', userEmail + ':', err.message);
    return { delivered: false };
  }
}

// Verifies the SMTP connection + credentials WITHOUT sending an email.
async function verifyEmailTransport() {
  if (!isEmailConfigured()) return { ok: false, error: 'EMAIL_USER/EMAIL_PASS not set' };
  const transporter = getTransporter();
  if (!transporter) return { ok: false, error: 'transport unavailable' };
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { sendPasswordResetEmail, isEmailConfigured, verifyEmailTransport };
