// controllers/contactController.js
const contactService = require('../services/contactService');

exports.submit = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    const result = await contactService.sendContactMessage({ name, email, subject, message });
    res.json(result);
  } catch (err) {
    console.error('Contact submit error', err);
    res.status(err.status || 500).json({ ok: false, message: err.message || 'Server error' });
  }
};
