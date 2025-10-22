import { DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import { sequelize } from "./db.js";

export class HeadOfFamily extends Model<InferAttributes<HeadOfFamily>, InferCreationAttributes<HeadOfFamily>> {
  declare id: string;
  declare fullName: string;
  declare idNumber: string;
  declare phoneNumber: string;
  declare passwordHash: string;
}

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
          msg: "رقم الهوية يجب أن يكون 9 أرقام"
        }
      }
    },
    phoneNumber: { type: DataTypes.STRING, allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, tableName: "heads_of_families" }
);

export class FamilyMember extends Model<InferAttributes<FamilyMember>, InferCreationAttributes<FamilyMember>> {
  declare id: string;
  declare familyId: string;
  declare fullName: string;
  declare idNumber: string;
  declare dateOfBirth: Date;
  declare gender: "male" | "female";
  declare isUniversityStudent: boolean;
}

FamilyMember.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    familyId: { type: DataTypes.UUID, allowNull: false },
    fullName: { type: DataTypes.STRING, allowNull: false },
    idNumber: { 
      type: DataTypes.STRING(9), 
      allowNull: false,
      validate: {
        len: {
          args: [9, 9],
          msg: "رقم الهوية يجب أن يكون 9 أرقام"
        }
      }
    },
    dateOfBirth: { type: DataTypes.DATE, allowNull: false },
    gender: { 
      type: DataTypes.ENUM("male", "female"), 
      allowNull: false,
      validate: {
        isIn: {
          args: [["male", "female"]],
          msg: "الجنس يجب أن يكون ذكر أو أنثى"
        }
      }
    },
    isUniversityStudent: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: false 
    },
  },
  { sequelize, tableName: "family_members" }
);

export class Family extends Model<InferAttributes<Family>, InferCreationAttributes<Family>> {
  declare id: string;
  declare headId: string;
  declare totalMembers: number;
  declare numberOfStudents: number;
  declare address: string;
  declare elderlyCount: number;
  declare childrenCount: number;
  declare femaleCount: number;
  // Removed employment, income and housing status fields
}

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
    // Removed fields for employment, income and housing status
  },
  { sequelize, tableName: "families" }
);

export class Institution extends Model<InferAttributes<Institution>, InferCreationAttributes<Institution>> {
  declare id: string;
  declare name: string;
  declare contactEmail: string;
  declare passwordHash: string;
  declare about: string;
  declare services: string;
  declare regions: string[]; // JSON array of regions
}

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
  { sequelize, tableName: "institutions" }
);

// Define model associations
HeadOfFamily.hasOne(Family, {
  foreignKey: 'headId',
  as: 'headFamily'
});

Family.belongsTo(HeadOfFamily, {
  foreignKey: 'headId',
  as: 'familyHead'
});

Family.hasMany(FamilyMember, {
  foreignKey: 'familyId',
  as: 'familyMembers'
});

FamilyMember.belongsTo(Family, {
  foreignKey: 'familyId',
  as: 'memberFamily'
});

export class Admin extends Model<InferAttributes<Admin>, InferCreationAttributes<Admin>> {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare role: string;
}

Admin.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: "admin" },
  },
  { sequelize, tableName: "admins" }
);

export class AidType extends Model<InferAttributes< AidType>, InferCreationAttributes<AidType>> {
  declare id: string;
  declare name: string;
}

AidType.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, tableName: "aid_types" }
);

export class Assistance extends Model<InferAttributes<Assistance>, InferCreationAttributes<Assistance>> {
  declare id: string;
  declare institutionId: string;
  declare familyId: string;
  declare aidTypeId: string;
  declare amount: number;
  declare givenAt: Date;
}

Assistance.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    institutionId: { type: DataTypes.UUID, allowNull: false },
    familyId: { type: DataTypes.UUID, allowNull: false },
    aidTypeId: { type: DataTypes.UUID, allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    givenAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: "assistance" }
);

export class Notification extends Model<InferAttributes<Notification>, InferCreationAttributes<Notification>> {
  declare id: string;
  declare targetType: "head_of_family" | "institution" | "admin";
  declare targetId: string;
  declare message: string;
  declare createdAt: Date;
  declare read: boolean;
}

Notification.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    targetType: { type: DataTypes.ENUM("head_of_family", "institution", "admin"), allowNull: false },
    targetId: { type: DataTypes.UUID, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { sequelize, tableName: "notifications" }
);

export class InstitutionApplication extends Model<InferAttributes<InstitutionApplication>, InferCreationAttributes<InstitutionApplication>> {
  declare id: string;
  declare name: string;
  declare contactEmail: string;
  declare passwordHash: string;
  declare about: string;
  declare services: string;
  declare regions: string[]; // JSON array of regions
  declare status: "pending" | "approved" | "rejected";
}

InstitutionApplication.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    contactEmail: { type: DataTypes.STRING, allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    about: { type: DataTypes.TEXT, allowNull: false },
    services: { type: DataTypes.TEXT, allowNull: false },
    regions: { type: DataTypes.JSONB, allowNull: false },
    status: { type: DataTypes.ENUM("pending", "approved", "rejected"), allowNull: false, defaultValue: "pending" },
  },
  { sequelize, tableName: "institution_applications" }
);

// Define associations
HeadOfFamily.hasOne(Family, { foreignKey: "headId", as: "family" });
Family.belongsTo(HeadOfFamily, { foreignKey: "headId", as: "head" });

Institution.hasMany(Assistance, { foreignKey: "institutionId", as: "assistances" });
Assistance.belongsTo(Institution, { foreignKey: "institutionId", as: "institution" });

Family.hasMany(Assistance, { foreignKey: "familyId", as: "assistances" });
Assistance.belongsTo(Family, { foreignKey: "familyId", as: "family" });

AidType.hasMany(Assistance, { foreignKey: "aidTypeId", as: "assistances" });
Assistance.belongsTo(AidType, { foreignKey: "aidTypeId", as: "aidType" });

Family.hasMany(FamilyMember, { foreignKey: "familyId", as: "members" });
FamilyMember.belongsTo(Family, { foreignKey: "familyId", as: "family" });

export class UpdateRequest extends Model<InferAttributes<UpdateRequest>, InferCreationAttributes<UpdateRequest>> {
  declare id: string;
  declare familyId: string;
  declare type: "MEMBER_ADD" | "MEMBER_UPDATE" | "MEMBER_DELETE" | "ADDRESS_UPDATE";
  declare status: "pending" | "approved" | "rejected" | "cancelled";
  declare payload: object; // JSONB to store the details of the change
  declare rejectionReason?: string;
}

UpdateRequest.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    familyId: { type: DataTypes.UUID, allowNull: false },
    type: {
      type: DataTypes.ENUM("MEMBER_ADD", "MEMBER_UPDATE", "MEMBER_DELETE", "ADDRESS_UPDATE"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
    payload: { type: DataTypes.JSONB, allowNull: false },
    rejectionReason: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, tableName: "update_requests" }
);

// Define association
Family.hasMany(UpdateRequest, { foreignKey: "familyId", as: "updateRequests" });
UpdateRequest.belongsTo(Family, { foreignKey: "familyId", as: "family" });

export class FamilyRegistrationRequest extends Model<InferAttributes<FamilyRegistrationRequest>, InferCreationAttributes<FamilyRegistrationRequest>> {
  declare id: string;
  declare fullName: string;
  declare idNumber: string;
  declare phoneNumber: string;
  declare passwordHash: string;
  declare address: string;
  declare familyData: object; // JSONB to store family details
  declare status: "pending" | "approved" | "rejected";
  declare rejectionReason?: string;
}

FamilyRegistrationRequest.init(
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
          msg: "رقم الهوية يجب أن يكون 9 أرقام"
        }
      }
    },
    phoneNumber: { type: DataTypes.STRING, allowNull: false },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.TEXT, allowNull: false },
    familyData: { type: DataTypes.JSONB, allowNull: false },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    rejectionReason: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, tableName: "family_registration_requests" }
);

