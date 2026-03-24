const mysql = require('mysql2');

const conn = mysql.createConnection({
  host: process.env.MYSQLHOST,       
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT || 3306
});

conn.connect(err => {
  if(err) console.error('DB connection failed:', err);
  else console.log('Connected to MySQL');
});

module.exports = conn;
