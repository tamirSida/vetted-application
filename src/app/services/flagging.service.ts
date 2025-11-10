import { Injectable } from '@angular/core';
import { Phase1Application } from '../models';

export interface ApplicationFlag {
  type: 'YELLOW' | 'RED';
  message: string;
  field?: string;
  severity: 'yellow' | 'red';
}

export interface FlaggingResult {
  applicationId: string;
  flags: ApplicationFlag[];
  autoAdvance: boolean; // true if yellow/no flags, false if red flags
  needsReview: boolean; // true if red flags
}

@Injectable({
  providedIn: 'root'
})
export class FlaggingService {

  /**
   * Analyze a Phase 1 application and flag potential issues
   * @param application The Phase 1 application to analyze
   * @returns FlaggingResult containing all flags and progression logic
   */
  analyzeApplication(application: Phase1Application): FlaggingResult {
    const flags: ApplicationFlag[] = [];

    // Check Yellow Flags
    this.checkYellowFlags(application, flags);
    
    // Check Red Flags  
    this.checkRedFlags(application, flags);

    // Determine auto-advance and review needs
    const hasRedFlags = flags.some(flag => flag.type === 'RED');
    const autoAdvance = !hasRedFlags; // Auto-advance if no red flags
    const needsReview = hasRedFlags;   // Manual review if red flags

    return {
      applicationId: application.id || '',
      flags,
      autoAdvance,
      needsReview
    };
  }

  /**
   * Check for Yellow Flags according to exact criteria
   */
  private checkYellowFlags(application: Phase1Application, flags: ApplicationFlag[]): void {
    // Yellow Flag: No LinkedIn profile
    const linkedIn = application.extendedInfo?.linkedInProfile;
    if (!linkedIn || linkedIn.trim() === '') {
      flags.push({
        type: 'YELLOW',
        message: 'No LinkedIn profile provided',
        field: 'linkedInProfile',
        severity: 'yellow'
      });
    }

    // Yellow Flag: No website
    const website = application.companyInfo?.companyWebsite;
    if (!website || website.trim() === '') {
      flags.push({
        type: 'YELLOW',
        message: 'No company website provided',
        field: 'companyWebsite',
        severity: 'yellow'
      });
    }

    // Yellow Flag: No professional email domain
    const email = application.personalInfo?.email || '';
    const domain = email.split('@')[1]?.toLowerCase() || '';
    const nonprofessionalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
    if (nonprofessionalDomains.includes(domain)) {
      flags.push({
        type: 'YELLOW',
        message: 'Email domain is not professional',
        field: 'email',
        severity: 'yellow'
      });
    }

    // Yellow Flag: # of Founders is not 2 or 3
    const founderCount = application.extendedInfo?.founderCount;
    if (founderCount !== 2 && founderCount !== 3) {
      flags.push({
        type: 'YELLOW',
        message: 'Number of founders should be 2 or 3',
        field: 'founderCount',
        severity: 'yellow'
      });
    }

    // Yellow Flag: Didn't serve in combat unit
    const serviceUnit = application.extendedInfo?.serviceHistory?.unit?.toLowerCase() || '';
    const combatUnits = ['combat', 'infantry', 'armor', 'artillery', 'special forces', 'paratroopers', 'commandos', 'navy seals', 'air force'];
    const servedInCombat = combatUnits.some(unit => serviceUnit.includes(unit));
    if (application.extendedInfo?.serviceHistory?.country && !servedInCombat) {
      flags.push({
        type: 'YELLOW',
        message: 'Did not serve in combat unit',
        field: 'serviceUnit',
        severity: 'yellow'
      });
    }

    // Yellow Flag: No deck uploaded
    const hasDeck = application.extendedInfo?.pitchDeck?.fileUrl;
    const hasExplanation = application.extendedInfo?.pitchDeck?.nodeckExplanation;
    if (!hasDeck && !hasExplanation) {
      flags.push({
        type: 'YELLOW',
        message: 'No pitch deck uploaded and no explanation provided',
        field: 'pitchDeck',
        severity: 'yellow'
      });
    }
  }

  /**
   * Check for Red Flags according to exact criteria
   */
  private checkRedFlags(application: Phase1Application, flags: ApplicationFlag[]): void {
    // Red Flag: Didn't serve in the military
    const serviceCountry = application.extendedInfo?.serviceHistory?.country;
    if (!serviceCountry || serviceCountry.trim() === '') {
      flags.push({
        type: 'RED',
        message: 'Did not serve in the military',
        field: 'serviceHistory',
        severity: 'red'
      });
    }
  }

  /**
   * Generate a human-readable summary of flags
   */
  generateFlagSummary(result: FlaggingResult): string {
    if (result.flags.length === 0) {
      return 'Application appears clean with no issues detected.';
    }

    const redCount = result.flags.filter(f => f.type === 'RED').length;
    const yellowCount = result.flags.filter(f => f.type === 'YELLOW').length;

    let summary = '';
    
    if (redCount > 0) {
      summary += `${redCount} red flag${redCount > 1 ? 's' : ''}`;
    }
    
    if (yellowCount > 0) {
      if (summary) summary += ', ';
      summary += `${yellowCount} yellow flag${yellowCount > 1 ? 's' : ''}`;
    }
    
    const action = result.autoAdvance ? 'Auto-advance to Phase 2' : 'Manual review required';
    return `Application flagged with ${summary}. ${action}.`;
  }
}