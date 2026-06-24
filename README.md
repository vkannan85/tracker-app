# Activity Tracker — Local Setup

Multi-project activity tracker with Node.js + SQLite backend.
Data is saved to a local `tracker.db` file on your machine.

---

## Prerequisites

- **Node.js** installed — download from https://nodejs.org (LTS version)
- That's it. No database server, no cloud account.

---

## Setup (one time)

```bash
# 1. Extract this folder somewhere, e.g. C:\Projects\activity-tracker

# 2. Open a terminal in that folder (right-click > Open in Terminal)

# 3. Install dependencies
npm install

# 4. Start the server
node server.js
```

You should see:
```
✅ Activity Tracker running at http://localhost:3001
📁 Database: C:\Projects\activity-tracker\tracker.db
```

**5. Open your browser and go to:** http://localhost:3001

---

## Daily use

Every time you want to use the tracker:

```bash
node server.js
```

Then open http://localhost:3001 in your browser.

To stop the server: press `Ctrl + C` in the terminal.

---

## Auto-start on Windows (optional)

To start automatically when Windows boots:

1. Create a file called `start-tracker.bat` in the project folder:
```batch
@echo off
cd /d C:\Projects\activity-tracker
node server.js
```

2. Press `Win + R`, type `shell:startup`, press Enter
3. Copy a shortcut to `start-tracker.bat` into that Startup folder

The tracker will now start automatically with Windows.

---

## Where is my data?

Your data is stored in `tracker.db` in the project folder.

**To back up:** copy `tracker.db` to OneDrive / SharePoint.
**To restore:** replace `tracker.db` with your backup copy.

---

## Project structure

```
activity-tracker/
├── server.js        ← Node.js Express API server
├── db.js            ← SQLite database setup & schema
├── package.json     ← Dependencies
├── tracker.db       ← Your data (created on first run)
└── public/
    └── index.html   ← The web app (React frontend)
```

---

## API endpoints (for reference)

| Method | Endpoint            | Description          |
|--------|---------------------|----------------------|
| GET    | /api/projects       | List all projects    |
| POST   | /api/projects       | Create project       |
| PUT    | /api/projects/:id   | Update project       |
| DELETE | /api/projects/:id   | Delete project       |
| GET    | /api/tasks          | List all tasks       |
| POST   | /api/tasks          | Create task          |
| PUT    | /api/tasks/:id      | Update task          |
| DELETE | /api/tasks/:id      | Delete task          |
| GET    | /api/subtasks       | List all subtasks    |
| POST   | /api/subtasks       | Create subtask       |
| PUT    | /api/subtasks/:id   | Update subtask       |
| DELETE | /api/subtasks/:id   | Delete subtask       |
| GET    | /api/checklist      | List checklist items |
| POST   | /api/checklist      | Add checklist item   |
| PUT    | /api/checklist/:id  | Update item          |
| DELETE | /api/checklist/:id  | Delete item          |
| GET    | /api/comments       | List all comments    |
| POST   | /api/comments       | Add comment          |
| PUT    | /api/comments/:id   | Edit comment         |
| DELETE | /api/comments/:id   | Delete comment       |

---

## Troubleshooting

**"Cannot find module 'better-sqlite3'"**
→ Run `npm install` again

**"Port 3001 already in use"**
→ Change PORT in server.js: `const PORT = 3002;`
→ Then open http://localhost:3002

**App shows "Cannot connect to server"**
→ Make sure `node server.js` is running in a terminal
