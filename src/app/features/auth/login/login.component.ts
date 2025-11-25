import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../services';
import { CohortService } from '../../../services/cohort.service';
import { ApplicationSettingsService } from '../../../services/application-settings.service';
import { UserRole, Cohort } from '../../../models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  styleUrl: './login.component.scss',
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <header class="auth-header">
          <h1>{{ isLogin() ? 'Sign In' : 'Create Account' }}</h1>
          <p>{{ isLogin() ? 'Welcome back to the Vetted Accelerator' : 'Join the Vetted Accelerator Program' }}</p>
        </header>

        @if (success()) {
          <div class="alert alert-success">
            <i class="fas fa-check-circle"></i>
            {{ success() }}
          </div>
        }

        @if (error()) {
          <div class="alert alert-error">
            <i class="fas fa-exclamation-circle"></i>
            {{ error() }}
          </div>
        }

        @if (isLogin()) {
          <form [formGroup]="loginForm" (ngSubmit)="onLogin()" class="auth-form">
            <div class="form-group">
              <label for="email">Email</label>
              <div class="input-group">
                <i class="fas fa-envelope"></i>
                <input
                  type="email"
                  id="email"
                  formControlName="email"
                  placeholder="Enter your email"
                  [class.error]="loginForm.get('email')?.touched && loginForm.get('email')?.errors"
                />
              </div>
              @if (loginForm.get('email')?.touched && loginForm.get('email')?.errors) {
                <div class="field-error">
                  @if (loginForm.get('email')?.errors?.['required']) {
                    Email is required
                  }
                  @if (loginForm.get('email')?.errors?.['email']) {
                    Please enter a valid email
                  }
                </div>
              }
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <div class="input-group">
                <i class="fas fa-lock"></i>
                <input
                  type="password"
                  id="password"
                  formControlName="password"
                  placeholder="Enter your password"
                  [class.error]="loginForm.get('password')?.touched && loginForm.get('password')?.errors"
                />
              </div>
              @if (loginForm.get('password')?.touched && loginForm.get('password')?.errors) {
                <div class="field-error">
                  @if (loginForm.get('password')?.errors?.['required']) {
                    Password is required
                  }
                  @if (loginForm.get('password')?.errors?.['minlength']) {
                    Password must be at least 6 characters
                  }
                </div>
              }
            </div>

            <button type="submit" class="submit-button" [disabled]="isLoading() || loginForm.invalid">
              @if (isLoading()) {
                <i class="fas fa-spinner fa-spin"></i>
                Signing In...
              } @else {
                <i class="fas fa-sign-in-alt"></i>
                Sign In
              }
            </button>

            <div class="forgot-password">
              <button type="button" class="forgot-password-button" (click)="onForgotPassword()" [disabled]="isLoading()">
                Forgot your password?
              </button>
            </div>
          </form>
        } @else {
          <!-- Applications Open -->
          @if (applicationsOpen() && !applicationsStopped()) {
            <div class="signup-info">
              <div class="info-section">
                <i class="fas fa-rocket"></i>
                <h3>Join Vetted Accelerator</h3>
                <p>Ready to accelerate your Combat Veteran-founded startup? Our exclusive program is designed specifically for Combat Veteran entrepreneurs.</p>
              </div>

              <div class="requirements">
                <h4>Program Requirements:</h4>
                <ul>
                  <li><i class="fas fa-check"></i> Must be a founder of your company</li>
                  <li><i class="fas fa-check"></i> Proof of combat service required</li>
                  <li><i class="fas fa-check"></i> 100% Participation in Program</li>
                </ul>
              </div>

              <button type="button" class="submit-button" (click)="startApplication()">
                <i class="fas fa-arrow-right"></i>
                Sign Up Now
              </button>

              <p class="application-note">
                Applying to the Vetted Accelerator includes both an online application and a Zoom / in-person meeting with one of our team members.
              </p>
            </div>
          }

          <!-- Applications Closed - Before Open -->
          @if (!applicationsOpen() && !isManuallyDisabled() && applicationStartDate()) {
            <div class="signup-info closed">
              <div class="info-section">
                <i class="fas fa-calendar-clock"></i>
                <h3>Applications Opening Soon</h3>
                <p>Get ready to accelerate your Combat Veteran-founded startup! Our exclusive program is designed specifically for Combat Veteran entrepreneurs.</p>
              </div>

              <div class="closed-message">
                <h4>Applications will open on:</h4>
                <div class="date-display">
                  {{ formatStartDate(applicationStartDate()) }}
                </div>
                <p>Sign up and applications start on {{ formatStartDate(applicationStartDate()) }}</p>
              </div>

              <button type="button" class="submit-button disabled" disabled>
                <i class="fas fa-clock"></i>
                Applications Not Yet Open
              </button>
            </div>
          }

          <!-- Applications Closed - Manually Disabled -->
          @if (!applicationsOpen() && isManuallyDisabled()) {
            <div class="signup-info closed">
              <div class="info-section">
                <i class="fas fa-pause-circle"></i>
                <h3>Applications Currently Closed</h3>
                <p>Thank you for your interest in the Vetted Accelerator program for Combat Veteran entrepreneurs.</p>
              </div>

              <div class="closed-message">
                <h4>Not accepting applications at this time</h4>
                <p>Sorry we aren't accepting applications anymore - stay tuned for possible updates</p>
                <a href="https://accelerator.thevetted.vc" target="_blank" class="website-link">
                  <i class="fas fa-external-link-alt"></i>
                  Visit our website for updates
                </a>
              </div>

              <button type="button" class="submit-button disabled" disabled>
                <i class="fas fa-times-circle"></i>
                Applications Closed
              </button>
            </div>
          }

          <!-- Applications Stopped -->
          @if (applicationsStopped()) {
            <div class="signup-info closed">
              <div class="info-section">
                <i class="fas fa-stop"></i>
                <h3>We aren't accepting applications any more!</h3>
              </div>

              <p class="contact-info">
                If you have questions, please contact us at <strong>info@thevetted.vc</strong>
              </p>

              <button type="button" class="submit-button" (click)="toggleMode()">
                <i class="fas fa-sign-in-alt"></i>
                Already have an account? Sign In
              </button>
            </div>
          }
        }

        @if (!applicationsStopped()) {
          <div class="auth-toggle">
            <p>
              {{ isLogin() ? "Don't have an account?" : "Already have an account?" }}
              <button type="button" class="toggle-button" (click)="toggleMode()">
                {{ isLogin() ? 'Apply Now' : 'Sign In' }}
              </button>
            </p>
          </div>
        }
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cohortService = inject(CohortService);
  private applicationSettingsService = inject(ApplicationSettingsService);

  isLogin = signal(false);
  isLoading = signal(false);
  error = signal<string>('');
  success = signal<string>('');

  // Application window status
  applicationsOpen = signal(true);
  applicationStartDate = signal<Date | null>(null);
  isManuallyDisabled = signal(false);
  applicationsStopped = signal(false);

  loginForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async ngOnInit() {
    await this.checkApplicationWindowStatus();
    await this.checkApplicationSettings();
  }

  private async checkApplicationWindowStatus(): Promise<void> {
    try {
      // Get all cohorts and filter for active ones
      const allCohorts = await this.cohortService.getAllCohorts();
      const activeCohorts = allCohorts.filter((cohort: Cohort) => cohort.isActive);
      const now = new Date();

      if (activeCohorts.length === 0) {
        this.applicationsOpen.set(false);
        this.isManuallyDisabled.set(true);
        return;
      }

      // Find the current cohort accepting applications
      const currentCohort = activeCohorts.find((cohort: Cohort) => {
        const appStart = new Date(cohort.applicationStartDate);
        const appEnd = new Date(cohort.applicationEndDate);
        return now >= appStart && now <= appEnd;
      });

      if (currentCohort) {
        this.applicationsOpen.set(true);
      } else {
        // Check if there's a future cohort
        const futureCohort = activeCohorts.find((cohort: Cohort) => {
          const appStart = new Date(cohort.applicationStartDate);
          return now < appStart;
        });

        if (futureCohort) {
          this.applicationsOpen.set(false);
          this.applicationStartDate.set(new Date(futureCohort.applicationStartDate));
          this.isManuallyDisabled.set(false);
        } else {
          this.applicationsOpen.set(false);
          this.isManuallyDisabled.set(true);
        }
      }
    } catch (error) {
      console.error('Error checking application window status:', error);
      // Default to closed if we can't check
      this.applicationsOpen.set(false);
      this.isManuallyDisabled.set(true);
    }
  }

  toggleMode(): void {
    this.isLogin.update(val => !val);
    this.error.set('');
    this.success.set('');
  }

  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) return;

    try {
      this.isLoading.set(true);
      this.error.set('');

      const { email, password } = this.loginForm.value;

      const user = await this.authService.signIn(email, password);

      this.success.set('Login successful! Redirecting...');

      // Redirect based on user role
      if (user.role === UserRole.ADMIN || user.role === UserRole.VIEWER) {
        setTimeout(() => this.router.navigate(['/admin']), 1500);
      } else {
        // All applicants go to dashboard
        setTimeout(() => this.router.navigate(['/dashboard']), 1500);
      }

    } catch (error: any) {
      let errorMessage = 'Invalid email or password. Please try again.';

      if (error.message?.includes('user-not-found')) {
        errorMessage = 'No account found with this email address.';
      } else if (error.message?.includes('wrong-password')) {
        errorMessage = 'Invalid password. Please try again.';
      } else if (error.message?.includes('user-disabled')) {
        errorMessage = 'This account has been disabled. Please contact support.';
      }

      this.error.set(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }

  onForgotPassword(): void {
    const email = this.loginForm.get('email')?.value;

    if (!email) {
      this.error.set('Please enter your email address to reset your password.');
      return;
    }

    if (!this.loginForm.get('email')?.valid) {
      this.error.set('Please enter a valid email address.');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');
    this.success.set('');

    // Mock password reset
    setTimeout(() => {
      this.success.set('Password reset email sent! Check your inbox and follow the instructions to reset your password.');
      this.isLoading.set(false);
    }, 1000);
  }


  startApplication(): void {
    if (this.applicationsOpen()) {
      this.router.navigate(['/application/phase1']);
    }
  }

  formatStartDate(date: Date | null): string {
    if (!date) return 'TBD';
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
    return `${dateStr} at ${timeStr} in your time zone`;
  }

  private async checkApplicationSettings(): Promise<void> {
    try {
      const settings = await this.applicationSettingsService.getApplicationSettings();
      if (settings) {
        this.applicationsStopped.set(!settings.acceptingApplications);
      }
    } catch (error) {
      console.error('Error checking application settings:', error);
    }
  }
}
