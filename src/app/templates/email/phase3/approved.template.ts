import { EMAIL_CONSTANTS } from '../../../constants/email.constants';

export interface Phase3ApprovedEmailData {
  applicantName: string;
  interviewerName: string;
  schedulingUrl: string;
}

export class Phase3ApprovedEmailTemplate {
  static generateSubject(): string {
    return EMAIL_CONSTANTS.SUBJECTS.PHASE3.APPROVED;
  }

  static generateBody(data: Phase3ApprovedEmailData): string {
    return `Hi ${data.applicantName},

We were impressed with your application for the Vetted Accelerator and would like to invite you to the final phase of our process which is a Zoom meeting with one of our team members: ${data.interviewerName}.

Please click the link to schedule a time that works best for you: ${data.schedulingUrl}

Feel free to reach out to Eden at eden@thevetted.vc, if you have any questions before the meeting.

${EMAIL_CONSTANTS.SIGNATURE.STANDARD}`;
  }

  static generateHtml(data: Phase3ApprovedEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interview Invite for the Vetted Accelerator Program</title>
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
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
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
        .interview-info {
            background: #ecfdf5;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
            border-left: 4px solid #059669;
        }
        .interviewer-name {
            font-weight: 600;
            color: #059669;
            font-size: 18px;
        }
        .schedule-link {
            display: inline-block;
            background: #059669;
            color: white !important;
            padding: 14px 28px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            margin: 20px 0;
            font-size: 16px;
        }
        .schedule-link:hover {
            background: #047857;
        }
        .contact-info {
            background: #f8fafc;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
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
        <img src="cid:logo" alt="Vetted Accelerator" class="logo" />
        <h1>🎉 Congratulations!</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">You've been invited to interview for the Vetted Accelerator</p>
    </div>
    
    <div class="content">
        <p>Hi <strong>${data.applicantName}</strong>,</p>
        
        <p>We were impressed with your application for the Vetted Accelerator and would like to invite you to the final phase of our process which is a Zoom meeting with one of our team members:</p>
        
        <div class="interview-info">
            <p style="margin: 0;"><strong>Your Interviewer:</strong></p>
            <div class="interviewer-name">${data.interviewerName}</div>
        </div>
        
        <p>Please click the link below to schedule a time that works best for you:</p>
        
        <p style="text-align: center;">
            <a href="${data.schedulingUrl}" class="schedule-link">Schedule Your Interview</a>
        </p>
        
        <div class="contact-info">
            <p style="margin: 0 0 10px 0;"><strong>Questions?</strong></p>
            <p style="margin: 0;">Feel free to reach out to Eden at <a href="mailto:eden@thevetted.vc" style="color: #3b82f6;">eden@thevetted.vc</a> if you have any questions before the meeting.</p>
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