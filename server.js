const express = require('express');
const multer = require('multer');
const path = require('path');
const { runResumeUpdater } = require('./platforms/internshala_automation');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public')); // Serves index.html

app.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    const imagePath = path.join(__dirname, req.file.path);
    const result = await runResumeUpdater(imagePath);
    res.send(`<h2>✅ Resume Processed</h2><pre>${JSON.stringify(result, null, 2)}</pre>`);
  } catch (err) {
    res.status(500).send(`<h2>❌ Error</h2><pre>${err.message}</pre>`);
  }
});

app.listen(3000, () => console.log('🌐 Server running at http://localhost:3000'));
