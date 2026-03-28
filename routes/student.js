
const express = require('express');
const router = express.Router();
const db = require('../conn');


function showMessage(req) {
  const message = req.session.message;
  req.session.message = null;
  return message;
}


router.get('/dashboard', (req, res) => {
  if (!req.session.student) {
    console.log('No session found! Redirecting to login...');
    return res.redirect('/auth/login');
  }

 
  console.log('Session student object:', req.session.student);

  const studId = req.session.student.student_id;

  try {
    const totalTasks = db.prepare('SELECT COUNT(*) AS total FROM tasks WHERE student_id = ?').get(studId).total;
    const completedTasks = db.prepare(" SELECT COUNT(*) AS completed FROM tasks WHERE student_id = ? AND status = 'Done'").get(studId).completed;
    const priorityRow = db.prepare(`
      SELECT
        SUM(CASE WHEN priority='High' THEN 1 ELSE 0 END) AS high,
        SUM(CASE WHEN priority='Medium' THEN 1 ELSE 0 END) AS medium,
        SUM(CASE WHEN priority='Low' THEN 1 ELSE 0 END) AS low
      FROM tasks WHERE student_id = ?
    `).get(studId);

    const totalSession = db.prepare('SELECT COUNT(*) AS total_session FROM study_sessions WHERE student_id = ?').get(studId).total_session;
    const totalStudyMinutes = db.prepare('SELECT COALESCE(SUM(duration_minutes),0) AS total_minutes FROM study_sessions WHERE student_id = ?').get(studId).total_minutes;
    const studyBySubject = db.prepare('SELECT subject, SUM(duration_minutes) AS total_minutes FROM study_sessions WHERE student_id = ? GROUP BY subject').all(studId);
    const recentSessions = db.prepare('SELECT subject, duration_minutes, start_time FROM study_sessions WHERE student_id = ? ORDER BY start_time DESC LIMIT 5').all(studId);

    res.render('dashboard', {
      student: req.session.student,
      totalTasks,
      completedTasks,
      pendingTasks: totalTasks - completedTasks,
      totalSession,
      totalStudyHours: (totalStudyMinutes / 60).toFixed(1),
      priorityStat: priorityRow,
      studyBySubject,
      recentSessions,
      message: showMessage(req)
    });
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Error loading dashboard' };
    res.redirect('/auth/login');
  }
});


router.get('/daily-planner', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  const studId = req.session.student.student_id;
  const tasks = db.prepare('SELECT * FROM tasks WHERE student_id = ? ORDER BY start_time ASC').all(studId);
  res.render('daily-planner', { student: req.session.student, tasks, message: showMessage(req) });
});


router.get('/add-task', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  res.render('add-tasks', { student: req.session.student, message: showMessage(req) });
});

router.post('/add-task', (req, res) => {
  const { title, description, subject, start_time, end_time, priority } = req.body;
  const studentId = req.session.student.student_id;

  try {
    db.prepare(`
      INSERT INTO tasks (student_id, title, description, subject, start_time, end_time, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(studentId, title, description, subject, start_time, end_time, priority);

    req.session.message = { type: 'success', text: 'New task added successfully!' };
    res.redirect('/student/daily-planner');
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Failed to add task.' };
    res.redirect('/student/daily-planner');
  }
});


router.post('/update-status/:task_id', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  const taskId = req.params.task_id;
  const newStatus = req.body.status === 'Done' ? 'Done' : 'Pending';

  try {
    db.prepare('UPDATE tasks SET status = ? WHERE task_id = ?').run(newStatus, taskId);
    req.session.message = { type: 'success', text: `Task marked as ${newStatus}.` };
    res.redirect('/student/daily-planner');
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Failed to update task status.' };
    res.redirect('/student/daily-planner');
  }
});


router.get('/edit-task/:task_id', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  const taskId = req.params.task_id;
  const task = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId);

  if (!task) return res.send('Task not found!');
  res.render('edit-task', { student: req.session.student, task, message: showMessage(req) });
});

router.post('/edit-task/:task_id', (req, res) => {
  const taskId = req.params.task_id;
  const { title, description, subject, start_time, end_time, priority } = req.body;

  try {
    db.prepare(`
      UPDATE tasks
      SET title=?, description=?, subject=?, start_time=?, end_time=?, priority=?
      WHERE task_id=?
    `).run(title, description, subject, start_time, end_time, priority, taskId);

    req.session.message = { type: 'success', text: 'Task updated successfully!' };
    res.redirect('/student/daily-planner');
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Error updating task.' };
    res.redirect('/student/daily-planner');
  }
});


router.post('/delete-task/:task_id', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  const taskId = req.params.task_id;

  try {
    db.prepare('DELETE FROM tasks WHERE task_id = ?').run(taskId);
    req.session.message = { type: 'success', text: 'Task deleted successfully!' };
    res.redirect('/student/daily-planner');
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Error deleting task.' };
    res.redirect('/student/daily-planner');
  }
});


router.get('/study-tracker', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  const studId = req.session.student.student_id;
  const sessions = db.prepare('SELECT * FROM study_sessions WHERE student_id = ? ORDER BY start_time DESC, date_created DESC').all(studId);
  res.render('study-tracker', { student: req.session.student, sessions, message: showMessage(req) });
});


router.get('/log-session', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  res.render('log-session', { student: req.session.student, message: showMessage(req) });
});

router.post('/log-session', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');

  const studId = req.session.student.student_id;
  const { subject, description, start_time, duration_minutes } = req.body;

  try {
    db.prepare(`
      INSERT INTO study_sessions (student_id, subject, description, start_time, duration_minutes)
      VALUES (?, ?, ?, ?, ?)
    `).run(studId, subject, description, start_time || null, duration_minutes || 0);

    req.session.message = { type: 'success', text: 'Study session logged successfully!' };
    res.redirect('/student/study-tracker');
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Error logging study session.' };
    res.redirect('/student/study-tracker');
  }
});


router.post('/delete-session/:study_id', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  const studyId = req.params.study_id;

  try {
    db.prepare('DELETE FROM study_sessions WHERE study_id = ?').run(studyId);
    req.session.message = { type: 'success', text: 'Study session deleted successfully!' };
    res.redirect('/student/study-tracker');
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Error deleting study session.' };
    res.redirect('/student/study-tracker');
  }
});



router.get('/profile', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');

  const studId = req.session.student.student_id;

  try {
    const user = db.prepare(
      'SELECT name, email, course, year_level FROM students WHERE student_id = ?'
    ).get(studId);

    if (!user) {
      req.session.message = { type: 'danger', text: 'Profile not found.' };
      return res.redirect('/student/dashboard');
    }

    res.render('profile', {
      student: req.session.student,
      user,
      message: showMessage(req)
    });

  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Failed to load profile.' };
    res.redirect('/student/dashboard');
  }
});


router.post('/update-profile', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');

  const studId = req.session.student.student_id;
  const { name, course, year_level } = req.body;

  try {
    db.prepare(`
      UPDATE students 
      SET name = ?, course = ?, year_level = ?
      WHERE student_id = ?
    `).run(name, course, year_level, studId);

 
    req.session.student.name = name;
    req.session.student.course = course;
    req.session.student.year_level = year_level;

    req.session.message = { type: 'success', text: 'Profile updated successfully!' };
    res.redirect('/student/profile');

  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Failed to update profile.' };
    res.redirect('/student/profile');
  }
});


module.exports = router;
