// services/contactService.js
// Business logic for contact form submissions

const sendEmail = require('../utils/sendEmail');

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function buildEmailHtml({ name, email, subject, message }) {
  const safeMessage = String(message || '').replace(/\n/g, '<br/>');
  const subj = subject && subject.trim() ? `Contact Form: ${subject}` : `Contact Form from ${name}`;
  const html = `
      <p>You have a new message from the contact form:</p>
      <ul>
        <li><strong>Name:</strong> ${name}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Subject:</strong> ${subject || '- (none) -'}</li>
      </ul>
      <hr/>
      <div>${safeMessage}</div>
    `;
  return { subj, html };
}

async function sendContactMessage({ name, email, subject, message }) {
  if (!name || !email || !message) throw httpError(400, 'Name, email and message are required');

  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER;
  if (!adminEmail) throw httpError(500, 'No admin email configured on server');

  const { subj, html } = buildEmailHtml({ name, email, subject, message });
  const ok = await sendEmail(adminEmail, subj, html);
  if (!ok) {
    throw httpError(500, 'Failed to send email (check server logs for SMTP errors)');
  }
  return { ok: true, message: 'Message sent to admin' };
}

module.exports = { sendContactMessage };
