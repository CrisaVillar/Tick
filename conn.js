// conn.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db'); // SQLite file
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Failed to connect to SQLite DB:', err);
  else console.log('Connected to SQLite database.');
});

// Create tables
db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      student_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      course TEXT,
      year_level TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      task_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      subject TEXT,
      start_time DATETIME,
      end_time DATETIME,
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(student_id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS study_sessions (
      study_id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      subject TEXT,
      description TEXT,
      start_time DATETIME,
      duration_minutes INTEGER DEFAULT 0,
      date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(student_id) ON DELETE CASCADE
    )
  `);

});

module.exports = db;