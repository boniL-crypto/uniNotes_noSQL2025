// utils/mailer.js
// Simple mailer wrapper (placeholder). Replace with nodemailer or your preferred provider.

exports.sendMail = async ({ to, subject, text, html }) => {
  console.log('mailer: sendMail called', { to, subject });
  // Implement actual sending in future, or inject service.
  return true;
};
