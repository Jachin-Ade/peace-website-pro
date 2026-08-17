const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Admin authentication
function adminAuth(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required');
  }

  const encoded = auth.split(' ')[1];
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');

  const [username, password] = decoded.split(':');

  if (
    username !== process.env.ADMIN_USER ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Invalid username or password');
  }

  next();
}
const PORT = process.env.PORT || 3000;
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');

app.use(cors());
app.use(express.json());
app.get('/admin.html', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});
app.use(express.static(__dirname));


// Load submissions from file
function loadSubmissions() {
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    return JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf8'));
  }
  return [];
}

// Save submissions to file
function saveSubmissions(submissions) {
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
}

// POST endpoint to receive form submissions
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const submission = {
    id: Date.now(),
    name,
    email,
    message,
    timestamp: new Date().toISOString(),
  };

  const submissions = loadSubmissions();
  submissions.push(submission);
  saveSubmissions(submissions);

  res.json({ success: true, message: 'Thank you! Your message has been received.' });
});

// GET endpoint to retrieve all submissions
app.get('/api/submissions', adminAuth, (req, res) => {
  const submissions = loadSubmissions();
  res.json(submissions);
});

// DELETE endpoint to remove a submission
app.delete('/api/submissions/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  let submissions = loadSubmissions();
  submissions = submissions.filter(sub => sub.id !== parseInt(id));
  saveSubmissions(submissions);
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`View submissions at http://localhost:${PORT}/admin.html`);
});
