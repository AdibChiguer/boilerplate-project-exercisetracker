const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// In-memory database
let users = [];
let exercises = [];
let userIdCounter = 1;
let exerciseIdCounter = 1;

// Routes
app.post('/api/users', (req, res) => {
  const { username } = req.body;
  const user = { username, _id: userIdCounter++ };
  users.push(user);
  res.json(user);
});

app.get('/api/users', (req, res) => {
  res.json(users);
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = parseInt(req.params._id);
  const user = users.find(u => u._id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { description, duration, date } = req.body;
  const exercise = {
    userId: userId,
    description,
    duration: parseInt(duration),
    date: date ? new Date(date).toDateString() : new Date().toDateString(),
    _id: exerciseIdCounter++,
  };
  exercises.push(exercise);

  res.json({
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date,
    _id: exercise._id,
  });
});

app.get('/api/users/:_id/logs', (req, res) => {
  const userId = parseInt(req.params._id);
  const user = users.find(u => u._id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { from, to, limit } = req.query;
  let log = exercises.filter(ex => ex.userId === userId);

  if (from) {
    const fromDate = new Date(from);
    log = log.filter(ex => new Date(ex.date) >= fromDate);
  }

  if (to) {
    const toDate = new Date(to);
    log = log.filter(ex => new Date(ex.date) <= toDate);
  }

  if (limit) {
    log = log.slice(0, parseInt(limit));
  }

  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log: log.map(({ description, duration, date }) => ({
      description,
      duration,
      date,
    })),
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
