import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApplicantUser, Webinar } from '../../../models';
import { WebinarService } from '../../../services/webinar.service';
import { CohortService } from '../../../services/cohort.service';
import { PhaseProgressionService } from '../../../services/phase-progression.service';
import { APP_CONSTANTS } from '../../../constants';

@Component({
  selector: 'app-phase2-webinar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="phase2-container">
      <header class="phase-header">
        <h2>Webinar Attendance</h2>
        <p>Please attend one of our webinars and enter the attendance code provided during the session.</p>
      </header>

      <div class="webinar-content">
        <!-- Loading State -->
        <div *ngIf="isLoading" class="loading-message">
          <div class="spinner"></div>
          <p>Loading webinar information...</p>
        </div>

        <!-- Webinars List -->
        <section *ngIf="!isLoading && webinars.length > 0" class="webinars-section">
          <h3>Upcoming Webinars</h3>
          <p class="instruction">Choose any webinar below to attend. You only need to attend one session.</p>
          
          <div class="webinars-grid">
            <div 
              *ngFor="let webinar of webinars" 
              class="webinar-card"
              [class.past]="isPastWebinar(webinar)"
            >
              <div class="webinar-header">
                <h4>{{ webinar.title || 'Webinar #' + webinar.num }}</h4>
                <span class="webinar-number">Session {{ webinar.num }}</span>
              </div>
              
              <div class="webinar-details">
                <div class="detail-item">
                  <span class="label">Date & Time:</span>
                  <span class="value">{{ webinar.timestamp | date:'medium' }}</span>
                </div>
                
                <div class="detail-item" *ngIf="webinar.description">
                  <span class="label">Description:</span>
                  <span class="value">{{ webinar.description }}</span>
                </div>
                
                <div class="detail-item" *ngIf="webinar.maxAttendees">
                  <span class="label">Capacity:</span>
                  <span class="value">
                    {{ webinar.attendeeCount || 0 }} / {{ webinar.maxAttendees }} attendees
                  </span>
                </div>
              </div>

              <div class="webinar-actions">
                <a 
                  *ngIf="!isPastWebinar(webinar)"
                  [href]="webinar.link" 
                  target="_blank" 
                  class="join-btn"
                >
                  Join Webinar
                </a>
                <span *ngIf="isPastWebinar(webinar)" class="past-label">
                  Session Ended
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- No Webinars Available -->
        <section *ngIf="!isLoading && webinars.length === 0" class="no-webinars">
          <div class="empty-state">
            <div class="empty-icon">📅</div>
            <h3>No Webinars Available</h3>
            <p>There are currently no webinars scheduled. Please check back later or contact support.</p>
          </div>
        </section>

        <!-- Attendance Code Section -->
        <section *ngIf="!isLoading" class="attendance-section">
          <div class="attendance-card">
            <h3>Webinar Attendance Verification</h3>
            <p>After attending a webinar, enter the 6-character code provided during the session.</p>
            
            <button 
              *ngIf="!showCodeInput"
              (click)="showCodeInput = true" 
              class="attended-btn"
            >
              I Attended a Webinar
            </button>

            <div *ngIf="showCodeInput" class="code-input-section">
              <form [formGroup]="codeForm" (ngSubmit)="submitCode()" class="code-form">
                <div class="form-group">
                  <label for="attendanceCode">6-Character Attendance Code</label>
                  <input
                    type="text"
                    id="attendanceCode"
                    formControlName="attendanceCode"
                    class="code-input"
                    placeholder="ABC123"
                    maxlength="6"
                    (input)="onCodeInput($event)"
                  >
                  <small class="help-text">
                    Enter the code exactly as provided during the webinar
                  </small>
                  <div *ngIf="codeForm.get('attendanceCode')?.invalid && codeForm.get('attendanceCode')?.touched" class="error">
                    Please enter a valid 6-character code
                  </div>
                </div>

                <div class="form-actions">
                  <button 
                    type="button" 
                    (click)="cancelCodeInput()" 
                    class="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  
                  <button 
                    type="submit" 
                    class="btn btn-primary"
                    [disabled]="codeForm.invalid || isSubmittingCode"
                  >
                    {{ isSubmittingCode ? 'Validating...' : 'Verify Attendance' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

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
    .phase2-container {
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

    .loading-message {
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

    .webinars-section {
      margin-bottom: 2rem;
    }

    .webinars-section h3 {
      color: #374151;
      font-size: 1.4rem;
      margin: 0 0 0.5rem 0;
    }

    .instruction {
      color: #6b7280;
      margin-bottom: 1.5rem;
    }

    .webinars-grid {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }

    .webinar-card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.5rem;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .webinar-card:hover:not(.past) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .webinar-card.past {
      opacity: 0.6;
      background: #f9fafb;
    }

    .webinar-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 1rem;
    }

    .webinar-header h4 {
      color: #374151;
      font-size: 1.1rem;
      margin: 0;
      flex: 1;
    }

    .webinar-number {
      background: #667eea;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .webinar-details {
      margin-bottom: 1.5rem;
    }

    .detail-item {
      display: flex;
      margin-bottom: 0.5rem;
    }

    .detail-item .label {
      font-weight: 600;
      color: #374151;
      min-width: 100px;
      font-size: 0.9rem;
    }

    .detail-item .value {
      color: #6b7280;
      font-size: 0.9rem;
    }

    .webinar-actions {
      text-align: center;
    }

    .join-btn {
      background: #10b981;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      display: inline-block;
      transition: background-color 0.3s;
    }

    .join-btn:hover {
      background: #059669;
    }

    .past-label {
      color: #9ca3af;
      font-style: italic;
    }

    .no-webinars {
      text-align: center;
      padding: 3rem 1rem;
    }

    .empty-state {
      max-width: 400px;
      margin: 0 auto;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      color: #374151;
      margin-bottom: 1rem;
    }

    .empty-state p {
      color: #6b7280;
    }

    .attendance-section {
      background: #f8fafc;
      border-radius: 12px;
      overflow: hidden;
    }

    .attendance-card {
      padding: 2rem;
      text-align: center;
    }

    .attendance-card h3 {
      color: #374151;
      font-size: 1.3rem;
      margin: 0 0 0.5rem 0;
    }

    .attendance-card > p {
      color: #6b7280;
      margin-bottom: 1.5rem;
    }

    .attended-btn {
      background: #667eea;
      color: white;
      padding: 0.75rem 2rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.3s;
    }

    .attended-btn:hover {
      background: #5a67d8;
    }

    .code-input-section {
      margin-top: 1.5rem;
      text-align: left;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    .code-form {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .code-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #d1d5db;
      border-radius: 6px;
      font-size: 1.2rem;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      text-align: center;
      transition: border-color 0.3s;
    }

    .code-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 1rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5a67d8;
    }

    .btn-secondary {
      background: #6b7280;
      color: white;
    }

    .btn-secondary:hover {
      background: #374151;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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
      .phase2-container {
        padding: 1rem;
      }

      .webinars-grid {
        grid-template-columns: 1fr;
      }

      .webinar-card {
        padding: 1rem;
      }

      .webinar-header {
        flex-direction: column;
        gap: 0.5rem;
      }

      .attendance-card {
        padding: 1.5rem;
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
export class Phase2WebinarComponent implements OnInit {
  @Input() applicant!: ApplicantUser;
  @Output() phaseCompleted = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private webinarService = inject(WebinarService);
  private cohortService = inject(CohortService);
  private phaseProgressionService = inject(PhaseProgressionService);

  webinars: Webinar[] = [];
  isLoading = true;
  showCodeInput = false;
  isSubmittingCode = false;
  successMessage = '';
  errorMessage = '';

  codeForm!: FormGroup;

  ngOnInit() {
    this.initializeCodeForm();
    this.loadWebinars();
  }

  private initializeCodeForm() {
    this.codeForm = this.fb.group({
      attendanceCode: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(6),
        Validators.pattern(/^[A-Z0-9]{6}$/)
      ]]
    });
  }

  private async loadWebinars() {
    try {
      this.isLoading = true;
      this.webinars = await this.webinarService.getWebinarsForCohort(this.applicant.cohortId);
    } catch (error) {
      console.error('Error loading webinars:', error);
      this.errorMessage = 'Failed to load webinar information. Please refresh the page.';
    } finally {
      this.isLoading = false;
    }
  }

  isPastWebinar(webinar: Webinar): boolean {
    return new Date() > webinar.timestamp;
  }

  onCodeInput(event: any) {
    // Convert to uppercase and limit to 6 characters
    const value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
    this.codeForm.patchValue({ attendanceCode: value });
  }

  cancelCodeInput() {
    this.showCodeInput = false;
    this.codeForm.reset();
    this.errorMessage = '';
  }

  async submitCode() {
    if (this.codeForm.invalid || this.isSubmittingCode) return;

    this.isSubmittingCode = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const attendanceCode = this.codeForm.get('attendanceCode')?.value;
      
      // Process webinar code validation through phase progression service
      await this.phaseProgressionService.processWebinarCodeValidation(
        this.applicant.userId,
        attendanceCode
      );

      this.successMessage = APP_CONSTANTS.SUCCESS_MESSAGES.WEBINAR_ATTENDED + ' You are now advancing to the next phase!';
      
      // Emit phase completion after a short delay to show success message
      setTimeout(() => {
        this.phaseCompleted.emit();
      }, 2000);

    } catch (error: any) {
      console.error('Code validation error:', error);
      this.errorMessage = error.message || 'Invalid webinar code. Please check the code and try again.';
    } finally {
      this.isSubmittingCode = false;
    }
  }
}