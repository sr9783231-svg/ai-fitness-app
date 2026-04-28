const express = require('express');
const db = require('./database');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const app = express();
const port = 3000;

console.log("=== API KEY DIAGNOSTIC TEST ===");
console.log("Can Node.js see the key?:", process.env.GEMINI_API_KEY ? "YES, IT IS HERE" : "NO, IT IS UNDEFINED");
console.log("===============================");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.static('public'));
app.use(express.json({limit: '50mb'})); 


app.post('/register', (req, res) => {
    const { username, password } = req.body;
    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], function(err) {
        if (err) return res.status(400).json({ error: "Username already taken." });
        res.json({ success: true, userId: this.lastID });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT id FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) res.json({ success: true, userId: row.id, username });
        else res.status(401).json({ error: "Invalid credentials." });
    });
});

app.post('/profile', (req, res) => {
    const { userId, gender, age, weight, height, goal, activity } = req.body;
    db.run("DELETE FROM profiles WHERE user_id = ?", [userId]); 
    db.run("INSERT INTO profiles (user_id, gender, age, weight, height, goal, activity) VALUES (?, ?, ?, ?, ?, ?, ?)", [userId, gender, age, weight, height, goal, activity], (err) => {
        if (err) return res.status(500).json({ error: "Database error" });
        db.run("INSERT INTO weight_logs (user_id, weight, date) VALUES (?, ?, date('now', 'localtime'))", [userId, weight]);
        res.json({ success: true });
    });
});

app.get('/profile/:id', (req, res) => {
    db.get("SELECT * FROM profiles WHERE user_id = ?", [req.params.id], (err, row) => {
        res.json({ success: !!row, profile: row });
    });
});

app.get('/api/weight-history/:id', (req, res) => {
    db.all("SELECT weight, date FROM weight_logs WHERE user_id = ? GROUP BY date ORDER BY date ASC", [req.params.id], (err, rows) => {
        res.json({ success: true, logs: rows || [] });
    });
});

app.post('/api/workouts', (req, res) => {
    const { userId, exercise, sets, reps, weight } = req.body;
    db.run("INSERT INTO workouts (user_id, exercise, sets, reps, weight) VALUES (?, ?, ?, ?, ?)", [userId, exercise, sets, reps, weight], (err) => {
        res.json({ success: !err });
    });
});

app.get('/api/workouts/:id', (req, res) => {
    db.all("SELECT * FROM workouts WHERE user_id = ? ORDER BY id DESC LIMIT 50", [req.params.id], (err, rows) => {
        res.json({ success: true, workouts: rows || [] });
    });
});


app.get('/api/daily-quote', async (req, res) => {
    try {
        const response = await fetch("https://type.fit/api/quotes");
        const quotes = await response.json();
        const randomIndex = Math.floor(Math.random() * quotes.length);
        const randomQuote = quotes[randomIndex];
        let author = randomQuote.author || "Unknown";
        if (author.includes("type.fit")) author = author.split(',')[0];
        res.json({ success: true, quote: randomQuote.text, author: author });
    } catch (error) {
        res.json({ success: false, error: "Could not fetch quote." });
    }
});


app.get('/api/search-exercises', async (req, res) => {
    try {
        const query = req.query.q || '';
        const response = await fetch(`https://wger.de/api/v2/exercise/search/?term=${query}`);
        const data = await response.json();
        const results = data.suggestions.map(ex => ({
            name: ex.data.name,
            body_part: ex.data.category || "Varied",
            equipment: "Gym" 
        }));
        res.json({ success: true, results: results });
    } catch (error) {
        res.json({ success: false, results: [] });
    }
});


app.post('/api/chat', async (req, res) => {
    const { message, userId } = req.body;
    db.get("SELECT * FROM profiles WHERE user_id = ?", [userId], async (err, p) => {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            const prompt = `You are FitAI. User is a ${p.age}yo ${p.gender}, ${p.weight}kg, ${p.height}cm. Goal: ${p.goal}. The user is vegetarian. Keep answers concise, bullet points, emojis. Msg: "${message}"`;
            const result = await model.generateContent(prompt);
            res.json({ reply: result.response.text() });
        } catch (error) { res.json({ reply: "Error: " + error.message }); }
    });
});

app.post('/api/vision', async (req, res) => {
    const { imageBase64 } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const imagePart = { inlineData: { data: imageBase64.split(',')[1], mimeType: imageBase64.split(';')[0].split(':')[1] } };
        const result = await model.generateContent(["Estimate calories and macros (P/C/F) for this food. Be concise. The user is vegetarian.", imagePart]);
        res.json({ reply: result.response.text() });
    } catch (error) { res.json({ reply: "Error: " + error.message }); }
});

app.post('/api/pose', async (req, res) => {
    const { imageBase64 } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const prompt = "You are an elite biomechanics coach. Analyze this workout photo. 1. Give a 'Form Score: XX/100' at the top. 2. Provide 3 short bullet points (with emojis) highlighting what is good and what needs fixing (e.g. spine alignment, joint angles).";
        const imagePart = { inlineData: { data: imageBase64.split(',')[1], mimeType: imageBase64.split(';')[0].split(':')[1] } };
        const result = await model.generateContent([prompt, imagePart]);
        res.json({ reply: result.response.text() });
    } catch (error) { res.json({ reply: "Error: " + error.message }); }
});

app.post('/api/mealplan', (req, res) => {
    const { userId, duration, diet, meals } = req.body;
    db.get("SELECT * FROM profiles WHERE user_id = ?", [userId], async (err, p) => {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            const prompt = `Act as an expert nutritionist. Generate a ${duration} meal plan for a ${p.age}yo ${p.gender}, weighing ${p.weight}kg. Goal: ${p.goal}. Diet preference: ${diet} (Note: The user is strictly vegetarian). Format: ${meals}. Provide structured daily plans with meal names, macros (Protein/Carbs/Fats) for each meal, and short prep instructions. Use markdown and emojis.`;
            const result = await model.generateContent(prompt);
            res.json({ reply: result.response.text() });
        } catch (error) { res.json({ reply: "Error: " + error.message }); }
    });
});

app.listen(port, () => console.log(`🚀 FitAI running at http://localhost:${port}`));