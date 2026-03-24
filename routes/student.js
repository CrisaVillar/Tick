// student.js
const express = require('express');
const router = express.Router();
const db = require('../conn');

// Helper: show message once then remove
function showMessage(req) {
  const message = req.session.message;
  delete req.session.message;
  return message;
}

// ---------------------- DASHBOARD ----------------------
router.get('/dashboard', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  const studId = req.session.student.student_id;

  db.get('SELECT COUNT(*) AS total FROM tasks WHERE student_id = ?', [studId], (err, totalRes) => {
    if (err) throw err;
    db.get('SELECT COUNT(*) AS completed FROM tasks WHERE student_id = ? AND status="Done"', [studId], (err, completedRes) => {
      if (err) throw err;
      db.get(`
        SELECT
          SUM(CASE WHEN priority='High' THEN 1 ELSE 0 END) AS high,
          SUM(CASE WHEN priority='Medium' THEN 1 ELSE 0 END) AS medium,
          SUM(CASE WHEN priority='Low' THEN 1 ELSE 0 END) AS low
        FROM tasks WHERE student_id = ?
      `, [studId], (err, priorityRes) => {
        if (err) throw err;

        db.get('SELECT COUNT(*) AS total_session FROM study_sessions WHERE student_id = ?', [studId], (err, sessionRes) => {
          if (err) throw err;
          db.get('SELECT COALESCE(SUM(duration_minutes),0) AS total_minutes FROM study_sessions WHERE student_id = ?', [studId], (err, studyRes) => {
            if (err) throw err;

            db.all('SELECT subject, SUM(duration_minutes) AS total_minutes FROM study_sessions WHERE student_id=? GROUP BY subject', [studId], (err, subjectRes) => {
              if (err) throw err;
              db.all('SELECT subject, duration_minutes, start_time FROM study_sessions WHERE student_id=? ORDER BY start_time DESC LIMIT 5', [studId], (err, recentRes) => {
                if (err) throw err;

                const totalTasks = totalRes.total;
                const completedTasks = completedRes.completed;
                const pendingTasks = totalTasks - completedTasks;
                const totalSession = sessionRes.total_session;
                const totalStudyHours = (studyRes.total_minutes / 60).toFixed(1);
                const priorityStat = {
                  high: priorityRes.high || 0,
                  medium: priorityRes.medium || 0,
                  low: priorityRes.low || 0
                };

                res.render('dashboard', {
                  student: req.session.student,
                  totalTasks,
                  completedTasks,
                  pendingTasks,
                  totalSession,
                  totalStudyHours,
                  priorityStat,
                  studyBySubject: subjectRes,
                  recentSessions: recentRes,
                  message: showMessage(req)
                });
              });
            });
          });
        });
      });
    });
  });
});

// ---------------------- DAILY PLANNER ----------------------
router.get('/daily-planner', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  const studId = req.session.student.student_id;

  db.all('SELECT * FROM tasks WHERE student_id = ? ORDER BY start_time ASC', [studId], (err, result) => {
    if (err) throw err;
    res.render('daily-planner', { student: req.session.student, tasks: result, message: showMessage(req) });
  });
});

// ---------------------- ADD TASK ----------------------
router.get('/add-task', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  res.render('add-tasks', { student: req.session.student, message: showMessage(req) });
});

router.post('/add-task', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  const { title, description, subject, start_time, end_time, priority } = req.body;
  const studentId = req.session.student.student_id;

  const add = `INSERT INTO tasks (student_id, title, description, subject, start_time, end_time, priority) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.run(add, [studentId, title, description, subject, start_time, end_time, priority], function(err) {
    if (err) {
      req.session.message = { type: 'danger', text: 'Failed to add task.' };
      return res.redirect('/student/daily-planner');
    }
    req.session.message = { type: 'success', text: 'New task added successfully!' };
    res.redirect('/student/daily-planner');
  });
});

// ---------------------- UPDATE TASK STATUS ----------------------
router.post('/update-status/:task_id', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  const taskId = req.params.task_id;
  const newStatus = req.body.status === 'Done' ? 'Done' : 'Pending';

  db.run('UPDATE tasks SET status = ? WHERE task_id = ?', [newStatus, taskId], function(err) {
    if (err) req.session.message = { type: 'danger', text: 'Failed to update task status.' };
    else req.session.message = { type: 'success', text: `Task marked as ${newStatus}.` };
    res.redirect('/student/daily-planner');
  });
});

// ---------------------- EDIT TASK ----------------------
router.get('/edit-task/:task_id', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  const taskId = req.params.task_id;

  db.get('SELECT * FROM tasks WHERE task_id = ?', [taskId], (err, task) => {
    if (err) throw err;
    if (!task) return res.send('Task not found!');
    res.render('edit-task', { student: req.session.student, task, message: showMessage(req) });
  });
});

router.post('/edit-task/:task_id', (req, res) => {
  const taskId = req.params.task_id;
  const { title, description, subject, start_time, end_time, priority } = req.body;

  const edit = 'UPDATE tasks SET title=?, description=?, subject=?, start_time=?, end_time=?, priority=? WHERE task_id=?';
  db.run(edit, [title, description, subject, start_time, end_time, priority, taskId], function(err) {
    if (err) req.session.message = { type: 'danger', text: 'Error updating task.' };
    else req.session.message = { type: 'success', text: 'Task updated successfully!' };
    res.redirect('/student/daily-planner');
  });
});

// ---------------------- DELETE TASK ----------------------
router.post('/delete-task/:task_id', (req, res) => {
  const taskId = req.params.task_id;
  db.run('DELETE FROM tasks WHERE task_id = ?', [taskId], function(err) {
    if (err) req.session.message = { type: 'danger', text: 'Error deleting task.' };
    else req.session.message = { type: 'success', text: 'Task deleted successfully!' };
    res.redirect('/student/daily-planner');
  });
});

// ---------------------- STUDY TRACKER ----------------------
router.get('/study-tracker', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  const studId = req.session.student.student_id;

  db.all('SELECT * FROM study_sessions WHERE student_id=? ORDER BY start_time DESC, date_created DESC', [studId], (err, sessions) => {
    if (err) throw err;
    res.render('study-tracker', { student: req.session.student, sessions, message: showMessage(req) });
  });
});

// ---------------------- LOG STUDY SESSION ----------------------
router.get('/log-session', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  res.render('log-session', { student: req.session.student, message: showMessage(req) });
});

router.post('/log-session', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  const studId = req.session.student.student_id;
  const { subject, description, start_time, duration_minutes } = req.body;

  const log = `INSERT INTO study_sessions (student_id, subject, description, start_time, duration_minutes) VALUES (?, ?, ?, ?, ?)`;
  db.run(log, [studId, subject, description, start_time || null, duration_minutes || 0], function(err) {
    if (err) req.session.message = { type: 'danger', text: 'Error logging study session.' };
    else req.session.message = { type: 'success', text: 'Study session logged successfully!' };
    res.redirect('/student/study-tracker');
  });
});

// ---------------------- DELETE STUDY SESSION ----------------------
router.post('/delete-session/:study_id', (req, res) => {
  const studyId = req.params.study_id;
  db.run('DELETE FROM study_sessions WHERE study_id = ?', [studyId], function(err) {
    if (err) req.session.message = { type: 'danger', text: 'Error deleting study session.' };
    else req.session.message = { type: 'success', text: 'Study session deleted successfully!' };
    res.redirect('/student/study-tracker');
  });
});

module.exports = router;