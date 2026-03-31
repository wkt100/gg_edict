import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { getDb } from "./server/db";
import { processWorkflow } from "./server/workflow";
import { v4 as uuidv4 } from 'uuid';
import { TaskStatus } from "./src/types";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // API Routes
  app.get("/api/tasks", async (req, res) => {
    const db = await getDb();
    const tasks = await db.all("SELECT * FROM tasks ORDER BY createdAt DESC");
    res.json(tasks.map(t => ({ ...t, metadata: JSON.parse(t.metadata || '{}') })));
  });

  app.get("/api/tasks/:id", async (req, res) => {
    const db = await getDb();
    const task = await db.get("SELECT * FROM tasks WHERE id = ?", [req.params.id]);
    if (!task) return res.status(404).json({ error: "Not found" });
    
    const subtasks = await db.all("SELECT * FROM subtasks WHERE taskId = ?", [req.params.id]);
    const logs = await db.all("SELECT * FROM audit_logs WHERE taskId = ? ORDER BY timestamp ASC", [req.params.id]);
    
    res.json({
      ...task,
      metadata: JSON.parse(task.metadata || '{}'),
      subtasks,
      logs
    });
  });

  app.post("/api/tasks", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt required" });

    const db = await getDb();
    const id = uuidv4();
    const now = Date.now();
    
    await db.run(
      "INSERT INTO tasks (id, title, description, status, originalPrompt, metadata, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, "New Decree", "Processing...", TaskStatus.PENDING, prompt, "{}", now, now]
    );

    res.json({ id });
  });

  // Background Workflow Runner
  setInterval(async () => {
    try {
      await processWorkflow();
    } catch (e) {
      console.error("Workflow runner error:", e);
    }
  }, 5000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
