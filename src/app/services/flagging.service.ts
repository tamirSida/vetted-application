import { Injectable } from '@angular/core';
import { Phase1Application } from '../models';

export interface ApplicationFlag {
  type: 'WARNING' | 'ERROR' | 'INFO';
  message: string;
  field?: string;
  severity: number; // 1-5, 5 being most severe
}

export interface FlaggingResult {
  applicationId: string;
  flags: ApplicationFlag[];
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  needsReview: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FlaggingService {

  /**
   * Analyze a Phase 1 application and flag potential issues
   * @param application The Phase 1 application to analyze
   * @returns FlaggingResult containing all flags and risk assessment
   */
  analyzeApplication(application: Phase1Application): FlaggingResult {
    const flags: ApplicationFlag[] = [];

    // Company Information Flags
    flags.push(...this.analyzeCompanyInfo(application));
    
    // Personal Information Flags
    flags.push(...this.analyzePersonalInfo(application));
    
    // Extended Information Flags
    flags.push(...this.analyzeExtendedInfo(application));
    
    // Cross-field Analysis
    flags.push(...this.analyzeCrossFields(application));

    // Calculate overall risk
    const overallRisk = this.calculateOverallRisk(flags);
    const needsReview = this.determineReviewNeed(flags, overallRisk);

    return {
      applicationId: application.id || '',
      flags,
      overallRisk,
      needsReview
    };
  }

  /**
   * Analyze company information for potential red flags
   */
  private analyzeCompanyInfo(application: Phase1Application): ApplicationFlag[] {
    const flags: ApplicationFlag[] = [];
    const { companyInfo } = application;

    // Generic company names
    const genericNames = ['startup', 'company', 'llc', 'inc', 'corp', 'business', 'venture'];
    const companyName = companyInfo.companyName?.toLowerCase() || '';
    
    if (genericNames.some(generic => companyName.includes(generic) && companyName.length < 15)) {
      flags.push({
        type: 'WARNING',
        message: 'Company name appears generic or placeholder',
        field: 'companyName',
        severity: 2
      });
    }

    // No website provided
    if (!companyInfo.companyWebsite) {
      flags.push({
        type: 'INFO',
        message: 'No company website provided',
        field: 'companyWebsite',
        severity: 1
      });
    }

    // Invalid website URL patterns
    if (companyInfo.companyWebsite) {
      const suspiciousPatterns = ['example.com', 'test.com', 'placeholder', 'wix.com', 'wordpress.com'];
      if (suspiciousPatterns.some(pattern => companyInfo.companyWebsite?.includes(pattern))) {
        flags.push({
          type: 'WARNING',
          message: 'Website appears to be a placeholder or template',
          field: 'companyWebsite',
          severity: 3
        });
      }
    }

    // Generic roles that might indicate lack of clarity
    const genericRoles = ['founder', 'owner', 'entrepreneur', 'boss'];
    const role = application.extendedInfo?.role?.toLowerCase() || '';
    
    if (genericRoles.includes(role) && role.length < 10) {
      flags.push({
        type: 'INFO',
        message: 'Role description is very generic',
        field: 'role',
        severity: 1
      });
    }

    return flags;
  }

  /**
   * Analyze personal information for potential issues
   */
  private analyzePersonalInfo(application: Phase1Application): ApplicationFlag[] {
    const flags: ApplicationFlag[] = [];
    const { personalInfo } = application;

    // Suspicious email patterns
    const suspiciousEmailPatterns = ['test@', '@test.', 'fake@', '@fake.', 'example@', '@example.'];
    const email = personalInfo.email?.toLowerCase() || '';
    
    if (suspiciousEmailPatterns.some(pattern => email.includes(pattern))) {
      flags.push({
        type: 'ERROR',
        message: 'Email appears to be a test or fake address',
        field: 'email',
        severity: 4
      });
    }

    // Temporary email services
    const tempEmailDomains = ['10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'temp-mail.org'];
    if (tempEmailDomains.some(domain => email.includes(domain))) {
      flags.push({
        type: 'ERROR',
        message: 'Temporary email service detected',
        field: 'email',
        severity: 5
      });
    }

    // Phone number patterns that might be fake
    const phone = personalInfo.phone || '';
    const phoneDigits = phone.replace(/\D/g, '');
    
    // Common fake patterns
    const fakePatterns = ['1234567890', '0000000000', '1111111111', '5555555555'];
    if (fakePatterns.includes(phoneDigits)) {
      flags.push({
        type: 'WARNING',
        message: 'Phone number appears to be placeholder or fake',
        field: 'phone',
        severity: 3
      });
    }

    // Names that might be fake or test
    const suspiciousNames = ['test', 'fake', 'john doe', 'jane doe', 'admin', 'user'];
    const fullName = `${personalInfo.firstName} ${personalInfo.lastName}`.toLowerCase();
    
    if (suspiciousNames.some(name => fullName.includes(name))) {
      flags.push({
        type: 'WARNING',
        message: 'Name appears to be a placeholder or test entry',
        field: 'firstName',
        severity: 3
      });
    }

    return flags;
  }

  /**
   * Analyze extended information for quality and completeness
   */
  private analyzeExtendedInfo(application: Phase1Application): ApplicationFlag[] {
    const flags: ApplicationFlag[] = [];
    const { extendedInfo } = application;

    // LinkedIn profile analysis
    const linkedIn = extendedInfo.linkedInProfile || '';
    if (!linkedIn.includes('linkedin.com')) {
      flags.push({
        type: 'WARNING',
        message: 'LinkedIn profile URL format appears incorrect',
        field: 'linkedInProfile',
        severity: 2
      });
    }

    // Service history validation
    if (!extendedInfo.serviceHistory?.unit || extendedInfo.serviceHistory.unit.length < 3) {
      flags.push({
        type: 'WARNING',
        message: 'Military unit information appears incomplete',
        field: 'serviceUnit',
        severity: 2
      });
    }

    // Grandma test quality
    const grandmaTest = extendedInfo.grandmaTest || '';
    if (grandmaTest.length < 50) {
      flags.push({
        type: 'INFO',
        message: 'Company description is very brief',
        field: 'grandmaTest',
        severity: 1
      });
    }

    // Generic or vague company descriptions
    const vaguePhrases = ['we help', 'we provide', 'we offer', 'we are', 'we do'];
    if (vaguePhrases.every(phrase => !grandmaTest.toLowerCase().includes(phrase)) && grandmaTest.length > 0) {
      // Good - specific description
    } else if (grandmaTest.split(' ').length < 10) {
      flags.push({
        type: 'WARNING',
        message: 'Company description lacks detail or specificity',
        field: 'grandmaTest',
        severity: 2
      });
    }

    // Discovery source analysis
    const discovery = extendedInfo.discovery?.toLowerCase() || '';
    if (discovery.includes('google') || discovery.includes('search')) {
      flags.push({
        type: 'INFO',
        message: 'Found through organic search - may need additional qualification',
        field: 'discovery',
        severity: 1
      });
    }

    // Pitch deck analysis
    if (!extendedInfo.pitchDeck?.fileUrl && !extendedInfo.pitchDeck?.nodeckExplanation) {
      flags.push({
        type: 'INFO',
        message: 'No pitch deck or explanation provided',
        severity: 1
      });
    } else if (extendedInfo.pitchDeck?.nodeckExplanation) {
      const explanation = extendedInfo.pitchDeck.nodeckExplanation.toLowerCase();
      const validReasons = ['early stage', 'mvp', 'stealth', 'pre-seed', 'just starting'];
      
      if (!validReasons.some(reason => explanation.includes(reason))) {
        flags.push({
          type: 'WARNING',
          message: 'Pitch deck explanation may need clarification',
          field: 'nodeckExplanation',
          severity: 2
        });
      }
    }

    return flags;
  }

  /**
   * Analyze relationships between different fields
   */
  private analyzeCrossFields(application: Phase1Application): ApplicationFlag[] {
    const flags: ApplicationFlag[] = [];

    // Check if email domain matches company website
    const email = application.personalInfo.email || '';
    const website = application.companyInfo.companyWebsite || '';
    
    if (website && email) {
      const emailDomain = email.split('@')[1]?.toLowerCase();
      const websiteDomain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]?.toLowerCase();
      
      if (emailDomain && websiteDomain && emailDomain !== websiteDomain) {
        // Not necessarily a red flag, but worth noting
        flags.push({
          type: 'INFO',
          message: 'Email domain differs from company website',
          severity: 1
        });
      }
    }

    // Check for consistency in naming
    const companyName = application.companyInfo.companyName?.toLowerCase() || '';
    const grandmaTest = application.extendedInfo.grandmaTest?.toLowerCase() || '';
    
    if (companyName.length > 5 && grandmaTest.length > 10 && !grandmaTest.includes(companyName)) {
      flags.push({
        type: 'INFO',
        message: 'Company name not mentioned in description',
        severity: 1
      });
    }

    return flags;
  }

  /**
   * Calculate overall risk based on flags
   */
  private calculateOverallRisk(flags: ApplicationFlag[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const totalSeverity = flags.reduce((sum, flag) => sum + flag.severity, 0);
    const criticalFlags = flags.filter(f => f.severity >= 4).length;
    const warningFlags = flags.filter(f => f.type === 'WARNING').length;

    if (criticalFlags > 0 || totalSeverity > 15) {
      return 'CRITICAL';
    } else if (warningFlags >= 3 || totalSeverity > 8) {
      return 'HIGH';
    } else if (warningFlags >= 1 || totalSeverity > 3) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Determine if application needs manual review
   */
  private determineReviewNeed(flags: ApplicationFlag[], risk: string): boolean {
    // Always review critical and high-risk applications
    if (risk === 'CRITICAL' || risk === 'HIGH') {
      return true;
    }

    // Review if there are any error-level flags
    const hasErrors = flags.some(f => f.type === 'ERROR');
    if (hasErrors) {
      return true;
    }

    // Review if there are multiple warnings
    const warningCount = flags.filter(f => f.type === 'WARNING').length;
    if (warningCount >= 2) {
      return true;
    }

    return false;
  }

  /**
   * Generate a human-readable summary of flags
   */
  generateFlagSummary(result: FlaggingResult): string {
    if (result.flags.length === 0) {
      return 'Application appears clean with no issues detected.';
    }

    const criticalCount = result.flags.filter(f => f.type === 'ERROR').length;
    const warningCount = result.flags.filter(f => f.type === 'WARNING').length;
    const infoCount = result.flags.filter(f => f.type === 'INFO').length;

    let summary = '';
    
    if (criticalCount > 0) {
      summary += `${criticalCount} critical issue${criticalCount > 1 ? 's' : ''}`;
    }
    
    if (warningCount > 0) {
      if (summary) summary += ', ';
      summary += `${warningCount} warning${warningCount > 1 ? 's' : ''}`;
    }
    
    if (infoCount > 0) {
      if (summary) summary += ', ';
      summary += `${infoCount} informational note${infoCount > 1 ? 's' : ''}`;
    }
    
    return `Application flagged with ${summary}. Risk level: ${result.overallRisk}.`;
  }
}