const express = require('express');
const bodyParser = require('body-parser');
const Ajv = require('ajv');
const Loki = require('lokijs');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);

const db = new Loki('memory.db', { autosave: true });
const collection = db.addCollection('data');
const users = db.addCollection('users');
const rooms = db.addCollection('rooms', {
  unique: ['id'],
  indices: ['userId', 'roomName'],
});

const io = socketIo(server, {
  path: '/api/socket-io/',
});

// The socketio already has userId... maybe i should use that...
io.use((socket, next) => {
  // I wonder if i need to do this... or socketio will always send that socket id in headers...
  socket.userId = socket.handshake.headers['x-user-id'];
  next();
});

class Room {
  constructor(userId, roomName) {
    this.id = `${userId}_${roomName}`;
    this.userId = userId;
    this.roomName = roomName;
    this.createdAt = new Date();
  }
}

io.on('connection', (socket) => {
  socket.emit('welcome', 'Hello from server!');

  socket.on('message', (data) => {
    console.log('Received message:', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  socket.on('sendToBackend', (value) => {
    const xUserId = socket.handshake.headers['x-user-id'];
    socket.emit('sendToFrontend', { value, 'x-user-id': xUserId });
  });

  socket.on('room:list', (data, callback) => {
    try {
      const userRooms = rooms.find({ userId: socket.userId });

      callback({ success: true, rooms: userRooms });
    } catch (error) {
      console.error(`'room:list' ${error.message}`);
      callback({
        success: false,
        error: `Failed to retrieve rooms.`,
      });
    }
  });

  socket.on('room:create', (data, callback) => {
    const { roomName } = data;

    try {
      if (rooms.findOne({ userId: socket.userId, roomName })) {
        callback({ success: false });
        return;
      }

      const room = new Room(socket.userId, roomName);

      const savedRoom = rooms.insert(room);

      callback({ success: true });
      socket.emit('room:create:success', {
        id: savedRoom.id,
        roomName: savedRoom.roomName,
      });
    } catch (error) {
      callback({ success: false });
    }
  });
});

const port = 8000;

const ajv = new Ajv();

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'integer', minimum: 18 },
  },
  required: ['name', 'age'],
  additionalProperties: false,
};
const validate = ajv.compile(schema);

app.use(bodyParser.json());

const router = express.Router();

router.post('/id', (req, res) => {
  const header = 'X-User-ID';
  const existingId = req.headers[header.toLowerCase()];

  if (existingId) {
    try {
      const user = users.findOne({ id: existingId });

      if (!user) {
        return res.status(401).json({
          error: 'Invalid user identifier',
          message: `The provided ${header} does not match any registered user.`,
        });
      }

      return res.status(400).json({
        error: 'User already identified',
        message:
          `Request contains existing ${header} header. ` +
          'Use existing ID instead of generating a new one.',
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Database lookup failed',
        message: 'Unable to verify user identifier.',
      });
    }
  }

  try {
    const id = crypto.randomBytes(32).toString('hex');
    users.insert({ id });
    return res.status(200).json({ id });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to generate identifier.',
      message: 'Unable to create id.',
    });
  }
});

router.post('/', (req, res) => {
  const isValid = validate(req.body);

  if (!isValid) {
    io.emit('notification', {
      id: crypto.randomUUID(),
      value: 'Failed to create user.',
    });
    return res
      .status(400)
      .json({ error: 'Invalid JSON format', details: validate.errors });
  } else {
    io.emit('notification', {
      id: crypto.randomUUID(),
      value: 'Created user.',
    });
  }

  collection.insert(req.body);
  res.status(201).json({ message: 'Data saved successfully' });
});

router.get('/', (req, res) => {
  const data = collection.find();
  res.status(200).json(data);
});

router.get('/schema', (req, res) => {
  res.json(schema);
});

app.use('/api', router);

app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The route ${req.originalUrl} does not exist`,
  });
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
