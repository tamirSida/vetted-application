import { ApplicantUser } from '../models';

export interface Phase2EmailData {
  firstName: string;
  lastName: string;
  email: string;
  dashboardUrl: string;
}

export const phase2PromotionSubject = 'Welcome to The Vetted Accelerator - Join a Webinar';

export function createPhase2PromotionEmailHtml(data: Phase2EmailData): string {
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
            <p>Hi ${data.firstName},</p>
            
            <p>Thank you for signing up for The Vetted Accelerator! We're excited to have you join our community of ambitious founders.</p>
            
            <p>Your next step is to attend one of our informational webinars where you'll learn more about the program structure, expectations, and what makes The Vetted special.</p>
            
            <p><strong>What to do next:</strong></p>
            <ul>
                <li>Log in to your dashboard using the link below</li>
                <li>Select and register for one of the available webinar sessions</li>
                <li>Attend the webinar to unlock the next phase of your application</li>
            </ul>
            
            <p style="text-align: center;">
                <a href="${data.dashboardUrl}" class="cta-button">
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

export function createPhase2PromotionEmailText(data: Phase2EmailData): string {
  return `Welcome to The Vetted Accelerator!

Hi ${data.firstName},

Thank you for signing up for The Vetted Accelerator! We're excited to have you join our community of ambitious founders.

Your next step is to attend one of our informational webinars where you'll learn more about the program structure, expectations, and what makes The Vetted special.

What to do next:
- Log in to your dashboard: ${data.dashboardUrl}
- Select and register for one of the available webinar sessions
- Attend the webinar to unlock the next phase of your application

We look forward to seeing you in the webinar!

Best regards,
The Vetted Team

--
© 2024 The Vetted | thevetted.vc
Questions? Reply to this email or contact us at application@thevetted.vc`;
}