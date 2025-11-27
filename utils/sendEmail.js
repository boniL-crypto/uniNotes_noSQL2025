// utils/sendEmail.js

require('dotenv').config();

if (process.env.NODE_ENV === 'test') {
  // In tests, avoid real SMTP connections entirely
  module.exports = async function sendEmail() { return true; };
} else {
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // smtp.gmail.com
    port: process.env.EMAIL_PORT, // 587
    secure: false, // use TLS, not SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false, // helps avoid local certificate issues
    },
  });

  transporter.verify((error, success) => {
    if (error) {
      console.error('SMTP connection failed:', error);
    } else {
      console.log('✅ Server is ready to take our messages');
    }
  });

  async function sendEmail(to, subject, html) {
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
      });
      console.log('✅ Email sent:', info.response);
      return true;
    } catch (err) {
      console.error('❌ Email send failed:', err);
      return false;
    }
  }

  module.exports = sendEmail;
}
