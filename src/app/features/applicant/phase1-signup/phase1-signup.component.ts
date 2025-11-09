import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApplicantUser, Phase1Application } from '../../../models';
import { APP_CONSTANTS } from '../../../constants';

@Component({
  selector: 'app-phase1-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="phase1-container">
      <header class="phase-header">
        <h2>Sign Up - Initial Application</h2>
        <p>Please complete your initial application below. You can save your progress and return to complete it later.</p>
      </header>

      <form [formGroup]="signupForm" (ngSubmit)="onSubmit()" class="signup-form">
        <!-- Personal Information Section -->
        <section class="form-section">
          <h3>Personal Information</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">First Name *</label>
              <input
                type="text"
                id="firstName"
                formControlName="firstName"
                class="form-control"
                placeholder="Enter your first name"
              >
              <div *ngIf="signupForm.get('firstName')?.invalid && signupForm.get('firstName')?.touched" class="error">
                First name is required
              </div>
            </div>

            <div class="form-group">
              <label for="lastName">Last Name *</label>
              <input
                type="text"
                id="lastName"
                formControlName="lastName"
                class="form-control"
                placeholder="Enter your last name"
              >
              <div *ngIf="signupForm.get('lastName')?.invalid && signupForm.get('lastName')?.touched" class="error">
                Last name is required
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email Address *</label>
            <input
              type="email"
              id="email"
              formControlName="email"
              class="form-control"
              placeholder="Enter your email address"
            >
            <div *ngIf="signupForm.get('email')?.invalid && signupForm.get('email')?.touched" class="error">
              Valid email address is required
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="phone">Phone Number *</label>
              <input
                type="tel"
                id="phone"
                formControlName="phone"
                class="form-control"
                placeholder="(555) 123-4567"
              >
              <div *ngIf="signupForm.get('phone')?.invalid && signupForm.get('phone')?.touched" class="error">
                Phone number is required
              </div>
            </div>

            <div class="form-group">
              <label for="location">Location *</label>
              <input
                type="text"
                id="location"
                formControlName="location"
                class="form-control"
                placeholder="City, State/Province, Country"
              >
              <div *ngIf="signupForm.get('location')?.invalid && signupForm.get('location')?.touched" class="error">
                Location is required
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="linkedIn">LinkedIn Profile</label>
            <input
              type="url"
              id="linkedIn"
              formControlName="linkedIn"
              class="form-control"
              placeholder="https://linkedin.com/in/yourprofile"
            >
          </div>
        </section>

        <!-- Background Information Section -->
        <section class="form-section">
          <h3>Background Information</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label for="currentRole">Current Role</label>
              <input
                type="text"
                id="currentRole"
                formControlName="currentRole"
                class="form-control"
                placeholder="e.g., Software Engineer, Student"
              >
            </div>

            <div class="form-group">
              <label for="company">Company/Organization</label>
              <input
                type="text"
                id="company"
                formControlName="company"
                class="form-control"
                placeholder="Current employer or school"
              >
            </div>
          </div>

          <div class="form-group">
            <label for="experience">Professional Experience *</label>
            <textarea
              id="experience"
              formControlName="experience"
              class="form-control"
              rows="4"
              placeholder="Describe your relevant work experience, projects, or accomplishments"
            ></textarea>
            <div *ngIf="signupForm.get('experience')?.invalid && signupForm.get('experience')?.touched" class="error">
              Experience description is required
            </div>
          </div>

          <div class="form-group">
            <label for="education">Education Background *</label>
            <textarea
              id="education"
              formControlName="education"
              class="form-control"
              rows="3"
              placeholder="Describe your educational background, degrees, certifications"
            ></textarea>
            <div *ngIf="signupForm.get('education')?.invalid && signupForm.get('education')?.touched" class="error">
              Education background is required
            </div>
          </div>

          <div class="form-group">
            <label for="skills">Key Skills *</label>
            <input
              type="text"
              id="skills"
              formControlName="skills"
              class="form-control"
              placeholder="Programming languages, frameworks, tools (comma separated)"
            >
            <small class="help-text">Separate multiple skills with commas (e.g., JavaScript, React, Node.js)</small>
            <div *ngIf="signupForm.get('skills')?.invalid && signupForm.get('skills')?.touched" class="error">
              At least one skill is required
            </div>
          </div>
        </section>

        <!-- Motivation Section -->
        <section class="form-section">
          <h3>Motivation & Goals</h3>
          
          <div class="form-group">
            <label for="whyApplying">Why are you applying to this accelerator? *</label>
            <textarea
              id="whyApplying"
              formControlName="whyApplying"
              class="form-control"
              rows="4"
              placeholder="Explain what motivates you to join this program and what you hope to achieve"
            ></textarea>
            <div *ngIf="signupForm.get('whyApplying')?.invalid && signupForm.get('whyApplying')?.touched" class="error">
              Please explain why you're applying
            </div>
          </div>

          <div class="form-group">
            <label for="goals">What are your career goals? *</label>
            <textarea
              id="goals"
              formControlName="goals"
              class="form-control"
              rows="4"
              placeholder="Describe your short-term and long-term career aspirations"
            ></textarea>
            <div *ngIf="signupForm.get('goals')?.invalid && signupForm.get('goals')?.touched" class="error">
              Career goals are required
            </div>
          </div>

          <div class="form-group">
            <label for="availability">Time Commitment & Availability *</label>
            <textarea
              id="availability"
              formControlName="availability"
              class="form-control"
              rows="3"
              placeholder="Describe your availability and how you plan to balance this program with other commitments"
            ></textarea>
            <div *ngIf="signupForm.get('availability')?.invalid && signupForm.get('availability')?.touched" class="error">
              Availability information is required
            </div>
          </div>
        </section>

        <!-- Form Actions -->
        <div class="form-actions">
          <button 
            type="button" 
            (click)="saveDraft()" 
            class="btn btn-secondary"
            [disabled]="isSaving"
          >
            {{ isSaving ? 'Saving...' : 'Save Draft' }}
          </button>

          <button 
            type="submit" 
            class="btn btn-primary"
            [disabled]="signupForm.invalid || isSubmitting"
          >
            {{ isSubmitting ? 'Submitting...' : 'Submit Application' }}
          </button>
        </div>

        <!-- Status Messages -->
        <div *ngIf="successMessage" class="success-message">
          {{ successMessage }}
        </div>

        <div *ngIf="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </form>
    </div>
  `,
  styles: [`
    .phase1-container {
      padding: 2rem;
    }

    .phase-header {
      margin-bottom: 2rem;
      text-align: center;
    }

    .phase-header h2 {
      color: #374151;
      font-size: 1.8rem;
      margin: 0 0 0.5rem 0;
    }

    .phase-header p {
      color: #6b7280;
      font-size: 1rem;
      margin: 0;
    }

    .signup-form {
      max-width: 800px;
      margin: 0 auto;
    }

    .form-section {
      margin-bottom: 2.5rem;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.5rem;
      background: #fafafa;
    }

    .form-section h3 {
      color: #374151;
      font-size: 1.3rem;
      margin: 0 0 1.5rem 0;
      border-bottom: 2px solid #667eea;
      padding-bottom: 0.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.3s, box-shadow 0.3s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    textarea.form-control {
      resize: vertical;
      min-height: 100px;
    }

    .help-text {
      display: block;
      font-size: 0.8rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }

    .error {
      color: #dc2626;
      font-size: 0.8rem;
      margin-top: 0.25rem;
      display: block;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin: 2rem 0;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    .btn {
      padding: 0.75rem 2rem;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      min-width: 140px;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5a67d8;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #6b7280;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #374151;
      transform: translateY(-1px);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .success-message {
      background: #ecfdf5;
      color: #065f46;
      padding: 1rem;
      border-radius: 6px;
      margin-top: 1rem;
      border-left: 4px solid #10b981;
    }

    .error-message {
      background: #fef2f2;
      color: #991b1b;
      padding: 1rem;
      border-radius: 6px;
      margin-top: 1rem;
      border-left: 4px solid #ef4444;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .phase1-container {
        padding: 1rem;
      }

      .form-section {
        padding: 1rem;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class Phase1SignupComponent implements OnInit {
  @Input() applicant!: ApplicantUser;
  @Output() phaseCompleted = new EventEmitter<void>();

  private fb = inject(FormBuilder);

  signupForm!: FormGroup;
  isSaving = false;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  ngOnInit() {
    this.initializeForm();
    this.loadDraftIfExists();
  }

  private initializeForm() {
    this.signupForm = this.fb.group({
      // Personal Information
      firstName: ['', [Validators.required, Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      location: ['', [Validators.required]],
      linkedIn: [''],

      // Background Information
      currentRole: [''],
      company: [''],
      experience: ['', [Validators.required, Validators.minLength(50)]],
      education: ['', [Validators.required, Validators.minLength(20)]],
      skills: ['', [Validators.required]],

      // Motivation
      whyApplying: ['', [Validators.required, Validators.minLength(100)]],
      goals: ['', [Validators.required, Validators.minLength(50)]],
      availability: ['', [Validators.required, Validators.minLength(30)]]
    });

    // Auto-save draft on form changes
    this.signupForm.valueChanges.subscribe(() => {
      this.autoSaveDraft();
    });
  }

  private loadDraftIfExists() {
    // TODO: Load draft from local storage or Firebase
    const draftKey = `phase1_draft_${this.applicant.userId}`;
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        this.signupForm.patchValue(draftData);
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }

  private autoSaveDraft() {
    if (this.signupForm.dirty && !this.isSaving) {
      setTimeout(() => this.saveDraftToLocal(), 2000);
    }
  }

  async saveDraft() {
    if (this.isSaving) return;
    
    this.isSaving = true;
    this.errorMessage = '';

    try {
      // Save to local storage
      this.saveDraftToLocal();
      
      // TODO: Save to Firebase as draft application
      // await this.applicationService.saveDraft(this.applicant.userId, this.signupForm.value);
      
      this.successMessage = 'Draft saved successfully!';
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error) {
      this.errorMessage = 'Failed to save draft. Please try again.';
      console.error('Draft save error:', error);
    } finally {
      this.isSaving = false;
    }
  }

  private saveDraftToLocal() {
    const draftKey = `phase1_draft_${this.applicant.userId}`;
    localStorage.setItem(draftKey, JSON.stringify(this.signupForm.value));
  }

  async onSubmit() {
    if (this.signupForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const formValue = this.signupForm.value;
      
      // Process skills into array
      const skills = formValue.skills.split(',').map((skill: string) => skill.trim()).filter((skill: string) => skill);
      
      const applicationData: Partial<Phase1Application> = {
        personalInfo: {
          firstName: formValue.firstName,
          lastName: formValue.lastName,
          email: formValue.email,
          phone: formValue.phone,
          linkedIn: formValue.linkedIn,
          location: formValue.location
        },
        backgroundInfo: {
          currentRole: formValue.currentRole,
          company: formValue.company,
          experience: formValue.experience,
          education: formValue.education,
          skills
        },
        motivation: {
          whyApplying: formValue.whyApplying,
          goals: formValue.goals,
          availability: formValue.availability
        }
      };

      // TODO: Submit application to Firebase
      // await this.applicationService.submitPhase1Application(this.applicant.userId, applicationData);
      
      // Clear draft from local storage
      const draftKey = `phase1_draft_${this.applicant.userId}`;
      localStorage.removeItem(draftKey);
      
      this.successMessage = APP_CONSTANTS.SUCCESS_MESSAGES.PROFILE_UPDATED;
      this.phaseCompleted.emit();
      
    } catch (error) {
      this.errorMessage = 'Failed to submit application. Please try again.';
      console.error('Application submission error:', error);
    } finally {
      this.isSubmitting = false;
    }
  }
}