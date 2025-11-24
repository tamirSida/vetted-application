import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService, WebinarService, ApplicationService, UserService, InterviewerService, CohortService, ApplicationSettingsService } from '../../../services';
import { combineLatest } from 'rxjs';
import { ApplicantUser, Phase, Webinar, ApplicationStatus, Interviewer } from '../../../models';

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

        <!-- Applications Stopped Message -->
        @if (applicationsStopped()) {
          <div class="status-card status-warning">
            <div class="status-icon">
              <i class="fas fa-stop"></i>
            </div>
            <div class="status-content">
              <h2>We aren't accepting applications any more!</h2>
              <p class="contact-info">
                If you have questions, please contact us at <strong>info@thevetted.vc</strong>
              </p>
            </div>
          </div>
        }

        <!-- Phase 1: Application Rejected (Red Flags) -->
        @if (currentPhase() === 'SIGNUP' && applicationStatus() === ApplicationStatus.PHASE_1) {
          <div class="status-card status-error">
            <div class="status-icon">
              <i class="fas fa-times-circle"></i>
            </div>
            <div class="status-content">
              <h2>Application Review Complete</h2>
              <p class="status-message">Thank you for applying to the Vetted Accelerator. After reviewing the application, it looks like you don't meet our requirements for applying. If you feel this might be incorrect please reach out to application@thevetted.vc.</p>
            </div>
          </div>
        }

        <!-- Phase 2: Webinar Required -->
        @if (currentPhase() === 'WEBINAR' && !applicationsStopped()) {
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
        @if (currentPhase() === 'IN_DEPTH_APPLICATION' && (!applicationsStopped() || applicationStatus() === ApplicationStatus.PHASE_3_SUBMITTED)) {
          @if (applicationStatus() === ApplicationStatus.PHASE_3_IN_PROGRESS) {
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
                  <button class="danger-button" (click)="startFromScratch()">
                    <i class="fas fa-trash-alt"></i>
                    Start from scratch
                  </button>
                </div>
              </div>
            </div>
          } @else if (applicationStatus() === ApplicationStatus.PHASE_3_SUBMITTED) {
            <div class="status-card status-pending">
              <div class="status-icon">
                <i class="fas fa-search"></i>
              </div>
              <div class="status-content">
                <h2>Application Under Review</h2>
                <p class="status-message">Thank you for submitting your application for the Vetted Accelerator.</p>
                <p class="status-message">We have received your submission and our team will now begin the review process. We review applications on a rolling basis. Expect to hear from us in the coming days / weeks but no later than {{ applicationEndDate() }}.</p>
              </div>
            </div>
          } @else if (applicationStatus() === ApplicationStatus.PHASE_3) {
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
              <h2>Phase 4: Interview</h2>
              <p class="status-message">We were impressed with your application for the Vetted Accelerator and would like to invite you to the final phase of our process which is a Zoom meeting with one of our team members:</p>

              @if (interviewer()) {
                <div class="interviewer-info">
                  <h4>[interviewer Schedule]</h4>
                  <p><strong>{{ interviewer()?.name }}, {{ interviewer()?.title }}</strong></p>
                  <a [href]="interviewer()?.calendarUrl" target="_blank" class="calendar-link">
                    <i class="fas fa-calendar-alt"></i>
                    Schedule with {{ interviewer()?.name }}, {{ interviewer()?.title }}
                  </a>
                </div>
              }

              <p>Please click the link to schedule a time that works best for you.</p>

              <p>Feel free to reach out to Eden at eden@thevetted.vc, if you have any questions before the meeting.</p>
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
              <p class="status-message">Welcome to the Vetted Accelerator! We're excited to have you join our community of Combat Veteran entrepreneurs.</p>
              <div class="celebration-content">
                <h4>What's Next?</h4>
                <ul>
                  <li>You'll receive a welcome package with program details</li>
                  <li>Program orientation starts soon - watch your email</li>
                  <li>Join our exclusive Combat Veteran founder community</li>
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
  private applicationService = inject(ApplicationService);
  private userService = inject(UserService);
  private interviewerService = inject(InterviewerService);
  private cohortService = inject(CohortService);
  private applicationSettingsService = inject(ApplicationSettingsService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Expose enum for template use
  ApplicationStatus = ApplicationStatus;

  applicant = signal<ApplicantUser | null>(null);
  currentPhase = signal<Phase | null>(null);
  applicationStatus = signal<string>('');
  interviewCompleted = signal<boolean>(false);
  interviewer = signal<Interviewer | null>(null);
  availableWebinars = signal<Webinar[]>([]);
  applicationEndDate = signal<string>('[Application End Date]');

  error = signal<string>('');
  success = signal<string>('');
  isLoading = signal<boolean>(false);
  applicationsStopped = signal<boolean>(false);

  webinarForm: FormGroup;

  constructor() {
    this.webinarForm = this.fb.group({
      webinarCode: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{6}$/)]]
    });
  }

  ngOnInit() {
    console.log('🔍 Dashboard: ngOnInit called');

    // Wait for auth initialization AND user data before making routing decisions
    combineLatest([
      this.authService.authInitialized$,
      this.authService.currentUser$,
      this.applicationSettingsService.applicationSettings$
    ]).subscribe(([authInitialized, user, appSettings]) => {
      console.log('🔍 Dashboard: Auth state update - initialized:', authInitialized, 'user:', user);

      if (!authInitialized) {
        console.log('⏳ Dashboard: Auth not initialized yet');
        return;
      }

      if (user && user.role === 'APPLICANT') {
        console.log('✅ Dashboard: User is an applicant, loading data');
        
        // Check if applications are stopped and if user should be blocked
        const applicant = user as ApplicantUser;
        const isBlocked = this.checkIfUserBlocked(applicant, appSettings);
        this.applicationsStopped.set(isBlocked);
        
        this.loadUserData(applicant);
        this.loadWebinars();
        this.loadCohortData(applicant);
      } else if (user === null) {
        console.log('❌ Dashboard: No user found, redirecting to login');
        // Auth is initialized and user is null - redirect to login
        this.router.navigate(['/auth/login']);
      } else {
        console.log('❌ Dashboard: User exists but not an applicant, role:', user?.role);
      }
      // If user exists but is not an applicant, do nothing (let them stay on the page)
    });
  }

  private async loadUserData(user: ApplicantUser) {
    try {
      console.log('🔍 Dashboard: Loading user data:', user);
      console.log('📊 User phase:', user.phase);
      console.log('📊 User status:', user.status);

      this.applicant.set(user);
      this.currentPhase.set(user.phase);

      // Use the actual user status from the database
      this.applicationStatus.set(user.status || ApplicationStatus.PHASE_1);

      console.log('✅ Dashboard: Set currentPhase to:', user.phase);
      console.log('✅ Dashboard: Set applicationStatus to:', user.status || ApplicationStatus.PHASE_1);

      // Load interviewer data if in interview phase
      if (user.phase === 'INTERVIEW' && user.interviewerId) {
        await this.loadInterviewerData(user.interviewerId);
        this.interviewCompleted.set(false); // This would come from backend
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.error.set('Failed to load user information');
    }
  }

  private async loadInterviewerData(interviewerId: string): Promise<void> {
    try {
      // Load all interviewers and find the assigned one
      const allInterviewers = await this.interviewerService.getAllInterviewers();
      const assignedInterviewer = allInterviewers.find(i => i.id === interviewerId);

      if (assignedInterviewer) {
        this.interviewer.set(assignedInterviewer);
        console.log('✅ Loaded interviewer data:', assignedInterviewer.name);
      } else {
        console.warn('❌ Interviewer not found:', interviewerId);
        this.interviewer.set(null);
      }
    } catch (error) {
      console.error('❌ Error loading interviewer data:', error);
      this.interviewer.set(null);
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

  private async loadCohortData(user: ApplicantUser) {
    try {
      if (user.cohortId) {
        const cohort = await this.cohortService.getCohortById(user.cohortId);
        if (cohort) {
          const applicationEndDate = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }).format(new Date(cohort.applicationEndDate));
          this.applicationEndDate.set(applicationEndDate);
        }
      }
    } catch (error) {
      console.error('Error loading cohort data:', error);
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

      const codeValue = this.webinarForm.get('webinarCode')?.value;
      const applicant = this.applicant();

      if (!codeValue || !codeValue.trim()) {
        throw new Error('Please enter a webinar code');
      }

      if (!applicant) {
        throw new Error('Applicant information not found');
      }

      const result = await this.webinarService.validateWebinarCode({
        code: codeValue.toUpperCase().trim(),
        applicantId: applicant.userId
      });

      if (result.isValid) {
        this.success.set('Webinar attendance verified! You have been promoted to Phase 3!');

        // Clear the form
        this.webinarForm.reset();

        // Refresh user data to get updated phase from database
        setTimeout(async () => {
          try {
            const currentUser = this.authService.getCurrentUser();
            if (currentUser && currentUser.role === 'APPLICANT') {
              // Reload user data from database to get latest phase/status
              const refreshedUser = await this.userService.getUserById(currentUser.userId);
              if (refreshedUser && refreshedUser.role === 'APPLICANT') {
                await this.loadUserData(refreshedUser as ApplicantUser);
                console.log('✅ User data refreshed after webinar validation');
              }
            }
          } catch (error) {
            console.error('Error refreshing user data:', error);
          }
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

  async startFromScratch() {
    const confirmed = confirm(
      'This will delete your progress permanently.\n\nAre you sure you want to start from scratch? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    try {
      this.isLoading.set(true);
      this.error.set('');

      const applicant = this.applicant();
      if (!applicant) {
        throw new Error('Applicant information not found');
      }

      // Delete the existing Phase 3 application
      await this.applicationService.deletePhase3Application(applicant.userId, applicant.cohortId);

      this.success.set('Application cleared successfully. Starting fresh...');

      // Navigate to a fresh Phase 3 application
      setTimeout(() => {
        this.router.navigate(['/application/phase3']);
      }, 1500);

    } catch (error: any) {
      this.error.set(error.message || 'Failed to delete application');
    } finally {
      this.isLoading.set(false);
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

  private checkIfUserBlocked(applicant: ApplicantUser, appSettings: any): boolean {
    // If applications are accepting, user is never blocked
    if (appSettings.acceptingApplications) {
      return false;
    }

    // If applications are stopped, check user's progress
    // Allow if user is in Phase 4 (INTERVIEW) or Phase 5 (ACCEPTED) 
    if (applicant.phase === Phase.INTERVIEW || applicant.phase === Phase.ACCEPTED) {
      return false;
    }

    // Allow Phase 3 users who have submitted (check by their application status)
    if (applicant.phase === Phase.IN_DEPTH_APPLICATION) {
      // Check the user's status directly from the applicant object, not the signal
      console.log('🔍 Checking Phase 3 status:', applicant.status, 'Expected:', ApplicationStatus.PHASE_3_SUBMITTED);
      // If they have submitted - don't block them (they can view their submitted application)
      if (applicant.status === ApplicationStatus.PHASE_3_SUBMITTED) {
        return false;
      }
    }

    // Block users in Phase 1, Phase 2, and Phase 3 (draft only)
    return applicant.phase === Phase.SIGNUP || 
           applicant.phase === Phase.WEBINAR || 
           applicant.phase === Phase.IN_DEPTH_APPLICATION;
  }
}
