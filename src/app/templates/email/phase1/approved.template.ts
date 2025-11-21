import { EMAIL_CONSTANTS } from '../../../constants/email.constants';

export interface Phase1ApprovedEmailData {
  applicantName: string;
  dashboardUrl?: string;
}

export class Phase1ApprovedEmailTemplate {
  static generateSubject(): string {
    return EMAIL_CONSTANTS.SUBJECTS.PHASE1.APPROVED;
  }

  static generateBody(data: Phase1ApprovedEmailData): string {
    const dashboardUrl = data.dashboardUrl || EMAIL_CONSTANTS.APPLICANT_DASHBOARD_URL;
    
    return `Hi ${data.applicantName},

Thank you for registering! We're excited that you're considering the Vetted Accelerator.

We've received your initial online form. Here is a link to your account dashboard where you will find everything you need: ${dashboardUrl}

On your dashboard, you can access the following:

List of Upcoming Live Info Sessions: We highly encourage you to attend a live info session before submitting your full application so you can learn more about the program.

If you can't make any of our live info sessions you can access a pre-recorded info session on the website.

The Full Application: The application is thorough because we receive a high volume of applicants. Answering all questions openly and honestly will streamline the due diligence process and help us make a timely investment decision without needing lots of Zoom calls.

Applications are accepted on a rolling basis, so we encourage you to apply sooner rather than later!

Good luck, and we look forward to reviewing your application!

${EMAIL_CONSTANTS.SIGNATURE.STANDARD}`;
  }

  static generateHtml(data: Phase1ApprovedEmailData): string {
    const dashboardUrl = data.dashboardUrl || EMAIL_CONSTANTS.APPLICANT_DASHBOARD_URL;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vetted: Your Accelerator Application Dashboard</title>
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
        .dashboard-link {
            display: inline-block;
            background: #1e40af;
            color: white !important;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            margin: 20px 0;
        }
        .dashboard-link:hover {
            background: #1d4ed8;
        }
        .feature-list {
            background: #f8fafc;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
            border-left: 4px solid #1e40af;
        }
        .feature-item {
            margin: 15px 0;
            padding-left: 20px;
        }
        .feature-title {
            font-weight: 600;
            color: #1e40af;
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
        <h1>Welcome to Vetted Accelerator!</h1>
    </div>
    
    <div class="content">
        <p>Hi <strong>${data.applicantName}</strong>,</p>
        
        <p>Thank you for registering! We're excited that you're considering the Vetted Accelerator.</p>
        
        <p>We've received your initial online form. Here is a link to your account dashboard where you will find everything you need:</p>
        
        <p style="text-align: center;">
            <a href="${dashboardUrl}" class="dashboard-link">Access Your Dashboard</a>
        </p>
        
        <div class="feature-list">
            <h3>On your dashboard, you can access the following:</h3>
            
            <div class="feature-item">
                <div class="feature-title">List of Upcoming Live Info Sessions</div>
                <p>We highly encourage you to attend a live info session before submitting your full application so you can learn more about the program.</p>
                <p>If you can't make any of our live info sessions you can access a pre-recorded info session on the website.</p>
            </div>
            
            <div class="feature-item">
                <div class="feature-title">The Full Application</div>
                <p>The application is thorough because we receive a high volume of applicants. Answering all questions openly and honestly will streamline the due diligence process and help us make a timely investment decision without needing lots of Zoom calls.</p>
            </div>
        </div>
        
        <p><strong>Applications are accepted on a rolling basis, so we encourage you to apply sooner rather than later!</strong></p>
        
        <p>Good luck, and we look forward to reviewing your application!</p>
        
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