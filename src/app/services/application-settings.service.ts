import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, getDoc, updateDoc } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApplicationSettings, ApplicationSettingsUpdate } from '../models/settings.models';
import { APP_CONSTANTS } from '../constants';

@Injectable({
  providedIn: 'root'
})
export class ApplicationSettingsService {
  private firestore = inject(Firestore);

  private applicationSettingsSubject = new BehaviorSubject<ApplicationSettings>({
    acceptingApplications: true,
    lastUpdatedBy: 'system',
    lastUpdatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  public applicationSettings$ = this.applicationSettingsSubject.asObservable();

  private readonly SETTINGS_DOC_ID = 'application-settings';

  constructor() {
    this.initializeApplicationSettings();
  }

  private async initializeApplicationSettings(): Promise<void> {
    try {
      const settings = await this.getApplicationSettings();
      if (settings) {
        this.applicationSettingsSubject.next(settings);
      }
    } catch (error) {
      console.error('Error initializing application settings:', error);
    }
  }

  async getApplicationSettings(): Promise<ApplicationSettings | null> {
    try {
      const settingsRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.SETTINGS, this.SETTINGS_DOC_ID);
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        return {
          id: settingsSnap.id,
          ...data,
          lastUpdatedAt: this.convertTimestampToDate(data['lastUpdatedAt']),
          createdAt: this.convertTimestampToDate(data['createdAt']),
          updatedAt: this.convertTimestampToDate(data['updatedAt'])
        } as ApplicationSettings;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting application settings:', error);
      throw error;
    }
  }

  async updateApplicationSettings(updates: ApplicationSettingsUpdate): Promise<void> {
    try {
      const settingsRef = doc(this.firestore, APP_CONSTANTS.COLLECTIONS.SETTINGS, this.SETTINGS_DOC_ID);
      const existingSettings = await this.getApplicationSettings();
      
      if (existingSettings) {
        await updateDoc(settingsRef, {
          ...updates,
          lastUpdatedAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        // Create new settings document
        const newSettings: ApplicationSettings = {
          acceptingApplications: updates.acceptingApplications ?? true,
          lastUpdatedBy: updates.lastUpdatedBy || 'system',
          lastUpdatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await setDoc(settingsRef, newSettings);
      }
      
      // Refresh application settings
      const newSettings = await this.getApplicationSettings();
      if (newSettings) {
        this.applicationSettingsSubject.next(newSettings);
      }
    } catch (error) {
      console.error('Error updating application settings:', error);
      throw error;
    }
  }

  async toggleApplicationAcceptance(userId: string): Promise<void> {
    try {
      const settings = await this.getApplicationSettings();
      const newState = settings ? !settings.acceptingApplications : false;
      
      await this.updateApplicationSettings({
        acceptingApplications: newState,
        lastUpdatedBy: userId
      });
    } catch (error) {
      console.error('Error toggling application acceptance:', error);
      throw error;
    }
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

  // Get current settings synchronously (from cache)
  getCurrentApplicationSettings(): ApplicationSettings {
    return this.applicationSettingsSubject.value;
  }

  // Check if applications are stopped
  isApplicationsStopped(): boolean {
    return !this.applicationSettingsSubject.value.acceptingApplications;
  }
}