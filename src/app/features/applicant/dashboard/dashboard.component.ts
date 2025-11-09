import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService, WebinarService } from '../../../services';
import { ApplicantUser, Phase, Webinar } from '../../../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <div class="header-content">
          <h1>Welcome to Vetted Accelerator</h1>
          @if (applicant()) {
            <p class="user-info">{{ applicant()?.name }}</p>
          }
          <button class="logout-button" (click)="logout()">
            <i class="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </div>

      <div class="dashboard-content">
        @if (error()) {
          <div class="alert alert-error">
            <i class="fas fa-exclamation-circle"></i>
            {{ error() }}
          </div>
        }

        @if (success()) {
          <div class="alert alert-success">
            <i class="fas fa-check-circle"></i>
            {{ success() }}
          </div>
        }

        <!-- Phase 1: Awaiting Approval -->
        @if (currentPhase() === 'SIGNUP' && applicationStatus() === 'SUBMITTED') {
          <div class="status-card status-pending">
            <div class="status-icon">
              <i class="fas fa-clock"></i>
            </div>
            <div class="status-content">
              <h2>Application Submitted</h2>
              <p class="status-message">Thank you for submitting your initial application! Our team is currently reviewing your information.</p>
              <div class="status-detail">
                <strong>Current Status:</strong> Awaiting team's approval
              </div>
              <div class="next-steps">
                <h4>What happens next?</h4>
                <ul>
                  <li>Our team will review your application within 3-5 business days</li>
                  <li>If approved, you'll receive access to our webinar sessions</li>
                  <li>We'll email you with updates on your application status</li>
                </ul>
              </div>
            </div>
          </div>
        }

        <!-- Phase 2: Webinar Required -->
        @if (currentPhase() === 'WEBINAR') {
          <div class="status-card status-action">
            <div class="status-icon">
              <i class="fas fa-video"></i>
            </div>
            <div class="status-content">
              <h2>Initial Application Approved!</h2>
              <p class="status-message">Congratulations! Your initial application has been approved. Please join one of our webinars to continue to the next phase.</p>
              
              @if (availableWebinars().length > 0) {
                <div class="webinars-section">
                  <h4>Available Webinars:</h4>
                  <div class="webinars-list">
                    @for (webinar of availableWebinars(); track webinar.id) {
                      <div class="webinar-item">
                        <div class="webinar-info">
                          <strong>{{ webinar.title || 'Vetted Accelerator Webinar #' + webinar.num }}</strong>
                          <p>{{ formatDate(webinar.timestamp) }}</p>
                          @if (webinar.description) {
                            <p class="webinar-desc">{{ webinar.description }}</p>
                          }
                        </div>
                        <a [href]="webinar.link" target="_blank" class="webinar-link">
                          <i class="fas fa-external-link-alt"></i>
                          Join Webinar
                        </a>
                      </div>
                    }
                  </div>
                </div>
              }

              <div class="webinar-code-section">
                <h4>After attending a webinar:</h4>
                <p>Enter the 6-character code provided during the session</p>
                <form [formGroup]="webinarForm" (ngSubmit)="submitWebinarCode()" class="webinar-form">
                  <div class="form-group">
                    <div class="input-group">
                      <i class="fas fa-key"></i>
                      <input 
                        type="text" 
                        formControlName="webinarCode"
                        placeholder="Enter 6-character code"
                        maxlength="6"
                        style="text-transform: uppercase;"
                        [class.error]="webinarForm.get('webinarCode')?.touched && webinarForm.get('webinarCode')?.errors">
                    </div>
                    @if (webinarForm.get('webinarCode')?.touched && webinarForm.get('webinarCode')?.errors) {
                      <div class="field-error">Please enter the 6-character code from the webinar</div>
                    }
                  </div>
                  <button type="submit" class="submit-button" [disabled]="isLoading() || webinarForm.invalid">
                    @if (isLoading()) {
                      <i class="fas fa-spinner fa-spin"></i>
                      Verifying...
                    } @else {
                      <i class="fas fa-check"></i>
                      Verify Attendance
                    }
                  </button>
                </form>
              </div>
            </div>
          </div>
        }

        <!-- Phase 3: In-Depth Application -->
        @if (currentPhase() === 'IN_DEPTH_APPLICATION') {
          @if (applicationStatus() === 'DRAFT') {
            <div class="status-card status-action">
              <div class="status-icon">
                <i class="fas fa-edit"></i>
              </div>
              <div class="status-content">
                <h2>Complete Your Application</h2>
                <p class="status-message">You've started your in-depth application. Please finish and submit it to continue the process.</p>
                <div class="action-buttons">
                  <button class="submit-button" (click)="continueApplication()">
                    <i class="fas fa-arrow-right"></i>
                    Continue Application
                  </button>
                </div>
              </div>
            </div>
          } @else if (applicationStatus() === 'SUBMITTED') {
            <div class="status-card status-pending">
              <div class="status-icon">
                <i class="fas fa-search"></i>
              </div>
              <div class="status-content">
                <h2>Application Under Review</h2>
                <p class="status-message">Thank you for submitting your in-depth application! Our team is currently reviewing your detailed information.</p>
                <div class="status-detail">
                  <strong>Current Status:</strong> We are reviewing your application
                </div>
                <div class="next-steps">
                  <h4>What happens next?</h4>
                  <ul>
                    <li>Our team will thoroughly review your application within 5-7 business days</li>
                    <li>If selected, you'll be invited for an interview</li>
                    <li>We'll email you with updates on your application status</li>
                  </ul>
                </div>
              </div>
            </div>
          } @else {
            <div class="status-card status-action">
              <div class="status-icon">
                <i class="fas fa-file-alt"></i>
              </div>
              <div class="status-content">
                <h2>Ready for In-Depth Application</h2>
                <p class="status-message">Great! You've completed the webinar. Now it's time to fill out our comprehensive application.</p>
                <div class="application-info">
                  <h4>This application includes:</h4>
                  <ul>
                    <li>Detailed business information</li>
                    <li>Technical assessment</li>
                    <li>Essay questions about your vision</li>
                    <li>Portfolio and code examples</li>
                  </ul>
                </div>
                <div class="action-buttons">
                  <button class="submit-button" (click)="startInDepthApplication()">
                    <i class="fas fa-arrow-right"></i>
                    Start In-Depth Application
                  </button>
                </div>
              </div>
            </div>
          }
        }

        <!-- Phase 4: Interview Invitation -->
        @if (currentPhase() === 'INTERVIEW' && !interviewCompleted()) {
          <div class="status-card status-success">
            <div class="status-icon">
              <i class="fas fa-handshake"></i>
            </div>
            <div class="status-content">
              <h2>Congratulations! Interview Invitation</h2>
              <p class="status-message">Excellent work! We'd like to invite you to an interview to discuss your startup and the accelerator program.</p>
              @if (interviewer()) {
                <div class="interviewer-info">
                  <h4>Your Interviewer:</h4>
                  <p><strong>{{ interviewer() }}</strong></p>
                </div>
              }
              <div class="next-steps">
                <h4>Next Steps:</h4>
                <ul>
                  <li>Check your email for interview scheduling details</li>
                  <li>Prepare to discuss your startup and business goals</li>
                  <li>Review your application materials</li>
                  <li>Be ready to ask questions about the program</li>
                </ul>
              </div>
              <div class="contact-info">
                <p><strong>Questions?</strong> Reply to the interview scheduling email or contact us directly.</p>
              </div>
            </div>
          </div>
        }

        <!-- Phase 4: Post-Interview -->
        @if (currentPhase() === 'INTERVIEW' && interviewCompleted()) {
          <div class="status-card status-pending">
            <div class="status-icon">
              <i class="fas fa-comments"></i>
            </div>
            <div class="status-content">
              <h2>Interview Completed</h2>
              <p class="status-message">We had a pleasure meeting with you! Thank you for taking the time to interview with our team.</p>
              <div class="status-detail">
                <strong>Current Status:</strong> We will get back to you soon
              </div>
              <div class="next-steps">
                <h4>What happens next?</h4>
                <ul>
                  <li>Our team will discuss your interview and application</li>
                  <li>Final decisions are made within 3-5 business days</li>
                  <li>You'll receive an email with the final decision</li>
                  <li>If accepted, you'll get detailed program information</li>
                </ul>
              </div>
            </div>
          </div>
        }

        <!-- Phase 5: Accepted -->
        @if (currentPhase() === 'ACCEPTED') {
          <div class="status-card status-celebration">
            <div class="status-icon">
              <i class="fas fa-trophy"></i>
            </div>
            <div class="status-content">
              <h2>🎉 Congratulations! You're In!</h2>
              <p class="status-message">Welcome to the Vetted Accelerator! We're excited to have you join our community of veteran entrepreneurs.</p>
              <div class="celebration-content">
                <h4>What's Next?</h4>
                <ul>
                  <li>You'll receive a welcome package with program details</li>
                  <li>Program orientation starts soon - watch your email</li>
                  <li>Join our exclusive veteran founder community</li>
                  <li>Get ready to accelerate your startup!</li>
                </ul>
              </div>
              <div class="contact-section">
                <h4>Questions or Need Help?</h4>
                <p>Our team is here to support you. Reach out anytime!</p>
                <div class="contact-buttons">
                  <button class="contact-button">
                    <i class="fas fa-envelope"></i>
                    Email Support
                  </button>
                  <button class="contact-button">
                    <i class="fas fa-calendar"></i>
                    Schedule Call
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private webinarService = inject(WebinarService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  applicant = signal<ApplicantUser | null>(null);
  currentPhase = signal<Phase | null>(null);
  applicationStatus = signal<string>('');
  interviewCompleted = signal<boolean>(false);
  interviewer = signal<string>('');
  availableWebinars = signal<Webinar[]>([]);
  
  error = signal<string>('');
  success = signal<string>('');
  isLoading = signal<boolean>(false);

  webinarForm: FormGroup;

  constructor() {
    this.webinarForm = this.fb.group({
      webinarCode: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{6}$/)]]
    });
  }

  async ngOnInit() {
    await this.loadUserData();
    await this.loadWebinars();
  }

  private async loadUserData() {
    try {
      const user = this.authService.getCurrentUser();
      if (user && user.role === 'APPLICANT') {
        const applicantUser = user as ApplicantUser;
        this.applicant.set(applicantUser);
        this.currentPhase.set(applicantUser.phase);
        
        // Mock application status - in real app, fetch from application service
        if (applicantUser.phase === 'SIGNUP') {
          this.applicationStatus.set('SUBMITTED');
        } else if (applicantUser.phase === 'IN_DEPTH_APPLICATION') {
          this.applicationStatus.set('DRAFT'); // or 'SUBMITTED' based on actual status
        }

        // Mock interviewer and interview status
        if (applicantUser.phase === 'INTERVIEW') {
          this.interviewer.set(applicantUser.interviewerId || 'TBD');
          this.interviewCompleted.set(false); // This would come from backend
        }
      } else {
        this.router.navigate(['/auth/login']);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.error.set('Failed to load user information');
    }
  }

  private async loadWebinars() {
    try {
      if (this.currentPhase() === 'WEBINAR' && this.applicant()?.cohortId) {
        const webinars = await this.webinarService.getWebinarsForCohort(this.applicant()!.cohortId);
        // Filter for upcoming webinars
        const upcoming = webinars.filter((w: any) => new Date(w.timestamp) > new Date());
        this.availableWebinars.set(upcoming);
      }
    } catch (error) {
      console.error('Error loading webinars:', error);
    }
  }

  async submitWebinarCode() {
    if (this.webinarForm.invalid) {
      this.webinarForm.markAllAsTouched();
      return;
    }

    try {
      this.isLoading.set(true);
      this.error.set('');

      const code = this.webinarForm.get('webinarCode')?.value?.toUpperCase();
      const cohortId = this.applicant()?.cohortId;

      if (!cohortId) {
        throw new Error('Cohort information not found');
      }

      const result = await this.webinarService.validateWebinarCode(code);
      
      if (result.isValid) {
        this.success.set('Webinar attendance verified! Redirecting to next phase...');
        
        // Refresh user data to get updated phase
        setTimeout(async () => {
          await this.loadUserData();
          this.success.set('');
        }, 2000);
      } else {
        this.error.set('Invalid webinar code. Please check and try again.');
      }
    } catch (error: any) {
      this.error.set(error.message || 'Failed to verify webinar code');
    } finally {
      this.isLoading.set(false);
    }
  }

  continueApplication() {
    this.router.navigate(['/application/phase3']);
  }

  startInDepthApplication() {
    this.router.navigate(['/application/phase3']);
  }

  async logout() {
    try {
      await this.authService.signOut();
      this.router.navigate(['/auth/login']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  formatDate(timestamp: Date): string {
    return new Date(timestamp).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}