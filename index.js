// Import the Express framework for building the web server
const express = require('express');

// Import the dotenv package to load environment variables from a .env file
const dotenv = require('dotenv');

// Load the variables defined in the .env file into process.env
dotenv.config();

// Create an Express app nstance
const app = express();

// Set the server port from .env or default to 3000
const PORT = process.env.PORT || 3000;

// Middleware to automatically parse incoming JSON in request bodies
app.use(express.json());

// Define a basic route for the homepage (GET request to '/')
// When someone visits localhost:3000/, they'll see this message
app.get('/', (req, res) => {
    res.send('Shopping Cart API is running!');
});

// Start the server and listen on the defined port
// When the server starts, log a message to the terminal
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});