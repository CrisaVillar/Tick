const express = require('express');
const session = require('express-session');
const path = require('path');
const conn = require('./conn');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//Session setup
app.use(session({
    secret: 'ticktock1secretkey',
    resave: true,
    saveUninitialized: true
}));

//Custom flash

app.use((req,res, next)=> {
    res.locals.message = req.session.message;
    delete req.session.message;
    next();
});

app.get('/', (req,res)=> {
    res.render('index');
});

app.use('/auth', require('./routes/auth'));

app.use('/student', require('./routes/student'));


app.listen(PORT, ()=> 
    console.log(`Running at port:${PORT}`));