import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Phase1Application, ServiceCountry, UserRole } from '../../../../models';
import { StorageService, ApplicationService, ApplicationSubmissionData, AuthService, CohortService } from '../../../../services';

@Component({
  selector: 'app-phase1-application',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <header class="auth-header">
          <button class="back-button" (click)="goBack()">
            <i class="fas fa-arrow-left"></i>
            Back to Login
          </button>
          <h1>Phase 1 Application</h1>
          <p>{{ currentPage() === 1 ? 'Company & Personal Information' : 'Extended Information' }}</p>
          <p class="form-note">This will create your user account and sign you in automatically.</p>
        </header>

        <!-- Progress Indicator -->
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-step" [class.active]="currentPage() === 1" [class.completed]="currentPage() > 1">
              <span class="step-number">1</span>
              <span class="step-label">Basic Info</span>
            </div>
            <div class="progress-step" [class.active]="currentPage() === 2">
              <span class="step-number">2</span>
              <span class="step-label">Details</span>
            </div>
          </div>
        </div>

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

        <form [formGroup]="applicationForm" (ngSubmit)="onSubmit()" class="auth-form">
          @if (currentPage() === 1) {
            <!-- Page 1: Company & Personal Info -->
            <div class="form-section">
              <h3>Company Information</h3>
              
              <div class="form-group">
                <label for="companyName">Company Name *</label>
                <div class="input-group">
                  <i class="fas fa-building"></i>
                  <input 
                    type="text" 
                    id="companyName" 
                    formControlName="companyName"
                    maxlength="300"
                    placeholder="Enter your company name"
                    [class.error]="applicationForm.get('companyName')?.touched && applicationForm.get('companyName')?.errors">
                </div>
                @if (applicationForm.get('companyName')?.touched && applicationForm.get('companyName')?.errors) {
                  <div class="field-error">Company name is required</div>
                }
              </div>

              <div class="form-group">
                <label for="companyWebsite">Company Website</label>
                <div class="input-group">
                  <i class="fas fa-globe"></i>
                  <input 
                    type="url" 
                    id="companyWebsite" 
                    formControlName="companyWebsite"
                    maxlength="300"
                    placeholder="https://example.com">
                </div>
              </div>


              <div class="form-group">
                <div class="checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" formControlName="isFounder">
                    <span class="checkmark"></span>
                    I am a founder of this company (required to apply) *
                  </label>
                </div>
                @if (applicationForm.get('isFounder')?.touched && applicationForm.get('isFounder')?.errors) {
                  <div class="field-error">You must be a founder to apply</div>
                }
              </div>
            </div>

            <div class="form-section">
              <h3>Personal Information</h3>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="firstName">First Name *</label>
                  <div class="input-group">
                    <i class="fas fa-user"></i>
                    <input 
                      type="text" 
                      id="firstName" 
                      formControlName="firstName"
                      maxlength="300"
                      placeholder="First name"
                      [class.error]="applicationForm.get('firstName')?.touched && applicationForm.get('firstName')?.errors">
                  </div>
                  @if (applicationForm.get('firstName')?.touched && applicationForm.get('firstName')?.errors) {
                    <div class="field-error">First name is required</div>
                  }
                </div>

                <div class="form-group">
                  <label for="lastName">Last Name *</label>
                  <div class="input-group">
                    <i class="fas fa-user"></i>
                    <input 
                      type="text" 
                      id="lastName" 
                      formControlName="lastName"
                      maxlength="300"
                      placeholder="Last name"
                      [class.error]="applicationForm.get('lastName')?.touched && applicationForm.get('lastName')?.errors">
                  </div>
                  @if (applicationForm.get('lastName')?.touched && applicationForm.get('lastName')?.errors) {
                    <div class="field-error">Last name is required</div>
                  }
                </div>
              </div>

              <div class="form-group">
                <label for="email">Email Address *</label>
                <div class="input-group">
                  <i class="fas fa-envelope"></i>
                  <input 
                    type="email" 
                    id="email" 
                    formControlName="email"
                    maxlength="300"
                    placeholder="you@example.com"
                    [class.error]="applicationForm.get('email')?.touched && applicationForm.get('email')?.errors">
                </div>
                @if (applicationForm.get('email')?.touched && applicationForm.get('email')?.errors) {
                  <div class="field-error">Valid email is required</div>
                }
              </div>

              <div class="form-group">
                <label for="confirmEmail">Confirm Email *</label>
                <div class="input-group">
                  <i class="fas fa-envelope"></i>
                  <input 
                    type="email" 
                    id="confirmEmail" 
                    formControlName="confirmEmail"
                    maxlength="300"
                    placeholder="Confirm email"
                    [class.error]="applicationForm.get('confirmEmail')?.touched && applicationForm.get('confirmEmail')?.errors"
                    [class.success]="isEmailMatching()">
                  @if (isEmailMatching()) {
                    <i class="fas fa-check success-icon"></i>
                  }
                </div>
                @if (applicationForm.get('confirmEmail')?.touched && applicationForm.get('confirmEmail')?.errors) {
                  <div class="field-error">
                    @if (applicationForm.get('confirmEmail')?.errors?.['required']) {
                      Email confirmation is required
                    } @else if (applicationForm.get('confirmEmail')?.errors?.['emailMismatch']) {
                      Email addresses do not match
                    } @else if (applicationForm.get('confirmEmail')?.errors?.['email']) {
                      Please enter a valid email
                    }
                  </div>
                } @else if (isEmailMatching()) {
                  <div class="field-success">
                    <i class="fas fa-check"></i>
                    Email addresses match
                  </div>
                }
              </div>

              <div class="form-group">
                <label for="password">Password *</label>
                <div class="input-group">
                  <i class="fas fa-lock"></i>
                  <input 
                    [type]="showPassword() ? 'text' : 'password'" 
                    id="password" 
                    formControlName="password"
                    placeholder="Create password"
                    [class.error]="applicationForm.get('password')?.touched && applicationForm.get('password')?.errors">
                  <button type="button" class="password-toggle" (click)="togglePasswordVisibility()">
                    <i [class]="showPassword() ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </button>
                </div>
                @if (applicationForm.get('password')?.touched && applicationForm.get('password')?.errors) {
                  <div class="field-error">Password is required (min 8 characters)</div>
                }
              </div>

              <div class="form-group">
                <label for="confirmPassword">Confirm Password *</label>
                <div class="input-group">
                  <i class="fas fa-lock"></i>
                  <input 
                    [type]="showConfirmPassword() ? 'text' : 'password'" 
                    id="confirmPassword" 
                    formControlName="confirmPassword"
                    placeholder="Confirm password"
                    [class.error]="applicationForm.get('confirmPassword')?.touched && applicationForm.get('confirmPassword')?.errors"
                    [class.success]="isPasswordMatching()">
                  <button type="button" class="password-toggle" (click)="toggleConfirmPasswordVisibility()">
                    <i [class]="showConfirmPassword() ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </button>
                  @if (isPasswordMatching()) {
                    <i class="fas fa-check success-icon"></i>
                  }
                </div>
                @if (applicationForm.get('confirmPassword')?.touched && applicationForm.get('confirmPassword')?.errors) {
                  <div class="field-error">
                    @if (applicationForm.get('confirmPassword')?.errors?.['required']) {
                      Password confirmation is required
                    } @else if (applicationForm.get('confirmPassword')?.errors?.['passwordMismatch']) {
                      Passwords do not match
                    }
                  </div>
                } @else if (isPasswordMatching()) {
                  <div class="field-success">
                    <i class="fas fa-check"></i>
                    Passwords match
                  </div>
                }
              </div>

              <div class="form-group">
                <label for="phone">Phone Number *</label>
                <div class="input-group">
                  <i class="fas fa-phone"></i>
                  <input 
                    type="tel" 
                    id="phone" 
                    formControlName="phone"
                    maxlength="300"
                    placeholder="(555) 123-4567"
                    [class.error]="applicationForm.get('phone')?.touched && applicationForm.get('phone')?.errors">
                </div>
                @if (applicationForm.get('phone')?.touched && applicationForm.get('phone')?.errors) {
                  <div class="field-error">Phone number is required</div>
                }
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="submit-button" (click)="nextPage()" [disabled]="!isPage1Valid()">
                Next Page
                <i class="fas fa-arrow-right"></i>
              </button>
            </div>
          } @else {
            <!-- Page 2: Extended Information -->
            <div class="form-section">
              <h3>Professional Background</h3>
              
              <div class="form-group">
                <label for="role">Your Role in the Company *</label>
                <div class="input-group">
                  <i class="fas fa-user-tie"></i>
                  <input 
                    type="text" 
                    id="role" 
                    formControlName="role"
                    maxlength="300"
                    placeholder="CEO, CTO, etc."
                    [class.error]="applicationForm.get('role')?.touched && applicationForm.get('role')?.errors">
                </div>
                @if (applicationForm.get('role')?.touched && applicationForm.get('role')?.errors) {
                  <div class="field-error">Role is required</div>
                }
              </div>

              <div class="form-group">
                <label for="founderCount">How many founders are in the company? *</label>
                <div class="input-group">
                  <i class="fas fa-users"></i>
                  <input 
                    type="number" 
                    id="founderCount" 
                    formControlName="founderCount"
                    min="1"
                    max="99"
                    placeholder="Number of founders"
                    [class.error]="applicationForm.get('founderCount')?.touched && applicationForm.get('founderCount')?.errors">
                </div>
                @if (applicationForm.get('founderCount')?.touched && applicationForm.get('founderCount')?.errors) {
                  <div class="field-error">Number of founders is required (1-99)</div>
                }
              </div>
              
              <div class="form-group">
                <label for="linkedInProfile">LinkedIn Profile URL</label>
                <div class="input-group">
                  <i class="fab fa-linkedin"></i>
                  <input 
                    type="url" 
                    id="linkedInProfile" 
                    formControlName="linkedInProfile"
                    maxlength="300"
                    placeholder="https://www.linkedin.com/in/yourprofile (optional)"
                    [class.error]="applicationForm.get('linkedInProfile')?.touched && applicationForm.get('linkedInProfile')?.errors">
                </div>
                @if (applicationForm.get('linkedInProfile')?.touched && applicationForm.get('linkedInProfile')?.errors) {
                  <div class="field-error">Please enter a valid LinkedIn URL</div>
                }
              </div>

              <div class="form-group">
                <label for="serviceCountry">Country of Military Service *</label>
                <div class="input-group">
                  <i class="fas fa-flag"></i>
                  <select id="serviceCountry" formControlName="serviceCountry" class="service-select"
                    [class.error]="applicationForm.get('serviceCountry')?.touched && applicationForm.get('serviceCountry')?.errors">
                    <option value="">Select Country</option>
                    <option *ngFor="let country of serviceCountries" [value]="country.value">{{ country.label }}</option>
                  </select>
                </div>
                @if (applicationForm.get('serviceCountry')?.touched && applicationForm.get('serviceCountry')?.errors) {
                  <div class="field-error">Service country is required</div>
                }
              </div>

              <div class="form-group">
                <label for="serviceUnit">Military Unit/Branch *</label>
                <div class="input-group">
                  <i class="fas fa-shield-alt"></i>
                  <input 
                    type="text" 
                    id="serviceUnit" 
                    formControlName="serviceUnit"
                    maxlength="300"
                    placeholder="e.g., Army Rangers, Navy SEALs, etc."
                    [class.error]="applicationForm.get('serviceUnit')?.touched && applicationForm.get('serviceUnit')?.errors">
                </div>
                @if (applicationForm.get('serviceUnit')?.touched && applicationForm.get('serviceUnit')?.errors) {
                  <div class="field-error">Service unit is required</div>
                }
              </div>
            </div>

            <div class="form-section">
              <h3>Company Description</h3>
              
              <div class="form-group">
                <label for="grandmaTest">The "Grandma" Test *</label>
                <p class="field-description">In one sentence, explain what your company does (without jargon)</p>
                <textarea 
                  id="grandmaTest" 
                  formControlName="grandmaTest"
                  maxlength="300"
                  rows="3"
                  placeholder="We help..."
                  class="textarea"
                  [class.error]="applicationForm.get('grandmaTest')?.touched && applicationForm.get('grandmaTest')?.errors"></textarea>
                <div class="char-count">{{ getCharCount('grandmaTest') }}/300</div>
                @if (applicationForm.get('grandmaTest')?.touched && applicationForm.get('grandmaTest')?.errors) {
                  <div class="field-error">Company description is required</div>
                }
              </div>

              <div class="form-group">
                <label for="discovery">How did you hear about Vetted? *</label>
                <div class="input-group">
                  <i class="fas fa-search"></i>
                  <input 
                    type="text" 
                    id="discovery" 
                    formControlName="discovery"
                    maxlength="300"
                    placeholder="LinkedIn, referral, website, etc."
                    [class.error]="applicationForm.get('discovery')?.touched && applicationForm.get('discovery')?.errors">
                </div>
                <div class="char-count">{{ getCharCount('discovery') }}/300</div>
                @if (applicationForm.get('discovery')?.touched && applicationForm.get('discovery')?.errors) {
                  <div class="field-error">Please tell us how you found Vetted</div>
                }
              </div>
            </div>

            <div class="form-section">
              <h3>Commitment & Documentation</h3>
              
              <div class="upload-section">
                <label>Pitch Deck (Optional)</label>
                @if (!selectedFile() && !uploadedFileUrl()) {
                  <div class="upload-area" (click)="fileInput.click()">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Upload your pitch deck (PDF only)</p>
                    <p class="upload-note">Max 10MB</p>
                  </div>
                }
                <input #fileInput type="file" accept=".pdf" (change)="onFileSelect($event)" style="display: none;">
                
                @if (isUploading()) {
                  <div class="file-preview uploading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Uploading {{ selectedFile()?.name }}...</span>
                  </div>
                } @else if (uploadedFileUrl() && selectedFile()) {
                  <div class="file-preview uploaded">
                    <i class="fas fa-file-pdf"></i>
                    <span>{{ selectedFile()?.name }} (Uploaded)</span>
                    <button type="button" class="remove-file" (click)="removeFile()">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                }

                <div class="form-group">
                  <label for="nodeckExplanation">If no deck available, explain why:</label>
                  <textarea 
                    id="nodeckExplanation" 
                    formControlName="nodeckExplanation"
                    maxlength="300"
                    rows="2"
                    placeholder="Early stage, working on MVP, etc."
                    class="textarea"></textarea>
                  <div class="char-count">{{ getCharCount('nodeckExplanation') }}/300</div>
                </div>
              </div>

              <div class="form-group">
                <div class="checkbox-group">
                  <label class="checkbox-label">
                    <input type="checkbox" formControlName="timeCommitment">
                    <span class="checkmark"></span>
                    I commit to participating 100% in the program *
                  </label>
                  <p class="commitment-note">This includes mandatory virtual sessions and in-person modules with travel.</p>
                </div>
                @if (applicationForm.get('timeCommitment')?.touched && applicationForm.get('timeCommitment')?.errors) {
                  <div class="field-error">Commitment confirmation is required</div>
                }
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="secondary-button" (click)="prevPage()">
                <i class="fas fa-arrow-left"></i>
                Previous
              </button>
              <button type="submit" class="submit-button" [disabled]="!applicationForm.valid || isLoading()">
                @if (isLoading()) {
                  <i class="fas fa-spinner fa-spin"></i>
                  Submitting...
                } @else {
                  <i class="fas fa-paper-plane"></i>
                  Submit Application
                }
              </button>
            </div>
          }
        </form>
      </div>
    </div>
  `,
  styleUrl: './phase1-application.component.scss'
})
export class Phase1ApplicationComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private storageService = inject(StorageService);
  private applicationService = inject(ApplicationService);
  private authService = inject(AuthService);
  private cohortService = inject(CohortService);

  currentPage = signal(1);
  error = signal<string>('');
  success = signal<string>('');
  selectedFile = signal<File | null>(null);
  uploadedFileUrl = signal<string>('');
  uploadedFilePath = signal<string>('');
  isLoading = signal(false);
  isUploading = signal(false);
  applicationId = signal<string>('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  serviceCountries = [
    { value: ServiceCountry.USA, label: 'USA' },
    { value: ServiceCountry.ISRAEL, label: 'Israel' },
    { value: ServiceCountry.OTHER, label: 'Other' }
  ];

  applicationForm: FormGroup;

  constructor() {

    this.applicationForm = this.fb.group({
      // Page 1 - Company Info
      companyName: ['', [Validators.required, Validators.maxLength(300)]],
      companyWebsite: ['', [Validators.maxLength(300)]],
      isFounder: [false, [Validators.requiredTrue]],
      
      // Page 1 - Personal Info
      firstName: ['', [Validators.required, Validators.maxLength(300)]],
      lastName: ['', [Validators.required, Validators.maxLength(300)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(300)]],
      confirmEmail: ['', [Validators.required, Validators.email, Validators.maxLength(300)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.maxLength(300)]],
      
      // Page 2 - Extended Info
      role: ['', [Validators.required, Validators.maxLength(300)]],
      founderCount: ['', [Validators.required, Validators.min(1), Validators.max(99)]],
      linkedInProfile: ['', [Validators.maxLength(300)]], // Made optional
      serviceCountry: ['', [Validators.required]],
      serviceUnit: ['', [Validators.required, Validators.maxLength(300)]],
      grandmaTest: ['', [Validators.required, Validators.maxLength(300)]],
      nodeckExplanation: ['', [Validators.maxLength(300)]],
      discovery: ['', [Validators.required, Validators.maxLength(300)]],
      timeCommitment: [false, [Validators.requiredTrue]]
    }, {
      validators: [this.emailMatchValidator, this.passwordMatchValidator]
    });

  }

  isPage1Valid(): boolean {
    const page1Fields = ['companyName', 'isFounder', 'firstName', 'lastName', 'email', 'confirmEmail', 'password', 'confirmPassword', 'phone'];
    return page1Fields.every(field => this.applicationForm.get(field)?.valid);
  }

  nextPage(): void {
    if (this.isPage1Valid()) {
      this.currentPage.set(2);
    }
  }


  prevPage(): void {
    this.currentPage.set(1);
  }

  getCharCount(fieldName: string): number {
    return this.applicationForm.get(fieldName)?.value?.length || 0;
  }

  async onFileSelect(event: any): Promise<void> {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (file.type !== 'application/pdf') {
      this.error.set('Please upload a PDF file only.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.error.set('File size must be less than 10MB.');
      return;
    }

    this.selectedFile.set(file);
    this.error.set('');

    // Auto-upload the file
    await this.uploadFile();
  }

  async uploadFile(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    this.isUploading.set(true);
    this.error.set('');

    try {
      // Mock applicant ID - in real app, get from auth service
      const applicantId = 'mock-applicant-id';
      
      const result = await this.storageService.uploadPitchDeck(file, applicantId);
      
      this.uploadedFileUrl.set(result.downloadURL);
      this.uploadedFilePath.set(result.filePath);
      this.success.set('Pitch deck uploaded successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => this.success.set(''), 3000);
      
    } catch (error: any) {
      this.error.set(error.message || 'Failed to upload file. Please try again.');
    } finally {
      this.isUploading.set(false);
    }
  }

  async removeFile(): Promise<void> {
    const filePath = this.uploadedFilePath();
    
    if (filePath) {
      try {
        await this.storageService.deletePitchDeck(filePath);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
    
    this.selectedFile.set(null);
    this.uploadedFileUrl.set('');
    this.uploadedFilePath.set('');
  }


  async onSubmit(): Promise<void> {
    if (!this.applicationForm.valid) {
      this.markAllFieldsAsTouched();
      this.error.set('Please fix the errors above before submitting.');
      return;
    }

    try {
      this.isLoading.set(true);
      this.error.set('');

      // Get the active cohort
      const activeCohort = await this.cohortService.getActiveCohort();
      if (!activeCohort) {
        throw new Error('No active cohort available for registration');
      }

      // Prepare complete form data for submission
      const formData = this.prepareFormData();

      const result = await this.applicationService.submitPhase1Application(
        formData as ApplicationSubmissionData, 
        activeCohort.id!
      );
      
      this.applicationId.set(result.applicationId);
      this.success.set('Application submitted successfully! Redirecting to your applicant dashboard...');
      
      // The user is now automatically signed in with their new account
      // Redirect to their applicant dashboard
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 2000);
      
    } catch (error: any) {
      console.error('Phase 1 submission error:', error);
      let errorMessage = 'Failed to submit application. Please try again.';
      
      // Handle specific Firebase Auth errors
      if (error.message?.includes('email-already-in-use')) {
        errorMessage = 'An account with this email already exists. Please use a different email or sign in.';
      } else if (error.message?.includes('weak-password')) {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.message?.includes('invalid-email')) {
        errorMessage = 'Please enter a valid email address.';
      } else {
        // Show the actual error message for debugging
        errorMessage = error.message || 'Failed to submit application. Please try again.';
      }
      
      this.error.set(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }

  private prepareFormData(): Partial<ApplicationSubmissionData> {
    const formValue = this.applicationForm.value;
    
    return {
      companyInfo: {
        companyName: formValue.companyName,
        companyWebsite: formValue.companyWebsite,
        isFounder: formValue.isFounder
      },
      personalInfo: {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
        confirmEmail: formValue.confirmEmail,
        password: formValue.password,
        confirmPassword: formValue.confirmPassword,
        phone: formValue.phone
      },
      extendedInfo: {
        role: formValue.role,
        founderCount: formValue.founderCount,
        linkedInProfile: formValue.linkedInProfile,
        serviceHistory: {
          country: formValue.serviceCountry,
          unit: formValue.serviceUnit
        },
        grandmaTest: formValue.grandmaTest,
        pitchDeck: this.uploadedFileUrl() ? {
          fileUrl: this.uploadedFileUrl(),
          fileName: this.selectedFile()?.name
        } : formValue.nodeckExplanation ? {
          nodeckExplanation: formValue.nodeckExplanation
        } : undefined,
        discovery: formValue.discovery,
        timeCommitment: formValue.timeCommitment
      }
    };
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.applicationForm.controls).forEach(key => {
      this.applicationForm.get(key)?.markAsTouched();
    });
  }

  goBack(): void {
    this.router.navigate(['/auth/login']);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(val => !val);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(val => !val);
  }

  isEmailMatching(): boolean {
    const email = this.applicationForm.get('email')?.value;
    const confirmEmail = this.applicationForm.get('confirmEmail')?.value;
    return email && confirmEmail && email === confirmEmail && this.applicationForm.get('email')?.valid && this.applicationForm.get('confirmEmail')?.valid;
  }

  isPasswordMatching(): boolean {
    const password = this.applicationForm.get('password')?.value;
    const confirmPassword = this.applicationForm.get('confirmPassword')?.value;
    return password && confirmPassword && password === confirmPassword && this.applicationForm.get('password')?.valid;
  }

  // Custom validators
  private emailMatchValidator(form: FormGroup) {
    const email = form.get('email');
    const confirmEmail = form.get('confirmEmail');
    
    if (email && confirmEmail && email.value !== confirmEmail.value) {
      confirmEmail.setErrors({ emailMismatch: true });
      return { emailMismatch: true };
    }
    
    if (confirmEmail?.hasError('emailMismatch')) {
      delete confirmEmail.errors?.['emailMismatch'];
      if (Object.keys(confirmEmail.errors || {}).length === 0) {
        confirmEmail.setErrors(null);
      }
    }
    
    return null;
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    if (confirmPassword?.hasError('passwordMismatch')) {
      delete confirmPassword.errors?.['passwordMismatch'];
      if (Object.keys(confirmPassword.errors || {}).length === 0) {
        confirmPassword.setErrors(null);
      }
    }
    
    return null;
  }




}