import { UserRole, InterviewStatus } from './enums';

export interface Interviewer {
  id?: string;
  userId: string; // Reference to Admin or Viewer user
  name: string;
  email: string;
  title: string; // Required title/position of the interviewer
  role: UserRole.ADMIN | UserRole.VIEWER;
  calendarUrl: string; // Required Google Calendar URL
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewerCreateRequest {
  userId: string;
  title: string;
  calendarUrl: string;
}

export interface InterviewerUpdateRequest {
  title?: string;
  calendarUrl?: string;
  isActive?: boolean;
}

export interface Interview {
  id?: string;
  applicantId: string;
  interviewerId: string;
  cohortId: string;
  status: InterviewStatus;
  notes?: string;
  documentUrl?: string; // Google Doc URL
  scheduledAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewCreateRequest {
  applicantId: string;
  interviewerId: string;
  cohortId: string;
  status?: InterviewStatus;
  notes?: string;
  documentUrl?: string;
  scheduledAt?: Date;
}

export interface InterviewUpdateRequest {
  status?: InterviewStatus;
  notes?: string;
  documentUrl?: string;
  scheduledAt?: Date;
  completedAt?: Date;
}