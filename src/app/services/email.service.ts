import { Injectable } from '@angular/core';
import { ApplicantUser } from '../models';
import { 
  Phase1ApprovedEmailTemplate,
  Phase1ApprovedEmailData,
  Phase1RejectedEmailTemplate,
  Phase1RejectedEmailData
} from '../templates/email/phase1';
import { EMAIL_CONSTANTS } from '../constants';

export interface EmailRequest {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private readonly API_URL = '/.netlify/functions/send-email';
  private readonly FROM_EMAIL = 'application@thevetted.vc';

  constructor() {}

  /**
   * Send email via Netlify function and Resend API
   */
  private async sendEmail(emailData: EmailRequest): Promise<EmailResponse> {
    try {
      console.log('📧 Sending email via Resend:', {
        to: emailData.to,
        subject: emailData.subject,
        from: emailData.from || this.FROM_EMAIL
      });

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...emailData,
          from: emailData.from || this.FROM_EMAIL
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Email sent successfully:', result);
      
      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error: any) {
      console.error('❌ Email sending failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  /**
   * Extract name data from applicant, with fallbacks
   */
  private getApplicantNameData(applicant: ApplicantUser): { firstName: string; lastName: string } {
    // Try to get firstName and lastName directly
    if (applicant.firstName && applicant.lastName) {
      return {
        firstName: applicant.firstName,
        lastName: applicant.lastName
      };
    }
    
    // Fallback: try to extract from the name field
    if (applicant.name) {
      const nameParts = applicant.name.trim().split(' ');
      return {
        firstName: nameParts[0] || 'there',
        lastName: nameParts.slice(1).join(' ') || ''
      };
    }
    
    // Last resort fallback
    return {
      firstName: 'there',
      lastName: ''
    };
  }

  /**
   * Send Phase 1 approved email (registration confirmation)
   */
  async sendPhase1ApprovedEmail(applicant: ApplicantUser): Promise<EmailResponse> {
    const nameData = this.getApplicantNameData(applicant);
    const fullName = `${nameData.firstName}${nameData.lastName ? ' ' + nameData.lastName : ''}`;
    
    const emailData: Phase1ApprovedEmailData = {
      applicantName: fullName,
      dashboardUrl: this.getDashboardUrl()
    };

    console.log('📧 Sending Phase 1 approved email to:', {
      email: applicant.email,
      applicantName: fullName
    });

    const html = Phase1ApprovedEmailTemplate.generateHtml(emailData);
    const text = Phase1ApprovedEmailTemplate.generateBody(emailData);

    return this.sendEmail({
      to: applicant.email,
      subject: Phase1ApprovedEmailTemplate.generateSubject(),
      html,
      text
    });
  }

  /**
   * Send Phase 1 rejected email
   */
  async sendPhase1RejectedEmail(applicant: ApplicantUser): Promise<EmailResponse> {
    const nameData = this.getApplicantNameData(applicant);
    const fullName = `${nameData.firstName}${nameData.lastName ? ' ' + nameData.lastName : ''}`;
    
    const emailData: Phase1RejectedEmailData = {
      applicantName: fullName,
      supportEmail: 'application@thevetted.vc'
    };

    console.log('📧 Sending Phase 1 rejected email to:', {
      email: applicant.email,
      applicantName: fullName
    });

    const html = Phase1RejectedEmailTemplate.generateHtml(emailData);
    const text = Phase1RejectedEmailTemplate.generateBody(emailData);

    return this.sendEmail({
      to: applicant.email,
      subject: Phase1RejectedEmailTemplate.generateSubject(),
      html,
      text
    });
  }

  /**
   * Get dashboard URL based on current environment
   */
  private getDashboardUrl(): string {
    // Use constants for local development, otherwise use current domain
    if (window.location.hostname === 'localhost') {
      return EMAIL_CONSTANTS.APPLICANT_DASHBOARD_URL;
    }
    
    // In production, use the actual domain
    const baseUrl = window.location.origin;
    return `${baseUrl}/dashboard`;
  }

  /**
   * Test email configuration
   */
  async testEmailConfig(): Promise<EmailResponse> {
    return this.sendEmail({
      to: 'test@thevetted.vc',
      subject: 'Test Email - Vetted Application System',
      text: 'This is a test email to verify the Resend integration is working correctly.',
      html: '<p>This is a test email to verify the <strong>Resend integration</strong> is working correctly.</p>'
    });
  }
}