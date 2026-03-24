const express = require('express');
const cookieSession = require('cookie-session');
const path = require('path');
const conn = require('./conn');
const app = express();


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//Session setup
app.use(cookieSession({
    name: 'session',
    keys: ['ticktock1secretkey', 'ticktock_secret2'],
    maxAge: 24 * 60 * 60 * 1000
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


const PORT = process.env.PORT || 10000;
console.log(`Render assigned PORT: ${process.env.PORT}`); 
app.listen(PORT, () => console.log(`Running at port: ${PORT}`));
