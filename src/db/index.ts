import sqlite3 from 'sqlite3';

export const DATABASE = './database.db';

const db = new sqlite3.Database(DATABASE, (err) => {
  if (err) throw err;
});

export default db;
