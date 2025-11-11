import { Injectable } from '@angular/core';
import { ApplicantUser } from '../models';

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
   * Send Phase 1 to Phase 2 promotion email
   */
  async sendPhase1ToPhase2PromotionEmail(applicant: ApplicantUser): Promise<EmailResponse> {
    const subject = 'Welcome to The Vetted Accelerator - Join a Webinar';
    
    const html = this.createPhase2PromotionEmailHtml(applicant);
    const text = this.createPhase2PromotionEmailText(applicant);

    return this.sendEmail({
      to: applicant.email,
      subject,
      html,
      text
    });
  }

  /**
   * Send Phase 3 approval email
   */
  async sendPhase3ApprovalEmail(applicant: ApplicantUser): Promise<EmailResponse> {
    const subject = 'Congratulations! You Passed Your Phase 3 Application - The Vetted';
    
    const html = this.createPhase3ApprovalEmailHtml(applicant);
    const text = this.createPhase3ApprovalEmailText(applicant);

    return this.sendEmail({
      to: applicant.email,
      subject,
      html,
      text
    });
  }

  /**
   * Create HTML content for Phase 2 promotion email
   */
  private createPhase2PromotionEmailHtml(applicant: ApplicantUser): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to The Vetted Accelerator</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
        }
        h1 {
            color: #059669;
            margin-bottom: 10px;
        }
        .content {
            color: #374151;
            margin-bottom: 30px;
        }
        .cta-button {
            display: inline-block;
            background-color: #059669;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">The Vetted</div>
            <p>Accelerator Program</p>
        </div>

        <h1>Welcome to The Vetted Accelerator!</h1>
        
        <div class="content">
            <p>Hi ${applicant.name},</p>
            
            <p>Thank you for signing up for The Vetted Accelerator! We're excited to have you join our community of ambitious founders.</p>
            
            <p>Your next step is to attend one of our informational webinars where you'll learn more about the program structure, expectations, and what makes The Vetted special.</p>
            
            <p><strong>What to do next:</strong></p>
            <ul>
                <li>Log in to your dashboard using the link below</li>
                <li>Select and register for one of the available webinar sessions</li>
                <li>Attend the webinar to unlock the next phase of your application</li>
            </ul>
            
            <p style="text-align: center;">
                <a href="${this.getDashboardUrl()}" class="cta-button">
                    Access Your Dashboard
                </a>
            </p>
            
            <p>We look forward to seeing you in the webinar!</p>
            
            <p>Best regards,<br>
            The Vetted Team</p>
        </div>

        <div class="footer">
            <p>© 2024 The Vetted | thevetted.vc<br>
            Questions? Reply to this email or contact us at application@thevetted.vc</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Create text content for Phase 2 promotion email
   */
  private createPhase2PromotionEmailText(applicant: ApplicantUser): string {
    return `Welcome to The Vetted Accelerator!

Hi ${applicant.name},

Thank you for signing up for The Vetted Accelerator! We're excited to have you join our community of ambitious founders.

Your next step is to attend one of our informational webinars where you'll learn more about the program structure, expectations, and what makes The Vetted special.

What to do next:
- Log in to your dashboard: ${this.getDashboardUrl()}
- Select and register for one of the available webinar sessions
- Attend the webinar to unlock the next phase of your application

We look forward to seeing you in the webinar!

Best regards,
The Vetted Team

--
© 2024 The Vetted | thevetted.vc
Questions? Reply to this email or contact us at application@thevetted.vc`;
  }

  /**
   * Create HTML content for Phase 3 approval email
   */
  private createPhase3ApprovalEmailHtml(applicant: ApplicantUser): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phase 3 Application Approved - The Vetted</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
        }
        .success-badge {
            background-color: #dcfce7;
            color: #166534;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            display: inline-block;
            margin: 10px 0;
        }
        h1 {
            color: #059669;
            margin-bottom: 10px;
        }
        .content {
            color: #374151;
            margin-bottom: 30px;
        }
        .next-steps {
            background-color: #f0fdf4;
            border-left: 4px solid #22c55e;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 6px 6px 0;
        }
        .cta-button {
            display: inline-block;
            background-color: #059669;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">The Vetted</div>
            <p>Accelerator Program</p>
            <div class="success-badge">✅ Application Approved</div>
        </div>

        <h1>Congratulations! You Passed Phase 3!</h1>
        
        <div class="content">
            <p>Hi ${applicant.name},</p>
            
            <p><strong>Congratulations!</strong> Your Phase 3 in-depth application has been approved by our review team. You've demonstrated excellent potential and we're excited to move you forward in the selection process.</p>
            
            <div class="next-steps">
                <h3>🎯 What's Next: Interview Phase</h3>
                <p>You're now entering <strong>Phase 4 - the Interview Phase</strong>. Here's what to expect:</p>
                <ul>
                    <li>Our team will review your application details</li>
                    <li>You'll be contacted within 3-5 business days to schedule your interview</li>
                    <li>The interview will be a deep-dive conversation about your startup, vision, and fit for the program</li>
                    <li>This is your opportunity to showcase your passion and commitment</li>
                </ul>
            </div>
            
            <p><strong>Interview Preparation Tips:</strong></p>
            <ul>
                <li>Review your Phase 3 application responses</li>
                <li>Prepare to discuss your customer validation and traction</li>
                <li>Be ready to articulate your vision and 12-month goals</li>
                <li>Think about how The Vetted can specifically help your startup</li>
            </ul>
            
            <p style="text-align: center;">
                <a href="${this.getDashboardUrl()}" class="cta-button">
                    View Your Dashboard
                </a>
            </p>
            
            <p>Keep an eye on your email for interview scheduling information. We're looking forward to speaking with you!</p>
            
            <p>Best of luck,<br>
            The Vetted Team</p>
        </div>

        <div class="footer">
            <p>© 2024 The Vetted | thevetted.vc<br>
            Questions? Reply to this email or contact us at application@thevetted.vc</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Create text content for Phase 3 approval email
   */
  private createPhase3ApprovalEmailText(applicant: ApplicantUser): string {
    return `Congratulations! You Passed Phase 3! - The Vetted

Hi ${applicant.name},

Congratulations! Your Phase 3 in-depth application has been approved by our review team. You've demonstrated excellent potential and we're excited to move you forward in the selection process.

WHAT'S NEXT: INTERVIEW PHASE
You're now entering Phase 4 - the Interview Phase. Here's what to expect:

- Our team will review your application details
- You'll be contacted within 3-5 business days to schedule your interview
- The interview will be a deep-dive conversation about your startup, vision, and fit for the program
- This is your opportunity to showcase your passion and commitment

Interview Preparation Tips:
- Review your Phase 3 application responses
- Prepare to discuss your customer validation and traction
- Be ready to articulate your vision and 12-month goals
- Think about how The Vetted can specifically help your startup

View your dashboard: ${this.getDashboardUrl()}

Keep an eye on your email for interview scheduling information. We're looking forward to speaking with you!

Best of luck,
The Vetted Team

--
© 2024 The Vetted | thevetted.vc
Questions? Reply to this email or contact us at application@thevetted.vc`;
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