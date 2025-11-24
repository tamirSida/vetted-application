import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User as FirebaseUser, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc, collection, query, where, getDocs } from '@angular/fire/firestore';
import { Observable, BehaviorSubject, from, of, switchMap, map, catchError } from 'rxjs';
import { User, UserRole, ApplicantUser, AdminUser, ViewerUser, UserCreateRequest } from '../models';
import { APP_CONSTANTS } from '../constants';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private authInitializedSubject = new BehaviorSubject<boolean>(false);
  public authInitialized$ = this.authInitializedSubject.asObservable();

  constructor() {
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await this.getUserData(firebaseUser.uid);
          this.currentUserSubject.next(userData);
          this.isAuthenticatedSubject.next(true);
        } catch (error) {
          console.error('Error loading user data:', error);
          this.currentUserSubject.next(null);
          this.isAuthenticatedSubject.next(false);
        }
      } else {
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
      }
      
      // Mark auth as initialized after first callback
      if (!this.authInitializedSubject.value) {
        this.authInitializedSubject.next(true);
      }
    });
  }

  async signUp(userRequest: UserCreateRequest): Promise<User> {
    try {
      // Password is required for signup (this is used for applicant registration)
      if (!userRequest.password) {
        throw new Error('Password is required for signup');
      }

      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        userRequest.email,
        userRequest.password
      );

      const userId = userCredential.user.uid;
      const userData = await this.createUserDocument(userId, userRequest);
      
      this.currentUserSubject.next(userData);
      this.isAuthenticatedSubject.next(true);
      
      return userData;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const userData = await this.getUserData(userCredential.user.uid);
      
      this.currentUserSubject.next(userData);
      this.isAuthenticatedSubject.next(true);
      
      return userData;
    } catch (error) {
      console.error('Signin error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
    } catch (error) {
      console.error('Signout error:', error);
      throw error;
    }
  }

  private async createUserDocument(userId: string, userRequest: UserCreateRequest): Promise<User> {
    const baseUserData = {
      userId,
      name: userRequest.name,
      email: userRequest.email,
      role: userRequest.role,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    let userData: User;
    let collectionName: string;

    switch (userRequest.role) {
      case UserRole.ADMIN:
        userData = {
          ...baseUserData,
          role: UserRole.ADMIN,
          isActive: true
        } as AdminUser;
        collectionName = APP_CONSTANTS.COLLECTIONS.ADMIN_USERS;
        break;

      case UserRole.VIEWER:
        userData = {
          ...baseUserData,
          role: UserRole.VIEWER,
          canView: true
        } as ViewerUser;
        collectionName = APP_CONSTANTS.COLLECTIONS.ADMIN_USERS; // Viewers stored in admin_users collection
        break;

      case UserRole.APPLICANT:
        if (!userRequest.cohortId) {
          throw new Error('Cohort ID is required for applicant users');
        }
        userData = {
          ...baseUserData,
          role: UserRole.APPLICANT,
          isAccepted: null,
          phase: 'SIGNUP' as any,
          webinarAttended: null,
          cohortId: userRequest.cohortId
        } as ApplicantUser;
        collectionName = 'users'; // Applicants stored in users collection
        break;

      default:
        throw new Error('Invalid user role');
    }

    await setDoc(doc(this.firestore, collectionName, userId), userData);
    return userData;
  }

  private async getUserData(userId: string): Promise<User> {
    const collections = [
      APP_CONSTANTS.COLLECTIONS.ADMIN_USERS, // Contains both admins and viewers
      'users' // Contains applicants
    ];

    for (const collectionName of collections) {
      const docRef = doc(this.firestore, collectionName, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        
        // If from the 'users' collection, transform to match our User interface
        if (collectionName === 'users') {
          return {
            userId: userData['uid'] || userId,
            name: `${userData['firstName'] || ''} ${userData['lastName'] || ''}`.trim(),
            email: userData['email'],
            role: userData['role'],
            phase: userData['phase'],
            status: userData['status'], // 🔥 CRITICAL FIX: Include the status field!
            isAccepted: userData['isAccepted'],
            webinarAttended: userData['webinarAttended'],
            interviewerId: userData['interviewerId'],
            cohortId: userData['cohortId'],
            profileData: userData['profileData'],
            createdAt: userData['createdAt'],
            updatedAt: userData['updatedAt']
          } as User;
        }
        
        return userData as User;
      }
    }

    throw new Error('User data not found');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: UserRole): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }

  isViewer(): boolean {
    return this.hasRole(UserRole.VIEWER);
  }

  isApplicant(): boolean {
    return this.hasRole(UserRole.APPLICANT);
  }

  canReadAll(): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;
    
    return currentUser.role === UserRole.ADMIN || 
           (currentUser.role === UserRole.VIEWER && (currentUser as ViewerUser).canView);
  }

  canWrite(): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;
    
    return currentUser.role === UserRole.ADMIN && (currentUser as AdminUser).isActive;
  }

  async updateUserProfile(updates: Partial<User>): Promise<void> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const collectionName = this.getCollectionNameForRole(currentUser.role);
    const updatedUser = { 
      ...currentUser, 
      ...updates, 
      updatedAt: new Date() 
    } as User;

    await setDoc(doc(this.firestore, collectionName, currentUser.userId), updatedUser);

    // Update the local user state immediately to prevent stale data
    this.currentUserSubject.next(updatedUser);
  }

  /**
   * Refreshes the current user data from Firestore
   * Useful when user data has been updated externally
   */
  async refreshCurrentUser(): Promise<User | null> {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) {
      return null;
    }

    try {
      const userData = await this.getUserData(firebaseUser.uid);
      this.currentUserSubject.next(userData);
      return userData;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      throw error;
    }
  }

  private getCollectionNameForRole(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return APP_CONSTANTS.COLLECTIONS.ADMIN_USERS;
      case UserRole.VIEWER:
        return APP_CONSTANTS.COLLECTIONS.ADMIN_USERS; // Viewers stored in admin_users collection
      case UserRole.APPLICANT:
        return 'users'; // Applicants stored in users collection
      default:
        throw new Error('Invalid user role');
    }
  }
}