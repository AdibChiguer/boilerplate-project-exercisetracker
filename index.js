const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Define schemas and models
const Schema = mongoose.Schema;

const exerciseUsersSchema = new Schema({
  username: { type: String, unique: true, required: true }
});

const ExercisesSchema = new Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, min: 1, required: true },
  date: { type: Date, default: Date.now }
});

const ExerciseUsers = mongoose.model('ExerciseUsers', exerciseUsersSchema);
const Exercises = mongoose.model('Exercises', ExercisesSchema);

// Serve static files
app.use('/public', express.static(process.cwd() + '/public'));

// Serve the index.html file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', (req, res) => {
  if (!req.body.username || req.body.username.trim() === '') {
    return res.json({ error: 'username is required' });
  }

  const username = req.body.username.trim();

  ExerciseUsers.findOne({ username: username }, (err, data) => {
    if (err) {
      return res.json({ error: 'Database error' });
    }

    if (data) {
      return res.json({ error: 'username already exists' });
    }

    const newUser = new ExerciseUsers({ username: username });
    newUser.save((err, savedUser) => {
      if (err || !savedUser) {
        return res.json({ error: 'Failed to save user' });
      }

      res.json({ _id: savedUser._id, username: savedUser.username });
    });
  });
});

// Get all users
app.get('/api/users', (req, res) => {
  ExerciseUsers.find({}, 'username _id', (err, users) => {
    if (err) {
      return res.json({ error: 'Database error' });
    }

    res.json(users);
  });
});

// Add exercises to a user
app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  if (!userId || userId.trim() === '') {
    return res.json({ error: '_id is required' });
  }

  if (!description || description.trim() === '') {
    return res.json({ error: 'description is required' });
  }

  if (!duration || isNaN(duration) || parseInt(duration) < 1) {
    return res.json({ error: 'duration must be a number greater than 0' });
  }

  const parsedDuration = parseInt(duration);
  const parsedDate = date ? new Date(date) : new Date();

  if (isNaN(parsedDate.getTime())) {
    return res.json({ error: 'Invalid date' });
  }

  ExerciseUsers.findById(userId, (err, user) => {
    if (err || !user) {
      return res.json({ error: 'User not found' });
    }

    const newExercise = new Exercises({
      userId: userId,
      description: description.trim(),
      duration: parsedDuration,
      date: parsedDate
    });

    newExercise.save((err, savedExercise) => {
      if (err || !savedExercise) {
        return res.json({ error: 'Failed to save exercise' });
      }

      res.json({
        _id: user._id,
        username: user.username,
        description: savedExercise.description,
        duration: savedExercise.duration,
        date: savedExercise.date.toISOString().slice(0, 10)
      });
    });
  });
});

// Get user's exercise log
app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  let { from, to, limit } = req.query;

  const findConditions = { userId: userId };

  if (from && new Date(from).toString() !== 'Invalid Date') {
    findConditions.date = { $gte: new Date(from) };
  }

  if (to && new Date(to).toString() !== 'Invalid Date') {
    if (!findConditions.date) {
      findConditions.date = {};
    }
    findConditions.date.$lte = new Date(to);
  }

  if (limit && !isNaN(limit)) {
    limit = parseInt(limit);
  } else {
    limit = 0; // default to no limit
  }

  ExerciseUsers.findById(userId, (err, user) => {
    if (err || !user) {
      return res.json({ error: 'User not found' });
    }

    Exercises.find(findConditions)
      .sort({ date: 'asc' })
      .limit(limit)
      .exec((err, exercises) => {
        if (err) {
          return res.json({ error: 'Database error' });
        }

        res.json({
          _id: user._id,
          username: user.username,
          count: exercises.length,
          log: exercises.map(exercise => ({
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toISOString().slice(0, 10)
          }))
        });
      });
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // Mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // Report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // Generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }

  res.status(errCode).type('txt').send(errMessage);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Your app is listening on port ${PORT}`);
});
