import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { PhaseProgressionService } from '../../../services/phase-progression.service';
import { ApplicantUser, Phase } from '../../../models';
import { Phase1SignupComponent } from '../phase1-signup/phase1-signup.component';
import { Phase2WebinarComponent } from '../phase2-webinar/phase2-webinar.component';
import { Phase3ApplicationComponent } from '../phase3-application/phase3-application.component';
import { Phase4InterviewComponent } from '../phase4-interview/phase4-interview.component';
import { Phase5AcceptedComponent } from '../phase5-accepted/phase5-accepted.component';

@Component({
  selector: 'app-applicant-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    Phase1SignupComponent,
    Phase2WebinarComponent,
    Phase3ApplicationComponent,
    Phase4InterviewComponent,
    Phase5AcceptedComponent
  ],
  template: `
    <div class="applicant-dashboard">
      <!-- Header Section -->
      <header class="dashboard-header">
        <div class="welcome-section">
          <h1>Welcome, {{ applicant?.name }}!</h1>
          <p class="subtitle">Vetted Accelerator Application</p>
        </div>
        
        <button 
          class="logout-btn"
          (click)="logout()"
        >
          Sign Out
        </button>
      </header>

      <!-- Progress Indicator -->
      <section class="progress-section">
        <h2>Application Progress</h2>
        <div class="progress-steps">
          <div 
            class="step"
            [class.active]="isCurrentPhase(Phase.SIGNUP)"
            [class.completed]="isPhaseCompleted(Phase.SIGNUP)"
          >
            <div class="step-number">1</div>
            <span class="step-label">Sign Up</span>
          </div>
          
          <div class="step-connector" [class.completed]="isPhaseCompleted(Phase.SIGNUP)"></div>
          
          <div 
            class="step"
            [class.active]="isCurrentPhase(Phase.WEBINAR)"
            [class.completed]="isPhaseCompleted(Phase.WEBINAR)"
          >
            <div class="step-number">2</div>
            <span class="step-label">Webinar</span>
          </div>
          
          <div class="step-connector" [class.completed]="isPhaseCompleted(Phase.WEBINAR)"></div>
          
          <div 
            class="step"
            [class.active]="isCurrentPhase(Phase.IN_DEPTH_APPLICATION)"
            [class.completed]="isPhaseCompleted(Phase.IN_DEPTH_APPLICATION)"
          >
            <div class="step-number">3</div>
            <span class="step-label">Application</span>
          </div>
          
          <div class="step-connector" [class.completed]="isPhaseCompleted(Phase.IN_DEPTH_APPLICATION)"></div>
          
          <div 
            class="step"
            [class.active]="isCurrentPhase(Phase.INTERVIEW)"
            [class.completed]="isPhaseCompleted(Phase.INTERVIEW)"
          >
            <div class="step-number">4</div>
            <span class="step-label">Interview</span>
          </div>
        </div>
      </section>

      <!-- Current Phase Content -->
      <main class="main-content">
        <div class="phase-container">
          <!-- Phase 1: Sign Up -->
          <app-phase1-signup 
            *ngIf="applicant?.phase === Phase.SIGNUP && applicant"
            [applicant]="applicant"
            (phaseCompleted)="onPhaseCompleted($event)"
          ></app-phase1-signup>

          <!-- Phase 1 Submitted - Pending Approval -->
          <div 
            *ngIf="applicant?.phase === Phase.SIGNUP && isPhase1Submitted()"
            class="status-message pending"
          >
            <div class="status-icon">⏳</div>
            <h3>Application Under Review</h3>
            <p>Your account is pending approval. We will be in touch soon!</p>
            <small>Submitted on {{ getSubmissionDate() | date:'medium' }}</small>
          </div>

          <!-- Phase 2: Webinar -->
          <app-phase2-webinar 
            *ngIf="applicant?.phase === Phase.WEBINAR && applicant"
            [applicant]="applicant"
            (phaseCompleted)="onPhaseCompleted($event)"
          ></app-phase2-webinar>

          <!-- Phase 3: In-Depth Application -->
          <app-phase3-application 
            *ngIf="applicant?.phase === Phase.IN_DEPTH_APPLICATION && applicant"
            [applicant]="applicant"
            (phaseCompleted)="onPhaseCompleted($event)"
          ></app-phase3-application>

          <!-- Phase 3 Submitted - Under Review -->
          <div 
            *ngIf="applicant?.phase === Phase.IN_DEPTH_APPLICATION && isPhase3Submitted()"
            class="status-message under-review"
          >
            <div class="status-icon">📋</div>
            <h3>Application Under Review</h3>
            <p>We are reviewing your application. This process typically takes 3-5 business days.</p>
            <small>Submitted on {{ getPhase3SubmissionDate() | date:'medium' }}</small>
          </div>

          <!-- Phase 4: Interview -->
          <app-phase4-interview 
            *ngIf="applicant?.phase === Phase.INTERVIEW && applicant"
            [applicant]="applicant"
          ></app-phase4-interview>

          <!-- Phase 5: Accepted -->
          <app-phase5-accepted 
            *ngIf="applicant?.phase === Phase.ACCEPTED && applicant"
            [applicant]="applicant"
          ></app-phase5-accepted>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .applicant-dashboard {
      min-height: 100vh;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .dashboard-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .welcome-section h1 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 700;
    }

    .subtitle {
      margin: 0.25rem 0 0 0;
      opacity: 0.9;
      font-size: 0.9rem;
    }

    .logout-btn {
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: background-color 0.3s;
    }

    .logout-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    .progress-section {
      background: white;
      margin: 1.5rem;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .progress-section h2 {
      margin: 0 0 1.5rem 0;
      color: #374151;
      font-size: 1.3rem;
    }

    .progress-steps {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 600px;
      margin: 0 auto;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 0 0 auto;
    }

    .step-number {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #e5e7eb;
      color: #6b7280;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      transition: all 0.3s;
      margin-bottom: 0.5rem;
    }

    .step.active .step-number {
      background: #667eea;
      color: white;
    }

    .step.completed .step-number {
      background: #10b981;
      color: white;
    }

    .step-label {
      font-size: 0.8rem;
      color: #6b7280;
      text-align: center;
    }

    .step.active .step-label {
      color: #667eea;
      font-weight: 600;
    }

    .step.completed .step-label {
      color: #10b981;
      font-weight: 600;
    }

    .step-connector {
      flex: 1;
      height: 2px;
      background: #e5e7eb;
      margin: 0 0.5rem;
      transition: background-color 0.3s;
    }

    .step-connector.completed {
      background: #10b981;
    }

    .main-content {
      padding: 0 1.5rem 1.5rem;
    }

    .phase-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .status-message {
      text-align: center;
      padding: 3rem 2rem;
    }

    .status-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .status-message h3 {
      margin: 0 0 1rem 0;
      color: #374151;
      font-size: 1.5rem;
    }

    .status-message p {
      margin: 0 0 1rem 0;
      color: #6b7280;
      font-size: 1.1rem;
    }

    .status-message small {
      color: #9ca3af;
      font-size: 0.9rem;
    }

    .status-message.pending {
      border-left: 4px solid #f59e0b;
    }

    .status-message.under-review {
      border-left: 4px solid #3b82f6;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .progress-section {
        margin: 1rem;
        padding: 1rem;
      }

      .progress-steps {
        flex-direction: column;
        gap: 1rem;
      }

      .step-connector {
        width: 2px;
        height: 20px;
        margin: 0;
      }

      .main-content {
        padding: 0 1rem 1rem;
      }

      .status-message {
        padding: 2rem 1rem;
      }

      .welcome-section h1 {
        font-size: 1.5rem;
      }
    }
  `]
})
export class ApplicantDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private phaseProgressionService = inject(PhaseProgressionService);

  applicant: ApplicantUser | null = null;
  Phase = Phase; // Expose enum to template

  ngOnInit() {
    this.loadApplicantData();
  }

  private loadApplicantData() {
    this.authService.currentUser$.subscribe(user => {
      if (user && user.role === 'APPLICANT') {
        this.applicant = user as ApplicantUser;
      }
    });
  }

  isCurrentPhase(phase: Phase): boolean {
    return this.applicant?.phase === phase;
  }

  isPhaseCompleted(phase: Phase): boolean {
    if (!this.applicant) return false;
    
    const phaseOrder = [Phase.SIGNUP, Phase.WEBINAR, Phase.IN_DEPTH_APPLICATION, Phase.INTERVIEW, Phase.ACCEPTED];
    const currentIndex = phaseOrder.indexOf(this.applicant.phase);
    const checkIndex = phaseOrder.indexOf(phase);
    
    return currentIndex > checkIndex;
  }

  isPhase1Submitted(): boolean {
    // TODO: Check if Phase 1 application is submitted
    return false;
  }

  isPhase3Submitted(): boolean {
    // TODO: Check if Phase 3 application is submitted
    return false;
  }

  getSubmissionDate(): Date {
    // TODO: Get actual submission date from application
    return new Date();
  }

  getPhase3SubmissionDate(): Date {
    // TODO: Get actual submission date from application
    return new Date();
  }

  onPhaseCompleted(event: any) {
    // Refresh applicant data when phase is completed
    this.loadApplicantData();
  }

  async logout() {
    try {
      await this.authService.signOut();
      // Router navigation will be handled by auth guard
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}