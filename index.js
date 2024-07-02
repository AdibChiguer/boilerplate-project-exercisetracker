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

// In-memory storage
let users = [];
let exercises = [];
let userIdCounter = 1;
let exerciseIdCounter = 1;

// Create a new user
app.post('/api/users', (req, res) => {
  const { username } = req.body;
  const newUser = { username, _id: userIdCounter++ };
  users.push(newUser);
  res.json(newUser);
});

// Get all users
app.get('/api/users', (req, res) => {
  res.json(users);
});

// Add exercises to a user
app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = parseInt(req.params._id);
  const user = users.find(u => u._id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { description, duration, date } = req.body;
  const exercise = {
    userId,
    description,
    duration,
    date: date ? new Date(date).toDateString() : new Date().toDateString(),
    _id: exerciseIdCounter++,
  };

  exercises.push(exercise);

  // Return user object with exercise fields added
  res.json({
    ...user,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date,
  });
});

// Get user's exercise log
app.get('/api/users/:_id/logs', (req, res) => {
  const userId = parseInt(req.params._id);
  const user = users.find(u => u._id === userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let filteredExercises = exercises.filter(ex => ex.userId === userId);

  const { from, to, limit } = req.query;

  if (from && to) {
    filteredExercises = filteredExercises.filter(ex => {
      const exerciseDate = new Date(ex.date);
      return exerciseDate >= new Date(from) && exerciseDate <= new Date(to);
    });
  }

  if (limit) {
    filteredExercises = filteredExercises.slice(0, limit);
  }

  res.json({
    ...user,
    count: filteredExercises.length,
    log: filteredExercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date,
    })),
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
