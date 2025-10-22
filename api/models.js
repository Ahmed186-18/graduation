import { DataTypes, Model } from 'sequelize';
import { sequelize } from './db.js';

// Define models using proper Sequelize syntax
export class HeadOfFamily extends Model {}
HeadOfFamily.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    fullName: { type: DataTypes.STRING, allowNull: false },
    idNumber: {
      type: DataTypes.STRING(9),
      allowNull: false,
      unique: true,
      validate: {
        len: {
          args: [9, 9],
          msg: 'رقم الهوية يجب أن يكون 9 أرقام'
        }
      }
    },
    phoneNumber: { type: DataTypes.STRING, allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, tableName: 'heads_of_families' }
);

export class Family extends Model {}
Family.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    headId: { type: DataTypes.UUID, allowNull: false },
    totalMembers: { type: DataTypes.INTEGER, allowNull: false },
    numberOfStudents: { type: DataTypes.INTEGER, allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },
    elderlyCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    childrenCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    femaleCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, tableName: 'families' }
);

export class Institution extends Model {}
Institution.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    contactEmail: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    about: { type: DataTypes.TEXT, allowNull: false },
    services: { type: DataTypes.TEXT, allowNull: false },
    regions: { type: DataTypes.JSONB, allowNull: false },
  },
  { sequelize, tableName: 'institutions' }
);

export class Admin extends Model {}
Admin.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'admin' },
  },
  { sequelize, tableName: 'admins' }
);

// Define associations
HeadOfFamily.hasOne(Family, { foreignKey: 'headId', as: 'family' });
Family.belongsTo(HeadOfFamily, { foreignKey: 'headId', as: 'head' });
