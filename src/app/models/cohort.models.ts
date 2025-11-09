import { Webinar } from './webinar.models';

export interface Cohort {
  id?: string;
  programStartDate: Date;
  programEndDate: Date;
  applicationStartDate: Date;
  applicationEndDate: Date;
  name: string;
  description?: string;
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
  webinars?: Partial<Webinar>[];
}

export interface CohortUpdateRequest {
  programStartDate?: Date;
  programEndDate?: Date;
  applicationStartDate?: Date;
  applicationEndDate?: Date;
  name?: string;
  description?: string;
  currentApplicantCount?: number;
  isActive?: boolean;
  webinars?: Partial<Webinar>[];
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