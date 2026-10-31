import sqlite3 from 'sqlite3';

export const DATABASE = './database.db';

const db = new sqlite3.Database(DATABASE, (err) => {
  if (err) throw err;
  db.run('PRAGMA foreign_keys = ON', (pragmaError) => {
    if (pragmaError) throw pragmaError;
  });
});

export default db;
