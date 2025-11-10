import { Phase, UserRole, ApplicationStatus } from './enums';

export interface BaseUser {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUser extends BaseUser {
  role: UserRole.ADMIN;
  isActive: boolean;
  permissions?: string[];
}

export interface ViewerUser extends BaseUser {
  role: UserRole.VIEWER;
  canView: boolean;
  accessLevel?: 'BASIC' | 'FULL';
}

export interface ApplicantUser extends BaseUser {
  role: UserRole.APPLICANT;
  applicationId?: string;
  isAccepted: boolean | null;
  phase: Phase;
  status: ApplicationStatus;
  webinarAttended: number | null;
  interviewerId?: string;
  cohortId: string;
  companyName?: string;
  interviewDate?: Date | string; // For scheduled interviews
  profileData?: {
    companyName?: string;
    phone?: string;
    linkedIn?: string;
    resume?: string;
    portfolio?: string;
  };
}

export type User = AdminUser | ViewerUser | ApplicantUser;

export interface UserCreateRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  cohortId?: string;
}

export interface UserUpdateRequest {
  name?: string;
  email?: string;
  isActive?: boolean;
  canView?: boolean;
  phase?: Phase;
  status?: ApplicationStatus;
  isAccepted?: boolean | null;
  interviewerId?: string;
  profileData?: ApplicantUser['profileData'];
}