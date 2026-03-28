
const Database = require('better-sqlite3');
const path = require('path');


const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);


db.prepare(`
CREATE TABLE IF NOT EXISTS students (
    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    course TEXT,
    year_level TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

db.prepare(`
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
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS study_sessions (
    study_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    subject TEXT,
    description TEXT,
    start_time DATETIME,
    duration_minutes INTEGER DEFAULT 0,
    date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
)
`).run();

console.log('Connected to SQLite database');

module.exports = db;
