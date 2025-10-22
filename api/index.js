import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

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
        // Simple hardcoded admin for now (replace with database later)
        if (email === "admin@solace.com" && password === "admin123") {
          const token = jwt.sign({ id: "admin-1", role: "admin" }, secret, { expiresIn: "2h" });
          return res.json({ token });
        }
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (role === "institution") {
        // Placeholder for institution login
        return res.status(501).json({ message: "Institution login not implemented yet" });
      }

      return res.status(400).json({ message: "Invalid role specified" });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Family login endpoint - simplified version
app.post('/api/auth/family-login',
  body("idNumber").isString().trim().matches(/^[0-9]{9}$/).withMessage("رقم الهوية يجب أن يكون 9 أرقام"),
  body("password").isString().isLength({ min: 6 }).withMessage("كلمة المرور مطلوبة"),
  handleValidation,
  async (req, res) => {
    try {
      console.log('Family login attempt:', { idNumber: req.body.idNumber });
      
      const { idNumber, password } = req.body;
      
      // Simple hardcoded family for testing (replace with database later)
      if (idNumber === "123456789" && password === "family123") {
        const secret = process.env.JWT_SECRET || "secret";
        const token = jwt.sign({ id: "family-1", role: "family" }, secret, { expiresIn: "2h" });
        
        return res.json({
          token,
          head: { 
            id: "family-1", 
            fullName: "Test Family Head", 
            idNumber: "123456789", 
            phoneNumber: "1234567890" 
          },
          family: { 
            id: "family-1", 
            totalMembers: 4 
          },
        });
      }
      
      return res.status(401).json({ message: "Invalid credentials" });
      
    } catch (error) {
      console.error('Family login error:', error.message);
      console.error('Full error:', error);
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
export default app;