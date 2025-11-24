import { EMAIL_CONSTANTS } from '../../../constants/email.constants';

export interface Phase3RejectedEmailData {
  applicantName: string;
}

export class Phase3RejectedEmailTemplate {
  static generateSubject(): string {
    return 'Decision Regarding Your Vetted Accelerator Application';
  }

  static generateBody(data: Phase3RejectedEmailData): string {
    return `Dear ${data.applicantName},

Thank you for your application to the Vetted Accelerator Program and for your patience during our review process.

We received an exceptionally high volume of applications this cycle. Following a thorough and careful evaluation, we regret to inform you that we will not be able to offer you a place in this year's cohort.

We truly appreciate the time and comprehensive effort you dedicated to your submission. We wish you continued success in your future ventures and hope to hear from you in the future.

Sincerely,
The Vetted Team`;
  }

  static generateHtml(data: Phase3RejectedEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Decision Regarding Your Vetted Accelerator Application</title>
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
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 24px;
        }
        .header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 400;
        }
        .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
        }
        .message-box {
            background: #f8fafc;
            padding: 25px;
            border-radius: 6px;
            margin: 20px 0;
            border-left: 4px solid #6b7280;
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
    </style>
</head>
<body>
    <div class="header">
        <h1>Vetted Accelerator</h1>
        <h2>Application Decision</h2>
    </div>
    
    <div class="content">
        <p>Dear <strong>${data.applicantName}</strong>,</p>
        
        <div class="message-box">
            <p>Thank you for your application to the Vetted Accelerator Program and for your patience during our review process.</p>
            
            <p>We received an exceptionally high volume of applications this cycle. Following a thorough and careful evaluation, we regret to inform you that we will not be able to offer you a place in this year's cohort.</p>
            
            <p>We truly appreciate the time and comprehensive effort you dedicated to your submission. We wish you continued success in your future ventures and hope to hear from you in the future.</p>
        </div>
        
        <div class="signature">
            <p>Sincerely,</p>
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