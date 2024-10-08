const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors');
dotenv.config();

// Create MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

const app = express();

app.use(cors({
  origin: 'http://localhost:5173', // Allow requests from this origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Specify the allowed HTTP methods
  credentials: true, // Allow credentials (e.g., cookies, authorization headers)
}));

app.use(express.json());

app.use(bodyParser.json()); // For parsing application/json

const JWT_SECRET = process.env.JWT_SECRET; 

// Login route
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    // SQL query to find the user by email
    const sql = 'SELECT * FROM laborers WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ message: 'Internal server error.', email });
        }

        if (results.length === 0 || results[0].password !== password) {
            // User not found or password mismatch
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Generate JWT token
        const user = results[0];
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });

        // Respond with token
        return res.status(200).json({ message: 'Login successful', token });
    });
});

//-------------------- Register laborer API ------------------------
app.post('/register', (req, res) => {
  const { email, password, mobile } = req.body; // assuming you're sending JSON data in the request body

  // Step 1: Check if the email already exists
  const checkEmailSql = 'SELECT * FROM laborers WHERE email = ?';
  
  db.query(checkEmailSql, [email], (err, result) => {
    if (err) {
      console.error('Error checking email:', err);
      return res.status(500).json({ error: 'Failed to check email' });
    }

    // Step 2: If the email already exists, send a response
    if (result.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Step 3: Insert the new user without hashing the password
    const insertSql = 'INSERT INTO laborers (email, password, mobile) VALUES (?, ?, ?)';
    db.query(insertSql, [email, password, mobile], (err, result) => {
      if (err) {
        console.error('Error inserting user:', err);
        return res.status(500).json({ error: 'Failed to register user' });
      }

      // Step 4: Successfully registered user
      return res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    });
  });
});


// Logout route (optional)
app.post('/logout', (req, res) => {
    // Handle logout logic, if needed
    return res.status(200).json({ message: 'Logged out successfully' });
});

//******* ---------------laborers-------------- *********** */
app.get('/laborers', (req, res) => {
  const { id, name, email } = req.query; // Get query parameters from request

  // Base SQL query
  let sql = 'SELECT * FROM laborers WHERE ';
  const params = [];

  // Dynamically build query based on provided parameters
  if (id) {
    sql += 'id = ?';
    params.push(id);
  } else if (name) {
    sql += 'name = ?';
    params.push(name);
  } else if (email) {
    sql += 'email = ?';
    params.push(email);
  } else {
    return res.status(400).json({ error: 'No valid query parameter provided (id, name, or email required)' });
  }

  // Execute the query
  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    } else {
      return res.json(result);
    }
  });
});

// Server setup (make sure to add your server listening logic)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
