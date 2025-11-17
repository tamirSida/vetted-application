export const EMAIL_CONSTANTS = {
  // Application dashboard URL
  APPLICANT_DASHBOARD_URL: 'http://localhost:4200/dashboard',
  
  // Email subject templates
  SUBJECTS: {
    PHASE1: {
      APPROVED: 'Vetted: Your Accelerator Application Dashboard',
      REJECTED: 'Vetted: Your Accelerator Application'
    },
    PHASE3: {
      SUBMITTED: 'Vetted Accelerator Application Confirmation',
      APPROVED: 'Interview Invite for the Vetted Accelerator Program'
    }
  },
  
  // Common email signatures
  SIGNATURE: {
    STANDARD: `Best regards,

The Vetted Team`
  }
} as const;