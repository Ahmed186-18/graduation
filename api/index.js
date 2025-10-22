import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { assertDatabaseConnection } from './db.js';
import { HeadOfFamily, Family, Admin, Institution } from './models.js';

const app = express();

// Initialize database connection
let dbConnected = false;
(async () => {
  try {
    await assertDatabaseConnection();
    dbConnected = true;
    console.log('Database connected successfully in API');
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
  }
})();

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
        if (!dbConnected) {
          return res.status(503).json({ message: "Database not connected" });
        }

        const admin = await Admin.findOne({ where: { email } });
        if (!admin) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
        if (!isValidPassword) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: admin.id, role: "admin" }, secret, { expiresIn: "2h" });
        return res.json({ token });
      }

      if (role === "institution") {
        if (!dbConnected) {
          return res.status(503).json({ message: "Database not connected" });
        }

        const institution = await Institution.findOne({ where: { contactEmail: email } });
        if (!institution) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const isValidPassword = await bcrypt.compare(password, institution.passwordHash);
        if (!isValidPassword) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: institution.id, role: "institution" }, secret, { expiresIn: "2h" });
        return res.json({ token });
      }

      return res.status(400).json({ message: "Invalid role specified" });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Family login endpoint - database version
app.post('/api/auth/family-login',
  body("idNumber").isString().trim().matches(/^[0-9]{9}$/).withMessage("رقم الهوية يجب أن يكون 9 أرقام"),
  body("password").isString().isLength({ min: 6 }).withMessage("كلمة المرور مطلوبة"),
  handleValidation,
  async (req, res) => {
    try {
      console.log('Family login attempt:', { idNumber: req.body.idNumber });

      const { idNumber, password } = req.body;

      if (!dbConnected) {
        return res.status(503).json({ message: "Database not connected" });
      }

      const headOfFamily = await HeadOfFamily.findOne({
        where: { idNumber },
        include: [{ model: Family, as: 'family' }]
      });

      if (!headOfFamily) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, headOfFamily.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const secret = process.env.JWT_SECRET || "secret";
      const token = jwt.sign({ id: headOfFamily.id, role: "family" }, secret, { expiresIn: "2h" });

      return res.json({
        token,
        head: {
          id: headOfFamily.id,
          fullName: headOfFamily.fullName,
          idNumber: headOfFamily.idNumber,
          phoneNumber: headOfFamily.phoneNumber
        },
        family: headOfFamily.family ? {
          id: headOfFamily.family.id,
          totalMembers: headOfFamily.family.totalMembers
        } : null,
      });

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