const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "tracker.db");
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    color_idx  INTEGER NOT NULL DEFAULT 0,
    created    INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    priority   TEXT NOT NULL DEFAULT '🟢 Normal',
    status     TEXT NOT NULL DEFAULT 'To Do',
    committed  INTEGER NOT NULL DEFAULT 0,
    notes      TEXT NOT NULL DEFAULT '',
    due_date   TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created    INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id         TEXT PRIMARY KEY,
    task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'To Do',
    priority   TEXT NOT NULL DEFAULT '🟢 Normal',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created    INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS checklist (
    id          TEXT PRIMARY KEY,
    subtask_id  TEXT NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    checked     INTEGER NOT NULL DEFAULT 0,
    created     INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id          TEXT PRIMARY KEY,
    subtask_id  TEXT NOT NULL REFERENCES subtasks(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    author      TEXT NOT NULL DEFAULT 'You',
    created     INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS captures (
    id      TEXT PRIMARY KEY,
    text    TEXT NOT NULL,
    done    INTEGER NOT NULL DEFAULT 0,
    created INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );
`);

// ── Migrations ────────────────────────────────────────────────────────────────
const taskCols = db.prepare("PRAGMA table_info(tasks)").all().map(c => c.name);
if (!taskCols.includes("due_date")) {
  db.exec("ALTER TABLE tasks ADD COLUMN due_date TEXT NOT NULL DEFAULT ''");
}
if (!taskCols.includes("sort_order")) {
  db.exec("ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
  for (const p of db.prepare("SELECT id FROM projects").all()) {
    db.prepare("SELECT id FROM tasks WHERE project_id=? ORDER BY created ASC").all(p.id)
      .forEach((r, i) => db.prepare("UPDATE tasks SET sort_order=? WHERE id=?").run(i, r.id));
  }
}
const subtaskCols = db.prepare("PRAGMA table_info(subtasks)").all().map(c => c.name);
if (!subtaskCols.includes("sort_order")) {
  db.exec("ALTER TABLE subtasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
  for (const t of db.prepare("SELECT id FROM tasks").all()) {
    db.prepare("SELECT id FROM subtasks WHERE task_id=? ORDER BY created ASC").all(t.id)
      .forEach((r, i) => db.prepare("UPDATE subtasks SET sort_order=? WHERE id=?").run(i, r.id));
  }
}

// ── Seed default data if empty ────────────────────────────────────────────────
const projectCount = db.prepare("SELECT COUNT(*) as c FROM projects").get().c;
if (projectCount === 0) {
  const now = Date.now();
  const p1 = "p1", p2 = "p2", p3 = "p3";
  const t1 = "t1", t2 = "t2", t3 = "t3";
  const s1 = "s1", s2 = "s2", s3 = "s3", s4 = "s4";

  db.prepare("INSERT INTO projects (id, name, color_idx, created) VALUES (?,?,?,?)").run(p1, "Project A – Azure Migration", 0, now);
  db.prepare("INSERT INTO projects (id, name, color_idx, created) VALUES (?,?,?,?)").run(p2, "Project B – M365 Rollout", 1, now);
  db.prepare("INSERT INTO projects (id, name, color_idx, created) VALUES (?,?,?,?)").run(p3, "Project C – CAF Governance", 2, now);

  db.prepare("INSERT INTO tasks (id, project_id, title, priority, status, committed, notes, created) VALUES (?,?,?,?,?,?,?,?)").run(t1, p1, "Subscription onboarding setup", "🟡 High", "In Progress", 1, "Follow CAF landing zone model", now - 172800000);
  db.prepare("INSERT INTO tasks (id, project_id, title, priority, status, committed, notes, created) VALUES (?,?,?,?,?,?,?,?)").run(t2, p2, "Entra ID policy configuration", "🔴 Critical", "To Do", 1, "", now - 86400000);
  db.prepare("INSERT INTO tasks (id, project_id, title, priority, status, committed, notes, created) VALUES (?,?,?,?,?,?,?,?)").run(t3, p3, "AVD FSLogix profile fix", "🟢 Normal", "Blocked", 0, "Waiting on storage RBAC", now);

  db.prepare("INSERT INTO subtasks (id, task_id, title, status, priority, created) VALUES (?,?,?,?,?,?)").run(s1, t1, "Create management group hierarchy", "Done", "🟢 Normal", now - 100000);
  db.prepare("INSERT INTO subtasks (id, task_id, title, status, priority, created) VALUES (?,?,?,?,?,?)").run(s2, t1, "Apply CAF naming policy", "In Progress", "🟡 High", now - 80000);
  db.prepare("INSERT INTO subtasks (id, task_id, title, status, priority, created) VALUES (?,?,?,?,?,?)").run(s3, t2, "Define Conditional Access baselines", "To Do", "🔴 Critical", now - 60000);
  db.prepare("INSERT INTO subtasks (id, task_id, title, status, priority, created) VALUES (?,?,?,?,?,?)").run(s4, t3, "Check storage account RBAC", "Blocked", "🟡 High", now - 40000);

  db.prepare("INSERT INTO checklist (id, subtask_id, text, checked, created) VALUES (?,?,?,?,?)").run("c1", s1, "Verify tenant root MG exists", 1, now - 95000);
  db.prepare("INSERT INTO checklist (id, subtask_id, text, checked, created) VALUES (?,?,?,?,?)").run("c2", s1, "Create platform MG", 1, now - 94000);
  db.prepare("INSERT INTO checklist (id, subtask_id, text, checked, created) VALUES (?,?,?,?,?)").run("c3", s1, "Create workloads MG", 0, now - 93000);

  db.prepare("INSERT INTO comments (id, subtask_id, text, author, created) VALUES (?,?,?,?,?)").run("cm1", s1, "Management group deployed via Terraform module.", "You", now - 90000);
  db.prepare("INSERT INTO comments (id, subtask_id, text, author, created) VALUES (?,?,?,?,?)").run("cm2", s2, "Policy initiative assigned — waiting peer review.", "You", now - 50000);
  db.prepare("INSERT INTO comments (id, subtask_id, text, author, created) VALUES (?,?,?,?,?)").run("cm3", s4, "Need Owner role on storage account to proceed.", "You", now - 20000);
}

module.exports = db;
