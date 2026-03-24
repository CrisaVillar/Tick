// auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../conn'); // your better-sqlite3 connection

// Helper: show flash messages once
function showMessage(req) {
  const message = req.session.message;
  req.session.message = null;
  return message;
}

// ---------------------
// Register Page
// ---------------------
router.get('/register', (req, res) => {
  res.render('register', { message: showMessage(req) });
});

// Register Process
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

// ---------------------
// Login Page
// ---------------------
router.get('/login', (req, res) => {
  res.render('login', { message: showMessage(req) });
});

// Login Process
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
      req.session.message = { type: 'danger', text: 'Incorrect password' };
      return res.redirect('/auth/login');
    }

    // Save student to session and ensure it's written before redirect
    req.session.student = student;
    req.session.save((err) => {
      if (err) {
        console.error(err);
        req.session.message = { type: 'danger', text: 'Login failed' };
        return res.redirect('/auth/login');
      }
      req.session.message = { type: 'success', text: 'Login successful!' };
      res.redirect('/student/dashboard');
    });

  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Login failed' };
    res.redirect('/auth/login');
  }
});

// ---------------------
// Logout
// ---------------------
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error(err);
    res.redirect('/');
  });
});

module.exports = router;
