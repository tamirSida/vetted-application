import { Injectable, inject } from '@angular/core';
import { Phase1Application, Phase3Application, EquityBreakdownRow } from '../models';
import { UserService } from './user.service';

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
  private userService = inject(UserService);

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

  /**
   * Analyze application and handle auto-advancement if eligible
   */
  async analyzeAndProcessApplication(application: Phase1Application, applicantId: string): Promise<FlaggingResult> {
    const result = this.analyzeApplication(application);
    
    // Auto-advance if no red flags
    if (result.autoAdvance) {
      console.log(`Application ${application.id} is eligible for auto-advancement`);
      console.log(`Attempting to auto-advance applicant: ${applicantId}`);
      
      try {
        const advanced = await this.userService.processAutoAdvancement(applicantId);
        if (advanced) {
          console.log(`Successfully auto-advanced applicant ${applicantId} to Phase 2`);
        } else {
          console.log(`Failed to auto-advance applicant ${applicantId} - processAutoAdvancement returned false`);
        }
      } catch (error) {
        console.error(`Error during auto-advancement for applicant ${applicantId}:`, error);
      }
    } else {
      console.log(`Application ${application.id} requires manual review due to red flags`);
    }
    
    return result;
  }

  /**
   * Analyze a Phase 3 application and flag potential issues
   * @param application The Phase 3 application to analyze
   * @returns FlaggingResult containing all flags
   */
  analyzePhase3Application(application: Phase3Application): FlaggingResult {
    const flags: ApplicationFlag[] = [];

    // Check Phase 3 Yellow Flags
    this.checkPhase3YellowFlags(application, flags);
    
    // No red flags for Phase 3 - only yellow flags for admin review
    const hasRedFlags = false; // Phase 3 doesn't have auto-blocking red flags
    const autoAdvance = false; // Phase 3 applications always need manual review
    const needsReview = true;   // Always needs manual review

    return {
      applicationId: application.id || '',
      flags,
      autoAdvance,
      needsReview
    };
  }

  /**
   * Check for Phase 3 Yellow Flags according to the specified criteria
   */
  private checkPhase3YellowFlags(application: Phase3Application, flags: ApplicationFlag[]): void {
    // Yellow Flag: Problem & Customer analysis (placeholder for LLM analysis)
    // This will be handled by the LLM service, but we can add a flag if no analysis exists
    if (!application.llmAnalysis?.problemCustomerScore) {
      flags.push({
        type: 'YELLOW',
        message: 'Problem & Customer description needs LLM analysis',
        field: 'problemCustomer',
        severity: 'yellow'
      });
    } else if (application.llmAnalysis.problemCustomerScore < 7) { // Assuming 1-10 scale
      flags.push({
        type: 'YELLOW',
        message: 'Problem & Customer description may be too vague or off-target',
        field: 'problemCustomer',
        severity: 'yellow'
      });
    }

    // Yellow Flag: Capacity not all full-time
    if (application.teamInfo.capacity !== 'ALL_FULLTIME') {
      flags.push({
        type: 'YELLOW',
        message: 'Team capacity is not all full-time',
        field: 'capacity',
        severity: 'yellow'
      });
    }

    // Yellow Flag: Previous founders who left
    if (application.teamInfo.previousFounders === true) {
      flags.push({
        type: 'YELLOW',
        message: 'Has previous co-founders who are no longer with the company',
        field: 'previousFounders',
        severity: 'yellow'
      });
    }

    // Yellow Flag: Equity breakdown issues
    this.checkEquityBreakdownFlags(application.fundingInfo.equityBreakdown, flags);

    // Yellow Flag: Corporate structure issues
    this.checkCorporateStructureFlags(application, flags);
  }

  /**
   * Check equity breakdown for potential issues
   */
  private checkEquityBreakdownFlags(equityBreakdown: EquityBreakdownRow[], flags: ApplicationFlag[]): void {
    if (!equityBreakdown || equityBreakdown.length === 0) {
      flags.push({
        type: 'YELLOW',
        message: 'No equity breakdown provided',
        field: 'equityBreakdown',
        severity: 'yellow'
      });
      return;
    }

    // Calculate total percentages by category
    const founderRows = equityBreakdown.filter(row => row.category === 'founder');
    const employeeRows = equityBreakdown.filter(row => row.category === 'employee');
    const investorRows = equityBreakdown.filter(row => row.category === 'investor');

    const totalFounderPercentage = founderRows.reduce((sum, row) => sum + (row.percentage || 0), 0);
    const totalInvestorPercentage = investorRows.reduce((sum, row) => sum + (row.percentage || 0), 0);
    const totalPercentage = equityBreakdown.reduce((sum, row) => sum + (row.percentage || 0), 0);

    // Yellow Flag: Founders collectively own <70%
    if (totalFounderPercentage < 70) {
      flags.push({
        type: 'YELLOW',
        message: `Founders collectively own ${totalFounderPercentage.toFixed(1)}% (should be ≥70%)`,
        field: 'equityBreakdown',
        severity: 'yellow'
      });
    }

    // Yellow Flag: Single founder with no other team members and owns <80%
    if (founderRows.length === 1 && totalFounderPercentage < 80) {
      flags.push({
        type: 'YELLOW',
        message: `Single founder owns ${totalFounderPercentage.toFixed(1)}% (should be ≥80% for solo founders)`,
        field: 'equityBreakdown',
        severity: 'yellow'
      });
    }

    // Yellow Flag: More than 5 investors already on cap table
    if (investorRows.length > 5) {
      flags.push({
        type: 'YELLOW',
        message: `${investorRows.length} investors on cap table (suggests poor fundraising hygiene)`,
        field: 'equityBreakdown',
        severity: 'yellow'
      });
    }

    // Yellow Flag: Uneven founder ownership
    if (founderRows.length === 2) {
      const [founder1, founder2] = founderRows.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
      const difference = (founder1.percentage || 0) - (founder2.percentage || 0);
      if (difference > 20) {
        flags.push({
          type: 'YELLOW',
          message: `Founder equity split is uneven (${difference.toFixed(1)}% difference)`,
          field: 'equityBreakdown',
          severity: 'yellow'
        });
      }
    } else if (founderRows.length >= 3) {
      const sortedFounders = founderRows.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
      for (let i = 0; i < sortedFounders.length - 1; i++) {
        const difference = (sortedFounders[i].percentage || 0) - (sortedFounders[i + 1].percentage || 0);
        if (difference > 15) {
          flags.push({
            type: 'YELLOW',
            message: `Founder equity split is uneven (max ${difference.toFixed(1)}% difference between founders)`,
            field: 'equityBreakdown',
            severity: 'yellow'
          });
          break;
        }
      }
    }

    // Yellow Flag: Total doesn't equal 100%
    if (Math.abs(totalPercentage - 100) > 0.1) {
      flags.push({
        type: 'YELLOW',
        message: `Total ownership is ${totalPercentage.toFixed(1)}% (should be 100%)`,
        field: 'equityBreakdown',
        severity: 'yellow'
      });
    }
  }

  /**
   * Check corporate structure for potential issues
   */
  private checkCorporateStructureFlags(application: Phase3Application, flags: ApplicationFlag[]): void {
    const legalInfo = application.legalInfo;

    // Yellow Flag: Not incorporated and doesn't agree to incorporate
    if (!legalInfo.isIncorporated && legalInfo.agreesToIncorporate === 'DISCUSS') {
      flags.push({
        type: 'YELLOW',
        message: 'Not incorporated and wants to discuss incorporation terms',
        field: 'agreesToIncorporate',
        severity: 'yellow'
      });
    }

    // Yellow Flag: Incorporated but missing standard venture terms
    if (legalInfo.isIncorporated) {
      const missingTerms = [];
      
      if (!legalInfo.hasIpAssignment) {
        missingTerms.push('IP Assignment');
      }
      
      if (!legalInfo.hasFounderVesting) {
        missingTerms.push('Founder Vesting');
      }
      
      if (!legalInfo.hasBoardStructure) {
        missingTerms.push('Board Structure');
      }

      if (missingTerms.length > 0) {
        // Yellow Flag: Missing terms but won't amend documents
        if (legalInfo.willAmendDocuments === false) {
          flags.push({
            type: 'YELLOW',
            message: `Missing standard venture terms (${missingTerms.join(', ')}) and unwilling to amend documents`,
            field: 'willAmendDocuments',
            severity: 'yellow'
          });
        } else {
          flags.push({
            type: 'YELLOW',
            message: `Missing standard venture terms: ${missingTerms.join(', ')}`,
            field: 'corporateStructure',
            severity: 'yellow'
          });
        }
      }
    }
  }

  /**
   * Generate a human-readable summary for Phase 3 flags
   */
  generatePhase3FlagSummary(result: FlaggingResult): string {
    if (result.flags.length === 0) {
      return 'Phase 3 application appears clean with no issues detected. Ready for manual review.';
    }

    const yellowCount = result.flags.filter(f => f.type === 'YELLOW').length;
    
    if (yellowCount > 0) {
      const flagList = result.flags.map(f => f.message).join('; ');
      return `Phase 3 application flagged with ${yellowCount} yellow flag${yellowCount > 1 ? 's' : ''}. Issues: ${flagList}. Manual review required.`;
    }

    return 'Phase 3 application ready for manual review.';
  }
}