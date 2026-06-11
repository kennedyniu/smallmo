require('dotenv').config();

const db = require('./config/db');

async function test() {
  const [rows] = await db.query('SELECT NOW() as time');
  console.log(rows);
}

test();
