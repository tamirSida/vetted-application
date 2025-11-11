import { Injectable } from '@angular/core';
import { ApplicantUser } from '../models';
import { 
  createPhase2PromotionEmailHtml, 
  createPhase2PromotionEmailText, 
  phase2PromotionSubject,
  Phase2EmailData
} from '../templates/phase2-promotion.template';
import { 
  createPhase3ApprovalEmailHtml, 
  createPhase3ApprovalEmailText, 
  phase3ApprovalSubject,
  Phase3EmailData
} from '../templates/phase3-approval.template';

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
   * Send Phase 1 to Phase 2 promotion email
   */
  async sendPhase1ToPhase2PromotionEmail(applicant: ApplicantUser): Promise<EmailResponse> {
    const nameData = this.getApplicantNameData(applicant);
    
    const emailData: Phase2EmailData = {
      firstName: nameData.firstName,
      lastName: nameData.lastName,
      email: applicant.email,
      dashboardUrl: this.getDashboardUrl()
    };

    console.log('📧 Sending Phase 2 promotion email to:', {
      email: applicant.email,
      firstName: nameData.firstName,
      lastName: nameData.lastName
    });

    const html = createPhase2PromotionEmailHtml(emailData);
    const text = createPhase2PromotionEmailText(emailData);

    return this.sendEmail({
      to: applicant.email,
      subject: phase2PromotionSubject,
      html,
      text
    });
  }

  /**
   * Send Phase 3 approval email
   */
  async sendPhase3ApprovalEmail(applicant: ApplicantUser): Promise<EmailResponse> {
    const nameData = this.getApplicantNameData(applicant);
    
    const emailData: Phase3EmailData = {
      firstName: nameData.firstName,
      lastName: nameData.lastName,
      email: applicant.email,
      dashboardUrl: this.getDashboardUrl()
    };

    console.log('📧 Sending Phase 3 approval email to:', {
      email: applicant.email,
      firstName: nameData.firstName,
      lastName: nameData.lastName
    });

    const html = createPhase3ApprovalEmailHtml(emailData);
    const text = createPhase3ApprovalEmailText(emailData);

    return this.sendEmail({
      to: applicant.email,
      subject: phase3ApprovalSubject,
      html,
      text
    });
  }

  /**
   * Get dashboard URL based on current environment
   */
  private getDashboardUrl(): string {
    // In production, this would be the actual domain
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