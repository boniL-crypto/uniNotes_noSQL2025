// testemail.js

const sendEmail = require('./utils/sendEmail');

sendEmail('bonimae.laluna@msugensan.edu.ph', 'Test', '<p>Hello from UniNotes test!</p>')
  .then(() => console.log('Done'))
  .catch(console.error);
