import { config } from "dotenv";
config({ path: ".env.local" });
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import bodyParser from "body-parser";
import { getDb } from "./server/db";
import { processWorkflow } from "./server/workflow";
import { v4 as uuidv4 } from 'uuid';
import { TaskStatus, AgentRole } from "./src/types";

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

  // DELETE /api/tasks/:id — 删除指定任务
  app.delete("/api/tasks/:id", async (req, res) => {
    const db = await getDb();
    const { id } = req.params;
    await db.run("DELETE FROM subtasks WHERE taskId = ?", [id]);
    await db.run("DELETE FROM audit_logs WHERE taskId = ?", [id]);
    await db.run("DELETE FROM tasks WHERE id = ?", [id]);
    res.json({ ok: true, id });
  });

  // DELETE /api/tasks — 批量清理（默认只清理 COMPLETED/FAILED/ESCALATED）
  app.delete("/api/tasks", async (req, res) => {
    const db = await getDb();
    const statuses = (req.query.statuses as string)?.split(",").map(s => s.trim()) || [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.ESCALATED];
    const placeholders = statuses.map(() => "?").join(",");
    const tasks = await db.all<{ id: string }[]>(`SELECT id FROM tasks WHERE status IN (${placeholders})`, ...statuses);
    for (const t of tasks) {
      await db.run("DELETE FROM subtasks WHERE taskId = ?", [t.id]);
      await db.run("DELETE FROM audit_logs WHERE taskId = ?", [t.id]);
    }
    await db.run(`DELETE FROM tasks WHERE status IN (${placeholders})`, ...statuses);
    res.json({ ok: true, deleted: tasks.length, statuses });
  });

  // POST /api/tasks/:id/retry — 重试 ESCALATED/FAILED 任务（重置为 PENDING）
  app.post("/api/tasks/:id/retry", async (req, res) => {
    const db = await getDb();
    const task = await db.get("SELECT * FROM tasks WHERE id = ?", [req.params.id]);
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (task.status !== TaskStatus.ESCALATED && task.status !== TaskStatus.FAILED) {
      return res.status(400).json({ error: `Cannot retry task in status: ${task.status}` });
    }
    // Delete old subtasks and reset
    await db.run("DELETE FROM subtasks WHERE taskId = ?", [task.id]);
    await db.run("UPDATE tasks SET status = ?, vetoCount = 0, metadata = '{}', updatedAt = ? WHERE id = ?",
      [TaskStatus.PENDING, Date.now(), task.id]);
    res.json({ ok: true, id: task.id, newStatus: TaskStatus.PENDING });
  });

  // POST /api/tasks/:id/escalate — 人工升级处理
  app.post("/api/tasks/:id/escalate", async (req, res) => {
    const db = await getDb();
    const { resolution } = req.body || {};
    await db.run("UPDATE tasks SET status = ?, updatedAt = ? WHERE id = ?",
      [TaskStatus.ESCALATED, Date.now(), req.params.id]);
    await db.run("INSERT INTO audit_logs (id, taskId, agent, action, content, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
      [uuidv4(), req.params.id, AgentRole.EMPEROR, "MANUAL_ESCALATE", resolution || "Manually escalated", Date.now()]);
    res.json({ ok: true });
  });

  // PATCH /api/tasks/:id — 更新任务字段
  app.patch("/api/tasks/:id", async (req, res) => {
    const db = await getDb();
    const { title, description, status } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    if (title !== undefined) { updates.push("title = ?"); values.push(title); }
    if (description !== undefined) { updates.push("description = ?"); values.push(description); }
    if (status !== undefined) { updates.push("status = ?"); values.push(status); }
    updates.push("updatedAt = ?"); values.push(Date.now());
    values.push(req.params.id);
    await db.run(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`, ...values);
    res.json({ ok: true });
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
