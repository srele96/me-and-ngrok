const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const Ajv = require("ajv");
const Loki = require("lokijs");
const http = require("http");
const socketIo = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);

// Change to use .env & .env.docker
const ORIGIN_HOST = "public";
const io = socketIo(server, {
  cors: {
    origin: "*",
    credentials: true,
    methods: ["GET", "POST"],
  },
});

io.use((socket, next) => {
  // console.log(socket.handshake.headers);
  socket.userId = socket.handshake.headers["x-user-id"];
  next();
});

io.on("connection", (socket) => {
  console.log("A user " + socket.userId + " connected.");

  socket.emit("welcome", "Hello from server!");

  socket.on("message", (data) => {
    console.log("Received message:", data);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });

  socket.on("error", (error) => {
    console.error("Error on socket", socket.id, error.message);
  });
});

const port = 8000;

// extend schema to contain map of
// userID -> { createdAt: Date }
// Later implement something to clean up > 7 days old objects
const db = new Loki("memory.db", { autosave: true });
const collection = db.addCollection("data");
const users = db.addCollection("users");

const ajv = new Ajv();

const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer", minimum: 18 },
  },
  required: ["name", "age"],
  additionalProperties: false,
};
const validate = ajv.compile(schema);

app.use(bodyParser.json());

app.post("/id", (req, res) => {
  console.log("received request /id");
  const header = "X-User-ID";
  const id = crypto.randomBytes(32).toString("hex");
  try {
    users.insert({ id });
    return res.status(200).json({ id });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to generate identifier.",
      message: "Unable to create id.",
    });
  }
});

app.post("/", (req, res) => {
  const isValid = validate(req.body);

  if (!isValid) {
    io.emit("notification", {
      id: crypto.randomUUID(),
      value: "Failed to create user.",
    });
    return res
      .status(400)
      .json({ error: "Invalid JSON format", details: validate.errors });
  } else {
    io.emit("notification", {
      id: crypto.randomUUID(),
      value: "Created user.",
    });
  }

  collection.insert(req.body);
  res.status(201).json({ message: "Data saved successfully" });
});

app.get("/", (req, res) => {
  const data = collection.find();
  res.status(200).json(data);
});

app.get("/schema", (req, res) => {
  res.json(schema);
});

app.use((req, res, next) => {
  console.log("request", req.path);
  res.status(404).json({
    error: "Not Found",
    message: `The route ${req.originalUrl} does not exist`,
  });
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
