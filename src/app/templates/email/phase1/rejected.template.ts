import { EMAIL_CONSTANTS } from '../../../constants/email.constants';

export interface Phase1RejectedEmailData {
  applicantName: string;
  supportEmail?: string;
}

export class Phase1RejectedEmailTemplate {
  static generateSubject(): string {
    return EMAIL_CONSTANTS.SUBJECTS.PHASE1.REJECTED;
  }

  static generateBody(data: Phase1RejectedEmailData): string {
    const supportEmail = data.supportEmail || 'application@thevetted.vc';
    
    return `Hi ${data.applicantName},

Thank you for applying to the Vetted Accelerator. After reviewing the application, it looks like you don't meet our requirements for applying. If you feel this might be incorrect please reach out to ${supportEmail}.

Good luck,
The Vetted Team`;
  }

  static generateHtml(data: Phase1RejectedEmailData): string {
    const supportEmail = data.supportEmail || 'application@thevetted.vc';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vetted: Your Accelerator Application</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
        }
        .header {
            background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
        }
        .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
        }
        .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
        }
        .support-email {
            color: #1e40af;
            text-decoration: none;
            font-weight: 600;
        }
        .support-email:hover {
            text-decoration: underline;
        }
        .signature {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #6b7280;
            border-radius: 0 0 8px 8px;
        }
        .message-content {
            background: #f9fafb;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #6b7280;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <img src="cid:logo" alt="Vetted Accelerator" class="logo" />
        <h1>Application Update</h1>
    </div>
    
    <div class="content">
        <p>Hi <strong>${data.applicantName}</strong>,</p>
        
        <div class="message-content">
            <p>Thank you for applying to the Vetted Accelerator. After reviewing the application, it looks like you don't meet our requirements for applying.</p>
            
            <p>If you feel this might be incorrect please reach out to <a href="mailto:${supportEmail}" class="support-email">${supportEmail}</a>.</p>
        </div>
        
        <div class="signature">
            <p>Good luck,</p>
            <p><strong>The Vetted Team</strong></p>
        </div>
    </div>
    
    <div class="footer">
        <p>© 2025 Vetted Accelerator. All rights reserved.</p>
    </div>
</body>
</html>`;
  }
}