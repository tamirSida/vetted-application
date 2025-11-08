import { Phase } from './enums';

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
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    linkedIn?: string;
    location: string;
  };
  backgroundInfo: {
    currentRole?: string;
    company?: string;
    experience: string;
    education: string;
    skills: string[];
  };
  motivation: {
    whyApplying: string;
    goals: string;
    availability: string;
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
  personalInfo?: Phase1Application['personalInfo'];
  backgroundInfo?: Phase1Application['backgroundInfo'];
  motivation?: Phase1Application['motivation'];
  webinarFeedback?: Phase2Application['webinarFeedback'];
  commitmentLevel?: Phase2Application['commitmentLevel'];
  technicalAssessment?: Phase3Application['technicalAssessment'];
  essayQuestions?: Phase3Application['essayQuestions'];
}