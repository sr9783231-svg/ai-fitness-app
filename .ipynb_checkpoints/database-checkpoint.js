const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./fitness.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS profiles (user_id INTEGER, gender TEXT, age INTEGER, weight REAL, height REAL, goal TEXT, activity TEXT, FOREIGN KEY(user_id) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS weight_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, weight REAL, date TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS workouts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, date TEXT DEFAULT CURRENT_TIMESTAMP, exercise TEXT, sets INTEGER, reps INTEGER, weight REAL, FOREIGN KEY(user_id) REFERENCES users(id))`);
});

module.exports = db;