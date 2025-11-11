export interface Phase3EmailData {
  firstName: string;
  lastName: string;
  email: string;
  dashboardUrl: string;
}

export const phase3ApprovalSubject = 'Congratulations! You Passed Your Phase 3 Application - The Vetted';

export function createPhase3ApprovalEmailHtml(data: Phase3EmailData): string {
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
            <p>Hi ${data.firstName},</p>
            
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
                <a href="${data.dashboardUrl}" class="cta-button">
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

export function createPhase3ApprovalEmailText(data: Phase3EmailData): string {
  return `Congratulations! You Passed Phase 3! - The Vetted

Hi ${data.firstName},

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

View your dashboard: ${data.dashboardUrl}

Keep an eye on your email for interview scheduling information. We're looking forward to speaking with you!

Best of luck,
The Vetted Team

--
© 2024 The Vetted | thevetted.vc
Questions? Reply to this email or contact us at application@thevetted.vc`;
}