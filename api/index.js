const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:8080",
    "http://localhost:8081", 
    "http://localhost:8082",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8082",
    // Add your Vercel domain here
    "https://*.vercel.app"
  ],
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    service: "solace-lens-api", 
    env: process.env.NODE_ENV || "production",
    timestamp: new Date().toISOString()
  });
});

// Placeholder endpoints for now
app.post('/api/auth/login', (req, res) => {
  res.status(501).json({ message: "Not implemented yet" });
});

app.post('/api/register', (req, res) => {
  res.status(501).json({ message: "Not implemented yet" });
});

app.get('/api/cases', (req, res) => {
  res.status(501).json({ message: "Not implemented yet" });
});

// Export the app for Vercel
module.exports = app;
