import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';

export interface SystemSettings {
  skipPhase2: boolean; // When true, automatically promote Phase 1 → Phase 3 (skip Phase 2)
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private firestore = inject(Firestore);
  private readonly SETTINGS_DOC_ID = 'system_settings';

  /**
   * Get current system settings
   */
  async getSettings(): Promise<SystemSettings> {
    try {
      const docRef = doc(this.firestore, 'settings', this.SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          skipPhase2: data['skipPhase2'] ?? true, // Default to true
          createdAt: data['createdAt']?.toDate(),
          updatedAt: data['updatedAt']?.toDate()
        };
      } else {
        // Create default settings if document doesn't exist
        const defaultSettings: SystemSettings = {
          skipPhase2: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await setDoc(docRef, {
          ...defaultSettings,
          createdAt: defaultSettings.createdAt,
          updatedAt: defaultSettings.updatedAt
        });
        
        return defaultSettings;
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Return safe defaults on error
      return {
        skipPhase2: true
      };
    }
  }

  /**
   * Update system settings
   */
  async updateSettings(settings: Partial<SystemSettings>): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'settings', this.SETTINGS_DOC_ID);
      
      const updateData = {
        ...settings,
        updatedAt: new Date()
      };

      await updateDoc(docRef, updateData);
      console.log('✅ Settings updated successfully');
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      throw new Error('Failed to update settings. Please try again.');
    }
  }

  /**
   * Toggle the Phase 2 skip setting
   */
  async toggleSkipPhase2(): Promise<boolean> {
    const currentSettings = await this.getSettings();
    const newValue = !currentSettings.skipPhase2;
    
    await this.updateSettings({ skipPhase2: newValue });
    return newValue;
  }

  /**
   * Check if Phase 2 should be skipped
   */
  async shouldSkipPhase2(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.skipPhase2;
  }
}