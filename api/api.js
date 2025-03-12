const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const Ajv = require('ajv');
const Loki = require('lokijs');

// Initialize express app
const app = express();
const port = 8000;

// In-memory database using LokiJS
const db = new Loki('memory.db', { autosave: true });
const collection = db.addCollection('data');

// Initialize AJV for JSON validation
const ajv = new Ajv();

// Define a JSON schema to validate incoming data
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

// Middleware to parse JSON
// Try to see if i get cors errors
// app.use(cors({ origin: 'http://localhost:8080' }));
app.use(bodyParser.json());

// Create Express Router
const router = express.Router();

// POST endpoint to save data after validating
router.post('/', (req, res) => {
  const isValid = validate(req.body);

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid JSON format', details: validate.errors });
  }

  // Save data to in-memory database
  collection.insert(req.body);
  res.status(201).json({ message: 'Data saved successfully' });
});

// GET endpoint to retrieve stored data
router.get('/', (req, res) => {
  const data = collection.find();
  res.status(200).json(data);
});

router.get('/schema', (req, res) => {
  res.json(schema);
});

// Use the router for requests starting with /api
app.use('/api', router);

// Handle 404 errors (route not found)
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found', message: `The route ${req.originalUrl} does not exist` });
});

// Start the server
// Try to change host to localhost
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
