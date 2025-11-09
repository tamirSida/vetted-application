import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApplicantUser } from '../../../models';

@Component({
  selector: 'app-phase4-interview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="phase4-container">
      <div class="interview-notification">
        <div class="success-icon">🎉</div>
        <h2>Congratulations!</h2>
        <h3>You've Advanced to the Interview Phase</h3>
        
        <div class="interview-details">
          <p>Your application has been reviewed and approved. You will now proceed to the interview stage.</p>
          
          <div class="interviewer-info" *ngIf="applicant.interviewerId">
            <h4>Your Interviewer</h4>
            <div class="contact-card">
              <div class="contact-detail">
                <span class="label">Email:</span>
                <span class="value">{{ getInterviewerEmail() }}</span>
              </div>
              <p class="contact-note">
                Your interviewer will be in touch soon to schedule an interview. 
                Please keep an eye on your email and respond promptly.
              </p>
            </div>
          </div>

          <div class="next-steps" *ngIf="!applicant.interviewerId">
            <h4>Next Steps</h4>
            <p>An interviewer will be assigned to you shortly. You will receive an email notification with their contact information once assigned.</p>
          </div>

          <div class="preparation-tips">
            <h4>Interview Preparation Tips</h4>
            <ul>
              <li>Review your application and be ready to discuss your experience</li>
              <li>Prepare specific examples of your technical projects</li>
              <li>Research our program and prepare thoughtful questions</li>
              <li>Test your video conferencing setup in advance</li>
              <li>Have your portfolio and relevant materials ready to share</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .phase4-container {
      padding: 2rem;
      max-width: 700px;
      margin: 0 auto;
    }

    .interview-notification {
      background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
      border: 1px solid #10b981;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
    }

    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .interview-notification h2 {
      color: #065f46;
      font-size: 1.8rem;
      margin: 0 0 0.5rem 0;
    }

    .interview-notification h3 {
      color: #047857;
      font-size: 1.3rem;
      margin: 0 0 2rem 0;
      font-weight: 600;
    }

    .interview-details {
      text-align: left;
    }

    .interview-details > p {
      color: #374151;
      font-size: 1.1rem;
      margin-bottom: 2rem;
      text-align: center;
    }

    .interviewer-info,
    .next-steps,
    .preparation-tips {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .interviewer-info h4,
    .next-steps h4,
    .preparation-tips h4 {
      color: #374151;
      font-size: 1.2rem;
      margin: 0 0 1rem 0;
      border-bottom: 2px solid #10b981;
      padding-bottom: 0.5rem;
    }

    .contact-card {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 1rem;
    }

    .contact-detail {
      display: flex;
      margin-bottom: 0.5rem;
    }

    .contact-detail .label {
      font-weight: 600;
      color: #374151;
      min-width: 60px;
    }

    .contact-detail .value {
      color: #1f2937;
      font-weight: 500;
    }

    .contact-note {
      color: #6b7280;
      font-size: 0.9rem;
      margin: 1rem 0 0 0;
      padding-top: 1rem;
      border-top: 1px solid #d1d5db;
    }

    .next-steps p {
      color: #6b7280;
      margin: 0;
    }

    .preparation-tips ul {
      margin: 0;
      padding-left: 1.5rem;
    }

    .preparation-tips li {
      color: #374151;
      margin-bottom: 0.5rem;
      line-height: 1.5;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .phase4-container {
        padding: 1rem;
      }

      .interview-notification {
        padding: 1.5rem;
      }

      .interviewer-info,
      .next-steps,
      .preparation-tips {
        padding: 1rem;
      }

      .success-icon {
        font-size: 3rem;
      }

      .interview-notification h2 {
        font-size: 1.5rem;
      }

      .interview-notification h3 {
        font-size: 1.1rem;
      }
    }
  `]
})
export class Phase4InterviewComponent {
  @Input() applicant!: ApplicantUser;

  getInterviewerEmail(): string {
    // TODO: Fetch interviewer details from service
    return 'interviewer@vettedaccelerator.com';
  }
}