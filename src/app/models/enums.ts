export enum Phase {
  SIGNUP = 'SIGNUP',
  WEBINAR = 'WEBINAR',
  IN_DEPTH_APPLICATION = 'IN_DEPTH_APPLICATION',
  INTERVIEW = 'INTERVIEW',
  ACCEPTED = 'ACCEPTED'
}

export enum ApplicationStatus {
  // Phase 1 statuses
  PHASE_1 = 'PHASE_1',
  
  // Phase 2 statuses
  PHASE_2 = 'PHASE_2',
  
  // Phase 3 statuses
  PHASE_3 = 'PHASE_3',
  PHASE_3_IN_PROGRESS = 'PHASE_3_IN_PROGRESS',
  PHASE_3_SUBMITTED = 'PHASE_3_SUBMITTED',
  PHASE_3_REJECTED = 'PHASE_3_REJECTED',
  
  // Phase 4 statuses
  PHASE_4 = 'PHASE_4',
  PHASE_4_INTERVIEW_SCHEDULED = 'PHASE_4_INTERVIEW_SCHEDULED',
  PHASE_4_POST_INTERVIEW = 'PHASE_4_POST_INTERVIEW',
  PHASE_4_REJECTED = 'PHASE_4_REJECTED',
  
  // Final status
  ACCEPTED = 'ACCEPTED'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
  APPLICANT = 'APPLICANT'
}

export enum ServiceCountry {
  USA = 'USA',
  ISRAEL = 'Israel',
  OTHER = 'Other'
}

