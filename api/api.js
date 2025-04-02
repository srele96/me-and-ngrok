const express = require('express');
const bodyParser = require('body-parser');
const Ajv = require('ajv');
const Loki = require('lokijs');
const http = require('http');
const socketIO = require('socket.io');
const crypto = require('crypto');
const session = require('express-session');

const db = new Loki('memory.db', { autosave: true });
const collection = db.addCollection('data');
const users = db.addCollection('users');
const rooms = db.addCollection('rooms', {
  unique: ['id'],
  indices: ['userId', 'roomName'],
});

const app = express();
const server = http.createServer(app);

const sessionMiddleware = session({
  secret: 'my_secret_key', // Requires .env file
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // Requires .env file
    maxAge: 1000 * 60 * 60 * 24, // Cookie expires in 1 day
  },
});

app.use(sessionMiddleware);

const io = new socketIO.Server(server, { path: '/api/socket-io/' });

io.engine.use(sessionMiddleware);

class Room {
  constructor(userId, roomName) {
    this.id = `${userId}_${roomName}`;
    this.userId = userId;
    this.roomName = roomName;
    this.createdAt = new Date();
  }
}

class User {
  constructor() {
    this.id = crypto.randomBytes(32).toString('hex');
  }
}

io.on('connection', (socket) => {
  // TODO: Check if i can use socket.request.session.userID without uid(socket)

  // --------------------------------------------------------------------------
  // https://socket.io/how-to/use-with-express-session
  //
  // BEGIN

  /** @typedef {function(import("socket.io").Socket): string} Select */

  /** @type {Select} */
  const sid = (s) => s.request.sessionID;
  /** @type {Select} */
  const uid = (s) => s.request.session.userID;

  // Example of manual session reload for every event
  socket.use((__, next) => {
    console.log(
      'Event received. ' +
        `Reloading session ${sid(socket)} ` +
        `for user ${uid(socket)}.`,
    );

    socket.request.session.reload((err) => {
      if (err) {
        console.error(
          `Failed to reload the session ${sid(socket)} ` +
            `for user ${uid(socket)}. ` +
            'Disconnect the socket.',
        );

        socket.disconnect();
        return;
      }

      console.log(
        `Successfully reloaded session ${sid(socket)} ` +
          `for user ${uid(socket)}.`,
      );
      next();
    });
  });

  // Periodically reload session to handle expiration
  const SESSION_RELOAD_INTERVAL = 30 * 1000; // 30 seconds
  const timer = setInterval(() => {
    // In development, when the server is restarted, the session reloads
    // successfully, but the userID in the session is undefined.

    console.log(`Reloading session ${sid(socket)} for user ${uid(socket)}.`);

    socket.request.session.reload((err) => {
      if (err) {
        socket.conn.close(); // Client reconnects automatically

        // You can also use socket.disconnect(), but in that case the client
        // will not try to reconnect.
        console.error(
          'Failed to reload the session. ' +
            `Session ${uid(socket)} has expired. ` +
            `Connection closed for user ${sid(socket)}.`,
        );

        return;
      }

      console.log(
        `Successfully reloaded session ${sid(socket)} ` +
          `for user ${uid(socket)}.`,
      );
    });
  }, SESSION_RELOAD_INTERVAL);

  socket.on('disconnect', () => {
    clearInterval(timer);
  });

  // END
  // --------------------------------------------------------------------------

  socket.on('message', (data) => {
    console.log('Received message:', data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  socket.on('sendToBackend', (value) => {
    socket.emit('sendToFrontend', { value, userID: uid(socket) });
  });

  socket.on('room:list', (data, callback) => {
    try {
      const userRooms = rooms.find({ userId: uid(socket) });

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
      if (rooms.findOne({ userId: uid(socket), roomName })) {
        callback({ success: false });
        return;
      }

      const room = new Room(uid(socket), roomName);

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

/** @type {import("express").RequestHandler} */
const ensureAnonymousUser = (req, res, next) => {
  const userID = req.session.userID;

  if (!userID) {
    try {
      console.log(
        `Attempting to create anonymous user for session ${req.sessionID}.`,
      );

      const user = new User();
      users.insert(user);
      req.session.userID = user.id;
      console.log(
        `Created anonymous user ${user.id} for the session ${req.sessionID}.`,
      );

      // I hope this doesn't cause race condition...
      req.session.save((err) => {
        if (err) {
          const message = error.message;
          console.error(
            `Failed to save the session ${req.sessionID}. ${message}`,
          );
          return next({ message });
        }

        console.log(`Successfully saved session ${req.sessionID}.`);
        return next();
      });

      return; // Needed because of req.session.save
    } catch (error) {
      const message = error.message;
      console.error(`Failed to create user for current session. ${message}`);
      return next({ message });
    }
  }

  console.log(`Anonymous user ${userID} exists in session ${req.sessionID}.`);
  return next();
};

router.use(ensureAnonymousUser);

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
