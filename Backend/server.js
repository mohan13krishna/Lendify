require('dotenv').config();
const express = require('express');
const cors = require('cors');
const database = require('./db');

const authenticationRouter = require('./routes/auth');
const userRouter = require('./routes/users');
const loanRouter = require('./routes/loans');
const loanRequestRouter = require('./routes/loanRequests');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

database.execute('SELECT 1 + 1 AS solution')
  .then(([rows]) => {
    console.log('Database connection successful:', rows[0].solution);
  })
  .catch(error => {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  });

app.use('/api/auth', authenticationRouter);
app.use('/api/users', userRouter);
app.use('/api/loans', loanRouter);
app.use('/api/loan-requests', loanRequestRouter);

app.get('/', (request, response) => {
  response.send('Loan Management Backend API is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
console.log('JWT_SECRET from .env:', process.env.JWT_SECRET);
