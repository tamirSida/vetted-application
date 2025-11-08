import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, addDoc } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { Webinar, WebinarCreateRequest, WebinarCodeValidationRequest, WebinarCodeValidationResponse, WebinarAttendanceRecord } from '../models/webinar.models';
import { ApplicantUser, Phase } from '../models';
import { APP_CONSTANTS } from '../constants';

@Injectable({
  providedIn: 'root'
})
export class WebinarService {
  private firestore = inject(Firestore);

  async createWebinar(webinarRequest: WebinarCreateRequest): Promise<Webinar> {
    try {
      // Get next webinar number for the cohort
      const webinarNum = await this.getNextWebinarNumber(webinarRequest.cohortId);
      
      // Generate unique 6-character code
      const code = await this.generateUniqueWebinarCode();
      
      const webinar: Webinar = {
        num: webinarNum,
        link: webinarRequest.link,
        timestamp: webinarRequest.timestamp,
        code,
        cohortId: webinarRequest.cohortId,
        title: webinarRequest.title,
        description: webinarRequest.description,
        maxAttendees: webinarRequest.maxAttendees,
        attendeeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const webinarRef = await addDoc(collection(this.firestore, APP_CONSTANTS.COLLECTIONS.WEBINARS), webinar);
      const createdWebinar = { ...webinar, id: webinarRef.id };

      return createdWebinar;
    } catch (error) {
      console.error('Error creating webinar:', error);
      throw error;
    }
  }

  async validateWebinarCode(validationRequest: WebinarCodeValidationRequest): Promise<WebinarCodeValidationResponse> {
    try {
      // Find webinar with the provided code
      const webinar = await this.findWebinarByCode(validationRequest.code);
      
      if (!webinar) {
        return {
          isValid: false,
          message: APP_CONSTANTS.ERROR_MESSAGES.INVALID_WEBINAR_CODE
        };
      }

      // Check if webinar has already passed
      if (new Date() < webinar.timestamp) {
        return {
          isValid: false,
          message: 'Webinar has not started yet'
        };
      }

      // Check if too much time has passed (e.g., more than 24 hours after webinar)
      const maxValidTime = new Date(webinar.timestamp.getTime() + (24 * 60 * 60 * 1000)); // 24 hours after webinar
      if (new Date() > maxValidTime) {
        return {
          isValid: false,
          message: 'Webinar code has expired'
        };
      }

      // Check if user already attended this or any other webinar
      const hasAttended = await this.checkUserAttendance(validationRequest.applicantId);
      if (hasAttended) {
        return {
          isValid: false,
          message: 'You have already attended a webinar'
        };
      }

      return {
        isValid: true,
        webinar,
        message: APP_CONSTANTS.SUCCESS_MESSAGES.WEBINAR_ATTENDED
      };
    } catch (error) {
      console.error('Error validating webinar code:', error);
      throw error;
    }
  }

  async recordWebinarAttendance(applicantId: string, webinar: Webinar): Promise<void> {
    try {
      // Create attendance record
      const attendanceRecord: WebinarAttendanceRecord = {
        webinarId: webinar.id!,
        applicantId,
        attendedAt: new Date()
      };

      await addDoc(collection(this.firestore, 'webinar_attendance'), attendanceRecord);

      // Update webinar attendee count
      if (webinar.id) {
        const webinarRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.WEBINARS, webinar.id);
        await updateDoc(webinarRef, {
          attendeeCount: (webinar.attendeeCount || 0) + 1,
          updatedAt: new Date()
        });
      }

      // Update applicant user with webinar attendance
      await this.updateApplicantWebinarAttendance(applicantId, webinar.num);
      
    } catch (error) {
      console.error('Error recording webinar attendance:', error);
      throw error;
    }
  }

  private async updateApplicantWebinarAttendance(applicantId: string, webinarNum: number): Promise<void> {
    try {
      const applicantRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.APPLICANT_USERS, applicantId);
      await updateDoc(applicantRef, {
        webinarAttended: webinarNum,
        phase: Phase.IN_DEPTH_APPLICATION,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating applicant webinar attendance:', error);
      throw error;
    }
  }

  private async getNextWebinarNumber(cohortId: string): Promise<number> {
    try {
      const webinarsQuery = query(
        collection(this.firestore, APP_CONSTANTS.COLLECTIONS.WEBINARS),
        where('cohortId', '==', cohortId)
      );
      
      const querySnapshot = await getDocs(webinarsQuery);
      
      if (querySnapshot.empty) {
        return 1;
      }
      
      let maxNum = 0;
      querySnapshot.forEach((doc) => {
        const webinar = doc.data() as Webinar;
        if (webinar.num > maxNum) {
          maxNum = webinar.num;
        }
      });
      
      return maxNum + 1;
    } catch (error) {
      console.error('Error getting next webinar number:', error);
      throw error;
    }
  }

  private async generateUniqueWebinarCode(): Promise<string> {
    let isUnique = false;
    let code = '';
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      code = this.generateRandomCode();
      isUnique = await this.isCodeUnique(code);
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Unable to generate unique webinar code after maximum attempts');
    }

    return code;
  }

  private generateRandomCode(): string {
    const characters = APP_CONSTANTS.WEBINAR.CODE_CHARACTERS;
    let result = '';
    
    for (let i = 0; i < APP_CONSTANTS.WEBINAR.CODE_LENGTH; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }

  private async isCodeUnique(code: string): Promise<boolean> {
    try {
      const webinarsQuery = query(
        collection(this.firestore, APP_CONSTANTS.COLLECTIONS.WEBINARS),
        where('code', '==', code)
      );
      
      const querySnapshot = await getDocs(webinarsQuery);
      return querySnapshot.empty;
    } catch (error) {
      console.error('Error checking code uniqueness:', error);
      return false;
    }
  }

  private async findWebinarByCode(code: string): Promise<Webinar | null> {
    try {
      const webinarsQuery = query(
        collection(this.firestore, APP_CONSTANTS.COLLECTIONS.WEBINARS),
        where('code', '==', code.toUpperCase())
      );
      
      const querySnapshot = await getDocs(webinarsQuery);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Webinar;
    } catch (error) {
      console.error('Error finding webinar by code:', error);
      return null;
    }
  }

  private async checkUserAttendance(applicantId: string): Promise<boolean> {
    try {
      const attendanceQuery = query(
        collection(this.firestore, 'webinar_attendance'),
        where('applicantId', '==', applicantId)
      );
      
      const querySnapshot = await getDocs(attendanceQuery);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking user attendance:', error);
      return false;
    }
  }

  async getWebinarsForCohort(cohortId: string): Promise<Webinar[]> {
    try {
      const webinarsQuery = query(
        collection(this.firestore, APP_CONSTANTS.COLLECTIONS.WEBINARS),
        where('cohortId', '==', cohortId)
      );
      
      const querySnapshot = await getDocs(webinarsQuery);
      const webinars: Webinar[] = [];
      
      querySnapshot.forEach((doc) => {
        webinars.push({ id: doc.id, ...doc.data() } as Webinar);
      });
      
      // Sort by webinar number
      return webinars.sort((a, b) => a.num - b.num);
    } catch (error) {
      console.error('Error getting webinars for cohort:', error);
      throw error;
    }
  }

  async getWebinarById(webinarId: string): Promise<Webinar | null> {
    try {
      const webinarRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.WEBINARS, webinarId);
      const webinarSnap = await getDoc(webinarRef);
      
      if (webinarSnap.exists()) {
        return { id: webinarSnap.id, ...webinarSnap.data() } as Webinar;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting webinar by ID:', error);
      throw error;
    }
  }

  async updateWebinar(webinarId: string, updates: Partial<Webinar>): Promise<void> {
    try {
      const webinarRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.WEBINARS, webinarId);
      await updateDoc(webinarRef, {
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating webinar:', error);
      throw error;
    }
  }

  async deleteWebinar(webinarId: string): Promise<void> {
    try {
      // Note: In a real application, you might want to soft delete or check for dependencies
      const webinarRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.WEBINARS, webinarId);
      await updateDoc(webinarRef, {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error deleting webinar:', error);
      throw error;
    }
  }

  // Utility method to check if a webinar code is valid format
  isValidCodeFormat(code: string): boolean {
    if (!code || code.length !== APP_CONSTANTS.WEBINAR.CODE_LENGTH) {
      return false;
    }
    
    const validCharacters = APP_CONSTANTS.WEBINAR.CODE_CHARACTERS;
    return code.split('').every(char => validCharacters.includes(char.toUpperCase()));
  }
}