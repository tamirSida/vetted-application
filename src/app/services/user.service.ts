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
  DocumentSnapshot,
  setDoc
} from '@angular/fire/firestore';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { ApplicantUser, AdminUser, ViewerUser, UserCreateRequest, UserUpdateRequest, ApplicationStatus, Phase } from '../models';
import { UserRole } from '../models/enums';
import { EmailService } from './email.service';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private emailService = inject(EmailService);
  private settingsService = inject(SettingsService);

  // Helper method to derive status from phase for backward compatibility
  private deriveStatusFromPhase(phase: string): ApplicationStatus {
    switch (phase) {
      case 'SIGNUP':
        return ApplicationStatus.PHASE_1;
      case 'WEBINAR':
        return ApplicationStatus.PHASE_2;
      case 'IN_DEPTH_APPLICATION':
        return ApplicationStatus.PHASE_3;
      case 'INTERVIEW':
        return ApplicationStatus.PHASE_4;
      case 'ACCEPTED':
        return ApplicationStatus.ACCEPTED;
      default:
        return ApplicationStatus.PHASE_1;
    }
  }

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
          status: data['status'] || this.deriveStatusFromPhase(data['phase']),
          webinarAttended: data['webinarAttended'],
          interviewerId: data['interviewerId'],
          assignedTo: data['assignedTo'],
          cohortId: data['cohortId'],
          interviewDate: data['interviewDate'],
          rating: data['rating'],
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
      const adminUsersRef = collection(this.firestore, 'admin_users');
      const q = query(
        adminUsersRef, 
        where('role', '==', UserRole.ADMIN)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          userId: doc.id,
          ...data,
          createdAt: data['createdAt']?.toDate?.() || data['createdAt'] || new Date(),
          updatedAt: data['updatedAt']?.toDate?.() || data['updatedAt'] || new Date()
        };
      }) as AdminUser[];
    } catch (error) {
      console.error('Error loading admins:', error);
      throw new Error('Failed to load administrators');
    }
  }

  async getAllViewers(): Promise<ViewerUser[]> {
    try {
      const adminUsersRef = collection(this.firestore, 'admin_users');
      const q = query(
        adminUsersRef, 
        where('role', '==', UserRole.VIEWER)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          userId: doc.id,
          ...data,
          createdAt: data['createdAt']?.toDate?.() || data['createdAt'] || new Date(),
          updatedAt: data['updatedAt']?.toDate?.() || data['updatedAt'] || new Date()
        };
      }) as ViewerUser[];
    } catch (error) {
      console.error('Error loading viewers:', error);
      throw new Error('Failed to load viewers');
    }
  }

  async getUserById(userId: string): Promise<ApplicantUser | AdminUser | ViewerUser | null> {
    try {
      // First check users collection (for applicants)
      const userRef = doc(this.firestore, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return {
          userId: userSnap.id,
          ...userSnap.data()
        } as ApplicantUser | AdminUser | ViewerUser;
      }
      
      // If not found, check admin_users collection (for admins/viewers)
      const adminUserRef = doc(this.firestore, 'admin_users', userId);
      const adminUserSnap = await getDoc(adminUserRef);
      
      if (adminUserSnap.exists()) {
        return {
          userId: adminUserSnap.id,
          ...adminUserSnap.data()
        } as AdminUser | ViewerUser;
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
          status: data['status'] || this.deriveStatusFromPhase(data['phase']),
          webinarAttended: data['webinarAttended'],
          interviewerId: data['interviewerId'],
          assignedTo: data['assignedTo'],
          cohortId: data['cohortId'],
          interviewDate: data['interviewDate'],
          rating: data['rating'],
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
      const now = new Date();

      // For ADMIN and VIEWER users, create Firebase Auth user and save to admin_users collection
      if (userRequest.role === UserRole.ADMIN || userRequest.role === UserRole.VIEWER) {
        // Use the provided password for Firebase Auth (password is never saved to database)
        const password = userRequest.password || this.generateTempPassword();
        console.log(`🔐 Creating Firebase Auth user for ${userRequest.email} with ${userRequest.password ? 'provided' : 'generated'} password`);
        
        let firebaseUid: string;
        
        try {
          // Create Firebase Auth user with provided password
          const userCredential = await createUserWithEmailAndPassword(this.auth, userRequest.email, password);
          firebaseUid = userCredential.user.uid;
        } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
            // If email exists in Firebase Auth but not in our admin_users collection,
            // we might need to link the existing user
            console.log(`⚠️ Email ${userRequest.email} already exists in Firebase Auth`);
            throw new Error(`Email ${userRequest.email} is already in use. Please use a different email or check if this user already exists.`);
          } else {
            throw error;
          }
        }
        
        // Prepare admin/viewer user data
        let userData: any = {
          name: userRequest.name,
          email: userRequest.email,
          role: userRequest.role,
          createdAt: now,
          updatedAt: now
        };

        // Add role-specific fields
        if (userRequest.role === UserRole.ADMIN) {
          userData = {
            ...userData,
            isActive: true,
            permissions: []
          };
        } else if (userRequest.role === UserRole.VIEWER) {
          userData = {
            ...userData,
            canView: true,
            accessLevel: 'BASIC'
          };
        }

        // Save to admin_users collection using Firebase Auth UID as document ID
        const adminUserRef = doc(this.firestore, 'admin_users', firebaseUid);
        await setDoc(adminUserRef, userData);
        
        console.log(`✅ Created ${userRequest.role} user with Firebase Auth`);
        return firebaseUid;
      } 
      // For APPLICANT users, continue using the old method (users collection)
      else {
        const usersRef = collection(this.firestore, 'users');
        
        let userData: any = {
          ...userRequest,
          createdAt: now,
          updatedAt: now,
          isAccepted: null,
          phase: 'SIGNUP',
          webinarAttended: null,
          profileData: {}
        };

        const docRef = await addDoc(usersRef, userData);
        return docRef.id;
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  private generateTempPassword(): string {
    // Generate a secure temporary password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async updateUser(userId: string, updates: UserUpdateRequest): Promise<void> {
    try {
      // First try to update in users collection
      try {
        const userRef = doc(this.firestore, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await updateDoc(userRef, {
            ...updates,
            updatedAt: new Date()
          });
          return;
        }
      } catch (error) {
        console.log('User not found in users collection, trying admin_users...');
      }

      // If not found in users collection, try admin_users collection
      const adminUserRef = doc(this.firestore, 'admin_users', userId);
      const adminUserSnap = await getDoc(adminUserRef);
      if (adminUserSnap.exists()) {
        await updateDoc(adminUserRef, {
          ...updates,
          updatedAt: new Date()
        });
        return;
      }

      throw new Error('User not found in any collection');
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      // First try to delete from users collection
      try {
        const userRef = doc(this.firestore, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await deleteDoc(userRef);
          return;
        }
      } catch (error) {
        console.log('User not found in users collection, trying admin_users...');
      }

      // If not found in users collection, try admin_users collection
      const adminUserRef = doc(this.firestore, 'admin_users', userId);
      const adminUserSnap = await getDoc(adminUserRef);
      if (adminUserSnap.exists()) {
        await deleteDoc(adminUserRef);
        return;
      }

      throw new Error('User not found in any collection');
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

  /**
   * Auto-advance applicant from Phase 1 to Phase 2 if eligible
   */
  async processAutoAdvancement(applicantId: string): Promise<boolean> {
    try {
      console.log(`🚀 Processing auto-advancement for applicant: ${applicantId}`);
      
      const applicant = await this.getUserById(applicantId) as ApplicantUser;
      console.log(`Current applicant status:`, applicant?.status);
      
      if (!applicant) {
        console.log(`❌ Applicant not found: ${applicantId}`);
        return false;
      }
      
      // Handle cases where status is undefined (old records) - assume Phase 1 if undefined
      const currentStatus = applicant.status || ApplicationStatus.PHASE_1;
      console.log(`Treating undefined status as Phase 1 for backward compatibility`);
      
      if (currentStatus !== ApplicationStatus.PHASE_1) {
        console.log(`⚠️ Applicant ${applicantId} is not in Phase 1 (current: ${currentStatus})`);
        return false;
      }

      // Check if Phase 2 should be skipped
      const shouldSkipPhase2 = await this.settingsService.shouldSkipPhase2();
      
      if (shouldSkipPhase2) {
        console.log(`⏭️ Phase 2 skip is enabled - advancing ${applicantId} directly to Phase 3...`);
        
        // Update directly to Phase 3
        await this.updateUser(applicantId, {
          phase: Phase.IN_DEPTH_APPLICATION,
          status: ApplicationStatus.PHASE_3
        });

        console.log(`✅ Auto-advanced applicant ${applicantId} to Phase 3 (skipped Phase 2)`);
      } else {
        console.log(`📝 Updating applicant ${applicantId} to Phase 2...`);
        
        // Update to Phase 2 (normal flow)
        await this.updateUser(applicantId, {
          phase: Phase.WEBINAR,
          status: ApplicationStatus.PHASE_2
        });

        console.log(`✅ Auto-advanced applicant ${applicantId} to Phase 2`);
      }

      // Send Phase 1 approved email (auto-advancement)
      try {
        console.log(`📧 Sending Phase 1 approved email to: ${applicant.email}`);
        const emailResult = await this.emailService.sendPhase1ApprovedEmail(applicant);
        
        if (emailResult.success) {
          console.log('✅ Auto-advancement email sent successfully');
        } else {
          console.error('❌ Failed to send auto-advancement email:', emailResult.error);
          // Don't fail the advancement if email fails
        }
      } catch (emailError) {
        console.error('❌ Email service error during auto-advancement:', emailError);
        // Don't fail the advancement if email fails
      }

      return true;
    } catch (error) {
      console.error('❌ Error in auto-advancement:', error);
      return false;
    }
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
          status: data['status'] || this.deriveStatusFromPhase(data['phase']),
          webinarAttended: data['webinarAttended'],
          interviewerId: data['interviewerId'],
          assignedTo: data['assignedTo'],
          cohortId: data['cohortId'],
          interviewDate: data['interviewDate'],
          rating: data['rating'],
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
      const adminUsersRef = collection(this.firestore, 'admin_users');
      let q = query(
        adminUsersRef,
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
      const adminUsersRef = collection(this.firestore, 'admin_users');
      let q = query(
        adminUsersRef,
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

  /**
   * Reject Phase 3 application and send rejection email
   */
  async rejectPhase3Application(applicantId: string): Promise<void> {
    try {
      console.log(`❌ Rejecting Phase 3 application for applicant: ${applicantId}`);

      // Get the applicant data first
      const applicant = await this.getUserById(applicantId);
      
      if (!applicant || applicant.role !== UserRole.APPLICANT) {
        throw new Error('Applicant not found or invalid role');
      }

      // Update user status to rejected
      await this.updateUser(applicantId, {
        status: 'rejected' as any
      });

      // Send rejection email
      try {
        console.log(`📧 Sending Phase 3 rejection email to: ${applicant.email}`);
        const emailResult = await this.emailService.sendPhase3RejectedEmail(applicant as ApplicantUser);

        if (emailResult.success) {
          console.log(`✅ Phase 3 rejection email sent successfully to: ${applicant.email}`);
        } else {
          console.error(`❌ Failed to send Phase 3 rejection email:`, emailResult.error);
        }
      } catch (emailError) {
        console.error(`❌ Error sending Phase 3 rejection email:`, emailError);
        // Don't fail the entire operation if email fails
      }

      console.log(`✅ Successfully rejected Phase 3 application for applicant: ${applicantId}`);
    } catch (error) {
      console.error(`❌ Error rejecting Phase 3 application for ${applicantId}:`, error);
      throw new Error('Failed to reject Phase 3 application');
    }
  }
}