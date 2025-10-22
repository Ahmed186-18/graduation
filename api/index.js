const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

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

// Validation helper
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    service: "solace-lens-api", 
    env: process.env.NODE_ENV || "production",
    timestamp: new Date().toISOString()
  });
});

// Admin/Institution Login endpoint
app.post('/api/auth/login', 
  body("email").isEmail(),
  body("password").isString().isLength({ min: 6 }),
  handleValidation,
  async (req, res) => {
    try {
      const { email, password, role } = req.body;
      const secret = process.env.JWT_SECRET || "secret";

      if (role === "admin") {
        // For demo purposes, create a default admin if none exists
        // In production, you'd want to use a proper database
        const defaultAdmin = {
          email: "admin@solace.com",
          passwordHash: await bcrypt.hash("admin123", 10)
        };

        // Simple in-memory admin check (replace with database in production)
        if (email === defaultAdmin.email) {
          const ok = await bcrypt.compare(password, defaultAdmin.passwordHash);
          if (ok) {
            const token = jwt.sign({ id: "admin-1", role: "admin" }, secret, { expiresIn: "2h" });
            return res.json({ token });
          }
        }
        
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Institution login placeholder
      return res.status(501).json({ message: "Institution login not implemented yet" });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Family login endpoint
app.post('/api/auth/family-login',
  body("idNumber").isString().trim().matches(/^[0-9]{9}$/).withMessage("رقم الهوية يجب أن يكون 9 أرقام"),
  body("password").isString().isLength({ min: 6 }).withMessage("كلمة المرور مطلوبة"),
  handleValidation,
  async (req, res) => {
    try {
      const { idNumber, password } = req.body;
      
      // Placeholder for family login
      return res.status(501).json({ message: "Family login not implemented yet" });
      
    } catch (error) {
      console.error('Family login error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Registration endpoint
app.post('/api/register',
  body("email").isEmail(),
  body("password").isString().isLength({ min: 6 }),
  body("name").isString().isLength({ min: 2 }),
  body("role").isIn(["admin", "institution", "family"]),
  handleValidation,
  async (req, res) => {
    try {
      const { email, password, name, role } = req.body;
      
      // Placeholder for registration
      return res.status(501).json({ message: "Registration not implemented yet" });
      
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Cases endpoint
app.get('/api/cases', async (req, res) => {
  try {
    // Placeholder for cases
    return res.status(501).json({ message: "Cases endpoint not implemented yet" });
  } catch (error) {
    console.error('Cases error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Export the app for Vercel
module.exports = app;
