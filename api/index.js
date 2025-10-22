const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
  },
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Models
const Admin = sequelize.define('Admin', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING, allowNull: false },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, allowNull: false, defaultValue: "admin" },
}, { tableName: "admins" });

const Institution = sequelize.define('Institution', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  contactEmail: { type: DataTypes.STRING, allowNull: false },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  phoneNumber: { type: DataTypes.STRING },
  address: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING, defaultValue: "pending" },
}, { tableName: "institutions" });

const HeadOfFamily = sequelize.define('HeadOfFamily', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  fullName: { type: DataTypes.STRING, allowNull: false },
  idNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  phoneNumber: { type: DataTypes.STRING },
  address: { type: DataTypes.TEXT },
}, { tableName: "head_of_families" });

const Family = sequelize.define('Family', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  headId: { type: DataTypes.UUID, allowNull: false },
  totalMembers: { type: DataTypes.INTEGER, defaultValue: 1 },
  monthlyIncome: { type: DataTypes.DECIMAL(10, 2) },
  status: { type: DataTypes.STRING, defaultValue: "pending" },
}, { tableName: "families" });

// Initialize database connection
async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Sync models (create tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized');
    
    // Create default admin if none exists
    const adminCount = await Admin.count();
    if (adminCount === 0) {
      const passwordHash = await bcrypt.hash("admin123", 10);
      await Admin.create({
        email: "admin@solace.com",
        passwordHash: passwordHash,
        role: "admin"
      });
      console.log('✅ Default admin created: admin@solace.com / admin123');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Initialize database on startup
initDatabase().catch(console.error);

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
        const admin = await Admin.findOne({ where: { email } });
        if (!admin) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const ok = await bcrypt.compare(password, admin.passwordHash);
        if (!ok) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign({ id: admin.id, role: "admin" }, secret, { expiresIn: "2h" });
        return res.json({ token });
      }

      if (role === "institution") {
        const institution = await Institution.findOne({ where: { contactEmail: email } });
        if (!institution) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

        const ok = await bcrypt.compare(password, institution.passwordHash);
        if (!ok) {
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

// Family login endpoint
app.post('/api/auth/family-login',
  body("idNumber").isString().trim().matches(/^[0-9]{9}$/).withMessage("رقم الهوية يجب أن يكون 9 أرقام"),
  body("password").isString().isLength({ min: 6 }).withMessage("كلمة المرور مطلوبة"),
  handleValidation,
  async (req, res) => {
    try {
      const { idNumber, password } = req.body;
      
      const head = await HeadOfFamily.findOne({ where: { idNumber } });
      if (!head) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const ok = await bcrypt.compare(password, head.passwordHash);
      if (!ok) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const secret = process.env.JWT_SECRET || "secret";
      const token = jwt.sign({ id: head.id, role: "family" }, secret, { expiresIn: "2h" });

      // Fetch family info if exists
      const family = await Family.findOne({ where: { headId: head.id } });

      return res.json({
        token,
        head: { 
          id: head.id, 
          fullName: head.fullName, 
          idNumber: head.idNumber, 
          phoneNumber: head.phoneNumber 
        },
        family: family ? { 
          id: family.id, 
          totalMembers: family.totalMembers 
        } : null,
      });
      
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
