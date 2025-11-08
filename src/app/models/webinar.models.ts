export interface Webinar {
  id?: string;
  num: number;
  link: string;
  timestamp: Date;
  code: string;
  cohortId: string;
  title?: string;
  description?: string;
  maxAttendees?: number;
  attendeeCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebinarCreateRequest {
  link: string;
  timestamp: Date;
  cohortId: string;
  title?: string;
  description?: string;
  maxAttendees?: number;
}

export interface WebinarAttendanceRecord {
  id?: string;
  webinarId: string;
  applicantId: string;
  attendedAt: Date;
  ipAddress?: string;
}

export interface WebinarCodeValidationRequest {
  code: string;
  applicantId: string;
}

export interface WebinarCodeValidationResponse {
  isValid: boolean;
  webinar?: Webinar;
  message?: string;
}