const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../conn');

// Helper: show message once then remove
function showMessage(req) {
  const message = req.session.message;
  delete req.session.message;
  return message;
}

// Register page
router.get('/register', (req, res) => {
  const message = req.session.message;
  req.session.message = null;
  res.render('register', { message });
});

// Register process
router.post('/register', async (req, res) => {
  const { name, email, password, course, year_level } = req.body;
  const hashedPass = await bcrypt.hash(password, 10);

  const reg = `
    INSERT INTO students (name, email, password, course, year_level)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(reg, [name, email, hashedPass, course, year_level], function(err) {
    if (err) {
      console.error(err);
      req.session.message = { type: 'error', text: 'Invalid credentials or email already used' };
      return res.redirect('/auth/register');
    }

    req.session.message = { type: 'success', text: 'Account created successfully!' };
    res.redirect('/auth/login');
  });
});

// Login page
router.get('/login', (req, res) => {
  const message = req.session.message;
  req.session.message = null;
  res.render('login', { message });
});

// Login process
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const log = `SELECT * FROM students WHERE email = ?`;

  db.get(log, [email], async (err, student) => {
    if (err) throw err;
    if (!student) {
      req.session.message = { type: 'danger', text: 'No student found with that email' };
      return res.redirect('/auth/login');
    }

    const match = await bcrypt.compare(password, student.password);
    if (!match) {
      req.session.message = { type: 'danger', text: 'Incorrect Password' };
      return res.redirect('/auth/login');
    }

    req.session.student = student;
    req.session.message = { type: 'success', text: 'Login successful!' };
    res.redirect('/student/dashboard');
  });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;