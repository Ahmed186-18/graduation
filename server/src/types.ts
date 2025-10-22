import { Request } from 'express';

export interface FamilyRegistrationRequest {
  fullName: string;
  idNumber: string;
  phoneNumber: string;
  password?: string;
  address: string;
  family: {
    totalMembers: number;
    numberOfStudents: number;
    elderlyCount?: number;
    childrenCount?: number;
    wife?: {
      fullName: string;
      idNumber: string;
      dateOfBirth: string;
      gender: 'female';
      isUniversityStudent: boolean;
    };
    members?: Array<{
      fullName: string;
      idNumber: string;
      dateOfBirth: string;
      gender: 'male' | 'female';
      isUniversityStudent: boolean;
    }>;
  };
}

export interface DatabaseError extends Error {
  name: string;
  errors: Array<{
    path: string;
    message: string;
  }>;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'admin' | 'institution' | 'family';
  };
}

export interface FamilyWithMembers {
  id: string;
  headName: string;
  headIdNumber: string;
  totalMembers: number;
  numberOfStudents: number;
  elderlyCount: number;
  monthlyIncome: number;
  housingStatus: string;
  headOfFamilyName: string;
  phoneNumber: string;
  members: Array<{
    name: string;
    idNumber: string;
    birthdate: string;
    gender: 'ذكر' | 'أنثى';
    isUniversityStudent: boolean;
  }>;
}
