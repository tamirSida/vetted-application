import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../services';
import { UserRole } from '../../../models';

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
          <div class="signup-info">
            <div class="info-section">
              <i class="fas fa-rocket"></i>
              <h3>Join Vetted Accelerator</h3>
              <p>Ready to accelerate your veteran-founded startup? Our exclusive program is designed specifically for veteran entrepreneurs.</p>
            </div>

            <div class="requirements">
              <h4>Program Requirements:</h4>
              <ul>
                <li><i class="fas fa-check"></i> Must be a founder of your company</li>
                <li><i class="fas fa-check"></i> Military service background required</li>
                <li><i class="fas fa-check"></i> Commitment to full program participation</li>
                <li><i class="fas fa-check"></i> Early-stage startup (pre-Series A)</li>
              </ul>
            </div>

            <button type="button" class="submit-button" (click)="startApplication()">
              <i class="fas fa-arrow-right"></i>
              Sign Up Now
            </button>

            <p class="application-note">
              The application process consists of multiple phases including webinar attendance and in-depth evaluation.
            </p>
          </div>
        }

        <div class="auth-toggle">
          <p>
            {{ isLogin() ? "Don't have an account?" : "Already have an account?" }}
            <button type="button" class="toggle-button" (click)="toggleMode()">
              {{ isLogin() ? 'Apply Now' : 'Sign In' }}
            </button>
          </p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  isLogin = signal(true);
  isLoading = signal(false);
  error = signal<string>('');
  success = signal<string>('');

  loginForm: FormGroup;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
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
    this.router.navigate(['/application/phase1']);
  }
}