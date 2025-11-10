import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { ApplicationService } from '../../../services/application.service';
import { StatusMessageService } from '../../../services/status-message.service';
import { ApplicantUser, Phase1Application, ApplicationStatus, Phase } from '../../../models';
import { FlaggingResult, FlaggingService } from '../../../services/flagging.service';

@Component({
  selector: 'app-applicant-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="detail-container">
      <!-- Header -->
      <header class="detail-header">
        <div class="header-content">
          <button class="back-button" (click)="goBack()">
            <i class="fas fa-arrow-left"></i>
            Back to Dashboard
          </button>
          <div class="applicant-info" *ngIf="applicant()">
            <h1>{{ applicant()?.name }}</h1>
            <span [class]="'status-badge status-' + (applicant()?.status?.toLowerCase()?.replace('_', '-') || '')">
              {{ getStatusDisplay(applicant()?.status) }}
            </span>
          </div>
        </div>
      </header>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="loading">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading applicant details...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error()" class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>{{ error() }}</p>
      </div>

      <!-- Main Content -->
      <main class="detail-main" *ngIf="!isLoading() && applicant()">
        
        <!-- Tab Navigation -->
        <nav class="tab-navigation">
          <button 
            [class]="'tab-button ' + (activeTab() === 'profile' ? 'active' : '')"
            (click)="setActiveTab('profile')">
            <i class="fas fa-user"></i>
            Profile
          </button>
          <button 
            *ngIf="shouldShowPhase1()"
            [class]="'tab-button ' + (activeTab() === 'phase1' ? 'active' : '')"
            (click)="setActiveTab('phase1')">
            <i class="fas fa-clipboard-list"></i>
            Phase 1
          </button>
          <button 
            *ngIf="shouldShowPhase2()"
            [class]="'tab-button ' + (activeTab() === 'phase2' ? 'active' : '')"
            (click)="setActiveTab('phase2')">
            <i class="fas fa-video"></i>
            Phase 2
          </button>
          <button 
            *ngIf="shouldShowPhase3()"
            [class]="'tab-button ' + (activeTab() === 'phase3' ? 'active' : '')"
            (click)="setActiveTab('phase3')">
            <i class="fas fa-file-alt"></i>
            Phase 3
          </button>
          <button 
            *ngIf="shouldShowPhase4()"
            [class]="'tab-button ' + (activeTab() === 'phase4' ? 'active' : '')"
            (click)="setActiveTab('phase4')">
            <i class="fas fa-handshake"></i>
            Phase 4
          </button>
        </nav>

        <!-- Tab Content -->
        <div class="tab-content">
        
          <!-- Profile Section -->
          <section class="profile-section tab-panel" *ngIf="activeTab() === 'profile'">
          <div class="section-header">
            <h2><i class="fas fa-user"></i> Profile</h2>
          </div>
          
          <div class="profile-grid">
            <div class="profile-item">
              <label>Name</label>
              <span>{{ getApplicantName() }}</span>
            </div>
            <div class="profile-item">
              <label>Current Phase</label>
              <span class="phase-display">{{ getCurrentPhaseDisplay() }}</span>
            </div>
            <div class="profile-item">
              <label>Company</label>
              <span>{{ getCompanyName() || 'Not specified' }}</span>
            </div>
            <div class="profile-item">
              <label>Title</label>
              <span>{{ getApplicantRole() || 'Not specified' }}</span>
            </div>
            <div class="profile-item">
              <label>Email</label>
              <span>
                <a [href]="'mailto:' + applicant()?.email" class="email-link">
                  {{ applicant()?.email }}
                </a>
              </span>
            </div>
            <div class="profile-item">
              <label>Phone</label>
              <span>{{ getPhoneNumber() || 'Not specified' }}</span>
            </div>
            <div class="profile-item">
              <label>Country</label>
              <span>{{ getServiceCountry() || 'Not specified' }}</span>
            </div>
            <div class="profile-item">
              <label>Website</label>
              <span>
                <a *ngIf="getCompanyWebsite()" 
                   [href]="getCompanyWebsite()" 
                   target="_blank" 
                   class="website-link">
                  {{ getCompanyWebsite() }}
                  <i class="fas fa-external-link-alt"></i>
                </a>
                <span *ngIf="!getCompanyWebsite()">Not specified</span>
              </span>
            </div>
            <div class="profile-item">
              <label>LinkedIn</label>
              <span>
                <a *ngIf="applicant()?.profileData?.linkedIn" 
                   [href]="applicant()?.profileData?.linkedIn" 
                   target="_blank" 
                   class="linkedin-link">
                  View Profile
                  <i class="fas fa-external-link-alt"></i>
                </a>
                <span *ngIf="!applicant()?.profileData?.linkedIn">Not specified</span>
              </span>
            </div>
          </div>
        </section>

          <!-- Phase 1 Section -->
          <section class="phase-section tab-panel" *ngIf="activeTab() === 'phase1'">
          <div class="section-header">
            <h2><i class="fas fa-clipboard-list"></i> Phase 1 Application</h2>
            <div class="phase-actions">
              <button *ngIf="canAdvanceFromPhase1()" class="advance-button" (click)="advanceToPhase2()">
                <i class="fas fa-arrow-right"></i>
                Advance to Phase 2
              </button>
              <button class="recalc-button" (click)="recalculateFlags()">
                <i class="fas fa-sync"></i>
                Recalculate Flags
              </button>
            </div>
          </div>
          
          <div *ngIf="phase1Application()" class="application-content">
            <!-- Company Information -->
            <div class="info-group">
              <h3>Company Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <label>Company Name</label>
                  <span class="value-with-flag">
                    {{ phase1Application()?.companyInfo?.companyName }}
                    <i *ngIf="hasFlag('companyName')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('companyName')" 
                       [title]="getFlagMessage('companyName')"></i>
                  </span>
                </div>
                <div class="info-item">
                  <label>Company Website</label>
                  <span class="value-with-flag">
                    <a *ngIf="phase1Application()?.companyInfo?.companyWebsite" 
                       [href]="phase1Application()?.companyInfo?.companyWebsite" 
                       target="_blank">
                      {{ phase1Application()?.companyInfo?.companyWebsite }}
                      <i class="fas fa-external-link-alt"></i>
                    </a>
                    <span *ngIf="!phase1Application()?.companyInfo?.companyWebsite">Not provided</span>
                    <i *ngIf="hasFlag('companyWebsite')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('companyWebsite')" 
                       [title]="getFlagMessage('companyWebsite')"></i>
                  </span>
                </div>
                <div class="info-item">
                  <label>Founder Status</label>
                  <span class="value-with-flag">
                    {{ phase1Application()?.companyInfo?.isFounder ? 'Yes' : 'No' }}
                    <i *ngIf="hasFlag('isFounder')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('isFounder')" 
                       [title]="getFlagMessage('isFounder')"></i>
                  </span>
                </div>
              </div>
            </div>

            <!-- Personal Information -->
            <div class="info-group">
              <h3>Personal Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <label>First Name</label>
                  <span>{{ phase1Application()?.personalInfo?.firstName }}</span>
                </div>
                <div class="info-item">
                  <label>Last Name</label>
                  <span>{{ phase1Application()?.personalInfo?.lastName }}</span>
                </div>
                <div class="info-item">
                  <label>Email</label>
                  <span class="value-with-flag">
                    {{ phase1Application()?.personalInfo?.email }}
                    <i *ngIf="hasFlag('email')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('email')" 
                       [title]="getFlagMessage('email')"></i>
                  </span>
                </div>
                <div class="info-item">
                  <label>Phone</label>
                  <span class="value-with-flag">
                    {{ phase1Application()?.personalInfo?.phone }}
                    <i *ngIf="hasFlag('phone')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('phone')" 
                       [title]="getFlagMessage('phone')"></i>
                  </span>
                </div>
              </div>
            </div>

            <!-- Extended Information -->
            <div class="info-group">
              <h3>Extended Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <label>Role in Company</label>
                  <span>{{ phase1Application()?.extendedInfo?.role }}</span>
                </div>
                <div class="info-item">
                  <label>Number of Founders</label>
                  <span class="value-with-flag">
                    {{ phase1Application()?.extendedInfo?.founderCount }}
                    <i *ngIf="hasFlag('founderCount')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('founderCount')" 
                       [title]="getFlagMessage('founderCount')"></i>
                  </span>
                </div>
                <div class="info-item">
                  <label>LinkedIn Profile</label>
                  <span class="value-with-flag">
                    <a *ngIf="phase1Application()?.extendedInfo?.linkedInProfile" 
                       [href]="phase1Application()?.extendedInfo?.linkedInProfile" 
                       target="_blank">
                      View Profile
                      <i class="fas fa-external-link-alt"></i>
                    </a>
                    <span *ngIf="!phase1Application()?.extendedInfo?.linkedInProfile">Not provided</span>
                    <i *ngIf="hasFlag('linkedInProfile')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('linkedInProfile')" 
                       [title]="getFlagMessage('linkedInProfile')"></i>
                  </span>
                </div>
                <div class="info-item full-width">
                  <label>Service History</label>
                  <span class="value-with-flag">
                    {{ phase1Application()?.extendedInfo?.serviceHistory?.country }} - {{ phase1Application()?.extendedInfo?.serviceHistory?.unit }}
                    <i *ngIf="hasFlag('serviceHistory')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('serviceHistory')" 
                       [title]="getFlagMessage('serviceHistory')"></i>
                    <i *ngIf="hasFlag('serviceUnit')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('serviceUnit')" 
                       [title]="getFlagMessage('serviceUnit')"></i>
                  </span>
                </div>
                <div class="info-item full-width">
                  <label>Company Description (Grandma Test)</label>
                  <span class="value-with-flag long-text">
                    {{ phase1Application()?.extendedInfo?.grandmaTest }}
                    <i *ngIf="hasFlag('grandmaTest')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('grandmaTest')" 
                       [title]="getFlagMessage('grandmaTest')"></i>
                  </span>
                </div>
                <div class="info-item full-width">
                  <label>How did you discover us?</label>
                  <span>{{ phase1Application()?.extendedInfo?.discovery }}</span>
                </div>
                <div class="info-item">
                  <label>Time Commitment Confirmed</label>
                  <span>{{ phase1Application()?.extendedInfo?.timeCommitment ? 'Yes' : 'No' }}</span>
                </div>
                <div class="info-item full-width">
                  <label>Pitch Deck</label>
                  <span class="value-with-flag">
                    <a *ngIf="phase1Application()?.extendedInfo?.pitchDeck?.fileUrl" 
                       [href]="phase1Application()?.extendedInfo?.pitchDeck?.fileUrl" 
                       target="_blank">
                      View Pitch Deck
                      <i class="fas fa-external-link-alt"></i>
                    </a>
                    <span *ngIf="!phase1Application()?.extendedInfo?.pitchDeck?.fileUrl && phase1Application()?.extendedInfo?.pitchDeck?.nodeckExplanation">
                      No deck - {{ phase1Application()?.extendedInfo?.pitchDeck?.nodeckExplanation }}
                    </span>
                    <span *ngIf="!phase1Application()?.extendedInfo?.pitchDeck?.fileUrl && !phase1Application()?.extendedInfo?.pitchDeck?.nodeckExplanation">
                      Not provided
                    </span>
                    <i *ngIf="hasFlag('pitchDeck')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('pitchDeck')" 
                       [title]="getFlagMessage('pitchDeck')"></i>
                  </span>
                </div>
              </div>
            </div>

            <!-- Flagging Summary -->
            <div class="flagging-summary" *ngIf="flaggingResult()">
              <h3>
                <i class="fas fa-flag"></i>
                Flagging Analysis
                <span [class]="'risk-badge risk-' + (flaggingResult()?.needsReview ? 'high' : 'low')">
                  {{ flaggingResult()?.needsReview ? 'Manual Review Required' : 'Auto-Advance' }}
                </span>
              </h3>
              <div class="flags-list" *ngIf="flaggingResult()?.flags && (flaggingResult()?.flags?.length || 0) > 0">
                <div *ngFor="let flag of flaggingResult()?.flags" 
                     [class]="'flag-item flag-' + flag.type.toLowerCase()">
                  <i [class]="'fas fa-flag flag-' + flag.type.toLowerCase()"></i>
                  <div class="flag-content">
                    <strong>{{ getFieldDisplayName(flag.field || '') }}:</strong>
                    <span>{{ flag.message }}</span>
                  </div>
                </div>
              </div>
              <div *ngIf="!flaggingResult()?.flags || (flaggingResult()?.flags?.length || 0) === 0" class="no-flags">
                <i class="fas fa-check-circle"></i>
                <span>No flags detected - application looks good!</span>
              </div>
            </div>
          </div>
        </section>

          <!-- Phase 2 Section -->
          <section class="phase-section tab-panel" *ngIf="activeTab() === 'phase2'">
          <div class="section-header">
            <h2><i class="fas fa-video"></i> Phase 2 - Webinar Attendance</h2>
            <div class="phase-actions" *ngIf="canAdvanceFromPhase2()">
              <button class="advance-button" (click)="advanceToPhase3()">
                <i class="fas fa-arrow-right"></i>
                Advance to Phase 3
              </button>
            </div>
          </div>
          
          <div class="webinar-status">
            <div *ngIf="applicant()?.webinarAttended" class="attended">
              <i class="fas fa-check-circle"></i>
              <span>Attended Webinar #{{ applicant()?.webinarAttended }}</span>
            </div>
            <div *ngIf="!applicant()?.webinarAttended" class="not-attended">
              <i class="fas fa-clock"></i>
              <span>Didn't attend yet</span>
            </div>
          </div>
        </section>

          <!-- Phase 3 Section -->
          <section class="phase-section tab-panel" *ngIf="activeTab() === 'phase3'">
          <div class="section-header">
            <h2><i class="fas fa-file-alt"></i> Phase 3 - In-Depth Application</h2>
            <div class="phase-actions" *ngIf="canAdvanceFromPhase3()">
              <button class="advance-button" (click)="advanceToPhase4()">
                <i class="fas fa-arrow-right"></i>
                Advance to Phase 4
              </button>
            </div>
          </div>
          
          <div class="phase3-placeholder">
            <p><i class="fas fa-info-circle"></i> Phase 3 application view will be implemented here</p>
          </div>
        </section>

          <!-- Phase 4 Section -->
          <section class="phase-section tab-panel" *ngIf="activeTab() === 'phase4'">
          <div class="section-header">
            <h2><i class="fas fa-handshake"></i> Phase 4 - Interview</h2>
            <div class="phase-actions" *ngIf="canAdvanceFromPhase4()">
              <button class="advance-button accept-program" (click)="acceptToProgram()">
                <i class="fas fa-graduation-cap"></i>
                Accept to Program
              </button>
            </div>
          </div>
          
          <div class="interview-management">
            <!-- Interviewer Assignment -->
            <div class="interviewer-section">
              <h3>Interviewer Assignment</h3>
              <div *ngIf="!applicant()?.interviewerId" class="no-interviewer">
                <p>No interviewer assigned yet</p>
                <button class="assign-button" (click)="showInterviewerAssignment()">
                  <i class="fas fa-user-plus"></i>
                  Assign Interviewer
                </button>
              </div>
              <div *ngIf="applicant()?.interviewerId" class="assigned-interviewer">
                <p><strong>Assigned Interviewer:</strong> {{ getInterviewerName() }}</p>
                <button class="change-button" (click)="showInterviewerAssignment()">
                  <i class="fas fa-edit"></i>
                  Change Interviewer
                </button>
              </div>
            </div>

            <!-- Interview Notes -->
            <div class="notes-section">
              <h3>Interview Notes</h3>
              <form [formGroup]="notesForm" (ngSubmit)="saveNotes()">
                <textarea 
                  formControlName="notes" 
                  placeholder="Add interview notes, feedback, and observations..."
                  rows="8"
                  class="notes-textarea"></textarea>
                <div class="notes-actions">
                  <button type="submit" class="save-notes-btn" [disabled]="!notesForm.dirty">
                    <i class="fas fa-save"></i>
                    Save Notes
                  </button>
                </div>
              </form>
            </div>

            <!-- Interview Date -->
            <div class="interview-date-section" *ngIf="applicant()?.status === 'PHASE_4_INTERVIEW_SCHEDULED' && applicant()?.interviewDate">
              <h3>Interview Schedule</h3>
              <div class="scheduled-date">
                <i class="fas fa-calendar-alt"></i>
                <span>{{ formatInterviewDate() }}</span>
              </div>
            </div>
          </div>
        </section>

        </div> <!-- Close tab-content -->
      </main>
    </div>
  `,
  styles: [`
    /* Main Container */
    .detail-container {
      min-height: 100vh;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Header */
    .detail-header {
      background: white;
      border-bottom: 2px solid #e5e7eb;
      padding: 1.5rem 0;
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .back-button {
      background: #6b7280;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: background-color 0.3s;
    }

    .back-button:hover {
      background: #374151;
    }

    .applicant-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .applicant-info h1 {
      margin: 0;
      color: #1f2937;
      font-size: 1.5rem;
      font-weight: 600;
    }

    /* Status Badges */
    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status-phase-1 { background: #e0e7ff; color: #3730a3; }
    .status-phase-2 { background: #fef3c7; color: #92400e; }
    .status-phase-3 { background: #dbeafe; color: #1e40af; }
    .status-phase-3-in-progress { background: #fbbf24; color: #92400e; }
    .status-phase-3-submitted { background: #60a5fa; color: #1e40af; }
    .status-phase-3-rejected { background: #fee2e2; color: #991b1b; }
    .status-phase-4 { background: #e0e7ff; color: #5b21b6; }
    .status-phase-4-interview-scheduled { background: #c084fc; color: #5b21b6; }
    .status-phase-4-post-interview { background: #d8b4fe; color: #6b21a8; }
    .status-phase-4-rejected { background: #fee2e2; color: #991b1b; }
    .status-accepted { background: #dcfce7; color: #166534; }

    /* Main Content */
    .detail-main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    /* Tab Navigation */
    .tab-navigation {
      display: flex;
      background: white;
      border-radius: 12px 12px 0 0;
      border: 1px solid #e5e7eb;
      border-bottom: none;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .tab-navigation::-webkit-scrollbar {
      display: none;
    }

    .tab-button {
      background: none;
      border: none;
      padding: 1rem 1.5rem;
      color: #6b7280;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s;
      border-bottom: 3px solid transparent;
      min-width: max-content;
      white-space: nowrap;
    }

    .tab-button:hover {
      color: #374151;
      background: #f9fafb;
    }

    .tab-button.active {
      color: #3b82f6;
      background: #f8fafc;
      border-bottom-color: #3b82f6;
    }

    .tab-button i {
      font-size: 0.9rem;
    }

    /* Tab Content */
    .tab-content {
      background: white;
      border-radius: 0 0 12px 12px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }

    .tab-panel {
      border: none;
      border-radius: 0;
      box-shadow: none;
      margin: 0;
    }

    /* States */
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      color: #6b7280;
    }

    .loading i {
      font-size: 2rem;
      margin-bottom: 1rem;
      color: #3b82f6;
    }

    .error-message {
      background: #fef2f2;
      color: #991b1b;
      padding: 1rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      border-left: 4px solid #ef4444;
      margin: 2rem;
    }

    /* Sections */
    .profile-section, .phase-section {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }

    .section-header {
      background: #f8fafc;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-header h2 {
      margin: 0;
      color: #1f2937;
      font-size: 1.3rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Profile Grid */
    .profile-grid {
      padding: 1.5rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .profile-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .profile-item label {
      font-weight: 600;
      color: #374151;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .profile-item span {
      color: #1f2937;
      font-size: 1rem;
    }

    .phase-display {
      background: #e0e7ff;
      color: #3730a3;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 500;
      text-transform: uppercase;
      display: inline-block;
    }

    /* Application Content */
    .application-content {
      padding: 1.5rem;
    }

    .info-group {
      margin-bottom: 2rem;
    }

    .info-group:last-child {
      margin-bottom: 0;
    }

    .info-group h3 {
      color: #374151;
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 1rem 0;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e5e7eb;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .info-item.full-width {
      grid-column: 1 / -1;
    }

    .info-item label {
      font-weight: 500;
      color: #6b7280;
      font-size: 0.85rem;
    }

    .info-item span, .info-item .value-with-flag {
      color: #1f2937;
      font-size: 0.95rem;
    }

    .long-text {
      line-height: 1.5;
      max-width: 100%;
      word-wrap: break-word;
    }

    /* Value with Flag */
    .value-with-flag {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .flag-icon {
      font-size: 0.8rem;
      cursor: help;
    }

    .flag-icon.flag-red {
      color: #dc2626;
    }

    .flag-icon.flag-yellow {
      color: #f59e0b;
    }

    .flag-icon.flag-green {
      color: #10b981;
    }

    .flag-icon.flag-1, .flag-icon.flag-2, .flag-icon.flag-3 {
      color: #f59e0b; /* Yellow for old severity levels */
    }

    .flag-icon.flag-4, .flag-icon.flag-5 {
      color: #dc2626; /* Red for old severity levels */
    }

    /* Flagging Summary */
    .flagging-summary {
      margin-top: 2rem;
      padding: 1.5rem;
      background: #f9fafb;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    .flagging-summary h3 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0 0 1rem 0;
      color: #374151;
    }

    .risk-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .risk-badge.risk-low {
      background: #dcfce7;
      color: #166534;
    }

    .risk-badge.risk-medium {
      background: #fef3c7;
      color: #92400e;
    }

    .risk-badge.risk-high {
      background: #fee2e2;
      color: #991b1b;
    }

    .flags-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .flag-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 6px;
      border-left: 4px solid;
    }

    .flag-item.flag-red {
      background: #fef2f2;
      border-left-color: #dc2626;
    }

    .flag-item.flag-yellow {
      background: #fffbeb;
      border-left-color: #f59e0b;
    }

    .flag-item.flag-green {
      background: #ecfdf5;
      border-left-color: #10b981;
    }

    /* Handle old flag types */
    .flag-item.flag-warning, .flag-item.flag-info {
      background: #fffbeb;
      border-left-color: #f59e0b;
    }

    .flag-item.flag-error {
      background: #fef2f2;
      border-left-color: #dc2626;
    }

    .flag-content {
      flex: 1;
    }

    .flag-content strong {
      color: #374151;
    }

    .flag-content span {
      color: #6b7280;
      font-size: 0.9rem;
    }

    /* Flag icon colors in summary */
    .fas.flag-warning, .fas.flag-info {
      color: #f59e0b;
    }

    .fas.flag-error {
      color: #dc2626;
    }

    .fas.flag-yellow {
      color: #f59e0b;
    }

    .fas.flag-red {
      color: #dc2626;
    }

    .no-flags {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #059669;
      font-weight: 500;
    }

    /* Links */
    .email-link, .website-link, .linkedin-link {
      color: #3b82f6;
      text-decoration: none;
    }

    .email-link:hover, .website-link:hover, .linkedin-link:hover {
      text-decoration: underline;
    }

    .website-link i, .linkedin-link i {
      font-size: 0.8rem;
      margin-left: 0.25rem;
    }

    /* Phase Actions */
    .phase-actions {
      display: flex;
      gap: 0.75rem;
    }

    .advance-button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: background-color 0.3s;
    }

    .advance-button:hover {
      background: #2563eb;
    }

    .advance-button.accept-program {
      background: #059669;
    }

    .advance-button.accept-program:hover {
      background: #047857;
    }

    .recalc-button {
      background: #f59e0b;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: background-color 0.3s;
    }

    .recalc-button:hover {
      background: #d97706;
    }

    /* Phase-specific styles */
    .webinar-status {
      padding: 1.5rem;
    }

    .attended, .not-attended {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 8px;
      font-weight: 500;
    }

    .attended {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #d1fae5;
    }

    .not-attended {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
    }

    .phase3-placeholder {
      padding: 1.5rem;
      text-align: center;
      color: #6b7280;
      font-style: italic;
    }

    /* Interview Management */
    .interview-management {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .interviewer-section h3, .notes-section h3, .interview-date-section h3 {
      color: #374151;
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 1rem 0;
    }

    .assign-button, .change-button {
      background: #6b7280;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .assign-button:hover, .change-button:hover {
      background: #374151;
    }

    .notes-textarea {
      width: 100%;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 1rem;
      font-family: inherit;
      font-size: 0.95rem;
      line-height: 1.5;
      resize: vertical;
    }

    .notes-textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .notes-actions {
      margin-top: 1rem;
      display: flex;
      justify-content: flex-end;
    }

    .save-notes-btn {
      background: #059669;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .save-notes-btn:hover:not(:disabled) {
      background: #047857;
    }

    .save-notes-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .scheduled-date {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: #e0e7ff;
      border: 1px solid #c7d2fe;
      border-radius: 8px;
      color: #3730a3;
      font-weight: 500;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .detail-main {
        padding: 1rem;
      }
      
      .header-content {
        padding: 0 1rem;
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .tab-navigation {
        border-radius: 8px 8px 0 0;
      }

      .tab-button {
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
      }

      .tab-content {
        border-radius: 0 0 8px 8px;
      }
      
      .profile-grid, .info-grid {
        grid-template-columns: 1fr;
      }
      
      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
        padding: 1rem;
      }
      
      .phase-actions {
        width: 100%;
      }
      
      .advance-button {
        flex: 1;
        justify-content: center;
      }

      .application-content {
        padding: 1rem;
      }

      .interview-management {
        padding: 1rem;
      }
    }
  `]
})
export class ApplicantDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);
  private applicationService = inject(ApplicationService);
  private statusMessageService = inject(StatusMessageService);
  private flaggingService = inject(FlaggingService);
  private fb = inject(FormBuilder);

  // Signals
  applicant = signal<ApplicantUser | null>(null);
  phase1Application = signal<Phase1Application | null>(null);
  flaggingResult = signal<FlaggingResult | null>(null);
  isLoading = signal(true);
  error = signal('');
  activeTab = signal<string>('profile');

  // Form
  notesForm: FormGroup;

  constructor() {
    this.notesForm = this.fb.group({
      notes: ['']
    });
  }

  ngOnInit() {
    const applicantId = this.route.snapshot.paramMap.get('id');
    if (applicantId) {
      this.loadApplicantDetails(applicantId);
    } else {
      this.error.set('No applicant ID provided');
      this.isLoading.set(false);
    }
  }

  private async loadApplicantDetails(applicantId: string) {
    try {
      this.isLoading.set(true);
      
      // Load applicant user data
      const applicantData = await this.userService.getUserById(applicantId);
      if (!applicantData || applicantData.role !== 'APPLICANT') {
        throw new Error('Applicant not found');
      }
      
      this.applicant.set(applicantData as ApplicantUser);

      // Load Phase 1 application if exists
      const phase1App = await this.applicationService.getApplicationByApplicantId(applicantId);
      if (phase1App) {
        this.phase1Application.set(phase1App);
        
        // Calculate fresh flagging results using new logic
        const flagging = this.flaggingService.analyzeApplication(phase1App);
        this.flaggingResult.set(flagging);

        // Auto-advance if no red flags and still in Phase 1
        if (flagging.autoAdvance && this.applicant()?.status === ApplicationStatus.PHASE_1) {
          console.log('Auto-advancing to Phase 2 on load...');
          await this.advanceToPhase2();
        }
      }

      // Load interview notes if in Phase 4
      if (this.shouldShowPhase4()) {
        // TODO: Load interview notes when implemented
      }

      // Set initial tab based on applicant status
      this.setInitialTab();

    } catch (error: any) {
      this.error.set(error.message || 'Failed to load applicant details');
    } finally {
      this.isLoading.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/admin']);
  }

  getStatusDisplay(status?: ApplicationStatus): string {
    if (!status) return '';
    return this.statusMessageService.getAdminDisplayName(status);
  }

  // Profile helper methods
  getApplicantName(): string {
    const applicant = this.applicant();
    if (applicant?.name) {
      return applicant.name;
    }
    // Fallback to Phase 1 application name if available
    const phase1 = this.phase1Application();
    if (phase1?.personalInfo?.firstName && phase1?.personalInfo?.lastName) {
      return `${phase1.personalInfo.firstName} ${phase1.personalInfo.lastName}`;
    }
    return 'Not specified';
  }

  getCurrentPhaseDisplay(): string {
    const status = this.applicant()?.status;
    return this.statusMessageService.getAdminDisplayName(status || ApplicationStatus.PHASE_1);
  }

  getCompanyName(): string {
    return this.applicant()?.profileData?.companyName || 
           this.phase1Application()?.companyInfo?.companyName || 
           '';
  }

  getPhoneNumber(): string {
    return this.applicant()?.profileData?.phone || this.phase1Application()?.personalInfo?.phone || '';
  }

  getServiceCountry(): string {
    return this.phase1Application()?.extendedInfo?.serviceHistory?.country || '';
  }

  getCompanyWebsite(): string {
    return this.phase1Application()?.companyInfo?.companyWebsite || '';
  }

  getApplicantRole(): string {
    return this.phase1Application()?.extendedInfo?.role || '';
  }

  // Phase visibility methods
  shouldShowPhase1(): boolean {
    // Always show Phase 1 tab for any applicant
    return this.applicant() !== null;
  }

  shouldShowPhase2(): boolean {
    const status = this.applicant()?.status;
    return status !== undefined && 
           status !== ApplicationStatus.PHASE_1;
  }

  shouldShowPhase3(): boolean {
    const status = this.applicant()?.status;
    return status !== undefined && [
      ApplicationStatus.PHASE_3_IN_PROGRESS,
      ApplicationStatus.PHASE_3_SUBMITTED,
      ApplicationStatus.PHASE_3_REJECTED,
      ApplicationStatus.PHASE_4,
      ApplicationStatus.PHASE_4_INTERVIEW_SCHEDULED,
      ApplicationStatus.PHASE_4_POST_INTERVIEW,
      ApplicationStatus.PHASE_4_REJECTED,
      ApplicationStatus.ACCEPTED
    ].includes(status);
  }

  shouldShowPhase4(): boolean {
    const status = this.applicant()?.status;
    return status !== undefined && [
      ApplicationStatus.PHASE_4,
      ApplicationStatus.PHASE_4_INTERVIEW_SCHEDULED,
      ApplicationStatus.PHASE_4_POST_INTERVIEW,
      ApplicationStatus.PHASE_4_REJECTED,
      ApplicationStatus.ACCEPTED
    ].includes(status);
  }

  // Phase advancement capabilities
  canAdvanceFromPhase1(): boolean {
    const status = this.applicant()?.status;
    const flagging = this.flaggingResult();
    
    // Only show advance button if in Phase 1 and has red flags (manual review required)
    // If auto-advance is true, they should already be in Phase 2
    return status === ApplicationStatus.PHASE_1 && flagging?.needsReview === true;
  }

  canAdvanceFromPhase2(): boolean {
    const status = this.applicant()?.status;
    return status === ApplicationStatus.PHASE_2;
  }

  canAdvanceFromPhase3(): boolean {
    const status = this.applicant()?.status;
    return status === ApplicationStatus.PHASE_3_SUBMITTED;
  }

  canAdvanceFromPhase4(): boolean {
    const status = this.applicant()?.status;
    return status === ApplicationStatus.PHASE_4_POST_INTERVIEW;
  }

  // Phase advancement actions
  async advanceToPhase2() {
    const applicant = this.applicant();
    if (!applicant) return;

    try {
      // Update applicant status to Phase 2
      await this.userService.updateUser(applicant.userId, {
        phase: Phase.WEBINAR,
        status: ApplicationStatus.PHASE_2
      });

      // Update local state
      this.applicant.set({
        ...applicant,
        phase: Phase.WEBINAR,
        status: ApplicationStatus.PHASE_2
      });

      console.log('Successfully advanced to Phase 2');
      
      // Refresh the current view
      window.location.reload();

    } catch (error) {
      console.error('Error advancing to Phase 2:', error);
    }
  }

  advanceToPhase3() {
    // TODO: Implement phase advancement
    console.log('Advance to Phase 3');
  }

  advanceToPhase4() {
    // TODO: Implement phase advancement
    console.log('Advance to Phase 4');
  }

  acceptToProgram() {
    // TODO: Implement program acceptance
    console.log('Accept to Program');
  }

  // Flagging methods
  hasFlag(field: string): boolean {
    return this.flaggingResult()?.flags?.some(flag => flag.field === field) || false;
  }

  getFlagColor(field: string): string {
    const flag = this.flaggingResult()?.flags?.find(f => f.field === field);
    return flag ? `flag-${flag.severity}` : '';
  }

  getFlagMessage(field: string): string {
    const flag = this.flaggingResult()?.flags?.find(f => f.field === field);
    return flag?.message || '';
  }

  getFieldDisplayName(field: string): string {
    const fieldNames: { [key: string]: string } = {
      'linkedInProfile': 'LinkedIn Profile',
      'companyWebsite': 'Company Website',
      'email': 'Email Domain',
      'founderCount': 'Number of Founders',
      'serviceHistory': 'Military Service',
      'serviceUnit': 'Combat Unit Service',
      'pitchDeck': 'Pitch Deck',
      'grandmaTest': 'Company Description'
    };
    return fieldNames[field] || field;
  }

  // Interview management
  showInterviewerAssignment() {
    // TODO: Implement interviewer assignment modal
    console.log('Show interviewer assignment');
  }

  getInterviewerName(): string {
    // TODO: Load interviewer name
    return 'John Doe'; // Placeholder
  }

  saveNotes() {
    // TODO: Implement notes saving
    console.log('Save notes:', this.notesForm.value.notes);
    this.notesForm.markAsPristine();
  }

  formatInterviewDate(): string {
    const date = this.applicant()?.interviewDate;
    if (!date) return '';
    
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Flagging methods
  async recalculateFlags() {
    const phase1App = this.phase1Application();
    const applicant = this.applicant();
    
    if (phase1App && applicant) {
      // Use the new method that handles both analysis and auto-advancement
      const result = await this.flaggingService.analyzeAndProcessApplication(phase1App, applicant.userId);
      this.flaggingResult.set(result);
      console.log('Flags recalculated:', result);

      // Refresh page if applicant was auto-advanced
      if (result.autoAdvance && applicant.status === ApplicationStatus.PHASE_1) {
        console.log('Applicant was auto-advanced, refreshing page...');
        setTimeout(() => window.location.reload(), 1000);
      }
    }
  }

  // Tab management methods
  setActiveTab(tab: string) {
    this.activeTab.set(tab);
  }

  setInitialTab() {
    const status = this.applicant()?.status;
    
    if (!status) {
      this.activeTab.set('profile');
      return;
    }

    // Set initial tab based on current phase
    switch (status) {
      case ApplicationStatus.PHASE_1:
        this.activeTab.set(this.shouldShowPhase1() ? 'phase1' : 'profile');
        break;
      case ApplicationStatus.PHASE_2:
        this.activeTab.set(this.shouldShowPhase1() ? 'phase1' : 'profile');
        break;
      case ApplicationStatus.PHASE_3_IN_PROGRESS:
      case ApplicationStatus.PHASE_3_SUBMITTED:
      case ApplicationStatus.PHASE_3_REJECTED:
        this.activeTab.set(this.shouldShowPhase2() ? 'phase2' : 'profile');
        break;
      case ApplicationStatus.PHASE_4:
      case ApplicationStatus.PHASE_4_INTERVIEW_SCHEDULED:
      case ApplicationStatus.PHASE_4_POST_INTERVIEW:
      case ApplicationStatus.PHASE_4_REJECTED:
        this.activeTab.set(this.shouldShowPhase3() ? 'phase3' : 'profile');
        break;
      case ApplicationStatus.ACCEPTED:
        this.activeTab.set(this.shouldShowPhase4() ? 'phase4' : 'profile');
        break;
      default:
        this.activeTab.set('profile');
    }
  }
}