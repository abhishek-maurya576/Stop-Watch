const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Database setup
const db = new sqlite3.Database('stopwatch.db', (err) => {
	if (err) console.error('Database connection error:', err);
	console.log('Connected to SQLite database');
});

// Create tables
db.serialize(() => {
	db.run(`CREATE TABLE IF NOT EXISTS sessions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
		duration INTEGER,
		notes TEXT
	)`);

	db.run(`CREATE TABLE IF NOT EXISTS laps (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		session_id INTEGER,
		lap_time INTEGER,
		lap_number INTEGER,
		FOREIGN KEY(session_id) REFERENCES sessions(id)
	)`);
});

// API Routes
app.post('/api/sessions', (req, res) => {
	const { duration, notes } = req.body;
	db.run('INSERT INTO sessions (duration, notes) VALUES (?, ?)', 
		[duration, notes], 
		function(err) {
			if (err) return res.status(500).json({ error: err.message });
			res.json({ id: this.lastID });
		});
});

app.post('/api/laps', (req, res) => {
	const { session_id, lap_time, lap_number } = req.body;
	db.run('INSERT INTO laps (session_id, lap_time, lap_number) VALUES (?, ?, ?)',
		[session_id, lap_time, lap_number],
		function(err) {
			if (err) return res.status(500).json({ error: err.message });
			res.json({ id: this.lastID });
		});
});

app.get('/api/sessions', (req, res) => {
	db.all('SELECT * FROM sessions ORDER BY start_time DESC', [], (err, rows) => {
		if (err) return res.status(500).json({ error: err.message });
		res.json(rows);
	});
});

app.get('/api/sessions/:id/laps', (req, res) => {
	const { id } = req.params;
	db.all('SELECT * FROM laps WHERE session_id = ? ORDER BY lap_number', [id], (err, rows) => {
		if (err) return res.status(500).json({ error: err.message });
		res.json(rows);
	});
});

// Start server
app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});