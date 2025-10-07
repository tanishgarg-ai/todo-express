const express = require("express");
const session = require("express-session");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "todo_secret",
    resave: false,
    saveUninitialized: true,
  })
);

// File paths
const USERS_FILE = path.join(__dirname, "data", "users.json");
const TASKS_FILE = path.join(__dirname, "data", "tasks.json");

// Utility functions
function readJSON(file) {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------- AUTH ROUTES ----------

// Signup
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE);

  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ message: "Username already exists" });
  }

  const newUser = { id: uuidv4(), username, password };
  users.push(newUser);
  writeJSON(USERS_FILE, users);

  res.json({ message: "Signup successful" });
});

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find((u) => u.username === username && u.password === password);

  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  req.session.user = user;
  res.json({ message: "Login successful" });
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out" }));
});

// Middleware to protect routes
function auth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: "Unauthorized" });
  next();
}

// ---------- TODO ROUTES ----------

// Get all tasks for logged in user
app.get("/tasks", auth, (req, res) => {
  const tasks = readJSON(TASKS_FILE).filter((t) => t.userId === req.session.user.id);
  res.json(tasks);
});

// Add task
app.post("/tasks", auth, (req, res) => {
  const tasks = readJSON(TASKS_FILE);
  const newTask = {
    id: uuidv4(),
    userId: req.session.user.id,
    title: req.body.title,
    status: "pending",
  };
  tasks.push(newTask);
  writeJSON(TASKS_FILE, tasks);
  res.json({ message: "Task added", task: newTask });
});

// Update task status
app.put("/tasks/:id", auth, (req, res) => {
  const tasks = readJSON(TASKS_FILE);
  const task = tasks.find((t) => t.id === req.params.id && t.userId === req.session.user.id);
  if (!task) return res.status(404).json({ message: "Task not found" });

  task.status = req.body.status;
  writeJSON(TASKS_FILE, tasks);
  res.json({ message: "Task updated", task });
});

// Delete task
app.delete("/tasks/:id", auth, (req, res) => {
  let tasks = readJSON(TASKS_FILE);
  tasks = tasks.filter((t) => !(t.id === req.params.id && t.userId === req.session.user.id));
  writeJSON(TASKS_FILE, tasks);
  res.json({ message: "Task deleted" });
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
