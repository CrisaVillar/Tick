const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const conn = require('../conn');

//Register

router.get('/register', (req, res) => {
  const message = req.session.message;
  req.session.message = null;
  res.render('register', { message });
});

//Process
router.post('/register', async(req,res)=> {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const course = req.body.course;
    const year_level = req.body.year_level;
    const hashedPass = await bcrypt.hash(password, 10);

    const reg = 'INSERT INTO students (name, email, password, course, year_level) VALUES (?, ?, ?, ?, ?)';
    conn.query(reg, [name, email, hashedPass, course, year_level], (err)=> {
        if(err) {
            console.error(err);
            req.session.message = {type: 'error', text: 'Invalid credentials'};
            return res.redirect('/auth/login');
        }

        req.session.message = {type: 'success', text: 'Account created successfully!'};
        res.redirect('/auth/login');
    });
});

//Login

router.get('/login', (req, res) => {
  const message = req.session.message;
  req.session.message = null; 
  res.render('login', { message });
});

//Process

router.post('/login', (req,res)=> {
    const email = req.body.email;
    const password = req.body.password;
    const log = 'SELECT * FROM students WHERE email = ? ';

    conn.query(log, [email], async (err, result)=> {
        if(err) throw err;

        if(result.length === 0){
            req.session.message = {type: 'danger', text: 'No student found with that email'};
            return res.redirect('/auth/login');
        }

        const student = result[0];
        const match = await bcrypt.compare(password, student.password);

        if(!match){
            req.session.message = {type: 'danger', text: 'Incorrect Passowrd'};
            return res.redirect('/auth/login');
        }

        // Store user in session
        req.session.student = student;
        req.session.message = { type: 'success', text: 'Login successful!'};
        return res.redirect('/student/dashboard');
    
    });

});

// Logout
router.get('/logout', (req,res)=> {
    req.session.destroy(()=> {
        res.redirect('/');
    });
});

module.exports = router;

