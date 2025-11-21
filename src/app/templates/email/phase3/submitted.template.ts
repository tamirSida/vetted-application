import { EMAIL_CONSTANTS } from '../../../constants/email.constants';

export interface Phase3SubmittedEmailData {
  applicantName: string;
  applicationEndDate: string; // Formatted date string
}

export class Phase3SubmittedEmailTemplate {
  static generateSubject(): string {
    return EMAIL_CONSTANTS.SUBJECTS.PHASE3.SUBMITTED;
  }

  static generateBody(data: Phase3SubmittedEmailData): string {
    return `Dear ${data.applicantName},

Thank you for submitting your application for the Vetted Accelerator.

We have received your submission and our team will now begin the review process. We review applications on a rolling basis. Expect to hear from us in the coming days / weeks but no later than ${data.applicationEndDate}

${EMAIL_CONSTANTS.SIGNATURE.STANDARD}`;
  }

  static generateHtml(data: Phase3SubmittedEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vetted Accelerator Application Confirmation</title>
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
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
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
        .confirmation-box {
            background: #f0f9ff;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #1e40af;
            margin: 20px 0;
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
        .status-icon {
            color: #10b981;
            font-size: 1.2em;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="header">
        <img src="cid:logo" alt="Vetted Accelerator" class="logo" />
        <h1>Application Confirmation</h1>
        <p>Your application has been received</p>
    </div>
    
    <div class="content">
        <p>Dear <strong>${data.applicantName}</strong>,</p>
        
        <div class="confirmation-box">
            <p><span class="status-icon">✓</span><strong>Thank you for submitting your application for the Vetted Accelerator.</strong></p>
            
            <p>We have received your submission and our team will now begin the review process. We review applications on a rolling basis. Expect to hear from us in the coming days / weeks but no later than <strong>${data.applicationEndDate}</strong></p>
        </div>
        
        <div class="signature">
            <p>Best regards,</p>
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