import { Injectable } from '@angular/core';
import { ApplicationStatus } from '../models/enums';

export interface StatusMessage {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actionRequired?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StatusMessageService {

  getApplicantMessage(status: ApplicationStatus, interviewDate?: Date | string): StatusMessage {
    switch (status) {
      case ApplicationStatus.PHASE_1:
        return {
          title: 'Thank you for signing up!',
          message: 'Thanks for signing up! We are reviewing your application.',
          type: 'info',
          actionRequired: false
        };

      case ApplicationStatus.PHASE_2:
        return {
          title: 'Please attend a webinar',
          message: 'Please attend one of our upcoming webinars to continue with your application.',
          type: 'warning',
          actionRequired: true
        };

      case ApplicationStatus.PHASE_3:
        return {
          title: 'Please fill out our application',
          message: 'After submitting your webinar password, please fill out our in-depth application.',
          type: 'warning',
          actionRequired: true
        };

      case ApplicationStatus.PHASE_3_IN_PROGRESS:
        return {
          title: 'Please finish submitting your application',
          message: 'Your application is in progress. Please complete and submit it.',
          type: 'warning',
          actionRequired: true
        };

      case ApplicationStatus.PHASE_3_SUBMITTED:
        return {
          title: 'Thanks for submitting!',
          message: 'Thanks for submitting! We are reviewing your application.',
          type: 'info',
          actionRequired: false
        };

      case ApplicationStatus.PHASE_3_REJECTED:
        return {
          title: 'Application Update',
          message: 'Sorry, we won\'t be continuing with your application at this time.',
          type: 'error',
          actionRequired: false
        };

      case ApplicationStatus.PHASE_4:
        return {
          title: 'Interview Invitation',
          message: 'We liked your application! Let\'s schedule an interview.',
          type: 'success',
          actionRequired: true
        };

      case ApplicationStatus.PHASE_4_INTERVIEW_SCHEDULED:
        const dateStr = interviewDate 
          ? new Date(interviewDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          : 'your scheduled date';
        return {
          title: 'Interview Scheduled',
          message: `Can't wait to see you at ${dateStr}!`,
          type: 'success',
          actionRequired: false
        };

      case ApplicationStatus.PHASE_4_POST_INTERVIEW:
        return {
          title: 'Interview Complete',
          message: 'We will be in touch soon with next steps.',
          type: 'info',
          actionRequired: false
        };

      case ApplicationStatus.PHASE_4_REJECTED:
        return {
          title: 'Application Update',
          message: 'Sorry, we think you have potential but won\'t be moving forward at this time.',
          type: 'error',
          actionRequired: false
        };

      case ApplicationStatus.ACCEPTED:
        return {
          title: 'Congratulations!',
          message: 'Congratulations! You\'ve been accepted into the program!',
          type: 'success',
          actionRequired: false
        };

      default:
        return {
          title: 'Application Status',
          message: 'Your application is being processed.',
          type: 'info',
          actionRequired: false
        };
    }
  }

  getAdminDisplayName(status: ApplicationStatus): string {
    const statusNames = {
      [ApplicationStatus.PHASE_1]: 'Phase 1',
      [ApplicationStatus.PHASE_2]: 'Phase 2',
      [ApplicationStatus.PHASE_3]: 'Phase 3',
      [ApplicationStatus.PHASE_3_IN_PROGRESS]: 'Phase 3 In Progress',
      [ApplicationStatus.PHASE_3_SUBMITTED]: 'Phase 3 Submitted',
      [ApplicationStatus.PHASE_3_REJECTED]: 'Phase 3 Rejected',
      [ApplicationStatus.PHASE_4]: 'Phase 4 (Interview)',
      [ApplicationStatus.PHASE_4_INTERVIEW_SCHEDULED]: 'Phase 4 Interview Scheduled',
      [ApplicationStatus.PHASE_4_POST_INTERVIEW]: 'Phase 4 Post Interview',
      [ApplicationStatus.PHASE_4_REJECTED]: 'Phase 4 Rejected',
      [ApplicationStatus.ACCEPTED]: 'Accepted'
    };
    return statusNames[status] || status;
  }
}