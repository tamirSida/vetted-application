import { Webinar } from './webinar.models';

export interface Cohort {
  id?: string;
  programStartDate: Date;
  programEndDate: Date;
  applicationStartDate: Date;
  applicationEndDate: Date;
  name: string;
  description?: string;
  maxApplicants?: number;
  currentApplicantCount?: number;
  isActive: boolean;
  webinars: Webinar[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CohortCreateRequest {
  programStartDate: Date;
  programEndDate: Date;
  applicationStartDate: Date;
  applicationEndDate: Date;
  name: string;
  description?: string;
  maxApplicants?: number;
}

export interface CohortUpdateRequest {
  programStartDate?: Date;
  programEndDate?: Date;
  applicationStartDate?: Date;
  applicationEndDate?: Date;
  name?: string;
  description?: string;
  maxApplicants?: number;
  isActive?: boolean;
}

export interface CohortValidationError {
  field: string;
  message: string;
}

export interface CohortOverlapCheck {
  hasOverlap: boolean;
  overlappingCohorts?: Cohort[];
  errors?: CohortValidationError[];
}