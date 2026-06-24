const express = require("express");
const cors    = require("cors");
const path    = require("path");
const { randomBytes } = require("crypto");
const db      = require("./db");

const app  = express();
const PORT = process.env.PORT || 3001;

const genId = () => randomBytes(4).toString("hex");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_, res) => res.json({ ok: true, ts: Date.now() }));

// ── Projects ──────────────────────────────────────────────────────────────────
app.get("/api/projects", (_, res) => {
  res.json(db.prepare("SELECT * FROM projects ORDER BY created ASC").all());
});

app.post("/api/projects", (req, res) => {
  const { name, color_idx = 0 } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Name required" });
  const id = genId();
  db.prepare("INSERT INTO projects (id, name, color_idx, created) VALUES (?,?,?,?)").run(id, name.trim(), color_idx, Date.now());
  res.json(db.prepare("SELECT * FROM projects WHERE id=?").get(id));
});

app.put("/api/projects/:id", (req, res) => {
  const { name, color_idx } = req.body;
  db.prepare("UPDATE projects SET name=COALESCE(?,name), color_idx=COALESCE(?,color_idx) WHERE id=?").run(name, color_idx, req.params.id);
  res.json(db.prepare("SELECT * FROM projects WHERE id=?").get(req.params.id));
});

app.delete("/api/projects/:id", (req, res) => {
  db.prepare("DELETE FROM projects WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ── Tasks ─────────────────────────────────────────────────────────────────────
app.get("/api/tasks", (_, res) => {
  res.json(db.prepare("SELECT * FROM tasks ORDER BY created ASC").all().map(t => ({ ...t, committed: !!t.committed })));
});

app.post("/api/tasks", (req, res) => {
  const { project_id, title, priority = "🟢 Normal", status = "To Do", committed = false, notes = "", due_date = "" } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Title required" });
  if (!project_id)    return res.status(400).json({ error: "project_id required" });
  const id = genId();
  db.prepare("INSERT INTO tasks (id, project_id, title, priority, status, committed, notes, due_date, created) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(id, project_id, title.trim(), priority, status, committed ? 1 : 0, notes, due_date, Date.now());
  res.json({ ...db.prepare("SELECT * FROM tasks WHERE id=?").get(id), committed: !!committed });
});

app.put("/api/tasks/:id", (req, res) => {
  const { title, priority, status, committed, notes, project_id, due_date } = req.body;
  const t = db.prepare("SELECT * FROM tasks WHERE id=?").get(req.params.id);
  if (!t) return res.status(404).json({ error: "Not found" });
  db.prepare(`UPDATE tasks SET
    title=COALESCE(?,title), priority=COALESCE(?,priority), status=COALESCE(?,status),
    committed=COALESCE(?,committed), notes=COALESCE(?,notes), project_id=COALESCE(?,project_id),
    due_date=COALESCE(?,due_date)
    WHERE id=?`).run(title, priority, status, committed !== undefined ? (committed ? 1 : 0) : null, notes, project_id, due_date, req.params.id);
  const updated = db.prepare("SELECT * FROM tasks WHERE id=?").get(req.params.id);
  res.json({ ...updated, committed: !!updated.committed });
});

app.delete("/api/tasks/:id", (req, res) => {
  db.prepare("DELETE FROM tasks WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ── Subtasks ──────────────────────────────────────────────────────────────────
app.get("/api/subtasks", (_, res) => {
  res.json(db.prepare("SELECT * FROM subtasks ORDER BY created ASC").all());
});

app.post("/api/subtasks", (req, res) => {
  const { task_id, title, priority = "🟢 Normal", status = "To Do" } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Title required" });
  if (!task_id)       return res.status(400).json({ error: "task_id required" });
  const id = genId();
  db.prepare("INSERT INTO subtasks (id, task_id, title, status, priority, created) VALUES (?,?,?,?,?,?)")
    .run(id, task_id, title.trim(), status, priority, Date.now());
  res.json(db.prepare("SELECT * FROM subtasks WHERE id=?").get(id));
});

app.put("/api/subtasks/:id", (req, res) => {
  const { title, status, priority } = req.body;
  db.prepare("UPDATE subtasks SET title=COALESCE(?,title), status=COALESCE(?,status), priority=COALESCE(?,priority) WHERE id=?")
    .run(title, status, priority, req.params.id);
  res.json(db.prepare("SELECT * FROM subtasks WHERE id=?").get(req.params.id));
});

app.delete("/api/subtasks/:id", (req, res) => {
  db.prepare("DELETE FROM subtasks WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ── Checklist ─────────────────────────────────────────────────────────────────
app.get("/api/checklist", (_, res) => {
  res.json(db.prepare("SELECT * FROM checklist ORDER BY created ASC").all().map(c => ({ ...c, checked: !!c.checked })));
});

app.post("/api/checklist", (req, res) => {
  const { subtask_id, text } = req.body;
  if (!text?.trim())  return res.status(400).json({ error: "Text required" });
  if (!subtask_id)    return res.status(400).json({ error: "subtask_id required" });
  const id = genId();
  db.prepare("INSERT INTO checklist (id, subtask_id, text, checked, created) VALUES (?,?,?,0,?)").run(id, subtask_id, text.trim(), Date.now());
  res.json({ ...db.prepare("SELECT * FROM checklist WHERE id=?").get(id), checked: false });
});

app.put("/api/checklist/:id", (req, res) => {
  const { text, checked } = req.body;
  db.prepare("UPDATE checklist SET text=COALESCE(?,text), checked=COALESCE(?,checked) WHERE id=?")
    .run(text, checked !== undefined ? (checked ? 1 : 0) : null, req.params.id);
  const updated = db.prepare("SELECT * FROM checklist WHERE id=?").get(req.params.id);
  res.json({ ...updated, checked: !!updated.checked });
});

app.delete("/api/checklist/:id", (req, res) => {
  db.prepare("DELETE FROM checklist WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ── Comments ──────────────────────────────────────────────────────────────────
app.get("/api/comments", (_, res) => {
  res.json(db.prepare("SELECT * FROM comments ORDER BY created ASC").all());
});

app.post("/api/comments", (req, res) => {
  const { subtask_id, text, author = "You" } = req.body;
  if (!text?.trim())  return res.status(400).json({ error: "Text required" });
  if (!subtask_id)    return res.status(400).json({ error: "subtask_id required" });
  const id = genId();
  db.prepare("INSERT INTO comments (id, subtask_id, text, author, created) VALUES (?,?,?,?,?)").run(id, subtask_id, text.trim(), author, Date.now());
  res.json(db.prepare("SELECT * FROM comments WHERE id=?").get(id));
});

app.put("/api/comments/:id", (req, res) => {
  const { text } = req.body;
  db.prepare("UPDATE comments SET text=COALESCE(?,text) WHERE id=?").run(text, req.params.id);
  res.json(db.prepare("SELECT * FROM comments WHERE id=?").get(req.params.id));
});

app.delete("/api/comments/:id", (req, res) => {
  db.prepare("DELETE FROM comments WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ── Captures ──────────────────────────────────────────────────────────────────
app.get("/api/captures", (_, res) => {
  res.json(db.prepare("SELECT * FROM captures WHERE done=0 ORDER BY created DESC").all());
});

app.post("/api/captures", (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Text required" });
  const id = genId();
  db.prepare("INSERT INTO captures (id, text, done, created) VALUES (?,?,0,?)").run(id, text.trim(), Date.now());
  res.json(db.prepare("SELECT * FROM captures WHERE id=?").get(id));
});

app.put("/api/captures/:id", (req, res) => {
  const { done } = req.body;
  db.prepare("UPDATE captures SET done=? WHERE id=?").run(done ? 1 : 0, req.params.id);
  res.json(db.prepare("SELECT * FROM captures WHERE id=?").get(req.params.id));
});

// ── Catch-all → serve React app ───────────────────────────────────────────────
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n✅ Activity Tracker running at http://localhost:${PORT}`);
  console.log(`📁 Database: ${path.join(__dirname, "tracker.db")}\n`);
});
