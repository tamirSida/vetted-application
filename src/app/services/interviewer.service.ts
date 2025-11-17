import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  getDoc,
  QueryConstraint,
  limit,
  startAfter,
  DocumentSnapshot
} from '@angular/fire/firestore';
import { 
  Interviewer, 
  InterviewerCreateRequest, 
  InterviewerUpdateRequest, 
  Interview, 
  InterviewCreateRequest, 
  InterviewUpdateRequest, 
  InterviewStatus,
  UserRole 
} from '../models';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class InterviewerService {
  private firestore = inject(Firestore);
  private userService = inject(UserService);

  // Interviewer CRUD Operations

  /**
   * Get all active interviewers
   */
  async getAllInterviewers(): Promise<Interviewer[]> {
    try {
      const interviewersRef = collection(this.firestore, 'interviewers');
      const q = query(
        interviewersRef, 
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Interviewer[];
    } catch (error) {
      console.error('Error loading interviewers:', error);
      throw new Error('Failed to load interviewers');
    }
  }

  /**
   * Get eligible users (admins and viewers) who can be interviewers
   */
  async getEligibleInterviewers(): Promise<{userId: string, name: string, email: string, role: UserRole}[]> {
    try {
      const admins = await this.userService.getAllAdmins();
      const viewers = await this.userService.getAllViewers();
      
      const eligible = [
        ...admins.map(admin => ({
          userId: admin.userId,
          name: admin.name,
          email: admin.email,
          role: admin.role
        })),
        ...viewers.map(viewer => ({
          userId: viewer.userId,
          name: viewer.name,
          email: viewer.email,
          role: viewer.role
        }))
      ];

      return eligible;
    } catch (error) {
      console.error('Error loading eligible interviewers:', error);
      throw new Error('Failed to load eligible users');
    }
  }

  /**
   * Create a new interviewer
   */
  async createInterviewer(request: InterviewerCreateRequest): Promise<string> {
    try {
      // Get user details
      const user = await this.userService.getUserById(request.userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== UserRole.ADMIN && user.role !== UserRole.VIEWER) {
        throw new Error('Only admins and viewers can be interviewers');
      }

      // Check if user is already an interviewer
      const existingInterviewer = await this.getInterviewerByUserId(request.userId);
      if (existingInterviewer) {
        throw new Error('User is already an interviewer');
      }

      const interviewersRef = collection(this.firestore, 'interviewers');
      const now = new Date();
      
      const interviewerData: Omit<Interviewer, 'id'> = {
        userId: request.userId,
        name: user.name,
        email: user.email,
        role: user.role as UserRole.ADMIN | UserRole.VIEWER,
        calendarUrl: request.calendarUrl,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await addDoc(interviewersRef, interviewerData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating interviewer:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create interviewer');
    }
  }

  /**
   * Update an interviewer
   */
  async updateInterviewer(interviewerId: string, updates: InterviewerUpdateRequest): Promise<void> {
    try {
      const interviewerRef = doc(this.firestore, 'interviewers', interviewerId);
      await updateDoc(interviewerRef, {
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating interviewer:', error);
      throw new Error('Failed to update interviewer');
    }
  }

  /**
   * Delete an interviewer (set inactive)
   */
  async deleteInterviewer(interviewerId: string): Promise<void> {
    try {
      await this.updateInterviewer(interviewerId, { isActive: false });
    } catch (error) {
      console.error('Error deleting interviewer:', error);
      throw new Error('Failed to delete interviewer');
    }
  }

  /**
   * Get interviewer by user ID
   */
  async getInterviewerByUserId(userId: string): Promise<Interviewer | null> {
    try {
      const interviewersRef = collection(this.firestore, 'interviewers');
      const q = query(
        interviewersRef, 
        where('userId', '==', userId),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as Interviewer;
    } catch (error) {
      console.error('Error finding interviewer by user ID:', error);
      return null;
    }
  }

  // Interview CRUD Operations

  /**
   * Create a new interview
   */
  async createInterview(request: InterviewCreateRequest): Promise<string> {
    try {
      const interviewsRef = collection(this.firestore, 'interviews');
      const now = new Date();
      
      const interviewData: any = {
        applicantId: request.applicantId,
        interviewerId: request.interviewerId,
        cohortId: request.cohortId,
        status: request.status || InterviewStatus.NOT_YET_SCHEDULED,
        createdAt: now,
        updatedAt: now
      };

      // Only add optional fields if they have values (not undefined)
      if (request.notes) {
        interviewData.notes = request.notes;
      }
      if (request.documentUrl) {
        interviewData.documentUrl = request.documentUrl;
      }
      if (request.scheduledAt) {
        interviewData.scheduledAt = request.scheduledAt;
      }

      const docRef = await addDoc(interviewsRef, interviewData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating interview:', error);
      throw new Error('Failed to create interview');
    }
  }

  /**
   * Update an interview
   */
  async updateInterview(interviewId: string, updates: InterviewUpdateRequest): Promise<void> {
    try {
      const interviewRef = doc(this.firestore, 'interviews', interviewId);
      const updateData: any = {
        updatedAt: new Date()
      };

      // Only add fields that are not undefined
      if (updates.status !== undefined) {
        updateData.status = updates.status;
      }
      if (updates.notes !== undefined) {
        updateData.notes = updates.notes;
      }
      if (updates.documentUrl !== undefined) {
        updateData.documentUrl = updates.documentUrl;
      }
      if (updates.scheduledAt !== undefined) {
        updateData.scheduledAt = updates.scheduledAt;
      }
      if (updates.completedAt !== undefined) {
        updateData.completedAt = updates.completedAt;
      }

      // Set completedAt when status changes to INTERVIEWED
      if (updates.status === InterviewStatus.INTERVIEWED && !updates.completedAt) {
        updateData.completedAt = new Date();
      }

      await updateDoc(interviewRef, updateData);
    } catch (error) {
      console.error('Error updating interview:', error);
      throw new Error('Failed to update interview');
    }
  }

  /**
   * Get interview by applicant ID
   */
  async getInterviewByApplicantId(applicantId: string): Promise<Interview | null> {
    try {
      const interviewsRef = collection(this.firestore, 'interviews');
      const q = query(
        interviewsRef, 
        where('applicantId', '==', applicantId)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as Interview;
    } catch (error) {
      console.error('Error finding interview by applicant ID:', error);
      return null;
    }
  }

  /**
   * Get all interviews for a specific interviewer
   */
  async getInterviewsByInterviewer(interviewerId: string): Promise<Interview[]> {
    try {
      const interviewsRef = collection(this.firestore, 'interviews');
      const q = query(
        interviewsRef, 
        where('interviewerId', '==', interviewerId)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Interview[];
    } catch (error) {
      console.error('Error loading interviews by interviewer:', error);
      throw new Error('Failed to load interviews');
    }
  }

  /**
   * Get all interviews for a cohort
   */
  async getInterviewsByCohort(cohortId: string): Promise<Interview[]> {
    try {
      const interviewsRef = collection(this.firestore, 'interviews');
      const q = query(
        interviewsRef, 
        where('cohortId', '==', cohortId)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Interview[];
    } catch (error) {
      console.error('Error loading interviews by cohort:', error);
      throw new Error('Failed to load interviews');
    }
  }

  /**
   * Delete an interview
   */
  async deleteInterview(interviewId: string): Promise<void> {
    try {
      const interviewRef = doc(this.firestore, 'interviews', interviewId);
      await deleteDoc(interviewRef);
    } catch (error) {
      console.error('Error deleting interview:', error);
      throw new Error('Failed to delete interview');
    }
  }
}