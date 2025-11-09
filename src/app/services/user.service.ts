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
import { ApplicantUser, AdminUser, ViewerUser, UserCreateRequest, UserUpdateRequest } from '../models';
import { UserRole } from '../models/enums';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore);

  async getAllApplicants(): Promise<ApplicantUser[]> {
    try {
      const usersRef = collection(this.firestore, 'users');
      const q = query(
        usersRef, 
        where('role', '==', UserRole.APPLICANT)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        // Transform data to match ApplicantUser interface
        return {
          userId: doc.id,
          name: `${data['firstName'] || ''} ${data['lastName'] || ''}`.trim() || data['name'],
          email: data['email'],
          role: data['role'],
          isAccepted: data['isAccepted'],
          phase: data['phase'],
          webinarAttended: data['webinarAttended'],
          interviewerId: data['interviewerId'],
          cohortId: data['cohortId'],
          profileData: data['profileData'],
          createdAt: data['createdAt'],
          updatedAt: data['updatedAt']
        };
      }) as ApplicantUser[];
    } catch (error) {
      console.error('Error loading applicants:', error);
      throw new Error('Failed to load applicants');
    }
  }

  async getAllAdmins(): Promise<AdminUser[]> {
    try {
      const usersRef = collection(this.firestore, 'users');
      const q = query(
        usersRef, 
        where('role', '==', UserRole.ADMIN)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      })) as AdminUser[];
    } catch (error) {
      console.error('Error loading admins:', error);
      throw new Error('Failed to load administrators');
    }
  }

  async getAllViewers(): Promise<ViewerUser[]> {
    try {
      const usersRef = collection(this.firestore, 'users');
      const q = query(
        usersRef, 
        where('role', '==', UserRole.VIEWER)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      })) as ViewerUser[];
    } catch (error) {
      console.error('Error loading viewers:', error);
      throw new Error('Failed to load viewers');
    }
  }

  async getUserById(userId: string): Promise<ApplicantUser | AdminUser | ViewerUser | null> {
    try {
      const userRef = doc(this.firestore, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return {
          userId: userSnap.id,
          ...userSnap.data()
        } as ApplicantUser | AdminUser | ViewerUser;
      }
      
      return null;
    } catch (error) {
      console.error('Error loading user:', error);
      throw new Error('Failed to load user data');
    }
  }

  async getApplicantsByCohort(cohortId: string): Promise<ApplicantUser[]> {
    try {
      const usersRef = collection(this.firestore, 'users');
      const q = query(
        usersRef, 
        where('role', '==', UserRole.APPLICANT),
        where('cohortId', '==', cohortId)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        // Transform data to match ApplicantUser interface
        return {
          userId: doc.id,
          name: `${data['firstName'] || ''} ${data['lastName'] || ''}`.trim() || data['name'],
          email: data['email'],
          role: data['role'],
          isAccepted: data['isAccepted'],
          phase: data['phase'],
          webinarAttended: data['webinarAttended'],
          interviewerId: data['interviewerId'],
          cohortId: data['cohortId'],
          profileData: data['profileData'],
          createdAt: data['createdAt'],
          updatedAt: data['updatedAt']
        };
      }) as ApplicantUser[];
    } catch (error) {
      console.error('Error loading cohort applicants:', error);
      throw new Error('Failed to load cohort applicants');
    }
  }

  async createUser(userRequest: UserCreateRequest): Promise<string> {
    try {
      const usersRef = collection(this.firestore, 'users');
      const now = new Date();
      
      let userData: any = {
        ...userRequest,
        createdAt: now,
        updatedAt: now
      };

      // Add role-specific fields
      switch (userRequest.role) {
        case UserRole.ADMIN:
          userData = {
            ...userData,
            isActive: true,
            permissions: []
          };
          break;
        case UserRole.VIEWER:
          userData = {
            ...userData,
            canView: true,
            accessLevel: 'BASIC'
          };
          break;
        case UserRole.APPLICANT:
          userData = {
            ...userData,
            isAccepted: null,
            phase: 'SIGNUP',
            webinarAttended: null,
            profileData: {}
          };
          break;
      }

      const docRef = await addDoc(usersRef, userData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async updateUser(userId: string, updates: UserUpdateRequest): Promise<void> {
    try {
      const userRef = doc(this.firestore, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const userRef = doc(this.firestore, 'users', userId);
      await deleteDoc(userRef);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  async toggleAdminStatus(userId: string, isActive: boolean): Promise<void> {
    return this.updateUser(userId, { isActive });
  }

  async toggleViewerAccess(userId: string, canView: boolean): Promise<void> {
    return this.updateUser(userId, { canView });
  }

  // Pagination methods
  async getApplicantsPaginated(pageSize: number, lastDoc?: DocumentSnapshot): Promise<{
    users: ApplicantUser[];
    lastDoc: DocumentSnapshot | null;
    hasMore: boolean;
  }> {
    try {
      const usersRef = collection(this.firestore, 'users');
      let q = query(
        usersRef,
        where('role', '==', UserRole.APPLICANT),
        limit(pageSize)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      
      const users = snapshot.docs.map(doc => {
        const data = doc.data();
        // Transform data to match ApplicantUser interface
        return {
          userId: doc.id,
          name: `${data['firstName'] || ''} ${data['lastName'] || ''}`.trim() || data['name'],
          email: data['email'],
          role: data['role'],
          isAccepted: data['isAccepted'],
          phase: data['phase'],
          webinarAttended: data['webinarAttended'],
          interviewerId: data['interviewerId'],
          cohortId: data['cohortId'],
          profileData: data['profileData'],
          createdAt: data['createdAt'],
          updatedAt: data['updatedAt']
        };
      }) as ApplicantUser[];

      return {
        users,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize
      };
    } catch (error) {
      console.error('Error loading paginated applicants:', error);
      throw new Error('Failed to load applicants');
    }
  }

  async getAdminsPaginated(pageSize: number, lastDoc?: DocumentSnapshot): Promise<{
    users: AdminUser[];
    lastDoc: DocumentSnapshot | null;
    hasMore: boolean;
  }> {
    try {
      const usersRef = collection(this.firestore, 'users');
      let q = query(
        usersRef,
        where('role', '==', UserRole.ADMIN),
        limit(pageSize)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      
      const users = snapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      })) as AdminUser[];

      return {
        users,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize
      };
    } catch (error) {
      console.error('Error loading paginated admins:', error);
      throw new Error('Failed to load administrators');
    }
  }

  async getViewersPaginated(pageSize: number, lastDoc?: DocumentSnapshot): Promise<{
    users: ViewerUser[];
    lastDoc: DocumentSnapshot | null;
    hasMore: boolean;
  }> {
    try {
      const usersRef = collection(this.firestore, 'users');
      let q = query(
        usersRef,
        where('role', '==', UserRole.VIEWER),
        limit(pageSize)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      
      const users = snapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      })) as ViewerUser[];

      return {
        users,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize
      };
    } catch (error) {
      console.error('Error loading paginated viewers:', error);
      throw new Error('Failed to load viewers');
    }
  }
}