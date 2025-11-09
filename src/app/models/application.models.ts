import { Phase, ServiceCountry } from './enums';

export interface BaseApplication {
  id?: string;
  applicantId: string;
  cohortId: string;
  phase: Phase;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewerId?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'COMPLETED' | 'REJECTED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Phase1Application extends BaseApplication {
  phase: Phase.SIGNUP;
  // Page 1 - Company & Personal Info
  companyInfo: {
    companyName: string;
    companyWebsite?: string;
    role: string;
    isFounder: boolean;
  };
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    confirmEmail: string;
    password: string;
    confirmPassword: string;
    phone: string;
  };
  // Page 2 - Extended Application
  extendedInfo: {
    linkedInProfile: string; // max 300 chars
    serviceHistory: {
      country: ServiceCountry;
      unit: string; // max 300 chars - text input, not dropdown
    };
    grandmaTest: string; // max 300 chars - One sentence company description
    pitchDeck?: {
      fileUrl?: string;
      fileName?: string;
      nodeckExplanation?: string; // max 300 chars
    };
    discovery: string; // max 300 chars - How did you hear about Vetted
    timeCommitment: boolean; // Can commit 100%
    selectedWebinarSessions: string[]; // Selected webinar IDs
  };
}

export interface Phase2Application extends BaseApplication {
  phase: Phase.WEBINAR;
  webinarFeedback: {
    rating: number;
    feedback: string;
    keyTakeaways: string[];
    questions?: string[];
  };
  commitmentLevel: {
    timeCommitment: string;
    priorityLevel: number;
    supportSystem: string;
  };
}

export interface Phase3Application extends BaseApplication {
  phase: Phase.IN_DEPTH_APPLICATION;
  technicalAssessment: {
    portfolioLinks: string[];
    githubProfile?: string;
    codeExamples: {
      title: string;
      description: string;
      technologies: string[];
      link: string;
    }[];
  };
  essayQuestions: {
    questionId: string;
    question: string;
    answer: string;
    wordCount: number;
  }[];
  llmGrading?: {
    score: number;
    feedback: string;
    gradedAt: Date;
    gradingModel: string;
  };
}

export type Application = Phase1Application | Phase2Application | Phase3Application;

export interface ApplicationCreateRequest {
  applicantId: string;
  cohortId: string;
  phase: Phase;
}

export interface ApplicationUpdateRequest {
  status?: BaseApplication['status'];
  notes?: string;
  reviewerId?: string;
  companyInfo?: Phase1Application['companyInfo'];
  personalInfo?: Phase1Application['personalInfo'];
  extendedInfo?: Phase1Application['extendedInfo'];
  webinarFeedback?: Phase2Application['webinarFeedback'];
  commitmentLevel?: Phase2Application['commitmentLevel'];
  technicalAssessment?: Phase3Application['technicalAssessment'];
  essayQuestions?: Phase3Application['essayQuestions'];
}