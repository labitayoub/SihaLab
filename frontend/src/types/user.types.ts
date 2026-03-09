export enum UserRole {
  ADMIN = 'admin',
  MEDECIN = 'medecin',
  PATIENT = 'patient',
  PHARMACIEN = 'pharmacien',
  LABORATOIRE = 'laboratoire',
  INFIRMIER = 'infirmier',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  specialite?: string;
  numeroOrdre?: string;
  ville?: string;
  pays?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}
