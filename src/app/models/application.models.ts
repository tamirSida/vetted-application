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
    role: string;
    founderCount: number;
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

export interface EquityBreakdownRow {
  id: string;
  name: string;
  shares: number;
  percentage: number;
  isCalculated?: boolean; // for total rows
  category: 'founder' | 'employee' | 'investor' | 'total' | 'grandTotal';
}

export interface Phase3Application extends BaseApplication {
  phase: Phase.IN_DEPTH_APPLICATION;
  
  // Part 1: Product & Traction
  productInfo: {
    productStage: 'LIVE_PAYING' | 'LIVE_BETA' | 'MVP' | 'IDEA_STAGE';
    tractionDetails: string; // max 300 words
    problemCustomer: string; // max 300 words - yellow flag for LLM analysis
    videoPitch: string; // URL
  };

  // Part 2: Team
  teamInfo: {
    coFounders: string; // max 300 words
    capacity: 'ALL_FULLTIME' | 'OTHER';
    capacityOther?: string; // conditional
    hasPreviousCollaboration: boolean; // Yes/No question
    previousCollaboration?: string; // conditional, max 300 words
    previousFounders: boolean; // yellow flag
    previousFoundersExplanation?: string; // conditional, max 300 words
    equitySplitRoles: string; // max 300 words
    additionalTeamMembers?: string; // max 300 words, optional
  };

  // Part 3: Funding
  fundingInfo: {
    hasRaisedCapital: boolean;
    fundingDetails?: string; // conditional, max 300 words
    equityBreakdown: EquityBreakdownRow[];
  };

  // Part 4: Legal & Corporate
  legalInfo: {
    isIncorporated: boolean;
    incorporationLocation?: string; // conditional - required if incorporated
    hasIpAssignment?: boolean; // conditional - only for incorporated companies
    hasFounderVesting?: boolean; // conditional - only for incorporated companies
    hasBoardStructure?: boolean; // conditional - only for incorporated companies
    willAmendDocuments?: boolean; // conditional - only for incorporated companies
    amendDocumentsExplanation?: string; // conditional - required if willAmendDocuments is false
    agreesToIncorporate?: 'AGREE' | 'DISCUSS'; // conditional - required if not incorporated
  };

  // LLM Analysis (OpenAI GPT-5-mini)
  llmAnalysis?: {
    problemCustomerScore: number;
    isSpecific: boolean;
    hasClearTarget: boolean;
    hasDefinedProblem: boolean;
    feedback: string;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    tokenUsage?: {
      input_tokens: number;
      output_tokens: number;
      reasoning_tokens?: number;
      total_tokens: number;
    };
    analyzedAt: Date;
    gradingModel: string;
    processing?: boolean; // For loading state
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
  productInfo?: Phase3Application['productInfo'];
  teamInfo?: Phase3Application['teamInfo'];
  fundingInfo?: Phase3Application['fundingInfo'];
  legalInfo?: Phase3Application['legalInfo'];
  llmAnalysis?: Phase3Application['llmAnalysis'];
}