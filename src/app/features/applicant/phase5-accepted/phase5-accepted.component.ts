import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApplicantUser } from '../../../models';

@Component({
  selector: 'app-phase5-accepted',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="phase5-container">
      <div class="acceptance-celebration">
        <div class="celebration-header">
          <div class="celebration-icon">🎊</div>
          <h1>Congratulations, {{ applicant.name }}!</h1>
          <h2>You've Been Accepted!</h2>
        </div>

        <div class="acceptance-message">
          <p class="main-message">
            We are thrilled to welcome you to the Vetted Accelerator program. 
            Your application impressed our team, and we believe you have great potential 
            to succeed in our program.
          </p>

          <div class="program-details">
            <h3>Program Details</h3>
            <div class="details-grid">
              <div class="detail-card">
                <div class="detail-icon">📅</div>
                <h4>Start Date</h4>
                <p>{{ getProgramStartDate() | date:'longDate' }}</p>
              </div>

              <div class="detail-card">
                <div class="detail-icon">⏰</div>
                <h4>Duration</h4>
                <p>{{ getProgramDuration() }}</p>
              </div>

              <div class="detail-card">
                <div class="detail-icon">🎯</div>
                <h4>Format</h4>
                <p>Hybrid (Online + In-Person)</p>
              </div>
            </div>
          </div>

          <div class="next-steps">
            <h3>What's Next?</h3>
            <div class="steps-list">
              <div class="step-item">
                <div class="step-number">1</div>
                <div class="step-content">
                  <h4>Check Your Email</h4>
                  <p>You'll receive a detailed welcome email with program materials and pre-work within 24 hours.</p>
                </div>
              </div>

              <div class="step-item">
                <div class="step-number">2</div>
                <div class="step-content">
                  <h4>Complete Onboarding</h4>
                  <p>Fill out required forms and complete any pre-program assessments or assignments.</p>
                </div>
              </div>

              <div class="step-item">
                <div class="step-number">3</div>
                <div class="step-content">
                  <h4>Join Our Community</h4>
                  <p>Get access to our private Discord/Slack community to connect with fellow participants.</p>
                </div>
              </div>

              <div class="step-item">
                <div class="step-number">4</div>
                <div class="step-content">
                  <h4>Prepare for Day One</h4>
                  <p>Review the program schedule and ensure you have all necessary tools and materials.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="contact-info">
            <h3>Questions?</h3>
            <p>If you have any questions or concerns, please don't hesitate to reach out:</p>
            <div class="contact-details">
              <div class="contact-item">
                <span class="contact-label">Email:</span>
                <span class="contact-value">support@vettedaccelerator.com</span>
              </div>
              <div class="contact-item">
                <span class="contact-label">Program Director:</span>
                <span class="contact-value">director@vettedaccelerator.com</span>
              </div>
            </div>
          </div>
        </div>

        <div class="celebration-footer">
          <p>Welcome to the Vetted family! 🚀</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .phase5-container {
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }

    .acceptance-celebration {
      background: linear-gradient(135deg, #fef7ff 0%, #f3e8ff 50%, #ede9fe 100%);
      border: 2px solid #a855f7;
      border-radius: 16px;
      overflow: hidden;
    }

    .celebration-header {
      background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
      color: white;
      text-align: center;
      padding: 3rem 2rem;
    }

    .celebration-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      animation: bounce 2s infinite;
    }

    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
      }
      40% {
        transform: translateY(-10px);
      }
      60% {
        transform: translateY(-5px);
      }
    }

    .celebration-header h1 {
      font-size: 2.5rem;
      margin: 0 0 0.5rem 0;
      font-weight: 700;
    }

    .celebration-header h2 {
      font-size: 1.5rem;
      margin: 0;
      font-weight: 600;
      opacity: 0.9;
    }

    .acceptance-message {
      padding: 2rem;
    }

    .main-message {
      font-size: 1.2rem;
      color: #374151;
      text-align: center;
      margin-bottom: 3rem;
      line-height: 1.6;
    }

    .program-details,
    .next-steps,
    .contact-info {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }

    .program-details h3,
    .next-steps h3,
    .contact-info h3 {
      color: #7c3aed;
      font-size: 1.4rem;
      margin: 0 0 1.5rem 0;
      text-align: center;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }

    .detail-card {
      text-align: center;
      padding: 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }

    .detail-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .detail-card h4 {
      color: #374151;
      margin: 0 0 0.5rem 0;
      font-size: 1rem;
    }

    .detail-card p {
      color: #6b7280;
      margin: 0;
      font-size: 0.9rem;
    }

    .steps-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #7c3aed;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      flex-shrink: 0;
    }

    .step-content h4 {
      color: #374151;
      margin: 0 0 0.5rem 0;
      font-size: 1.1rem;
    }

    .step-content p {
      color: #6b7280;
      margin: 0;
      line-height: 1.5;
    }

    .contact-info p {
      color: #6b7280;
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .contact-details {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 400px;
      margin: 0 auto;
    }

    .contact-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      border-radius: 6px;
    }

    .contact-label {
      font-weight: 600;
      color: #374151;
    }

    .contact-value {
      color: #7c3aed;
      font-weight: 500;
    }

    .celebration-footer {
      background: #7c3aed;
      color: white;
      text-align: center;
      padding: 1.5rem;
      font-size: 1.2rem;
      font-weight: 600;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .phase5-container {
        padding: 1rem;
      }

      .celebration-header {
        padding: 2rem 1rem;
      }

      .celebration-header h1 {
        font-size: 2rem;
      }

      .celebration-header h2 {
        font-size: 1.2rem;
      }

      .acceptance-message {
        padding: 1.5rem;
      }

      .program-details,
      .next-steps,
      .contact-info {
        padding: 1.5rem;
      }

      .details-grid {
        grid-template-columns: 1fr;
      }

      .step-item {
        flex-direction: column;
        text-align: center;
      }

      .contact-item {
        flex-direction: column;
        gap: 0.5rem;
        text-align: center;
      }
    }
  `]
})
export class Phase5AcceptedComponent {
  @Input() applicant!: ApplicantUser;

  getProgramStartDate(): Date {
    // TODO: Get actual program start date from cohort
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  }

  getProgramDuration(): string {
    // TODO: Calculate from cohort dates
    return '12 weeks';
  }
}