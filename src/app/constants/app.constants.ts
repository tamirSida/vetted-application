export const APP_CONSTANTS = {
  // Phase Constants
  PHASES: {
    SIGNUP: 'SIGNUP',
    WEBINAR: 'WEBINAR',
    IN_DEPTH_APPLICATION: 'IN_DEPTH_APPLICATION',
    INTERVIEW: 'INTERVIEW',
    ACCEPTED: 'ACCEPTED'
  },

  // User Role Constants
  USER_ROLES: {
    ADMIN: 'ADMIN',
    VIEWER: 'VIEWER',
    APPLICANT: 'APPLICANT'
  },

  // Webinar Constants
  WEBINAR: {
    CODE_LENGTH: 6,
    CODE_CHARACTERS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  },

  // Validation Constants
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_NAME_LENGTH: 100,
    MAX_EMAIL_LENGTH: 255
  },

  // Date/Time Constants
  DATETIME: {
    TIMEZONE: {
      INPUT: 'America/New_York', // ET
      STORAGE: 'UTC'
    }
  },

  // Firebase Collections
  COLLECTIONS: {
    USERS: 'users',
    ADMIN_USERS: 'admin_users',
    VIEWER_USERS: 'viewer_users',
    APPLICANT_USERS: 'applicant_users',
    COHORTS: 'cohorts',
    APPLICATIONS: 'applications',
    PHASE1_APPLICATIONS: 'phase1_applications',
    PHASE2_APPLICATIONS: 'phase2_applications',
    WEBINARS: 'webinars',
    SETTINGS: 'settings'
  },

  // UI Constants
  UI: {
    MOBILE_BREAKPOINT: 768,
    TABLET_BREAKPOINT: 1024,
    DESKTOP_BREAKPOINT: 1200
  },

  // Error Messages
  ERROR_MESSAGES: {
    UNAUTHORIZED: 'You are not authorized to access this resource',
    INVALID_CREDENTIALS: 'Invalid email or password',
    USER_NOT_FOUND: 'User not found',
    EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
    INVALID_WEBINAR_CODE: 'Invalid webinar code',
    COHORT_OVERLAP: 'Cannot create overlapping cohorts',
    PHASE_PROGRESSION_ERROR: 'Cannot advance to this phase'
  },

  // Success Messages
  SUCCESS_MESSAGES: {
    USER_CREATED: 'User account created successfully',
    PROFILE_UPDATED: 'Profile updated successfully',
    WEBINAR_ATTENDED: 'Webinar attendance recorded successfully',
    PHASE_ADVANCED: 'Successfully advanced to next phase'
  }
} as const;

export type PhaseType = typeof APP_CONSTANTS.PHASES[keyof typeof APP_CONSTANTS.PHASES];
export type UserRoleType = typeof APP_CONSTANTS.USER_ROLES[keyof typeof APP_CONSTANTS.USER_ROLES];