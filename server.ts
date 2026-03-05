import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("attendance.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'staff')),
    full_name TEXT
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT CHECK(type IN ('in', 'out')),
    note TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Insert default admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)").run(
    "admin",
    "admin123", // In a real app, hash this
    "admin",
    "Administrador Sistema"
  );
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // --- API Routes ---

  // Auth
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT id, username, role, full_name FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "Credenciales inválidas" });
    }
  });

  // Attendance
  app.post("/api/attendance", (req, res) => {
    const { user_id, type, note } = req.body;
    try {
      db.prepare("INSERT INTO attendance (user_id, type, note) VALUES (?, ?, ?)").run(user_id, type, note || "");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.get("/api/attendance", (req, res) => {
    const { user_id } = req.query;
    let query = `
      SELECT a.*, u.full_name 
      FROM attendance a 
      JOIN users u ON a.user_id = u.id 
    `;
    const params = [];
    if (user_id) {
      query += " WHERE a.user_id = ?";
      params.push(user_id);
    }
    query += " ORDER BY a.timestamp DESC";
    
    const records = db.prepare(query).all(...params);
    res.json(records);
  });

  app.put("/api/attendance/:id", (req, res) => {
    const { id } = req.params;
    const { timestamp, type, note } = req.body;
    try {
      db.prepare("UPDATE attendance SET timestamp = ?, type = ?, note = ? WHERE id = ?").run(timestamp, type, note, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.delete("/api/attendance/:id", (req, res) => {
    const { id } = req.params;
    console.log('API: Eliminando registro de asistencia:', id);
    try {
      const info = db.prepare("DELETE FROM attendance WHERE id = ?").run(id);
      console.log('API: Resultado eliminación asistencia:', info);
      res.json({ success: true });
    } catch (error) {
      console.error('API Error: Error al eliminar asistencia:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // User Management
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, username, role, full_name FROM users").all();
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    const { username, password, role, full_name } = req.body;
    try {
      db.prepare("INSERT INTO users (username, password, role, full_name) VALUES (?, ?, ?, ?)").run(username, password, role, full_name);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    console.log('API: Eliminando usuario:', id);
    try {
      // First delete all attendance records for this user
      const attInfo = db.prepare("DELETE FROM attendance WHERE user_id = ?").run(id);
      console.log('API: Registros de asistencia eliminados para el usuario:', attInfo.changes);
      
      // Then delete the user
      const userInfo = db.prepare("DELETE FROM users WHERE id = ?").run(id);
      console.log('API: Resultado eliminación usuario:', userInfo);
      
      res.json({ success: true });
    } catch (error) {
      console.error('API Error: Error al eliminar usuario:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
