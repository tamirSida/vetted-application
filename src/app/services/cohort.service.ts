import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, deleteDoc, Timestamp, limit, startAfter, DocumentSnapshot } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { Cohort, CohortCreateRequest, CohortUpdateRequest, CohortOverlapCheck, CohortValidationError } from '../models/cohort.models';
import { Webinar } from '../models/webinar.models';
import { APP_CONSTANTS } from '../constants';

@Injectable({
  providedIn: 'root'
})
export class CohortService {
  private firestore = inject(Firestore);

  async createCohort(cohortRequest: CohortCreateRequest): Promise<Cohort> {
    try {
      // Convert ET dates to UTC
      const utcDates = this.convertETDatesToUTC(cohortRequest);
      
      // Check for overlapping cohorts
      const overlapCheck = await this.checkCohortOverlap(utcDates);
      if (overlapCheck.hasOverlap) {
        throw new Error(APP_CONSTANTS.ERROR_MESSAGES.COHORT_OVERLAP);
      }

      // Validate date logic
      const validationErrors = this.validateCohortDates(utcDates);
      if (validationErrors.length > 0) {
        throw new Error(`Validation errors: ${validationErrors.map(e => e.message).join(', ')}`);
      }

      const cohort: Cohort = {
        ...utcDates,
        name: cohortRequest.name,
        description: cohortRequest.description || '',
        currentApplicantCount: 0,
        isActive: true,
        webinars: cohortRequest.webinars || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const cohortRef = await addDoc(collection(this.firestore, APP_CONSTANTS.COLLECTIONS.COHORTS), cohort);
      const createdCohort = { ...cohort, id: cohortRef.id };

      return createdCohort;
    } catch (error) {
      console.error('Error creating cohort:', error);
      throw error;
    }
  }

  async updateCohort(cohortId: string, updates: CohortUpdateRequest): Promise<void> {
    try {
      let processedUpdates: any = { ...updates };

      // Convert ET dates to UTC if date fields are being updated
      if (this.hasDateUpdates(updates)) {
        const utcDates = this.convertETDatesToUTC(updates);
        processedUpdates = { ...processedUpdates, ...utcDates };

        // Check for overlaps if dates are being updated
        const overlapCheck = await this.checkCohortOverlapForUpdate(cohortId, processedUpdates);
        if (overlapCheck.hasOverlap) {
          throw new Error(APP_CONSTANTS.ERROR_MESSAGES.COHORT_OVERLAP);
        }

        // Validate updated dates
        const existingCohort = await this.getCohortById(cohortId);
        if (existingCohort) {
          const mergedData = { ...existingCohort, ...processedUpdates };
          const validationErrors = this.validateCohortDates(mergedData);
          if (validationErrors.length > 0) {
            throw new Error(`Validation errors: ${validationErrors.map(e => e.message).join(', ')}`);
          }
        }
      }

      const cohortRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.COHORTS, cohortId);
      await updateDoc(cohortRef, {
        ...processedUpdates,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating cohort:', error);
      throw error;
    }
  }

  async getCohortById(cohortId: string): Promise<Cohort | null> {
    try {
      const cohortRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.COHORTS, cohortId);
      const cohortSnap = await getDoc(cohortRef);
      
      if (cohortSnap.exists()) {
        const data = cohortSnap.data();
        return {
          id: cohortSnap.id,
          ...data,
          // Convert Firestore Timestamps back to Dates
          programStartDate: this.convertTimestampToDate(data['programStartDate']),
          programEndDate: this.convertTimestampToDate(data['programEndDate']),
          applicationStartDate: this.convertTimestampToDate(data['applicationStartDate']),
          applicationEndDate: this.convertTimestampToDate(data['applicationEndDate']),
          createdAt: this.convertTimestampToDate(data['createdAt']),
          updatedAt: this.convertTimestampToDate(data['updatedAt'])
        } as Cohort;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting cohort by ID:', error);
      throw error;
    }
  }

  async getAllCohorts(): Promise<Cohort[]> {
    try {
      const cohortsQuery = query(
        collection(this.firestore, APP_CONSTANTS.COLLECTIONS.COHORTS)
      );
      
      const querySnapshot = await getDocs(cohortsQuery);
      const cohorts: Cohort[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        cohorts.push({
          id: doc.id,
          ...data,
          programStartDate: this.convertTimestampToDate(data['programStartDate']),
          programEndDate: this.convertTimestampToDate(data['programEndDate']),
          applicationStartDate: this.convertTimestampToDate(data['applicationStartDate']),
          applicationEndDate: this.convertTimestampToDate(data['applicationEndDate']),
          createdAt: this.convertTimestampToDate(data['createdAt']),
          updatedAt: this.convertTimestampToDate(data['updatedAt'])
        } as Cohort);
      });
      
      return cohorts;
    } catch (error) {
      console.error('Error getting all cohorts:', error);
      throw error;
    }
  }

  async getActiveCohort(): Promise<Cohort | null> {
    try {
      const now = new Date();
      const cohortsQuery = query(
        collection(this.firestore, APP_CONSTANTS.COLLECTIONS.COHORTS),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(cohortsQuery);
      
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const cohort = {
          id: docSnap.id,
          ...data,
          programStartDate: this.convertTimestampToDate(data['programStartDate']),
          programEndDate: this.convertTimestampToDate(data['programEndDate']),
          applicationStartDate: this.convertTimestampToDate(data['applicationStartDate']),
          applicationEndDate: this.convertTimestampToDate(data['applicationEndDate']),
          createdAt: this.convertTimestampToDate(data['createdAt']),
          updatedAt: this.convertTimestampToDate(data['updatedAt'])
        } as Cohort;

        // Check if current time is within application period
        if (now >= cohort.applicationStartDate && now <= cohort.applicationEndDate) {
          return cohort;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting active cohort:', error);
      throw error;
    }
  }

  async checkCohortOverlap(cohortDates: any): Promise<CohortOverlapCheck> {
    try {
      const existingCohorts = await this.getAllCohorts();
      const overlapping: Cohort[] = [];

      for (const existingCohort of existingCohorts) {
        if (this.datesOverlap(cohortDates, existingCohort)) {
          overlapping.push(existingCohort);
        }
      }

      return {
        hasOverlap: overlapping.length > 0,
        overlappingCohorts: overlapping.length > 0 ? overlapping : undefined
      };
    } catch (error) {
      console.error('Error checking cohort overlap:', error);
      throw error;
    }
  }

  private async checkCohortOverlapForUpdate(cohortId: string, updatedData: any): Promise<CohortOverlapCheck> {
    try {
      const existingCohorts = await this.getAllCohorts();
      const overlapping: Cohort[] = [];

      for (const existingCohort of existingCohorts) {
        // Skip the cohort being updated
        if (existingCohort.id === cohortId) continue;

        if (this.datesOverlap(updatedData, existingCohort)) {
          overlapping.push(existingCohort);
        }
      }

      return {
        hasOverlap: overlapping.length > 0,
        overlappingCohorts: overlapping.length > 0 ? overlapping : undefined
      };
    } catch (error) {
      console.error('Error checking cohort overlap for update:', error);
      throw error;
    }
  }

  private datesOverlap(cohort1: any, cohort2: any): boolean {
    const c1AppStart = new Date(cohort1.applicationStartDate);
    const c1AppEnd = new Date(cohort1.applicationEndDate);
    const c1ProgStart = new Date(cohort1.programStartDate);
    const c1ProgEnd = new Date(cohort1.programEndDate);

    const c2AppStart = new Date(cohort2.applicationStartDate);
    const c2AppEnd = new Date(cohort2.applicationEndDate);
    const c2ProgStart = new Date(cohort2.programStartDate);
    const c2ProgEnd = new Date(cohort2.programEndDate);

    // Check application period overlap
    const appOverlap = !(c1AppEnd < c2AppStart || c2AppEnd < c1AppStart);
    
    // Check program period overlap
    const progOverlap = !(c1ProgEnd < c2ProgStart || c2ProgEnd < c1ProgStart);

    return appOverlap || progOverlap;
  }

  private validateCohortDates(cohortData: any): CohortValidationError[] {
    const errors: CohortValidationError[] = [];

    const appStart = new Date(cohortData.applicationStartDate);
    const appEnd = new Date(cohortData.applicationEndDate);
    const progStart = new Date(cohortData.programStartDate);
    const progEnd = new Date(cohortData.programEndDate);

    // Application start must be before application end
    if (appStart >= appEnd) {
      errors.push({
        field: 'applicationStartDate',
        message: 'Application start date must be before application end date'
      });
    }

    // Program start must be before program end
    if (progStart >= progEnd) {
      errors.push({
        field: 'programStartDate',
        message: 'Program start date must be before program end date'
      });
    }

    // Application period should end before or on program start
    if (appEnd > progStart) {
      errors.push({
        field: 'applicationEndDate',
        message: 'Application period should end before program starts'
      });
    }


    return errors;
  }

  private convertETDatesToUTC(data: any): any {
    const result = { ...data };
    
    const dateFields = ['programStartDate', 'programEndDate', 'applicationStartDate', 'applicationEndDate'];
    
    dateFields.forEach(field => {
      if (result[field]) {
        // The date is already in the correct format from the admin component
        // No conversion needed - just pass it through
        result[field] = result[field];
      }
    });

    return result;
  }

  private convertTimestampToDate(timestamp: any): Date {
    if (timestamp && timestamp.toDate) {
      // Firestore Timestamp
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    return new Date();
  }

  private hasDateUpdates(updates: CohortUpdateRequest): boolean {
    return !!(updates.programStartDate || updates.programEndDate || 
              updates.applicationStartDate || updates.applicationEndDate);
  }

  async incrementApplicantCount(cohortId: string): Promise<void> {
    try {
      const cohort = await this.getCohortById(cohortId);
      if (cohort) {
        const newCount = (cohort.currentApplicantCount || 0) + 1;
        await this.updateCohort(cohortId, { 
          currentApplicantCount: newCount 
        });
      }
    } catch (error) {
      console.error('Error incrementing applicant count:', error);
      throw error;
    }
  }

  async decrementApplicantCount(cohortId: string): Promise<void> {
    try {
      const cohort = await this.getCohortById(cohortId);
      if (cohort) {
        const newCount = Math.max(0, (cohort.currentApplicantCount || 0) - 1);
        await this.updateCohort(cohortId, { 
          currentApplicantCount: newCount 
        });
      }
    } catch (error) {
      console.error('Error decrementing applicant count:', error);
      throw error;
    }
  }

  async deactivateCohort(cohortId: string): Promise<void> {
    try {
      await this.updateCohort(cohortId, { isActive: false });
    } catch (error) {
      console.error('Error deactivating cohort:', error);
      throw error;
    }
  }

  async activateCohort(cohortId: string): Promise<void> {
    try {
      // Check for overlaps before activating
      const cohort = await this.getCohortById(cohortId);
      if (cohort) {
        const overlapCheck = await this.checkCohortOverlapForUpdate(cohortId, { ...cohort, isActive: true });
        if (overlapCheck.hasOverlap) {
          throw new Error(APP_CONSTANTS.ERROR_MESSAGES.COHORT_OVERLAP);
        }
        
        await this.updateCohort(cohortId, { isActive: true });
      }
    } catch (error) {
      console.error('Error activating cohort:', error);
      throw error;
    }
  }

  async deleteCohort(cohortId: string): Promise<void> {
    try {
      const cohortRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.COHORTS, cohortId);
      await deleteDoc(cohortRef);
    } catch (error) {
      console.error('Error deleting cohort:', error);
      throw error;
    }
  }

  async getCohortsPaginated(pageSize: number, lastDoc?: DocumentSnapshot): Promise<{
    cohorts: Cohort[];
    lastDoc: DocumentSnapshot | null;
    hasMore: boolean;
  }> {
    return new Promise((resolve, reject) => {
      try {
        let cohortsQuery = query(
          collection(this.firestore, APP_CONSTANTS.COLLECTIONS.COHORTS),
          limit(pageSize)
        );

        if (lastDoc) {
          cohortsQuery = query(cohortsQuery, startAfter(lastDoc));
        }

        getDocs(cohortsQuery).then(querySnapshot => {
          const cohorts: Cohort[] = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            cohorts.push({
              id: doc.id,
              ...data,
              programStartDate: data['programStartDate']?.toDate() || new Date(),
              programEndDate: data['programEndDate']?.toDate() || new Date(),
              applicationStartDate: data['applicationStartDate']?.toDate() || new Date(),
              applicationEndDate: data['applicationEndDate']?.toDate() || new Date(),
              createdAt: data['createdAt']?.toDate() || new Date(),
              updatedAt: data['updatedAt']?.toDate() || new Date(),
            } as Cohort);
          });

          resolve({
            cohorts,
            lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
            hasMore: querySnapshot.docs.length === pageSize
          });
        }).catch(error => {
          console.error('Error getting paginated cohorts:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Error getting paginated cohorts:', error);
        reject(error);
      }
    });
  }
}