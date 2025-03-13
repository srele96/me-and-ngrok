const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const Ajv = require('ajv');
const Loki = require('lokijs');

const app = express();
const port = 8000;

const db = new Loki('memory.db', { autosave: true });
const collection = db.addCollection('data');

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

router.post('/', (req, res) => {
  const isValid = validate(req.body);

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid JSON format', details: validate.errors });
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
  res.status(404).json({ error: 'Not Found', message: `The route ${req.originalUrl} does not exist` });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
