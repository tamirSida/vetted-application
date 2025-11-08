import { Injectable, inject } from '@angular/core';
import { Firestore, doc, updateDoc, getDoc } from '@angular/fire/firestore';
import { Phase, ApplicantUser, AdminUser } from '../models';
import { AuthService } from './auth.service';
import { WebinarService } from './webinar.service';
import { APP_CONSTANTS } from '../constants';

@Injectable({
  providedIn: 'root'
})
export class PhaseProgressionService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private webinarService = inject(WebinarService);

  async advanceApplicantPhase(applicantId: string, targetPhase: Phase, adminOverride: boolean = false): Promise<void> {
    try {
      const applicant = await this.getApplicantById(applicantId);
      if (!applicant) {
        throw new Error('Applicant not found');
      }

      // Check if user has permission to advance phases
      if (!adminOverride && !this.canAdvancePhase(applicant, targetPhase)) {
        throw new Error('Cannot advance to target phase - prerequisites not met');
      }

      // Admin override check
      if (adminOverride) {
        const currentUser = this.authService.getCurrentUser();
        if (!currentUser || !this.authService.canWrite()) {
          throw new Error('Admin override requires write permissions');
        }
      }

      // Validate phase progression rules
      if (!adminOverride) {
        this.validatePhaseProgression(applicant.phase, targetPhase);
      }

      // Update applicant phase
      await this.updateApplicantPhase(applicantId, targetPhase);

    } catch (error) {
      console.error('Error advancing applicant phase:', error);
      throw error;
    }
  }

  async processWebinarCodeValidation(applicantId: string, webinarCode: string): Promise<void> {
    try {
      // Validate webinar code format
      if (!this.webinarService.isValidCodeFormat(webinarCode)) {
        throw new Error('Invalid webinar code format');
      }

      // Get applicant
      const applicant = await this.getApplicantById(applicantId);
      if (!applicant) {
        throw new Error('Applicant not found');
      }

      // Check if applicant is in correct phase for webinar attendance
      if (applicant.phase !== Phase.WEBINAR) {
        throw new Error('Applicant is not in webinar phase');
      }

      // Validate webinar code
      const validationResult = await this.webinarService.validateWebinarCode({
        code: webinarCode,
        applicantId
      });

      if (!validationResult.isValid) {
        throw new Error(validationResult.message || 'Invalid webinar code');
      }

      if (!validationResult.webinar) {
        throw new Error('Webinar not found');
      }

      // Record webinar attendance and advance phase
      await this.webinarService.recordWebinarAttendance(applicantId, validationResult.webinar);

      // Phase advancement is handled in the webinar service recordWebinarAttendance method
      // No need to call advanceApplicantPhase here as it's automatically updated

    } catch (error) {
      console.error('Error processing webinar code validation:', error);
      throw error;
    }
  }

  async moveToInterviewPhase(applicantId: string, interviewerId?: string): Promise<void> {
    try {
      const applicant = await this.getApplicantById(applicantId);
      if (!applicant) {
        throw new Error('Applicant not found');
      }

      // Check if applicant is eligible for interview
      if (applicant.phase !== Phase.IN_DEPTH_APPLICATION) {
        throw new Error('Applicant must complete in-depth application before interview');
      }

      // Update applicant with interview phase and optional interviewer
      const updates: any = {
        phase: Phase.INTERVIEW,
        updatedAt: new Date()
      };

      if (interviewerId) {
        // Verify interviewer is an active admin
        const interviewer = await this.getAdminById(interviewerId);
        if (!interviewer || !interviewer.isActive) {
          throw new Error('Invalid or inactive interviewer');
        }
        updates.interviewerId = interviewerId;
      }

      const applicantRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.APPLICANT_USERS, applicantId);
      await updateDoc(applicantRef, updates);

    } catch (error) {
      console.error('Error moving to interview phase:', error);
      throw error;
    }
  }

  async acceptApplicant(applicantId: string): Promise<void> {
    try {
      const applicant = await this.getApplicantById(applicantId);
      if (!applicant) {
        throw new Error('Applicant not found');
      }

      // Check if user can accept applicants
      if (!this.authService.canWrite()) {
        throw new Error('Insufficient permissions to accept applicant');
      }

      // Update applicant status
      const applicantRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.APPLICANT_USERS, applicantId);
      await updateDoc(applicantRef, {
        phase: Phase.ACCEPTED,
        isAccepted: true,
        updatedAt: new Date()
      });

    } catch (error) {
      console.error('Error accepting applicant:', error);
      throw error;
    }
  }

  async rejectApplicant(applicantId: string, reason?: string): Promise<void> {
    try {
      const applicant = await this.getApplicantById(applicantId);
      if (!applicant) {
        throw new Error('Applicant not found');
      }

      // Check if user can reject applicants
      if (!this.authService.canWrite()) {
        throw new Error('Insufficient permissions to reject applicant');
      }

      // Update applicant status
      const updates: any = {
        isAccepted: false,
        updatedAt: new Date()
      };

      if (reason) {
        updates.rejectionReason = reason;
      }

      const applicantRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.APPLICANT_USERS, applicantId);
      await updateDoc(applicantRef, updates);

    } catch (error) {
      console.error('Error rejecting applicant:', error);
      throw error;
    }
  }

  private canAdvancePhase(applicant: ApplicantUser, targetPhase: Phase): boolean {
    switch (targetPhase) {
      case Phase.WEBINAR:
        return applicant.phase === Phase.SIGNUP;
      
      case Phase.IN_DEPTH_APPLICATION:
        return applicant.phase === Phase.WEBINAR && applicant.webinarAttended !== null;
      
      case Phase.INTERVIEW:
        return applicant.phase === Phase.IN_DEPTH_APPLICATION;
      
      case Phase.ACCEPTED:
        return applicant.phase === Phase.INTERVIEW;
      
      default:
        return false;
    }
  }

  private validatePhaseProgression(currentPhase: Phase, targetPhase: Phase): void {
    const phaseOrder = [
      Phase.SIGNUP,
      Phase.WEBINAR,
      Phase.IN_DEPTH_APPLICATION,
      Phase.INTERVIEW,
      Phase.ACCEPTED
    ];

    const currentIndex = phaseOrder.indexOf(currentPhase);
    const targetIndex = phaseOrder.indexOf(targetPhase);

    if (currentIndex === -1 || targetIndex === -1) {
      throw new Error('Invalid phase specified');
    }

    if (targetIndex <= currentIndex) {
      throw new Error('Cannot move to a previous or same phase');
    }

    if (targetIndex > currentIndex + 1) {
      throw new Error('Cannot skip phases - must progress sequentially');
    }
  }

  private async updateApplicantPhase(applicantId: string, phase: Phase): Promise<void> {
    const applicantRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.APPLICANT_USERS, applicantId);
    await updateDoc(applicantRef, {
      phase,
      updatedAt: new Date()
    });
  }

  private async getApplicantById(applicantId: string): Promise<ApplicantUser | null> {
    try {
      const applicantRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.APPLICANT_USERS, applicantId);
      const applicantSnap = await getDoc(applicantRef);
      
      if (applicantSnap.exists()) {
        return applicantSnap.data() as ApplicantUser;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting applicant by ID:', error);
      return null;
    }
  }

  private async getAdminById(adminId: string): Promise<AdminUser | null> {
    try {
      const adminRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.ADMIN_USERS, adminId);
      const adminSnap = await getDoc(adminRef);
      
      if (adminSnap.exists()) {
        return adminSnap.data() as AdminUser;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting admin by ID:', error);
      return null;
    }
  }

  // Utility methods
  getNextPhase(currentPhase: Phase): Phase | null {
    switch (currentPhase) {
      case Phase.SIGNUP:
        return Phase.WEBINAR;
      case Phase.WEBINAR:
        return Phase.IN_DEPTH_APPLICATION;
      case Phase.IN_DEPTH_APPLICATION:
        return Phase.INTERVIEW;
      case Phase.INTERVIEW:
        return Phase.ACCEPTED;
      default:
        return null;
    }
  }

  getPreviousPhase(currentPhase: Phase): Phase | null {
    switch (currentPhase) {
      case Phase.WEBINAR:
        return Phase.SIGNUP;
      case Phase.IN_DEPTH_APPLICATION:
        return Phase.WEBINAR;
      case Phase.INTERVIEW:
        return Phase.IN_DEPTH_APPLICATION;
      case Phase.ACCEPTED:
        return Phase.INTERVIEW;
      default:
        return null;
    }
  }

  getPhaseDisplayName(phase: Phase): string {
    switch (phase) {
      case Phase.SIGNUP:
        return 'Initial Sign Up';
      case Phase.WEBINAR:
        return 'Webinar Attendance';
      case Phase.IN_DEPTH_APPLICATION:
        return 'In-Depth Application';
      case Phase.INTERVIEW:
        return 'Interview';
      case Phase.ACCEPTED:
        return 'Accepted';
      default:
        return 'Unknown Phase';
    }
  }

  getPhaseDescription(phase: Phase): string {
    switch (phase) {
      case Phase.SIGNUP:
        return 'Complete your initial application and profile setup';
      case Phase.WEBINAR:
        return 'Attend the required webinar and enter the attendance code';
      case Phase.IN_DEPTH_APPLICATION:
        return 'Complete the detailed application with essays and technical assessment';
      case Phase.INTERVIEW:
        return 'Participate in the interview process';
      case Phase.ACCEPTED:
        return 'Congratulations! You have been accepted into the program';
      default:
        return 'Phase information not available';
    }
  }
}