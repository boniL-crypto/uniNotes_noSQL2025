//api/notes.js
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const query = req.query.q ? { title: new RegExp(req.query.q, 'i') } : {};

  const notes = await Note.find(query).skip((page-1)*limit).limit(limit);
  const count = await Note.countDocuments(query);

  res.json({ notes, totalPages: Math.ceil(count/limit) });
});
