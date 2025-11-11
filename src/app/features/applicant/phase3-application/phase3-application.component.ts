import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, AbstractControl, ValidationErrors } from '@angular/forms';
import { ApplicantUser, Phase3Application, EquityBreakdownRow, Phase } from '../../../models';
import { ApplicationService } from '../../../services/application.service';
import { AuthService } from '../../../services/auth.service';
import { APP_CONSTANTS } from '../../../constants';
import { EquityTableComponent } from './equity-table.component';
import { Router } from '@angular/router';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-phase3-application',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EquityTableComponent],
  template: `
    <div class="phase3-container">
      <header class="phase-header">
        <h2>In-Depth Application</h2>
        <p>Complete your detailed application covering your product, team, funding, and legal structure.</p>
      </header>

      <div class="form-content">
        <!-- Loading State -->
        <div *ngIf="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading your application...</p>
        </div>

        <!-- Form -->
        <form *ngIf="!isLoading" [formGroup]="applicationForm" class="application-form">
          
          <!-- Part 1: Product & Traction -->
          <section class="form-section">
            <div class="section-header">
              <h3>Part 1: Product & Traction</h3>
            </div>

            <!-- Product Stage -->
            <div class="form-group">
              <label class="form-label">Product Stage: How far along are you in building the service or product?</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" formControlName="productStage" value="LIVE_PAYING">
                  <span class="checkmark"></span>
                  Live with paying customers
                </label>
                <label class="radio-option">
                  <input type="radio" formControlName="productStage" value="LIVE_BETA">
                  <span class="checkmark"></span>
                  Live with non-paying/beta users
                </label>
                <label class="radio-option">
                  <input type="radio" formControlName="productStage" value="MVP">
                  <span class="checkmark"></span>
                  Functional prototype (MVP)
                </label>
                <label class="radio-option">
                  <input type="radio" formControlName="productStage" value="IDEA_STAGE">
                  <span class="checkmark"></span>
                  Pre-prototype / Idea stage
                </label>
              </div>
            </div>

            <!-- Traction Details -->
            <div class="form-group">
              <label for="tractionDetails" class="form-label">
                Traction Details: Describe the traction as of above (max 300 words)
              </label>
              <textarea
                id="tractionDetails"
                formControlName="tractionDetails"
                class="form-textarea"
                placeholder="e.g., 100 unpaid users within 3 months of beta launch / five paying customers with average ACV of $20K/year / launching MVP in Q3 of this year"
                rows="4"
              ></textarea>
              <div class="word-count">
                {{ getWordCount('tractionDetails') }}/300 words
              </div>
            </div>

            <!-- Problem & Customer -->
            <div class="form-group">
              <label for="problemCustomer" class="form-label">
                Problem & Customer: Who is the exact person you're helping, and what problem do they face? (max 300 words)
              </label>
              <textarea
                id="problemCustomer"
                formControlName="problemCustomer"
                class="form-textarea"
                placeholder="Be specific — not just a company or age group, but a real role or situation. Example: 'New moms recovering from childbirth who struggle to find time for healthy meals'"
                rows="5"
              ></textarea>
              <div class="word-count">
                {{ getWordCount('problemCustomer') }}/300 words
              </div>
            </div>

            <!-- Video Pitch -->
            <div class="form-group">
              <label for="videoPitch" class="form-label">
                Video Pitch: Link to a 1-2 minute unlisted YouTube video where the founding team introduces themselves and what you're building
              </label>
              <input
                type="url"
                id="videoPitch"
                formControlName="videoPitch"
                class="form-input"
                placeholder="https://www.youtube.com/watch?v=..."
              >
            </div>
          </section>

          <!-- Part 2: Team -->
          <section class="form-section">
            <div class="section-header">
              <h3>Part 2: Team</h3>
            </div>

            <!-- Co-Founders -->
            <div class="form-group">
              <label for="coFounders" class="form-label">
                Co-Founders: Please list all co-founders, their roles, and LinkedIn profiles (max 300 words)
              </label>
              <textarea
                id="coFounders"
                formControlName="coFounders"
                class="form-textarea"
                rows="4"
              ></textarea>
              <div class="word-count">
                {{ getWordCount('coFounders') }}/300 words
              </div>
            </div>

            <!-- Capacity -->
            <div class="form-group">
              <label class="form-label">Capacity: What are you and your co-founders current capacity?</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" formControlName="capacity" value="ALL_FULLTIME">
                  <span class="checkmark"></span>
                  All full-time
                </label>
                <label class="radio-option">
                  <input type="radio" formControlName="capacity" value="OTHER">
                  <span class="checkmark"></span>
                  Other (explain)
                </label>
              </div>
              
              <!-- Conditional Other Explanation -->
              <div *ngIf="applicationForm.get('capacity')?.value === 'OTHER'" class="conditional-field">
                <input
                  type="text"
                  formControlName="capacityOther"
                  class="form-input"
                  placeholder="Please explain your current capacity"
                >
              </div>
            </div>

            <!-- Previous Collaboration -->
            <div class="form-group">
              <label for="previousCollaboration" class="form-label">
                Have any team members worked together before? If so, describe how. (max 300 words)
              </label>
              <textarea
                id="previousCollaboration"
                formControlName="previousCollaboration"
                class="form-textarea"
                rows="3"
              ></textarea>
              <div class="word-count">
                {{ getWordCount('previousCollaboration') }}/300 words
              </div>
            </div>

            <!-- Previous Founders -->
            <div class="form-group">
              <label class="form-label">Previous Founders: Have you had any co-founders who are no longer with the company?</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" [value]="true" formControlName="previousFounders">
                  <span class="checkmark"></span>
                  Yes
                </label>
                <label class="radio-option">
                  <input type="radio" [value]="false" formControlName="previousFounders">
                  <span class="checkmark"></span>
                  No
                </label>
              </div>
              
              <!-- Conditional Explanation -->
              <div *ngIf="applicationForm.get('previousFounders')?.value === true" class="conditional-field">
                <label for="previousFoundersExplanation" class="form-label">
                  Please briefly explain the circumstances of their departure and any severance or equity agreements (max 300 words)
                </label>
                <textarea
                  id="previousFoundersExplanation"
                  formControlName="previousFoundersExplanation"
                  class="form-textarea"
                  rows="3"
                ></textarea>
                <div class="word-count">
                  {{ getWordCount('previousFoundersExplanation') }}/300 words
                </div>
              </div>
            </div>

            <!-- Equity Split & Roles -->
            <div class="form-group">
              <label for="equitySplitRoles" class="form-label">
                Equity Split & Roles: Please briefly describe how you decided on the equity split between the founders and on the role each one would have (max 300 words)
              </label>
              <textarea
                id="equitySplitRoles"
                formControlName="equitySplitRoles"
                class="form-textarea"
                rows="4"
              ></textarea>
              <div class="word-count">
                {{ getWordCount('equitySplitRoles') }}/300 words
              </div>
            </div>

            <!-- Additional Team Members -->
            <div class="form-group">
              <label for="additionalTeamMembers" class="form-label">
                Additional team members who are not founders: List the roles (max 300 words)
              </label>
              <textarea
                id="additionalTeamMembers"
                formControlName="additionalTeamMembers"
                class="form-textarea"
                rows="3"
              ></textarea>
              <div class="word-count">
                {{ getWordCount('additionalTeamMembers') }}/300 words
              </div>
            </div>
          </section>

          <!-- Part 3: Funding -->
          <section class="form-section">
            <div class="section-header">
              <h3>Part 3: Funding</h3>
            </div>

            <!-- Funding History -->
            <div class="form-group">
              <label class="form-label">Funding History: Have you raised any capital to date?</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" [value]="true" formControlName="hasRaisedCapital">
                  <span class="checkmark"></span>
                  Yes
                </label>
                <label class="radio-option">
                  <input type="radio" [value]="false" formControlName="hasRaisedCapital">
                  <span class="checkmark"></span>
                  No
                </label>
              </div>
              
              <!-- Conditional Funding Details -->
              <div *ngIf="applicationForm.get('hasRaisedCapital')?.value === true" class="conditional-field">
                <label for="fundingDetails" class="form-label">
                  What is the total amount of capital you have raised to date and on what terms? (max 300 words)
                </label>
                <textarea
                  id="fundingDetails"
                  formControlName="fundingDetails"
                  class="form-textarea"
                  placeholder="e.g., $150K on a post-money safe with a $XM cap"
                  rows="3"
                ></textarea>
                <div class="word-count">
                  {{ getWordCount('fundingDetails') }}/300 words
                </div>
              </div>
            </div>

            <!-- Equity Breakdown Table -->
            <div class="form-group">
              <label class="form-label">Equity Breakdown: Please provide a simple CAP table or equity breakdown</label>
              <app-equity-table 
                [equityRows]="equityRows"
                (rowsChanged)="onEquityRowsChanged($event)"
              ></app-equity-table>
            </div>
          </section>

          <!-- Part 4: Legal & Corporate Structure -->
          <section class="form-section">
            <div class="section-header">
              <h3>Part 4: Legal & Corporate Structure</h3>
            </div>

            <!-- Incorporated -->
            <div class="form-group">
              <label class="form-label">Is your company incorporated?</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" [value]="true" formControlName="isIncorporated">
                  <span class="checkmark"></span>
                  Yes
                </label>
                <label class="radio-option">
                  <input type="radio" [value]="false" formControlName="isIncorporated">
                  <span class="checkmark"></span>
                  No
                </label>
              </div>
              
              <!-- Conditional Incorporation Location -->
              <div *ngIf="applicationForm.get('isIncorporated')?.value === true" class="conditional-field">
                <label for="incorporationLocation" class="form-label">
                  Country & State/Province of Incorporation:
                </label>
                <input
                  type="text"
                  id="incorporationLocation"
                  formControlName="incorporationLocation"
                  class="form-input"
                  placeholder="e.g., Delaware, USA"
                >
              </div>
            </div>

            <!-- Corporate Structure (conditional on incorporated = true) -->
            <div *ngIf="applicationForm.get('isIncorporated')?.value === true" class="form-group">
              <label class="form-label">If YES, does your current corporate structure include all of the following?</label>
              <div class="checkbox-group">
                <label class="checkbox-option">
                  <input type="checkbox" formControlName="hasIpAssignment">
                  <span class="checkmark"></span>
                  IP Assignment (All IP developed by founders/employees has been assigned to the company)
                </label>
                <label class="checkbox-option">
                  <input type="checkbox" formControlName="hasFounderVesting">
                  <span class="checkmark"></span>
                  Founder Shares: There are vesting schedules for all founders
                </label>
                <label class="checkbox-option">
                  <input type="checkbox" formControlName="hasBoardStructure">
                  <span class="checkmark"></span>
                  Founder Board Seats: Founder Board seats are tied to employment/service with the company
                </label>
              </div>

              <!-- Conditional Amendment Question -->
              <div *ngIf="!hasAllCorporateStructures()" class="conditional-field">
                <label class="form-label">
                  If you answered NO to any of the above, are you open to amending your corporate documents to include these standard venture terms?
                </label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input type="radio" [value]="true" formControlName="willAmendDocuments">
                    <span class="checkmark"></span>
                    Yes
                  </label>
                  <label class="radio-option">
                    <input type="radio" [value]="false" formControlName="willAmendDocuments">
                    <span class="checkmark"></span>
                    No, please explain
                  </label>
                </div>
                
                <!-- Conditional Explanation -->
                <div *ngIf="applicationForm.get('willAmendDocuments')?.value === false" class="conditional-field">
                  <input
                    type="text"
                    formControlName="amendDocumentsExplanation"
                    class="form-input"
                    placeholder="Please explain why you are not open to amending documents"
                  >
                </div>
              </div>
            </div>

            <!-- Incorporation Agreement (conditional on incorporated = false) -->
            <div *ngIf="applicationForm.get('isIncorporated')?.value === false" class="form-group">
              <label class="form-label">
                If you are NOT incorporated, do you agree to sign a side letter obligating you to incorporate with the standard venture terms listed above prior to the start of the program?
              </label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" formControlName="agreesToIncorporate" value="AGREE">
                  <span class="checkmark"></span>
                  I agree.
                </label>
                <label class="radio-option">
                  <input type="radio" formControlName="agreesToIncorporate" value="DISCUSS">
                  <span class="checkmark"></span>
                  I would like to discuss this further.
                </label>
              </div>
            </div>
          </section>

          <!-- Form Actions -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="saveDraft()" [disabled]="isSaving">
              {{ isSaving ? 'Saving...' : 'Save Draft' }}
            </button>
            <button type="button" class="btn btn-primary" (click)="submitApplication()" [disabled]="isSubmitting || applicationForm.invalid">
              {{ isSubmitting ? 'Submitting...' : 'Submit Application' }}
            </button>
          </div>
        </form>

        <!-- Status Messages -->
        <div *ngIf="successMessage" class="success-message">
          {{ successMessage }}
        </div>
        <div *ngIf="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .phase3-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .phase-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .phase-header h2 {
      color: #374151;
      font-size: 2rem;
      margin: 0 0 0.5rem 0;
      font-weight: 700;
    }

    .phase-header p {
      color: #6b7280;
      font-size: 1.1rem;
      margin: 0;
    }

    .loading-state {
      text-align: center;
      padding: 3rem 1rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f3f4f6;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .application-form {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .form-section {
      border-bottom: 1px solid #e5e7eb;
      padding: 2rem;
    }

    .form-section:last-of-type {
      border-bottom: none;
    }

    .section-header {
      margin-bottom: 2rem;
    }

    .section-header h3 {
      color: #1f2937;
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #667eea;
      display: inline-block;
    }

    .form-group {
      margin-bottom: 2rem;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    .form-label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.75rem;
      font-size: 1rem;
      line-height: 1.5;
    }

    .form-input {
      width: 100%;
      padding: 0.875rem;
      border: 2px solid #d1d5db;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
      background: white;
    }

    .form-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-textarea {
      width: 100%;
      padding: 0.875rem;
      border: 2px solid #d1d5db;
      border-radius: 8px;
      font-size: 1rem;
      font-family: inherit;
      line-height: 1.6;
      resize: vertical;
      transition: all 0.3s ease;
      background: white;
    }

    .form-textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .word-count {
      font-size: 0.875rem;
      color: #6b7280;
      margin-top: 0.5rem;
      text-align: right;
    }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .radio-option {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
      padding: 0.75rem;
      border-radius: 8px;
      transition: background-color 0.3s;
    }

    .radio-option:hover {
      background: #f8fafc;
    }

    .radio-option input[type="radio"] {
      margin: 0;
      width: 18px;
      height: 18px;
      accent-color: #667eea;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .checkbox-option {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
      padding: 0.75rem;
      border-radius: 8px;
      transition: background-color 0.3s;
    }

    .checkbox-option:hover {
      background: #f8fafc;
    }

    .checkbox-option input[type="checkbox"] {
      margin: 0;
      width: 18px;
      height: 18px;
      accent-color: #667eea;
    }

    .conditional-field {
      margin-top: 1rem;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }


    .form-actions {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 2rem;
      background: #f8fafc;
      border-top: 1px solid #e5e7eb;
    }

    .btn {
      padding: 0.875rem 2rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 120px;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5a67d8;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #6b7280;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #374151;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(107, 114, 128, 0.4);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .success-message {
      background: #ecfdf5;
      color: #065f46;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 2rem;
      border-left: 4px solid #10b981;
      font-weight: 500;
    }

    .error-message {
      background: #fef2f2;
      color: #991b1b;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 2rem;
      border-left: 4px solid #ef4444;
      font-weight: 500;
    }

    .validation-warning {
      background: #fef3c7;
      color: #92400e;
      padding: 0.75rem;
      border-radius: 6px;
      margin-top: 1rem;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .phase3-container {
        padding: 1rem;
      }

      .form-section {
        padding: 1.5rem 1rem;
      }

      .phase-header h2 {
        font-size: 1.5rem;
      }

      .section-header h3 {
        font-size: 1.25rem;
      }

      .form-actions {
        flex-direction: column;
        padding: 1.5rem 1rem;
      }

      .btn {
        width: 100%;
      }

      .radio-option,
      .checkbox-option {
        padding: 0.5rem;
      }

      .conditional-field {
        margin-left: 0;
        margin-top: 0.75rem;
      }

    }

    /* Print Styles */
    @media print {
      .form-actions {
        display: none;
      }

      .phase3-container {
        padding: 0;
      }

      .application-form {
        box-shadow: none;
      }
    }
  `]
})
export class Phase3ApplicationComponent implements OnInit, OnDestroy {
  @Input() applicant?: ApplicantUser;
  @Output() phaseCompleted = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private applicationService = inject(ApplicationService);
  private authService = inject(AuthService);
  private router = inject(Router);

  applicationForm!: FormGroup;
  equityRows: EquityBreakdownRow[] = [];
  
  isLoading = true;
  isSaving = false;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  
  existingApplication?: Phase3Application;
  autoSaveInterval?: any;

  ngOnInit() {
    this.initializeForm();
    this.loadApplicantData();
  }

  private async loadApplicantData() {
    try {
      // If applicant is not provided as input, get it from auth service
      if (!this.applicant) {
        combineLatest([
          this.authService.authInitialized$,
          this.authService.currentUser$
        ]).subscribe(async ([authInitialized, user]) => {
          if (!authInitialized) {
            return; // Wait for auth to initialize
          }
          
          if (user && user.role === 'APPLICANT') {
            this.applicant = user as ApplicantUser;
            await this.loadExistingApplication();
            this.setupAutoSave();
          } else {
            // Redirect to login if no valid applicant user
            this.router.navigate(['/auth/login']);
          }
        });
      } else {
        // Applicant provided as input, proceed normally
        await this.loadExistingApplication();
        this.setupAutoSave();
      }
    } catch (error) {
      console.error('Error loading applicant data:', error);
    }
  }

  ngOnDestroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }

  private initializeForm() {
    this.applicationForm = this.fb.group({
      // Part 1: Product & Traction
      productStage: ['', Validators.required],
      tractionDetails: ['', [Validators.required, this.wordCountValidator(300)]],
      problemCustomer: ['', [Validators.required, this.wordCountValidator(300)]],
      videoPitch: ['', [Validators.required, Validators.pattern(/^https:\/\/(www\.)?youtube\.com\/watch\?v=.+/)]],
      
      // Part 2: Team
      coFounders: ['', [Validators.required, this.wordCountValidator(300)]],
      capacity: ['', Validators.required],
      capacityOther: [''],
      previousCollaboration: ['', this.wordCountValidator(300)],
      previousFounders: ['', Validators.required],
      previousFoundersExplanation: [''],
      equitySplitRoles: ['', [Validators.required, this.wordCountValidator(300)]],
      additionalTeamMembers: ['', this.wordCountValidator(300)],
      
      // Part 3: Funding
      hasRaisedCapital: ['', Validators.required],
      fundingDetails: [''],
      
      // Part 4: Legal & Corporate
      isIncorporated: ['', Validators.required],
      incorporationLocation: [''],
      hasIpAssignment: [false],
      hasFounderVesting: [false],
      hasBoardStructure: [false],
      willAmendDocuments: [''],
      amendDocumentsExplanation: [''],
      agreesToIncorporate: ['']
    });

    this.initializeEquityTable();
    this.setupConditionalValidators();
  }

  private async loadExistingApplication() {
    try {
      this.isLoading = true;
      
      // Check if applicant is available
      if (!this.applicant) {
        throw new Error('Applicant data not available');
      }
      
      // Try to load existing Phase 3 application
      const existingApp = await this.applicationService.getPhase3Application(
        this.applicant.userId,
        this.applicant.cohortId
      );
      
      if (existingApp) {
        this.existingApplication = existingApp;
        this.populateFormFromApplication(existingApp);
      }
    } catch (error) {
      console.error('Error loading existing application:', error);
      // Continue with empty form if no existing application
    } finally {
      this.isLoading = false;
    }
  }

  private populateFormFromApplication(app: Phase3Application) {
    // Populate form with existing application data
    this.applicationForm.patchValue({
      productStage: app.productInfo.productStage,
      tractionDetails: app.productInfo.tractionDetails,
      problemCustomer: app.productInfo.problemCustomer,
      videoPitch: app.productInfo.videoPitch,
      
      coFounders: app.teamInfo.coFounders,
      capacity: app.teamInfo.capacity,
      capacityOther: app.teamInfo.capacityOther,
      previousCollaboration: app.teamInfo.previousCollaboration,
      previousFounders: app.teamInfo.previousFounders,
      previousFoundersExplanation: app.teamInfo.previousFoundersExplanation,
      equitySplitRoles: app.teamInfo.equitySplitRoles,
      additionalTeamMembers: app.teamInfo.additionalTeamMembers,
      
      hasRaisedCapital: app.fundingInfo.hasRaisedCapital,
      fundingDetails: app.fundingInfo.fundingDetails,
      
      isIncorporated: app.legalInfo.isIncorporated,
      incorporationLocation: app.legalInfo.incorporationLocation,
      hasIpAssignment: app.legalInfo.hasIpAssignment,
      hasFounderVesting: app.legalInfo.hasFounderVesting,
      hasBoardStructure: app.legalInfo.hasBoardStructure,
      willAmendDocuments: app.legalInfo.willAmendDocuments,
      amendDocumentsExplanation: app.legalInfo.amendDocumentsExplanation,
      agreesToIncorporate: app.legalInfo.agreesToIncorporate
    });

    // Populate equity breakdown
    if (app.fundingInfo.equityBreakdown && app.fundingInfo.equityBreakdown.length > 0) {
      this.equityRows = [...app.fundingInfo.equityBreakdown];
    }
  }

  private setupAutoSave() {
    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      if (this.applicationForm.dirty && !this.isSaving && !this.isSubmitting) {
        this.saveDraft();
      }
    }, 30000);
  }

  private initializeEquityTable() {
    // Equity table will initialize itself with default values
    // We just need to ensure the array exists
    if (!this.equityRows || this.equityRows.length === 0) {
      this.equityRows = [];
    }
  }

  private setupConditionalValidators() {
    // Set up conditional validators for form fields
    this.applicationForm.get('capacity')?.valueChanges.subscribe(value => {
      const capacityOtherControl = this.applicationForm.get('capacityOther');
      if (value === 'OTHER') {
        capacityOtherControl?.setValidators([Validators.required]);
      } else {
        capacityOtherControl?.clearValidators();
      }
      capacityOtherControl?.updateValueAndValidity();
    });

    this.applicationForm.get('previousFounders')?.valueChanges.subscribe(value => {
      const explanationControl = this.applicationForm.get('previousFoundersExplanation');
      if (value === true) {
        explanationControl?.setValidators([Validators.required, this.wordCountValidator(300)]);
      } else {
        explanationControl?.clearValidators();
      }
      explanationControl?.updateValueAndValidity();
    });

    this.applicationForm.get('hasRaisedCapital')?.valueChanges.subscribe(value => {
      const fundingDetailsControl = this.applicationForm.get('fundingDetails');
      if (value === true) {
        fundingDetailsControl?.setValidators([Validators.required, this.wordCountValidator(300)]);
      } else {
        fundingDetailsControl?.clearValidators();
      }
      fundingDetailsControl?.updateValueAndValidity();
    });

    this.applicationForm.get('isIncorporated')?.valueChanges.subscribe(value => {
      const locationControl = this.applicationForm.get('incorporationLocation');
      const agreeControl = this.applicationForm.get('agreesToIncorporate');
      
      if (value === true) {
        locationControl?.setValidators([Validators.required]);
        agreeControl?.clearValidators();
      } else {
        locationControl?.clearValidators();
        agreeControl?.setValidators([Validators.required]);
      }
      locationControl?.updateValueAndValidity();
      agreeControl?.updateValueAndValidity();
    });

    this.applicationForm.get('willAmendDocuments')?.valueChanges.subscribe(value => {
      const explanationControl = this.applicationForm.get('amendDocumentsExplanation');
      if (value === false) {
        explanationControl?.setValidators([Validators.required]);
      } else {
        explanationControl?.clearValidators();
      }
      explanationControl?.updateValueAndValidity();
    });
  }
  
  getWordCount(fieldName: string): number {
    const value = this.applicationForm.get(fieldName)?.value || '';
    return value.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
  }

  hasAllCorporateStructures(): boolean {
    const form = this.applicationForm;
    return form.get('hasIpAssignment')?.value && 
           form.get('hasFounderVesting')?.value && 
           form.get('hasBoardStructure')?.value;
  }

  onEquityRowsChanged(rows: EquityBreakdownRow[]) {
    this.equityRows = rows;
    this.applicationForm.markAsDirty();
  }
  
  async saveDraft() {
    if (this.isSaving) return;

    this.isSaving = true;
    this.errorMessage = '';

    try {
      const applicationData = this.buildApplicationData('DRAFT');
      
      if (this.existingApplication?.id) {
        await this.applicationService.updatePhase3Application(
          this.existingApplication.id,
          applicationData
        );
      } else {
        const newApp = await this.applicationService.createPhase3Application(applicationData);
        this.existingApplication = newApp;
      }

      this.successMessage = 'Draft saved successfully';
      this.applicationForm.markAsPristine();
      
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);

    } catch (error) {
      console.error('Error saving draft:', error);
      this.errorMessage = 'Failed to save draft. Please try again.';
    } finally {
      this.isSaving = false;
    }
  }

  async submitApplication() {
    if (this.isSubmitting || this.applicationForm.invalid) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const applicationData = this.buildApplicationData('SUBMITTED');
      
      if (this.existingApplication?.id) {
        await this.applicationService.updatePhase3Application(
          this.existingApplication.id,
          applicationData
        );
      } else {
        await this.applicationService.createPhase3Application(applicationData);
      }

      this.successMessage = 'Application submitted successfully! You will be notified when it has been reviewed.';
      
      setTimeout(() => {
        this.phaseCompleted.emit();
      }, 2000);

    } catch (error) {
      console.error('Error submitting application:', error);
      this.errorMessage = 'Failed to submit application. Please try again.';
    } finally {
      this.isSubmitting = false;
    }
  }

  private buildApplicationData(status: 'DRAFT' | 'SUBMITTED'): Omit<Phase3Application, 'id'> {
    if (!this.applicant) {
      throw new Error('Applicant data is required to build application');
    }
    
    const formValue = this.applicationForm.value;
    
    return {
      applicantId: this.applicant.userId,
      cohortId: this.applicant.cohortId,
      phase: Phase.IN_DEPTH_APPLICATION,
      status,
      productInfo: {
        productStage: formValue.productStage,
        tractionDetails: formValue.tractionDetails,
        problemCustomer: formValue.problemCustomer,
        videoPitch: formValue.videoPitch
      },
      teamInfo: {
        coFounders: formValue.coFounders,
        capacity: formValue.capacity,
        capacityOther: formValue.capacityOther,
        previousCollaboration: formValue.previousCollaboration,
        previousFounders: formValue.previousFounders,
        previousFoundersExplanation: formValue.previousFoundersExplanation,
        equitySplitRoles: formValue.equitySplitRoles,
        additionalTeamMembers: formValue.additionalTeamMembers
      },
      fundingInfo: {
        hasRaisedCapital: formValue.hasRaisedCapital,
        fundingDetails: formValue.fundingDetails,
        equityBreakdown: this.equityRows
      },
      legalInfo: {
        isIncorporated: formValue.isIncorporated,
        incorporationLocation: formValue.incorporationLocation,
        hasIpAssignment: formValue.hasIpAssignment,
        hasFounderVesting: formValue.hasFounderVesting,
        hasBoardStructure: formValue.hasBoardStructure,
        willAmendDocuments: formValue.willAmendDocuments,
        amendDocumentsExplanation: formValue.amendDocumentsExplanation,
        agreesToIncorporate: formValue.agreesToIncorporate
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  private wordCountValidator(maxWords: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;
      
      const wordCount = control.value.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
      return wordCount > maxWords ? { wordCount: { max: maxWords, actual: wordCount } } : null;
    };
  }
}