import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, addDoc } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { Webinar, WebinarCreateRequest, WebinarCodeValidationRequest, WebinarCodeValidationResponse, WebinarAttendanceRecord } from '../models/webinar.models';
import { ApplicantUser, Phase, ApplicationStatus } from '../models';
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
      console.log('=== WEBINAR CODE VALIDATION DEBUG ===');
      console.log('Input request:', validationRequest);
      console.log('Code to validate:', `"${validationRequest.code}"`);
      console.log('Code length:', validationRequest.code?.length);
      console.log('ApplicantId:', validationRequest.applicantId);
      
      // Validate input
      if (!validationRequest.code || !validationRequest.code.trim()) {
        console.log('❌ Code validation failed: empty or missing');
        return {
          isValid: false,
          message: 'Webinar code is required'
        };
      }

      if (!validationRequest.applicantId) {
        console.log('❌ ApplicantId validation failed: missing');
        return {
          isValid: false,
          message: 'Applicant ID is required'
        };
      }

      // Find webinar with the provided code
      console.log('🔍 Searching for webinar with code:', validationRequest.code);
      const webinar = await this.findWebinarByCode(validationRequest.code);
      
      if (!webinar) {
        console.log('❌ Webinar not found in database');
        console.log('📊 Let me check what webinars exist...');
        await this.debugListAllWebinars();
        return {
          isValid: false,
          message: APP_CONSTANTS.ERROR_MESSAGES.INVALID_WEBINAR_CODE
        };
      }
      
      console.log('✅ Webinar found:', webinar);

      // Check if user already attended this or any other webinar
      const hasAttended = await this.checkUserAttendance(validationRequest.applicantId);
      if (hasAttended) {
        console.log('❌ User has already attended a webinar');
        return {
          isValid: false,
          message: 'You have already attended a webinar'
        };
      }

      console.log('✅ All validations passed - code is valid');
      
      // Record the webinar attendance
      console.log('📝 Recording webinar attendance...');
      await this.recordWebinarAttendance(validationRequest.applicantId, webinar);
      
      // Promote user to Phase 3
      console.log('🚀 Promoting user to Phase 3...');
      await this.promoteUserToPhase3(validationRequest.applicantId, webinar);
      
      console.log('✅ User successfully promoted to Phase 3');
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

  // Debug method to list all webinars
  private async debugListAllWebinars(): Promise<void> {
    try {
      console.log('🔍 DEBUG: Listing all webinars in cohorts...');
      const cohortsRef = collection(this.firestore, APP_CONSTANTS.COLLECTIONS.COHORTS);
      const snapshot = await getDocs(cohortsRef);
      
      if (snapshot.empty) {
        console.log('📭 No cohorts found in database');
        return;
      }

      console.log(`📊 Found ${snapshot.size} cohort(s):`);
      let totalWebinars = 0;
      
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const webinars = data['webinars'] || [];
        totalWebinars += webinars.length;
        
        console.log(`${index + 1}. Cohort ID: ${doc.id}`);
        console.log(`   Name: ${data['name'] || 'No name'}`);
        console.log(`   Webinars: ${webinars.length}`);
        
        webinars.forEach((webinar: any, webinarIndex: number) => {
          console.log(`   Webinar ${webinarIndex + 1}:`);
          console.log(`     Code: "${webinar.code}" (length: ${webinar.code?.length})`);
          console.log(`     Num: ${webinar.num}`);
          console.log(`     Link: ${webinar.link}`);
          console.log(`     Timestamp: ${webinar.timestamp?.toDate?.() || webinar.timestamp}`);
        });
        console.log('---');
      });
      
      console.log(`📊 Total webinars across all cohorts: ${totalWebinars}`);
    } catch (error) {
      console.error('Error listing webinars:', error);
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
      console.log('✅ Attendance record created successfully');

      // Note: Webinars are stored as objects in cohort documents, not as separate documents
      // So we skip updating the webinar attendee count for now
      console.log('ℹ️ Skipping webinar attendee count update (stored in cohort document)');

      // Update applicant user with webinar attendance
      console.log('📝 Updating applicant webinar attendance...');
      await this.updateApplicantWebinarAttendance(applicantId, webinar.num);
      console.log('✅ Applicant attendance updated successfully');
      
    } catch (error) {
      console.error('Error recording webinar attendance:', error);
      throw error;
    }
  }

  private async updateApplicantWebinarAttendance(applicantId: string, webinarNum: number): Promise<void> {
    try {
      console.log('📝 Updating user in users collection:', applicantId);
      const applicantRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.USERS, applicantId);
      await updateDoc(applicantRef, {
        webinarAttended: webinarNum,
        phase: Phase.IN_DEPTH_APPLICATION,
        updatedAt: new Date()
      });
      console.log('✅ User webinar attendance updated successfully');
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
      // Validate code parameter
      if (!code || typeof code !== 'string') {
        console.error('Invalid webinar code provided:', code);
        return null;
      }

      const normalizedCode = code.toUpperCase().trim();
      console.log('🔍 Searching for webinar code:', `"${normalizedCode}"`);
      console.log('🏪 Searching in cohorts collection for webinars array...');

      // Get all cohorts and search their webinars arrays
      const cohortsRef = collection(this.firestore, APP_CONSTANTS.COLLECTIONS.COHORTS);
      const cohortsSnapshot = await getDocs(cohortsRef);
      
      console.log(`📊 Found ${cohortsSnapshot.size} cohort(s) to search`);
      
      for (const cohortDoc of cohortsSnapshot.docs) {
        const cohortData = cohortDoc.data();
        const webinars = cohortData['webinars'] || [];
        
        console.log(`🔍 Searching cohort ${cohortDoc.id} with ${webinars.length} webinar(s)`);
        
        for (const webinar of webinars) {
          if (webinar.code && webinar.code.toUpperCase() === normalizedCode) {
            console.log('✅ Found matching webinar in cohort:', cohortDoc.id);
            const foundWebinar = {
              id: `${cohortDoc.id}-${webinar.num}`, // Create a unique ID
              cohortId: cohortDoc.id,
              ...webinar,
              timestamp: webinar.timestamp?.toDate ? webinar.timestamp.toDate() : webinar.timestamp
            } as Webinar;
            console.log('✅ Webinar data:', foundWebinar);
            return foundWebinar;
          }
        }
      }
      
      console.log('❌ No matching webinar found in any cohort');
      return null;
    } catch (error) {
      console.error('Error finding webinar by code:', error);
      return null;
    }
  }

  private async checkUserAttendance(applicantId: string): Promise<boolean> {
    try {
      console.log('🔍 Checking user attendance for:', applicantId);
      
      // First, check the user's current status
      const userRef = doc(this.firestore, 'users', applicantId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const webinarAttended = userData['webinarAttended'];
        const phase = userData['phase'];
        const status = userData['status'];
        
        console.log('👤 User phase:', phase);
        console.log('📊 User status:', status);
        console.log('🎫 Webinar attended:', webinarAttended);
        
        // User has successfully completed webinar attendance if:
        // 1. They have a webinarAttended value (not null)
        // 2. AND they're in Phase 3 or beyond
        const hasCompletedWebinar = webinarAttended !== null && webinarAttended !== undefined;
        const isInPhase3OrBeyond = phase === 'IN_DEPTH_APPLICATION' || phase === 'INTERVIEW' || phase === 'ACCEPTED';
        
        if (hasCompletedWebinar && isInPhase3OrBeyond) {
          console.log('✅ User has successfully completed webinar attendance');
          return true;
        }
        
        // If user is stuck (has attendance record but not promoted), allow retry
        if (!hasCompletedWebinar) {
          console.log('⚠️ User may have incomplete webinar attendance - allowing retry');
          return false;
        }
      }
      
      return false;
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

  /**
   * Promote user to Phase 3 after successful webinar attendance
   */
  private async promoteUserToPhase3(applicantId: string, webinar: Webinar): Promise<void> {
    try {
      console.log(`🚀 Promoting user ${applicantId} to Phase 3...`);
      
      const userRef = doc(this.firestore, 'users', applicantId);
      
      // Update user's phase and status
      await updateDoc(userRef, {
        phase: Phase.IN_DEPTH_APPLICATION,
        status: ApplicationStatus.PHASE_3,
        webinarAttended: webinar.num,
        updatedAt: new Date()
      });
      
      console.log('✅ User successfully promoted to Phase 3');
    } catch (error) {
      console.error('Error promoting user to Phase 3:', error);
      throw error;
    }
  }
}