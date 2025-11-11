import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  updateDoc, 
  setDoc,
  doc, 
  getDoc, 
  query, 
  where, 
  getDocs,
  deleteDoc
} from '@angular/fire/firestore';
import { Auth, createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth';
import { Phase1Application, Phase3Application, Phase, ServiceCountry, ApplicationStatus } from '../models';
import { FlaggingService, FlaggingResult } from './flagging.service';

export interface ApplicationSubmissionData {
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
  extendedInfo: {
    role: string;
    founderCount: number;
    linkedInProfile: string;
    serviceHistory: {
      country: ServiceCountry;
      unit: string;
    };
    grandmaTest: string;
    pitchDeck?: {
      fileUrl?: string;
      fileName?: string;
      nodeckExplanation?: string;
    };
    discovery: string;
    timeCommitment: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private flaggingService = inject(FlaggingService);

  /**
   * Submit a Phase 1 application and create user account
   * @param formData The form data from the Phase 1 application
   * @param cohortId The target cohort ID
   * @returns Promise containing the application ID and user ID
   */
  async submitPhase1Application(
    formData: ApplicationSubmissionData, 
    cohortId: string
  ): Promise<{ applicationId: string; userId: string }> {
    try {
      // Validate required fields
      this.validatePhase1Data(formData);

      // Step 1: Create Firebase Auth user account
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        formData.personalInfo.email,
        formData.personalInfo.password
      );

      const userId = userCredential.user.uid;

      // Step 2: Update user profile
      await updateProfile(userCredential.user, {
        displayName: `${formData.personalInfo.firstName} ${formData.personalInfo.lastName}`
      });

      // Step 3: Create Phase1Application object (without storing passwords)
      const application: Omit<Phase1Application, 'id'> = {
        applicantId: userId,
        cohortId,
        phase: Phase.SIGNUP,
        status: 'SUBMITTED',
        companyInfo: formData.companyInfo,
        personalInfo: {
          firstName: formData.personalInfo.firstName,
          lastName: formData.personalInfo.lastName,
          email: formData.personalInfo.email,
          confirmEmail: formData.personalInfo.confirmEmail,
          // Don't store passwords in application data
          password: '', 
          confirmPassword: '',
          phone: formData.personalInfo.phone,
        },
        extendedInfo: {
          role: formData.extendedInfo.role,
          founderCount: formData.extendedInfo.founderCount,
          linkedInProfile: formData.extendedInfo.linkedInProfile,
          serviceHistory: formData.extendedInfo.serviceHistory,
          grandmaTest: formData.extendedInfo.grandmaTest,
          pitchDeck: formData.extendedInfo.pitchDeck,
          discovery: formData.extendedInfo.discovery,
          timeCommitment: formData.extendedInfo.timeCommitment,
          selectedWebinarSessions: [] // Initialize empty, will be populated in Phase 2
        },
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Step 4: Save application to Firestore
      const docRef = await addDoc(collection(this.firestore, 'applications'), application);
      
      // Step 5: Create user profile document using the Firebase Auth UID as the document ID
      await setDoc(doc(this.firestore, 'users', userId), {
        uid: userId,
        role: 'APPLICANT',
        email: formData.personalInfo.email,
        firstName: formData.personalInfo.firstName,
        lastName: formData.personalInfo.lastName,
        phone: formData.personalInfo.phone,
        applicationId: docRef.id,
        cohortId,
        phase: Phase.SIGNUP,
        status: ApplicationStatus.PHASE_1,
        isAccepted: null,
        webinarAttended: null,
        interviewerId: null,
        profileData: {
          companyName: formData.companyInfo.companyName,
          role: formData.extendedInfo.role,
          linkedIn: formData.extendedInfo.linkedInProfile
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Step 6: Run flagging analysis on the submitted application
      const applicationWithId = { ...application, id: docRef.id };
      const flaggingResult = this.flaggingService.analyzeApplication(applicationWithId);
      
      // Step 7: Save flagging results
      await this.saveFlaggingResults(docRef.id, flaggingResult);
      
      return { applicationId: docRef.id, userId };
    } catch (error) {
      console.error('Error submitting Phase 1 application:', error);
      // If user creation succeeded but application submission failed, 
      // we should ideally clean up the user account here in a production app
      throw new Error('Failed to submit application. Please try again.');
    }
  }

  /**
   * Save a Phase 1 application as draft (no user creation)
   * @param formData Partial form data
   * @param sessionId A unique session identifier for the draft
   * @param applicationId Optional existing application ID for updates
   * @returns Promise containing the application ID
   */
  async saveDraftPhase1Application(
    formData: Partial<ApplicationSubmissionData>,
    sessionId: string,
    applicationId?: string
  ): Promise<string> {
    try {
      const draftData = {
        sessionId, // Use session ID instead of user ID for drafts
        phase: Phase.SIGNUP,
        status: 'DRAFT' as const,
        companyInfo: formData.companyInfo || {},
        personalInfo: {
          // Don't store passwords in drafts for security
          firstName: formData.personalInfo?.firstName || '',
          lastName: formData.personalInfo?.lastName || '',
          email: formData.personalInfo?.email || '',
          confirmEmail: formData.personalInfo?.confirmEmail || '',
          password: '', // Never store passwords in drafts
          confirmPassword: '',
          phone: formData.personalInfo?.phone || '',
        },
        extendedInfo: formData.extendedInfo || {},
        updatedAt: new Date()
      };

      if (applicationId) {
        // Update existing draft
        const docRef = doc(this.firestore, 'draft_applications', applicationId);
        await updateDoc(docRef, draftData);
        return applicationId;
      } else {
        // Create new draft in separate collection
        const docRef = await addDoc(collection(this.firestore, 'draft_applications'), {
          ...draftData,
          createdAt: new Date()
        });
        return docRef.id;
      }
    } catch (error) {
      console.error('Error saving draft application:', error);
      throw new Error('Failed to save draft. Please try again.');
    }
  }

  /**
   * Get draft application by session ID
   * @param sessionId The session identifier
   * @returns Promise containing the draft or null if not found
   */
  async getDraftBySessionId(sessionId: string): Promise<any | null> {
    try {
      const q = query(
        collection(this.firestore, 'draft_applications'),
        where('sessionId', '==', sessionId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error fetching draft application:', error);
      return null;
    }
  }

  /**
   * Get an existing application by applicant ID
   * @param applicantId The applicant's user ID
   * @returns Promise containing the application or null if not found
   */
  async getApplicationByApplicantId(applicantId: string): Promise<Phase1Application | null> {
    try {
      const q = query(
        collection(this.firestore, 'applications'),
        where('applicantId', '==', applicantId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as Phase1Application;
    } catch (error) {
      console.error('Error fetching application:', error);
      throw new Error('Failed to fetch application data.');
    }
  }


  /**
   * Validate Phase 1 application data before submission
   * @param formData The form data to validate
   */
  private validatePhase1Data(formData: ApplicationSubmissionData): void {
    const errors: string[] = [];

    // Company Info validation
    if (!formData.companyInfo.companyName?.trim()) {
      errors.push('Company name is required');
    }
    if (!formData.companyInfo.isFounder) {
      errors.push('You must be a founder to apply');
    }

    // Personal Info validation
    if (!formData.personalInfo.firstName?.trim()) {
      errors.push('First name is required');
    }
    if (!formData.personalInfo.lastName?.trim()) {
      errors.push('Last name is required');
    }
    if (!formData.personalInfo.email?.trim()) {
      errors.push('Email is required');
    }
    if (formData.personalInfo.email !== formData.personalInfo.confirmEmail) {
      errors.push('Email addresses do not match');
    }
    if (!formData.personalInfo.password) {
      errors.push('Password is required');
    }
    if (formData.personalInfo.password !== formData.personalInfo.confirmPassword) {
      errors.push('Passwords do not match');
    }
    if (!formData.personalInfo.phone?.trim()) {
      errors.push('Phone number is required');
    }

    // Extended Info validation (LinkedIn is now optional)
    if (!formData.extendedInfo.role?.trim()) {
      errors.push('Your role is required');
    }
    if (!formData.extendedInfo.founderCount || formData.extendedInfo.founderCount < 1) {
      errors.push('Number of founders is required');
    }
    if (!formData.extendedInfo.serviceHistory?.country) {
      errors.push('Service country is required');
    }
    if (!formData.extendedInfo.serviceHistory?.unit?.trim()) {
      errors.push('Service unit is required');
    }
    if (!formData.extendedInfo.grandmaTest?.trim()) {
      errors.push('Company description is required');
    }
    if (!formData.extendedInfo.discovery?.trim()) {
      errors.push('Discovery source is required');
    }
    if (!formData.extendedInfo.timeCommitment) {
      errors.push('Time commitment confirmation is required');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  /**
   * Save flagging results to Firestore
   * @param applicationId The application ID
   * @param flaggingResult The flagging analysis result
   */
  private async saveFlaggingResults(applicationId: string, flaggingResult: FlaggingResult): Promise<void> {
    try {
      // Save to a separate collection for flagging data
      await addDoc(collection(this.firestore, 'application_flags'), {
        applicationId,
        flags: flaggingResult.flags,
        autoAdvance: flaggingResult.autoAdvance,
        needsReview: flaggingResult.needsReview,
        summary: this.flaggingService.generateFlagSummary(flaggingResult),
        analyzedAt: new Date()
      });

      // Also update the application document with flagging metadata
      const appRef = doc(this.firestore, 'applications', applicationId);
      await updateDoc(appRef, {
        flagging: {
          autoAdvance: flaggingResult.autoAdvance,
          needsReview: flaggingResult.needsReview,
          flagCount: flaggingResult.flags.length,
          lastAnalyzed: new Date()
        }
      });
    } catch (error) {
      console.error('Error saving flagging results:', error);
      // Don't throw here - flagging failure shouldn't prevent application submission
    }
  }

  /**
   * Get flagging results for an application
   * @param applicationId The application ID
   * @returns Promise containing the flagging result or null
   */
  async getFlaggingResults(applicationId: string): Promise<FlaggingResult | null> {
    try {
      const q = query(
        collection(this.firestore, 'application_flags'),
        where('applicationId', '==', applicationId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      return {
        applicationId: data['applicationId'],
        flags: data['flags'],
        autoAdvance: data['autoAdvance'],
        needsReview: data['needsReview']
      };
    } catch (error) {
      console.error('Error fetching flagging results:', error);
      return null;
    }
  }

  /**
   * Re-analyze an application (useful after data corrections)
   * @param application The application to re-analyze
   * @returns Promise containing the updated flagging result
   */
  async reanalyzeApplication(application: Phase1Application): Promise<FlaggingResult> {
    const flaggingResult = this.flaggingService.analyzeApplication(application);
    
    if (application.id) {
      await this.saveFlaggingResults(application.id, flaggingResult);
    }
    
    return flaggingResult;
  }

  /**
   * Get Phase 3 application by applicant ID and cohort ID
   * @param applicantId The applicant's user ID
   * @param cohortId The cohort ID
   * @returns Promise containing the Phase 3 application or null if not found
   */
  async getPhase3Application(applicantId: string, cohortId: string): Promise<Phase3Application | null> {
    try {
      const q = query(
        collection(this.firestore, 'phase3_applications'),
        where('applicantId', '==', applicantId),
        where('cohortId', '==', cohortId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as Phase3Application;
    } catch (error) {
      console.error('Error fetching Phase 3 application:', error);
      return null;
    }
  }

  /**
   * Create a new Phase 3 application
   * @param applicationData The Phase 3 application data
   * @returns Promise containing the created application
   */
  async createPhase3Application(applicationData: Omit<Phase3Application, 'id'>): Promise<Phase3Application> {
    try {
      const docRef = await addDoc(collection(this.firestore, 'phase3_applications'), {
        ...applicationData,
        phase: Phase.IN_DEPTH_APPLICATION,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const createdApp = { ...applicationData, id: docRef.id };
      
      // Run Phase 3 flagging analysis if submitted
      if (applicationData.status === 'SUBMITTED') {
        const flaggingResult = this.flaggingService.analyzePhase3Application(createdApp);
        await this.savePhase3FlaggingResults(docRef.id, flaggingResult);
      }
      
      return createdApp;
    } catch (error) {
      console.error('Error creating Phase 3 application:', error);
      throw new Error('Failed to create Phase 3 application. Please try again.');
    }
  }

  /**
   * Update an existing Phase 3 application
   * @param applicationId The application ID
   * @param updateData Partial application data to update
   * @returns Promise that resolves when update is complete
   */
  async updatePhase3Application(applicationId: string, updateData: Partial<Phase3Application>): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'phase3_applications', applicationId);
      const updatedData = {
        ...updateData,
        updatedAt: new Date()
      };
      
      await updateDoc(docRef, updatedData);
      
      // Re-run flagging analysis if submitted
      if (updateData.status === 'SUBMITTED') {
        const fullApp = await this.getPhase3ApplicationById(applicationId);
        if (fullApp) {
          const flaggingResult = this.flaggingService.analyzePhase3Application(fullApp);
          await this.savePhase3FlaggingResults(applicationId, flaggingResult);
        }
      }
    } catch (error) {
      console.error('Error updating Phase 3 application:', error);
      throw new Error('Failed to update Phase 3 application. Please try again.');
    }
  }

  /**
   * Get Phase 3 application by ID
   * @param applicationId The application ID
   * @returns Promise containing the application or null if not found
   */
  private async getPhase3ApplicationById(applicationId: string): Promise<Phase3Application | null> {
    try {
      const docRef = doc(this.firestore, 'phase3_applications', applicationId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Phase3Application;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching Phase 3 application by ID:', error);
      return null;
    }
  }

  /**
   * Save Phase 3 flagging results to Firestore
   * @param applicationId The Phase 3 application ID
   * @param flaggingResult The flagging analysis result
   */
  private async savePhase3FlaggingResults(applicationId: string, flaggingResult: FlaggingResult): Promise<void> {
    try {
      // Save to flagging collection
      await addDoc(collection(this.firestore, 'phase3_application_flags'), {
        applicationId,
        flags: flaggingResult.flags,
        autoAdvance: flaggingResult.autoAdvance,
        needsReview: flaggingResult.needsReview,
        summary: this.flaggingService.generatePhase3FlagSummary(flaggingResult),
        analyzedAt: new Date()
      });

      // Update the application document with flagging metadata
      const appRef = doc(this.firestore, 'phase3_applications', applicationId);
      await updateDoc(appRef, {
        flagging: {
          autoAdvance: flaggingResult.autoAdvance,
          needsReview: flaggingResult.needsReview,
          flagCount: flaggingResult.flags.length,
          lastAnalyzed: new Date()
        }
      });
    } catch (error) {
      console.error('Error saving Phase 3 flagging results:', error);
      // Don't throw here - flagging failure shouldn't prevent application submission
    }
  }

  /**
   * Get Phase 3 flagging results for an application
   * @param applicationId The application ID
   * @returns Promise containing the flagging result or null
   */
  async getPhase3FlaggingResults(applicationId: string): Promise<FlaggingResult | null> {
    try {
      const q = query(
        collection(this.firestore, 'phase3_application_flags'),
        where('applicationId', '==', applicationId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      return {
        applicationId: data['applicationId'],
        flags: data['flags'],
        autoAdvance: data['autoAdvance'],
        needsReview: data['needsReview']
      };
    } catch (error) {
      console.error('Error fetching Phase 3 flagging results:', error);
      return null;
    }
  }

  /**
   * Delete Phase 3 application and associated data
   * @param applicantId The applicant's user ID
   * @param cohortId The cohort ID
   * @returns Promise that resolves when deletion is complete
   */
  async deletePhase3Application(applicantId: string, cohortId: string): Promise<void> {
    try {
      // First, get the application to find its ID
      const existingApp = await this.getPhase3Application(applicantId, cohortId);
      
      if (!existingApp || !existingApp.id) {
        console.log('No Phase 3 application found to delete');
        return;
      }

      const applicationId = existingApp.id;

      // Delete the application document
      const appRef = doc(this.firestore, 'phase3_applications', applicationId);
      await deleteDoc(appRef);

      // Delete associated flagging results
      const flagsQuery = query(
        collection(this.firestore, 'phase3_application_flags'),
        where('applicationId', '==', applicationId)
      );
      
      const flagsSnapshot = await getDocs(flagsQuery);
      const deletePromises = flagsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      
      await Promise.all(deletePromises);

      console.log(`Successfully deleted Phase 3 application ${applicationId} and associated data`);
    } catch (error) {
      console.error('Error deleting Phase 3 application:', error);
      throw new Error('Failed to delete application. Please try again.');
    }
  }
}