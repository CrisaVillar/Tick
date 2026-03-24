const express = require('express');
const router = express.Router();
const conn = require('../conn');

// Helper: Show message once then remove
function showMessage(req) {
  const message = req.session.message;
  delete req.session.message;
  return message;
}

// Student Dashboard
router.get('/dashboard', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  
  const studId = req.session.student.student_id;

  const dashQuery = {
    totalTasks: 'SELECT COUNT(*) AS total FROM tasks WHERE student_id = ?',
    completedTasks: 'SELECT COUNT(*) AS completed FROM tasks WHERE student_id = ? AND status = "Done"',
    tasksPriorities: `
      SELECT 
        SUM(CASE WHEN priority = "High" THEN 1 ELSE 0 END) AS high,
        SUM(CASE WHEN priority = "Medium" THEN 1 ELSE 0 END) AS medium,
        SUM(CASE WHEN priority = "Low" THEN 1 ELSE 0 END) AS low  
      FROM tasks WHERE student_id = ?
    `,
    totalStudySessions: 'SELECT COUNT(*) AS total_session FROM study_sessions WHERE student_id = ?',
    totalStudyTime: 'SELECT COALESCE(SUM(duration_minutes),0) AS total_minutes FROM study_sessions WHERE student_id = ?',
    studyBySubject: `SELECT subject, SUM(duration_minutes) AS total_minutes FROM study_sessions WHERE student_id = ? GROUP BY subject`,
    recentSessions: `SELECT subject, duration_minutes, start_time FROM study_sessions WHERE student_id = ? ORDER BY start_time DESC LIMIT 5`
  };

  conn.query(dashQuery.totalTasks, [studId], (err, totalTaskRes) => {
    if (err) throw err;
    conn.query(dashQuery.completedTasks, [studId], (err, completedTasksRes) => {
      if (err) throw err;
      conn.query(dashQuery.tasksPriorities, [studId], (err, priorityRes) => {
        if (err) throw err;
        conn.query(dashQuery.totalStudySessions, [studId], (err, studySessRes) => {
          if (err) throw err;
          conn.query(dashQuery.totalStudyTime, [studId], (err, studyTimeRes) => {
            if (err) throw err;
            conn.query(dashQuery.studyBySubject, [studId], (err, subjectRes) => {
              if (err) throw err;
              conn.query(dashQuery.recentSessions, [studId], (err, recentRes) => {
                if (err) throw err;

                const totalTasks = totalTaskRes[0].total;
                const completedTasks = completedTasksRes[0].completed;
                const pendingTasks = totalTasks - completedTasks;
                const totalSession = studySessRes[0].total_session;
                const totalStudyMinutes = studyTimeRes[0].total_minutes;
                const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);
                const priorityStat = {
                  high: priorityRes[0].high || 0,
                  medium: priorityRes[0].medium || 0,
                  low: priorityRes[0].low || 0
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

// Daily Planner
router.get('/daily-planner', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');

  const studId = req.session.student.student_id;
  const plan = 'SELECT * FROM tasks WHERE student_id = ? ORDER BY start_time ASC';

  conn.query(plan, [studId], (err, result) => {
    if (err) throw err;
    res.render('daily-planner', {
      student: req.session.student,
      tasks: result,
      message: showMessage(req)
    });
  });
});

// Add Task Form
router.get('/add-task', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  res.render('add-tasks', {
    student: req.session.student,
    message: showMessage(req)
  });
});

// Handle Add Task Submission
router.post('/add-task', (req, res) => {
  const { title, description, subject, start_time, end_time, priority } = req.body;
  const studentId = req.session.student.student_id || req.session.student.id;

  const add = `
    INSERT INTO tasks (student_id, title, description, subject, start_time, end_time, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  conn.query(add, [studentId, title, description, subject, start_time, end_time, priority], (err) => {
    if (err) {
      req.session.message = { type: 'danger', text: 'Failed to add task.' };
      return res.redirect('/student/daily-planner');
    }

    req.session.message = { type: 'success', text: 'New task added successfully!' };
    res.redirect('/student/daily-planner');
  });
});

// Update Task (checkbox)
router.post('/update-status/:task_id', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');

  const taskId = req.params.task_id;
  const newStatus = req.body.status === 'Done' ? 'Done' : 'Pending';
  const update = 'UPDATE tasks SET status = ? WHERE task_id = ?';

  conn.query(update, [newStatus, taskId], (err) => {
    if (err) {
      req.session.message = { type: 'danger', text: 'Failed to update task status.' };
      return res.redirect('/student/daily-planner');
    }

    req.session.message = { type: 'success', text: `Task marked as ${newStatus}.` };
    res.redirect('/student/daily-planner');
  });
});

// Edit Task
router.get('/edit-task/:task_id', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');

  const taskId = req.params.task_id;
  conn.query('SELECT * FROM tasks WHERE task_id = ?', [taskId], (err, result) => {
    if (err) throw err;
    if (result.length === 0) return res.send('Task not found!');

    res.render('edit-task', { 
      student: req.session.student,
      task: result[0],
      message: showMessage(req)
    });
  });
});

// Handle Edit Task
router.post('/edit-task/:task_id', (req, res) => {
  const taskId = req.params.task_id;
  const { title, description, subject, start_time, end_time, priority } = req.body;

  const edit_task = `
    UPDATE tasks 
    SET title=?, description=?, subject=?, start_time=?, end_time=?, priority=? 
    WHERE task_id=?
  `;

  conn.query(edit_task, [title, description, subject, start_time, end_time, priority, taskId], (err) => {
    if (err) {
      req.session.message = { type: 'danger', text: 'Error updating task.' };
      return res.redirect('/student/daily-planner');
    }

    req.session.message = { type: 'success', text: 'Task updated successfully!' };
    res.redirect('/student/daily-planner');
  });
});

// Delete Task
router.post('/delete-task/:task_id', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');

  const taskId = req.params.task_id;
  conn.query('DELETE FROM tasks WHERE task_id = ?', [taskId], (err) => {
    if (err) {
      req.session.message = { type: 'danger', text: 'Error deleting task.' };
      return res.redirect('/student/daily-planner');
    }

    req.session.message = { type: 'success', text: 'Task deleted successfully!' };
    res.redirect('/student/daily-planner');
  });
});

// Study Tracker
router.get('/study-tracker', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');

  const studId = req.session.student.student_id;
  const studTrack = `SELECT * FROM study_sessions WHERE student_id = ? ORDER BY start_time DESC, date_created DESC`;

  conn.query(studTrack, [studId], (err, result) => {
    if (err) throw err;
    res.render('study-tracker', {
      student: req.session.student,
      sessions: result,
      message: showMessage(req)
    });
  });
});

// Form to log new session
router.get('/log-session', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');
  res.render('log-session', {
    student: req.session.student,
    message: showMessage(req)
  });
});

// Submit new study session
router.post('/log-session', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');

  const studId = req.session.student.student_id;
  const { subject, description, start_time, duration_minutes } = req.body;

  const log = `
    INSERT INTO study_sessions (student_id, subject, description, start_time, duration_minutes)
    VALUES (?, ?, ?, ?, ?)
  `;

  conn.query(log, [studId, subject, description, start_time || null, duration_minutes || 0], (err) => {
    if (err) {
      req.session.message = { type: 'danger', text: 'Error logging study session.' };
      return res.redirect('/student/study-tracker');
    }

    req.session.message = { type: 'success', text: 'Study session logged successfully!' };
    res.redirect('/student/study-tracker');
  });
});

// Delete study session
router.post('/delete-session/:study_id', (req, res) => {
  if (!req.session.student) return res.redirect('/auth/login');

  const studyId = req.params.study_id;
  conn.query('DELETE FROM study_sessions WHERE study_id = ?', [studyId], (err) => {
    if (err) {
      req.session.message = { type: 'danger', text: 'Error deleting study session.' };
      return res.redirect('/student/study-tracker');
    }

    req.session.message = { type: 'success', text: 'Study session deleted successfully!' };
    res.redirect('/student/study-tracker');
  });
});

module.exports = router;
