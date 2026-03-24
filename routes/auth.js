// auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../conn');

// Helper to show flash messages
function showMessage(req) {
  const message = req.session.message;
  req.session.message = null;
  return message;
}

// Register page
router.get('/register', (req, res) => {
  res.render('register', { message: showMessage(req) });
});

// Register process
router.post('/register', async (req, res) => {
  const { name, email, password, course, year_level } = req.body;
  const hashedPass = await bcrypt.hash(password, 10);

  try {
    db.prepare(`
      INSERT INTO students (name, email, password, course, year_level)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, email, hashedPass, course, year_level);

    req.session.message = { type: 'success', text: 'Account created successfully!' };
    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'error', text: 'Email already exists or invalid input.' };
    res.redirect('/auth/register');
  }
});

// Login page
router.get('/login', (req, res) => {
  res.render('login', { message: showMessage(req) });
});

// Login process
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const student = db.prepare('SELECT * FROM students WHERE email = ?').get(email);

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
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Login failed' };
    res.redirect('/auth/login');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;