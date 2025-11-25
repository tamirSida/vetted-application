import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';
import { ApplicationService } from '../../../services/application.service';
import { StatusMessageService } from '../../../services/status-message.service';
import { InterviewerService } from '../../../services/interviewer.service';
import { PhaseProgressionService } from '../../../services/phase-progression.service';
import { ApplicantUser, AdminUser, Phase1Application, Phase3Application, ApplicationStatus, Phase, Interviewer, InterviewerCreateRequest, Interview, InterviewStatus } from '../../../models';
import { FlaggingResult, FlaggingService } from '../../../services/flagging.service';
import { OpenAIService } from '../../../services/openai.service';
import { EmailService } from '../../../services/email.service';
import { deleteField } from '@angular/fire/firestore';

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
            
            <!-- Rating Assignment -->
            <div class="profile-item">
              <label>Rating</label>
              <div class="rating-dropdown-container">
                <span [class]="'rating-badge rating-' + (applicant()?.rating || 'none')" 
                      (click)="toggleRatingDropdown(applicant()?.userId)">
                  {{ getRatingDisplay(applicant()?.rating) }}
                  <i class="fas fa-chevron-down rating-arrow"></i>
                </span>
                <div *ngIf="activeRatingDropdown() === applicant()?.userId" 
                     class="rating-dropdown"
                     (click)="$event.stopPropagation()">
                  <div class="rating-option rating-option-none"
                       (click)="setApplicantRating(applicant()!, null)">
                    <span class="rating-preview rating-none">—</span>
                    <span class="rating-label">No Rating</span>
                  </div>
                  <div class="rating-option rating-option-1"
                       (click)="setApplicantRating(applicant()!, 1)">
                    <span class="rating-preview rating-1">1</span>
                    <span class="rating-label">Best</span>
                  </div>
                  <div class="rating-option rating-option-2"
                       (click)="setApplicantRating(applicant()!, 2)">
                    <span class="rating-preview rating-2">2</span>
                    <span class="rating-label">Average</span>
                  </div>
                  <div class="rating-option rating-option-3"
                       (click)="setApplicantRating(applicant()!, 3)">
                    <span class="rating-preview rating-3">3</span>
                    <span class="rating-label">Worst</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Assigned To -->
            <div class="profile-item">
              <label>Assigned To</label>
              <div class="assigned-dropdown-container">
                <span class="assigned-badge" 
                      (click)="toggleAssignedDropdown(applicant()?.userId)">
                  {{ getAssignedDisplay(applicant()?.assignedTo) }}
                  <i class="fas fa-chevron-down assigned-arrow"></i>
                </span>
                <div *ngIf="activeAssignedDropdown() === applicant()?.userId" 
                     class="assigned-dropdown"
                     (click)="$event.stopPropagation()">
                  <div class="assigned-option"
                       (click)="setApplicantAssignment(applicant()!, null)">
                    <span class="assigned-preview">—</span>
                    <span class="assigned-label">None</span>
                  </div>
                  <div *ngFor="let admin of adminUsers()" 
                       class="assigned-option"
                       (click)="setApplicantAssignment(applicant()!, admin.userId)">
                    <span class="assigned-preview">{{ admin.name.charAt(0) }}</span>
                    <span class="assigned-label">{{ admin.name }}</span>
                  </div>
                </div>
              </div>
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
            <div class="phase-actions">
              <button *ngIf="canAdvanceFromPhase3()" class="advance-button" (click)="advanceToPhase4()">
                <i class="fas fa-arrow-right"></i>
                Advance to Phase 4
              </button>
              <button *ngIf="canReopenPhase3Application()" class="reopen-button" (click)="reopenPhase3Application()">
                <i class="fas fa-edit"></i>
                Reopen Application
              </button>
              <button class="recalc-button" (click)="reevaluatePhase3Flags()" [disabled]="isReevaluatingPhase3()">
                <i [class]="isReevaluatingPhase3() ? 'fas fa-spinner fa-spin' : 'fas fa-sync'"></i>
                {{ isReevaluatingPhase3() ? 'Reevaluating...' : 'Reevaluate Flags' }}
              </button>
              <button *ngIf="canRejectPhase3Application()" class="reject-button" (click)="rejectPhase3Application()" [disabled]="isRejectingPhase3()">
                <i [class]="isRejectingPhase3() ? 'fas fa-spinner fa-spin' : 'fas fa-times'"></i>
                {{ isRejectingPhase3() ? 'Rejecting...' : 'Reject' }}
              </button>
            </div>
          </div>
          
          <div *ngIf="phase3Application()" class="application-content">
            <!-- Product & Traction -->
            <div class="info-group">
              <h3>Product & Traction</h3>
              <div class="info-grid">
                <div class="info-item">
                  <label>Product Stage</label>
                  <span class="value-with-flag">
                    {{ getProductStageDisplay(phase3Application()?.productInfo?.productStage) }}
                    <i *ngIf="hasFlag('productStage')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('productStage')" 
                       [title]="getFlagMessage('productStage')"></i>
                  </span>
                </div>
                <div class="info-item full-width">
                  <label>Video Pitch URL</label>
                  <span class="value-with-flag">
                    <a *ngIf="phase3Application()?.productInfo?.videoPitch" 
                       [href]="phase3Application()?.productInfo?.videoPitch" 
                       target="_blank">
                      View Video Pitch
                      <i class="fas fa-external-link-alt"></i>
                    </a>
                    <span *ngIf="!phase3Application()?.productInfo?.videoPitch">Not provided</span>
                    <i *ngIf="hasFlag('videoPitch')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('videoPitch')" 
                       [title]="getFlagMessage('videoPitch')"></i>
                  </span>
                </div>
                <div class="info-item full-width">
                  <label>Traction Details</label>
                  <span class="value-with-flag long-text">
                    {{ phase3Application()?.productInfo?.tractionDetails }}
                    <i *ngIf="hasFlag('tractionDetails')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('tractionDetails')" 
                       [title]="getFlagMessage('tractionDetails')"></i>
                  </span>
                </div>
                <div class="info-item full-width">
                  <label>Problem & Customer Description</label>
                  <span class="value-with-flag long-text">
                    {{ phase3Application()?.productInfo?.problemCustomer }}
                    <i *ngIf="hasFlag('problemCustomer')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('problemCustomer')" 
                       [title]="getFlagMessage('problemCustomer')"></i>
                  </span>
                </div>
              </div>
            </div>

            <!-- Team Information -->
            <div class="info-group">
              <h3>Team Information</h3>
              <div class="info-grid">
                <div class="info-item full-width">
                  <label>Co-Founders</label>
                  <span class="value-with-flag long-text">
                    {{ phase3Application()?.teamInfo?.coFounders }}
                    <i *ngIf="hasFlag('coFounders')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('coFounders')" 
                       [title]="getFlagMessage('coFounders')"></i>
                  </span>
                </div>
                <div class="info-item">
                  <label>Team Capacity</label>
                  <span class="value-with-flag">
                    {{ getCapacityDisplay(phase3Application()?.teamInfo?.capacity) }}
                    <span *ngIf="phase3Application()?.teamInfo?.capacity === 'OTHER' && phase3Application()?.teamInfo?.capacityOther">
                      - {{ phase3Application()?.teamInfo?.capacityOther }}
                    </span>
                    <i *ngIf="hasFlag('capacity')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('capacity')" 
                       [title]="getFlagMessage('capacity')"></i>
                  </span>
                </div>
                <div class="info-item">
                  <label>Previous Team Collaboration</label>
                  <span class="value-with-flag">
                    {{ phase3Application()?.teamInfo?.hasPreviousCollaboration ? 'Yes' : 'No' }}
                    <i *ngIf="hasFlag('hasPreviousCollaboration')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('hasPreviousCollaboration')" 
                       [title]="getFlagMessage('hasPreviousCollaboration')"></i>
                  </span>
                </div>
                <div class="info-item full-width" *ngIf="phase3Application()?.teamInfo?.hasPreviousCollaboration && phase3Application()?.teamInfo?.previousCollaboration">
                  <label>Previous Collaboration Details</label>
                  <span class="value-with-flag long-text">
                    {{ phase3Application()?.teamInfo?.previousCollaboration }}
                  </span>
                </div>
                <div class="info-item">
                  <label>Previous Co-Founders Left</label>
                  <span class="value-with-flag">
                    {{ phase3Application()?.teamInfo?.previousFounders ? 'Yes' : 'No' }}
                    <i *ngIf="hasFlag('previousFounders')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('previousFounders')" 
                       [title]="getFlagMessage('previousFounders')"></i>
                  </span>
                </div>
                <div class="info-item full-width" *ngIf="phase3Application()?.teamInfo?.previousFounders && phase3Application()?.teamInfo?.previousFoundersExplanation">
                  <label>Previous Founders Departure Explanation</label>
                  <span class="value-with-flag long-text">
                    {{ phase3Application()?.teamInfo?.previousFoundersExplanation }}
                  </span>
                </div>
                <div class="info-item full-width">
                  <label>Equity Split & Roles</label>
                  <span class="value-with-flag long-text">
                    {{ phase3Application()?.teamInfo?.equitySplitRoles }}
                    <i *ngIf="hasFlag('equitySplitRoles')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('equitySplitRoles')" 
                       [title]="getFlagMessage('equitySplitRoles')"></i>
                  </span>
                </div>
                <div class="info-item full-width" *ngIf="phase3Application()?.teamInfo?.additionalTeamMembers">
                  <label>Additional Team Members</label>
                  <span class="long-text">{{ phase3Application()?.teamInfo?.additionalTeamMembers }}</span>
                </div>
              </div>
            </div>

            <!-- Funding Information -->
            <div class="info-group">
              <h3>Funding Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <label>Has Raised Capital</label>
                  <span class="value-with-flag">
                    {{ phase3Application()?.fundingInfo?.hasRaisedCapital ? 'Yes' : 'No' }}
                    <i *ngIf="hasFlag('hasRaisedCapital')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('hasRaisedCapital')" 
                       [title]="getFlagMessage('hasRaisedCapital')"></i>
                  </span>
                </div>
                <div class="info-item full-width" *ngIf="phase3Application()?.fundingInfo?.hasRaisedCapital && phase3Application()?.fundingInfo?.fundingDetails">
                  <label>Funding Details</label>
                  <span class="value-with-flag long-text">
                    {{ phase3Application()?.fundingInfo?.fundingDetails }}
                    <i *ngIf="hasFlag('fundingDetails')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('fundingDetails')" 
                       [title]="getFlagMessage('fundingDetails')"></i>
                  </span>
                </div>
                <div class="info-item full-width" *ngIf="getEquityBreakdown().length > 0">
                  <label>
                    <span class="value-with-flag">
                      Equity Breakdown
                      <i *ngIf="hasFlag('equityBreakdown')" 
                         [class]="'flag-icon fas fa-flag ' + getFlagColor('equityBreakdown')" 
                         [title]="getFlagMessage('equityBreakdown')"></i>
                    </span>
                  </label>
                  <div class="equity-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Shares</th>
                          <th>Percentage</th>
                          <th>Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr *ngFor="let row of getEquityBreakdown()" 
                            [class]="'equity-row equity-' + row.category">
                          <td>{{ row.name }}</td>
                          <td>{{ formatNumber(row.shares) }}</td>
                          <td>{{ row.percentage.toFixed(1) }}%</td>
                          <td>{{ getEquityCategoryDisplay(row.category) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- Legal & Corporate Structure -->
            <div class="info-group">
              <h3>Legal & Corporate Structure</h3>
              <div class="info-grid">
                <div class="info-item">
                  <label>Company Incorporated</label>
                  <span class="value-with-flag">
                    {{ phase3Application()?.legalInfo?.isIncorporated ? 'Yes' : 'No' }}
                    <i *ngIf="hasFlag('isIncorporated')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('isIncorporated')" 
                       [title]="getFlagMessage('isIncorporated')"></i>
                  </span>
                </div>
                <div class="info-item" *ngIf="phase3Application()?.legalInfo?.isIncorporated && phase3Application()?.legalInfo?.incorporationLocation">
                  <label>Incorporation Location</label>
                  <span class="value-with-flag">
                    {{ phase3Application()?.legalInfo?.incorporationLocation }}
                    <i *ngIf="hasFlag('incorporationLocation')" 
                       [class]="'flag-icon fas fa-flag ' + getFlagColor('incorporationLocation')" 
                       [title]="getFlagMessage('incorporationLocation')"></i>
                  </span>
                </div>
                <div class="info-item" *ngIf="phase3Application()?.legalInfo?.isIncorporated">
                  <label>IP Assignment Agreements</label>
                  <span>{{ getBooleanDisplay(phase3Application()?.legalInfo?.hasIpAssignment) }}</span>
                </div>
                <div class="info-item" *ngIf="phase3Application()?.legalInfo?.isIncorporated">
                  <label>Founder Vesting</label>
                  <span>{{ getBooleanDisplay(phase3Application()?.legalInfo?.hasFounderVesting) }}</span>
                </div>
                <div class="info-item" *ngIf="phase3Application()?.legalInfo?.isIncorporated">
                  <label>Board Structure</label>
                  <span>{{ getBooleanDisplay(phase3Application()?.legalInfo?.hasBoardStructure) }}</span>
                </div>
                <div class="info-item" *ngIf="phase3Application()?.legalInfo?.isIncorporated">
                  <label>Will Amend Documents</label>
                  <span>{{ getBooleanDisplay(phase3Application()?.legalInfo?.willAmendDocuments) }}</span>
                </div>
                <div class="info-item full-width" *ngIf="phase3Application()?.legalInfo?.isIncorporated && phase3Application()?.legalInfo?.willAmendDocuments === false && phase3Application()?.legalInfo?.amendDocumentsExplanation">
                  <label>Amendment Concerns</label>
                  <span class="long-text">{{ phase3Application()?.legalInfo?.amendDocumentsExplanation }}</span>
                </div>
                <div class="info-item" *ngIf="!phase3Application()?.legalInfo?.isIncorporated && phase3Application()?.legalInfo?.agreesToIncorporate">
                  <label>Agrees to Incorporate</label>
                  <span>{{ getIncorporationAgreementDisplay(phase3Application()?.legalInfo?.agreesToIncorporate) }}</span>
                </div>
              </div>
            </div>

            <!-- OpenAI Analysis (GPT-5-mini) -->
            <div class="info-group openai-analysis" *ngIf="phase3Application()?.llmAnalysis">
              <h3>
                <i class="fas fa-brain"></i> 
                AI Analysis - Problem & Customer Description
                <span *ngIf="phase3Application()?.llmAnalysis?.processing" class="processing-badge">
                  <i class="fas fa-spinner fa-spin"></i>
                  Processing...
                </span>
              </h3>
              
              <!-- Loading State -->
              <div *ngIf="phase3Application()?.llmAnalysis?.processing" class="analysis-loading">
                <div class="loading-content">
                  <i class="fas fa-robot"></i>
                  <p>GPT-5-mini is analyzing the Problem & Customer description...</p>
                  <div class="loading-spinner"></div>
                </div>
              </div>

              <!-- Analysis Results -->
              <div *ngIf="!phase3Application()?.llmAnalysis?.processing" class="analysis-results">
                <!-- Score Card -->
                <div class="score-card">
                  <div class="score-display">
                    <span class="score-number" [class]="getAnalysisScoreClass(phase3Application()?.llmAnalysis?.problemCustomerScore || 0)">
                      {{ phase3Application()?.llmAnalysis?.problemCustomerScore || 0 }}
                    </span>
                    <span class="score-label">/ 10</span>
                  </div>
                  
                  <!-- Criteria Indicators -->
                  <div class="criteria-indicators">
                    <div class="criterion" [class.met]="phase3Application()?.llmAnalysis?.isSpecific">
                      <i [class]="phase3Application()?.llmAnalysis?.isSpecific ? 'fas fa-check' : 'fas fa-times'"></i>
                      <span>Specific Target</span>
                    </div>
                    <div class="criterion" [class.met]="phase3Application()?.llmAnalysis?.hasClearTarget">
                      <i [class]="phase3Application()?.llmAnalysis?.hasClearTarget ? 'fas fa-check' : 'fas fa-times'"></i>
                      <span>Clear Target</span>
                    </div>
                    <div class="criterion" [class.met]="phase3Application()?.llmAnalysis?.hasDefinedProblem">
                      <i [class]="phase3Application()?.llmAnalysis?.hasDefinedProblem ? 'fas fa-check' : 'fas fa-times'"></i>
                      <span>Defined Problem</span>
                    </div>
                  </div>
                </div>

                <!-- Detailed Feedback -->
                <div class="analysis-feedback">
                  <div class="feedback-item">
                    <h4><i class="fas fa-comment"></i> Feedback</h4>
                    <p>{{ phase3Application()?.llmAnalysis?.feedback }}</p>
                  </div>

                  <div class="feedback-item strengths" *ngIf="phase3Application()?.llmAnalysis?.strengths && (phase3Application()?.llmAnalysis?.strengths || []).length > 0">
                    <h4><i class="fas fa-thumbs-up"></i> Strengths</h4>
                    <ul>
                      <li *ngFor="let strength of phase3Application()?.llmAnalysis?.strengths">{{ strength }}</li>
                    </ul>
                  </div>

                  <div class="feedback-item weaknesses" *ngIf="phase3Application()?.llmAnalysis?.weaknesses && (phase3Application()?.llmAnalysis?.weaknesses || []).length > 0">
                    <h4><i class="fas fa-thumbs-down"></i> Weaknesses</h4>
                    <ul>
                      <li *ngFor="let weakness of phase3Application()?.llmAnalysis?.weaknesses">{{ weakness }}</li>
                    </ul>
                  </div>

                  <!-- Token Usage (Admin only) -->
                  <div class="analysis-meta" *ngIf="phase3Application()?.llmAnalysis?.tokenUsage">
                    <div class="meta-info">
                      <span class="meta-item">
                        <i class="fas fa-calculator"></i>
                        Tokens: {{ phase3Application()?.llmAnalysis?.tokenUsage?.total_tokens || 'N/A' }}
                      </span>
                      <span class="meta-item">
                        <i class="fas fa-calendar"></i>
                        {{ formatDate(phase3Application()?.llmAnalysis?.analyzedAt) }}
                      </span>
                      <span class="meta-item">
                        <i class="fas fa-robot"></i>
                        {{ phase3Application()?.llmAnalysis?.gradingModel }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Flagging Summary for Phase 3 (if available) -->
            <div class="flagging-summary" *ngIf="phase3FlaggingResult()">
              <h3>
                <i class="fas fa-flag"></i>
                Phase 3 Flagging Analysis
                <span [class]="'risk-badge risk-' + (phase3FlaggingResult()?.needsReview ? 'high' : 'low')">
                  {{ phase3FlaggingResult()?.needsReview ? 'Manual Review Required' : 'Auto-Advance' }}
                </span>
              </h3>
              <div class="flags-list" *ngIf="phase3FlaggingResult()?.flags && (phase3FlaggingResult()?.flags?.length || 0) > 0">
                <div *ngFor="let flag of phase3FlaggingResult()?.flags" 
                     [class]="'flag-item flag-' + flag.type.toLowerCase()">
                  <i [class]="'fas fa-flag flag-' + flag.type.toLowerCase()"></i>
                  <div class="flag-content">
                    <strong>{{ getFieldDisplayName(flag.field || '') }}:</strong>
                    <span>{{ flag.message }}</span>
                  </div>
                </div>
              </div>
              <div *ngIf="!phase3FlaggingResult()?.flags || (phase3FlaggingResult()?.flags?.length || 0) === 0" class="no-flags">
                <i class="fas fa-check-circle"></i>
                <span>No flags detected - application looks good!</span>
              </div>
            </div>
          </div>

          <!-- Debug Information -->
          <div *ngIf="!phase3Application()" class="no-application">
            <i class="fas fa-file-alt"></i>
            <p>No Phase 3 application found for this applicant.</p>
            <p><small>Debug: Applicant ID: {{ applicant()?.userId }}, Cohort ID: {{ applicant()?.cohortId }}</small></p>
          </div>
          
          <!-- Debug Phase 3 Data -->
          <div *ngIf="phase3Application()" class="debug-info" style="background: #f0f9ff; padding: 1rem; margin: 1rem; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <h4>Debug: Phase 3 Data Loaded</h4>
            <p><strong>Application ID:</strong> {{ phase3Application()?.id }}</p>
            <p><strong>Has Funding Info:</strong> {{ !!phase3Application()?.fundingInfo }}</p>
            <p><strong>Has Equity Breakdown:</strong> {{ !!phase3Application()?.fundingInfo?.equityBreakdown }}</p>
            <p><strong>Equity Breakdown Length:</strong> {{ (phase3Application()?.fundingInfo?.equityBreakdown || []).length }}</p>
          </div>
        </section>

          <!-- Phase 4 Section -->
          <section class="phase-section tab-panel" *ngIf="activeTab() === 'phase4'">
          <div class="section-header">
            <h2><i class="fas fa-handshake"></i> Phase 4 - Interview</h2>
            <div class="phase-actions">
              <div *ngIf="shouldShowPhase4Toggle()" class="phase4-status-toggle">
                <label for="phase4-status">Interview Status:</label>
                <select id="phase4-status" 
                        class="status-select" 
                        [value]="getPhase4Status()" 
                        (change)="updatePhase4Status($event)"
                        [disabled]="isUpdatingPhase4Status()">
                  <option value="pending">Pending Decision</option>
                  <option value="accepted">Accept</option>
                  <option value="rejected">Reject</option>
                </select>
                <i *ngIf="isUpdatingPhase4Status()" class="fas fa-spinner fa-spin loading-icon"></i>
              </div>
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

            <!-- Interview Status -->
            <div class="interview-status-section">
              <h3>Interview Status</h3>
              <form [formGroup]="interviewForm" (ngSubmit)="updateInterviewStatus()">
                <div class="status-controls">
                  <div class="form-group">
                    <label for="status">Status</label>
                    <select formControlName="status" id="status" class="status-dropdown">
                      <option value="NOT_YET_SCHEDULED">Not Yet Scheduled</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="INTERVIEWED">Interviewed</option>
                    </select>
                  </div>
                  <button type="submit" class="update-status-btn" [disabled]="!interviewForm.dirty">
                    <i class="fas fa-save"></i>
                    Update Status
                  </button>
                </div>
              </form>
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

            <!-- Document Management -->
            <div class="document-section">
              <h3>Interview Document</h3>
              <div class="document-controls">
                <div *ngIf="!interview()?.documentUrl" class="no-document">
                  <p>No Google Doc URL set</p>
                  <button class="set-url-btn" (click)="showDocumentUrlModal()">
                    <i class="fas fa-plus"></i>
                    Set URL
                  </button>
                </div>
                <div *ngIf="interview()?.documentUrl" class="document-info">
                  <p><strong>Document URL:</strong></p>
                  <div class="url-display">{{ interview()?.documentUrl }}</div>
                  <div class="document-actions">
                    <button class="view-doc-btn" (click)="viewDocument()">
                      <i class="fas fa-external-link-alt"></i>
                      View Doc
                    </button>
                    <button class="edit-url-btn" (click)="showDocumentUrlModal()">
                      <i class="fas fa-edit"></i>
                      Edit URL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        </div> <!-- Close tab-content -->
      </main>

      <!-- Interviewer Selection Modal -->
      <div *ngIf="showInterviewerSelection()" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>
              <i class="fas fa-user-tie"></i>
              {{ isAdvancingToPhase4() ? 'Advance to Phase 4 - Select Interviewer' : 'Change Interviewer' }}
            </h3>
            <button class="modal-close" (click)="cancelInterviewerSelection()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="modal-body">
            <p>{{ isAdvancingToPhase4() ? 'Select an interviewer to advance to Phase 4:' : 'Select a new interviewer:' }}</p>
            
            <div class="interviewer-list">
              <div *ngFor="let interviewer of interviewers()" 
                   class="interviewer-option" 
                   (click)="assignInterviewer(interviewer.id!)">
                <div class="interviewer-info">
                  <h4>{{ interviewer.name }}</h4>
                  <p>{{ interviewer.email }}</p>
                  <span class="role-badge">{{ interviewer.role }}</span>
                </div>
                <div class="interviewer-actions">
                  <a [href]="interviewer.calendarUrl" target="_blank" class="calendar-link">
                    <i class="fas fa-calendar"></i>
                    View Calendar
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="secondary-button" (click)="cancelInterviewerSelection()">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Document URL Modal -->
      <div *ngIf="showDocumentModal()" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>
              <i class="fas fa-file-alt"></i>
              Set Google Doc URL
            </h3>
            <button class="modal-close" (click)="closeDocumentModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="modal-body">
            <form [formGroup]="documentForm" (ngSubmit)="saveDocumentUrl()">
              <div class="form-group">
                <label for="documentUrl">Google Doc URL</label>
                <input 
                  type="url" 
                  id="documentUrl"
                  formControlName="documentUrl" 
                  placeholder="https://docs.google.com/document/..."
                  class="url-input">
                <small class="form-help">
                  Enter the full URL to the Google Doc for this interview
                </small>
              </div>
              <div class="modal-actions">
                <button type="button" class="secondary-button" (click)="closeDocumentModal()">
                  <i class="fas fa-times"></i>
                  Cancel
                </button>
                <button type="submit" class="primary-button" [disabled]="!documentForm.valid">
                  <i class="fas fa-save"></i>
                  Save URL
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
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

    /* Allow dropdowns to overflow in profile section */
    .profile-section {
      overflow: visible;
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
      overflow: visible;
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

    .reject-button {
      background: #ef4444;
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

    .reject-button:hover {
      background: #dc2626;
    }

    .reject-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .accept-button {
      background: #10b981;
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
    }

    .accept-button:hover {
      background: #059669;
    }

    .accept-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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

    .interviewer-section,
    .interview-status-section,
    .notes-section,
    .document-section {
      background: #f9fafb;
      border-radius: 8px;
      padding: 1.5rem;
      border: 1px solid #e5e7eb;
    }

    .interviewer-section h3,
    .interview-status-section h3,
    .notes-section h3,
    .document-section h3 {
      color: #1f2937;
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 1rem 0;
    }

    /* Interview Status Styling */
    .status-controls {
      display: flex;
      align-items: end;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .status-controls .form-group {
      flex: 1;
      min-width: 200px;
    }

    .status-dropdown {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.9rem;
      background: white;
      color: #1f2937;
    }

    .status-dropdown:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .update-status-btn {
      padding: 0.75rem 1.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: background-color 0.2s;
      white-space: nowrap;
    }

    .update-status-btn:hover:not(:disabled) {
      background: #2563eb;
    }

    .update-status-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    /* Notes Section Styling */
    .notes-textarea {
      width: 100%;
      padding: 1rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-family: inherit;
      font-size: 0.9rem;
      resize: vertical;
      min-height: 120px;
    }

    .notes-textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .notes-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 1rem;
    }

    .save-notes-btn {
      padding: 0.75rem 1.5rem;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: background-color 0.2s;
    }

    .save-notes-btn:hover:not(:disabled) {
      background: #059669;
    }

    .save-notes-btn:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    /* Document Section Styling */
    .document-controls {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .no-document {
      text-align: center;
      padding: 2rem;
      color: #6b7280;
    }

    .set-url-btn {
      padding: 0.75rem 1.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: center;
      transition: background-color 0.2s;
    }

    .set-url-btn:hover {
      background: #2563eb;
    }

    .document-info {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .url-display {
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 0.75rem;
      font-family: monospace;
      font-size: 0.85rem;
      color: #374151;
      word-break: break-all;
    }

    .document-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .view-doc-btn,
    .edit-url-btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      font-size: 0.85rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
      text-decoration: none;
    }

    .view-doc-btn {
      background: #10b981;
      color: white;
    }

    .view-doc-btn:hover {
      background: #059669;
    }

    .edit-url-btn {
      background: #f59e0b;
      color: white;
    }

    .edit-url-btn:hover {
      background: #d97706;
    }

    /* Document Modal Styling */
    .url-input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.9rem;
      font-family: monospace;
    }

    .url-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-help {
      display: block;
      margin-top: 0.5rem;
      color: #6b7280;
      font-size: 0.8rem;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .primary-button {
      padding: 0.75rem 1.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: background-color 0.2s;
    }

    .primary-button:hover:not(:disabled) {
      background: #2563eb;
    }

    .primary-button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    /* Equity Table */
    .equity-table {
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    .equity-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .equity-table th,
    .equity-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #f3f4f6;
    }

    .equity-table th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .equity-table td {
      color: #1f2937;
      font-size: 0.9rem;
    }

    .equity-row.equity-total,
    .equity-row.equity-grandTotal {
      background: #f3f4f6;
      font-weight: 600;
    }

    .equity-row.equity-grandTotal {
      border-top: 2px solid #d1d5db;
    }

    /* AI Analysis */
    .ai-score {
      font-weight: 600;
      color: #3b82f6;
      font-size: 1.1rem;
    }

    .ai-feedback {
      background: #f0f9ff;
      padding: 0.75rem;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
      font-style: italic;
    }

    /* No Application Message */
    .no-application {
      padding: 3rem 1.5rem;
      text-align: center;
      color: #6b7280;
    }

    .no-application i {
      font-size: 3rem;
      margin-bottom: 1rem;
      color: #d1d5db;
    }

    .no-application p {
      font-size: 1.1rem;
      margin: 0;
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

    /* OpenAI Analysis Styles */
    .openai-analysis {
      background: #fafcff;
      border: 1px solid #e1e9ff;
      border-radius: 12px;
      overflow: hidden;
    }

    .openai-analysis h3 {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      margin: 0;
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 1.1rem;
    }

    .processing-badge {
      background: rgba(255, 255, 255, 0.2);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .analysis-loading {
      padding: 2rem;
      text-align: center;
    }

    .loading-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      color: #6b7280;
    }

    .loading-content i {
      font-size: 2rem;
      color: #3b82f6;
    }

    .loading-spinner {
      width: 2rem;
      height: 2rem;
      border: 2px solid #e5e7eb;
      border-top: 2px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .analysis-results {
      padding: 1.5rem;
    }

    .score-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .score-display {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .score-number {
      font-size: 3rem;
      font-weight: bold;
    }

    .score-number.high { color: #059669; }
    .score-number.medium { color: #d97706; }
    .score-number.low { color: #dc2626; }

    .score-label {
      font-size: 1.5rem;
      color: #6b7280;
    }

    .criteria-indicators {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .criterion {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      background: #f3f4f6;
      color: #6b7280;
      font-size: 0.9rem;
    }

    .criterion.met {
      background: #dcfce7;
      color: #166534;
    }

    .criterion i {
      font-size: 0.8rem;
    }

    .analysis-feedback {
      display: grid;
      gap: 1.5rem;
    }

    .feedback-item h4 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #374151;
      margin-bottom: 0.75rem;
      font-size: 1rem;
    }

    .feedback-item.strengths h4 { color: #059669; }
    .feedback-item.weaknesses h4 { color: #dc2626; }

    .feedback-item p {
      margin: 0;
      line-height: 1.6;
      color: #4b5563;
    }

    .feedback-item ul {
      margin: 0;
      padding-left: 1.5rem;
      color: #4b5563;
    }

    .feedback-item li {
      margin-bottom: 0.5rem;
      line-height: 1.5;
    }

    .analysis-meta {
      background: #f8fafc;
      border-radius: 8px;
      padding: 1rem;
      margin-top: 1.5rem;
    }

    .meta-info {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
      font-size: 0.9rem;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #6b7280;
    }

    .meta-item i {
      color: #9ca3af;
    }

    /* Interviewer Selection Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .modal-close {
      background: none;
      border: none;
      padding: 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      color: #6b7280;
      transition: background-color 0.2s;
    }

    .modal-close:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .interviewer-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1rem;
    }

    .interviewer-option {
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .interviewer-option:hover {
      border-color: #3b82f6;
      background: #f8fafc;
    }

    .interviewer-info h4 {
      margin: 0 0 0.25rem 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .interviewer-info p {
      margin: 0 0 0.5rem 0;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .interviewer-info .role-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: #e5e7eb;
      color: #374151;
      border-radius: 12px;
      text-transform: uppercase;
      font-weight: 500;
    }

    .interviewer-actions .calendar-link {
      color: #3b82f6;
      text-decoration: none;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .interviewer-actions .calendar-link:hover {
      text-decoration: underline;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
    }

    /* Rating and Assignment Dropdowns */
    .rating-dropdown-container,
    .assigned-dropdown-container {
      position: relative;
      display: inline-block;
      z-index: 10;
    }

    .rating-badge,
    .assigned-badge {
      background: #f3f4f6;
      color: #374151;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      border: 1px solid #e5e7eb;
      transition: all 0.2s;
      min-width: 100px;
      justify-content: space-between;
    }

    .rating-badge:hover,
    .assigned-badge:hover {
      background: #e5e7eb;
      border-color: #d1d5db;
    }

    .rating-arrow,
    .assigned-arrow {
      font-size: 0.75rem;
      color: #6b7280;
      transition: transform 0.2s;
    }

    .rating-dropdown,
    .assigned-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15), 0 5px 10px rgba(0, 0, 0, 0.05);
      z-index: 9999;
      margin-top: 0.25rem;
      max-height: 200px;
      overflow-y: auto;
      min-width: 150px;
    }

    .rating-option,
    .assigned-option {
      padding: 0.75rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      transition: background-color 0.2s;
      border-bottom: 1px solid #f3f4f6;
    }

    .rating-option:last-child,
    .assigned-option:last-child {
      border-bottom: none;
    }

    .rating-option:hover,
    .assigned-option:hover {
      background: #f9fafb;
    }

    .rating-preview,
    .assigned-preview {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      background: #e5e7eb;
      color: #374151;
    }

    .rating-preview.rating-1 {
      background: #10b981;
      color: white;
    }

    .rating-preview.rating-2 {
      background: #f59e0b;
      color: white;
    }

    .rating-preview.rating-3 {
      background: #ef4444;
      color: white;
    }

    .rating-label,
    .assigned-label {
      font-size: 0.875rem;
      color: #374151;
    }

    /* Rating badge variants */
    .rating-badge.rating-1 {
      background: #d1fae5;
      color: #047857;
      border-color: #a7f3d0;
    }

    .rating-badge.rating-2 {
      background: #fef3c7;
      color: #92400e;
      border-color: #fde68a;
    }

    .rating-badge.rating-3 {
      background: #fee2e2;
      color: #b91c1c;
      border-color: #fecaca;
    }

    /* Phase 4 Status Toggle */
    .phase4-status-toggle {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .phase4-status-toggle label {
      font-weight: 600;
      color: #374151;
      min-width: 120px;
    }

    .status-select {
      padding: 0.75rem 1rem;
      border: 2px solid #d1d5db;
      border-radius: 8px;
      background: white;
      color: #374151;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: border-color 0.3s, box-shadow 0.3s;
      min-width: 160px;
    }

    .status-select:hover {
      border-color: #9ca3af;
    }

    .status-select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .status-select:disabled {
      background: #f3f4f6;
      border-color: #d1d5db;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .loading-icon {
      color: #3b82f6;
      margin-left: 0.5rem;
    }

    .status-select option {
      padding: 0.5rem;
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
  private openaiService = inject(OpenAIService);
  private emailService = inject(EmailService);
  private interviewerService = inject(InterviewerService);
  private phaseProgressionService = inject(PhaseProgressionService);
  private fb = inject(FormBuilder);

  // Signals
  applicant = signal<ApplicantUser | null>(null);
  phase1Application = signal<Phase1Application | null>(null);
  phase3Application = signal<Phase3Application | null>(null);
  flaggingResult = signal<FlaggingResult | null>(null);
  phase3FlaggingResult = signal<FlaggingResult | null>(null);
  interviewers = signal<Interviewer[]>([]);
  allInterviewers = signal<Interviewer[]>([]); // For displaying interviewer names
  showInterviewerSelection = signal(false);
  isAdvancingToPhase4 = signal(false);
  interview = signal<Interview | null>(null);
  showDocumentModal = signal(false);
  isLoading = signal(true);
  error = signal('');
  success = signal('');
  activeTab = signal<string>('profile');
  isReevaluatingPhase3 = signal(false);
  rejectingPhase3 = signal(false);
  activeRatingDropdown = signal<string | null>(null);
  activeAssignedDropdown = signal<string | null>(null);
  adminUsers = signal<AdminUser[]>([]);
  isAcceptingApplicant = signal(false);
  isRejectingApplicant = signal(false);
  isUpdatingPhase4Status = signal(false);

  // Form
  notesForm: FormGroup;
  interviewForm: FormGroup;
  documentForm: FormGroup;

  constructor() {
    this.notesForm = this.fb.group({
      notes: ['']
    });

    this.interviewForm = this.fb.group({
      status: [InterviewStatus.NOT_YET_SCHEDULED, Validators.required],
      documentUrl: ['']
    });

    this.documentForm = this.fb.group({
      documentUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]]
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
    
    // Load admin users for assignment dropdown
    this.loadAdminUsers();
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

      // Load Phase 3 application if exists
      try {
        console.log('🔍 Loading Phase 3 application for:', applicantId, (applicantData as ApplicantUser).cohortId);
        const phase3App = await this.applicationService.getPhase3Application(applicantId, (applicantData as ApplicantUser).cohortId);
        console.log('📝 Phase 3 application result:', phase3App);
        
        if (phase3App) {
          console.log('✅ Setting Phase 3 application data:', phase3App);
          console.log('📊 Equity breakdown:', phase3App.fundingInfo?.equityBreakdown);
          this.phase3Application.set(phase3App);
          
          // Phase 3 flagging will be calculated when explicitly requested via the "Reevaluate Flags" button
        } else {
          console.log('❌ No Phase 3 application found');
        }
      } catch (error) {
        console.warn('🚨 Phase 3 application not found or error loading:', error);
      }

      // Load interview data if in Phase 4
      if (this.shouldShowPhase4()) {
        await this.loadInterviewData();
      }
      
      // Always load interviewer data for name lookup (needed for any phase with assigned interviewer)
      await this.loadInterviewerData();

      // Set initial tab based on applicant status
      this.setInitialTab();

    } catch (error: any) {
      this.error.set(error.message || 'Failed to load applicant details');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadAdminUsers() {
    try {
      const admins = await this.userService.getAllAdmins();
      this.adminUsers.set(admins);
    } catch (error) {
      console.error('Error loading admin users:', error);
      // Don't throw error as this is not critical for the page functionality
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

  canReopenPhase3Application(): boolean {
    const status = this.applicant()?.status;
    return status === ApplicationStatus.PHASE_3_SUBMITTED;
  }

  canRejectPhase3Application(): boolean {
    const status = this.applicant()?.status;
    return status === ApplicationStatus.PHASE_3_SUBMITTED;
  }

  isRejectingPhase3(): boolean {
    return this.rejectingPhase3();
  }

  canAdvanceFromPhase4(): boolean {
    const status = this.applicant()?.status;
    return status === ApplicationStatus.PHASE_4_POST_INTERVIEW;
  }

  canAcceptFromPhase4(): boolean {
    const status = this.applicant()?.status;
    return status !== undefined && [
      ApplicationStatus.PHASE_4,
      ApplicationStatus.PHASE_4_INTERVIEW_SCHEDULED,
      ApplicationStatus.PHASE_4_POST_INTERVIEW
    ].includes(status);
  }

  canRejectFromPhase4(): boolean {
    const status = this.applicant()?.status;
    return status !== undefined && [
      ApplicationStatus.PHASE_4,
      ApplicationStatus.PHASE_4_INTERVIEW_SCHEDULED,
      ApplicationStatus.PHASE_4_POST_INTERVIEW
    ].includes(status);
  }

  shouldShowPhase4Toggle(): boolean {
    const applicant = this.applicant();
    if (!applicant) return false;
    
    const status = applicant.status;
    // Show toggle for any Phase 4 related status, regardless of current phase
    // Also show for ACCEPTED phase users who might have been rejected at Phase 4
    return status !== undefined && (
      [
        ApplicationStatus.PHASE_4,
        ApplicationStatus.PHASE_4_INTERVIEW_SCHEDULED,
        ApplicationStatus.PHASE_4_POST_INTERVIEW,
        'PHASE_4_REJECTED' as any
      ].includes(status) ||
      // Show for ACCEPTED phase users (they might have been accepted from Phase 4)
      (applicant.phase === Phase.ACCEPTED) ||
      // Show for users with ACCEPTED status (legitimate acceptance)
      (status === ApplicationStatus.ACCEPTED)
    );
  }

  getPhase4Status(): string {
    const applicant = this.applicant();
    if (!applicant) return 'pending';
    
    const status = applicant.status;
    if (status === 'PHASE_4_REJECTED') return 'rejected';
    if (status === ApplicationStatus.ACCEPTED) return 'accepted';
    return 'pending';
  }

  async updatePhase4Status(event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement;
    const newStatus = target.value;
    const applicant = this.applicant();
    
    if (!applicant) {
      console.error('Applicant not found');
      return;
    }

    this.isUpdatingPhase4Status.set(true);
    this.error.set('');

    try {
      switch (newStatus) {
        case 'accepted':
          await this.acceptApplicant();
          break;
        case 'rejected':
          await this.rejectApplicant();
          break;
        case 'pending':
          await this.resetPhase4ToPending();
          break;
      }
    } catch (error) {
      console.error('Error updating Phase 4 status:', error);
      this.error.set('Failed to update interview status');
    } finally {
      this.isUpdatingPhase4Status.set(false);
    }
  }

  private async resetPhase4ToPending(): Promise<void> {
    const applicant = this.applicant();
    if (!applicant) return;

    try {
      await this.userService.updateUser(applicant.userId, {
        status: ApplicationStatus.PHASE_4,
        phase: Phase.INTERVIEW
      });
      
      // Update local state
      this.applicant.update(current => ({
        ...current!,
        status: ApplicationStatus.PHASE_4,
        phase: Phase.INTERVIEW
      }));

      this.success.set('Interview status reset to pending');
      console.log('✅ Phase 4 status reset to pending');
    } catch (error) {
      console.error('❌ Error resetting Phase 4 status:', error);
      throw error;
    }
  }

  // Phase advancement actions
  async advanceToPhase2() {
    const applicant = this.applicant();
    if (!applicant) return;

    try {
      console.log('🚀 Advancing applicant to Phase 2...', applicant.name);
      
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

      console.log('✅ Successfully advanced to Phase 2');

      // Send Phase 1 approved email
      try {
        console.log('📧 Sending Phase 1 approved email to:', applicant.email);
        const emailResult = await this.emailService.sendPhase1ApprovedEmail(applicant);
        
        if (emailResult.success) {
          console.log('✅ Phase 1 approved email sent successfully');
        } else {
          console.error('❌ Failed to send Phase 1 approved email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ Email service error during Phase 1 approval:', emailError);
      }
      
      // Refresh the current view
      window.location.reload();

    } catch (error) {
      console.error('❌ Error advancing to Phase 2:', error);
    }
  }

  async advanceToPhase3() {
    const applicant = this.applicant();
    if (!applicant) return;

    try {
      // Update applicant status to Phase 3
      await this.userService.updateUser(applicant.userId, {
        phase: Phase.IN_DEPTH_APPLICATION,
        status: ApplicationStatus.PHASE_3
      });

      // Update local state
      this.applicant.set({
        ...applicant,
        phase: Phase.IN_DEPTH_APPLICATION,
        status: ApplicationStatus.PHASE_3
      });

      console.log('Successfully advanced to Phase 3');
      
      // Refresh the current view
      window.location.reload();

    } catch (error) {
      console.error('Error advancing to Phase 3:', error);
    }
  }

  async advanceToPhase4() {
    const applicant = this.applicant();
    if (!applicant) return;

    try {
      console.log('🚀 Advancing to Phase 4 - loading interviewers...');
      
      // Load available interviewers
      const availableInterviewers = await this.interviewerService.getAllInterviewers();
      
      if (availableInterviewers.length === 0) {
        this.error.set('No interviewers available. Please add at least one interviewer before advancing to Phase 4.');
        return;
      }

      this.interviewers.set(availableInterviewers);
      this.isAdvancingToPhase4.set(true);
      
      // Show interviewer selection modal
      this.showInterviewerSelection.set(true);
      
    } catch (error: any) {
      console.error('❌ Error loading interviewers for Phase 4:', error);
      this.error.set(error.message || 'Failed to advance to Phase 4');
    }
  }

  async assignInterviewer(interviewerId: string) {
    const applicant = this.applicant();
    if (!applicant || !interviewerId) return;

    try {
      const isAdvancing = this.isAdvancingToPhase4();
      
      if (isAdvancing) {
        console.log('🚀 Advancing applicant to Phase 4 with interviewer:', applicant.name);
        
        // Update applicant status to Phase 4
        await this.userService.updateUser(applicant.userId, {
          phase: Phase.INTERVIEW,
          status: ApplicationStatus.PHASE_4,
          interviewerId: interviewerId
        });

        // Create interview record
        await this.interviewerService.createInterview({
          applicantId: applicant.userId,
          interviewerId: interviewerId,
          cohortId: applicant.cohortId
        });

        // Update local state
        this.applicant.set({
          ...applicant,
          phase: Phase.INTERVIEW,
          status: ApplicationStatus.PHASE_4,
          interviewerId: interviewerId
        });

        console.log('✅ Successfully advanced to Phase 4');

        // Send Phase 3 approved email (interview invitation)
        try {
          // Get interviewer details for email from the loaded interviewers array
          const interviewer = this.interviewers().find(i => i.id === interviewerId);
          if (!interviewer) {
            console.error('❌ Interviewer not found for email:', interviewerId);
            throw new Error('Interviewer not found');
          }

          const interviewerName = interviewer.name;
          const interviewerTitle = interviewer.title;
          const schedulingUrl = interviewer.calendarUrl;
          
          console.log('📧 Sending Phase 3 approved email:', {
            to: applicant.email,
            interviewer: interviewerName,
            interviewerTitle,
            schedulingUrl
          });

          const emailResult = await this.emailService.sendPhase3ApprovedEmail(
            applicant,
            interviewerName,
            interviewerTitle,
            schedulingUrl
          );
          
          if (emailResult.success) {
            console.log('✅ Phase 3 approved email sent successfully');
          } else {
            console.error('❌ Failed to send Phase 3 approved email:', emailResult.error);
            // Don't fail the advancement if email fails
          }
        } catch (emailError) {
          console.error('❌ Email service error during Phase 3 approval:', emailError);
          // Don't fail the advancement if email fails
        }
        
        // Refresh to show Phase 4 interface
        window.location.reload();
        
      } else {
        console.log('🔄 Changing interviewer for Phase 4 applicant:', applicant.name);
        
        // Just update the interviewer assignment
        await this.userService.updateUser(applicant.userId, {
          interviewerId: interviewerId
        });

        // Note: We don't update the interview record's interviewerId field
        // because that requires creating a new interview record with the new interviewer
        // The interviewerId in the user record is the primary source of truth

        // Update local state
        this.applicant.set({
          ...applicant,
          interviewerId: interviewerId
        });

        console.log('✅ Successfully changed interviewer');
      }

      // Hide selection modal and reset state
      this.showInterviewerSelection.set(false);
      this.interviewers.set([]);
      this.isAdvancingToPhase4.set(false);
      
      // Reload interview data if we're just changing interviewer
      if (!isAdvancing) {
        await this.loadInterviewData();
      }

    } catch (error) {
      console.error('❌ Error assigning interviewer:', error);
      this.error.set('Failed to assign interviewer');
    }
  }

  cancelInterviewerSelection() {
    this.showInterviewerSelection.set(false);
    this.interviewers.set([]);
    this.isAdvancingToPhase4.set(false);
  }

  async reopenPhase3Application() {
    const applicant = this.applicant();
    const phase3App = this.phase3Application();
    if (!applicant || !phase3App) return;

    try {
      console.log('🔄 Reopening Phase 3 application for:', applicant.name || applicant.email);
      
      // Update applicant status back to Phase 3 In Progress
      await this.userService.updateUser(applicant.userId, {
        phase: Phase.IN_DEPTH_APPLICATION,
        status: ApplicationStatus.PHASE_3_IN_PROGRESS
      });

      // Update Phase 3 application status back to DRAFT
      const updateData: any = {
        status: 'DRAFT',
        submittedAt: deleteField() // Clear the submission timestamp using Firebase deleteField
      };
      await this.applicationService.updatePhase3Application(phase3App.id!, updateData);

      // Update local state
      this.applicant.set({
        ...applicant,
        phase: Phase.IN_DEPTH_APPLICATION,
        status: ApplicationStatus.PHASE_3_IN_PROGRESS
      });

      this.phase3Application.set({
        ...phase3App,
        status: 'DRAFT',
        submittedAt: undefined // This is okay for local state
      });

      console.log('✅ Successfully reopened Phase 3 application');
      
      // Refresh the current view to reflect changes
      window.location.reload();

    } catch (error) {
      console.error('❌ Error reopening Phase 3 application:', error);
    }
  }

  async acceptToProgram() {
    const applicant = this.applicant();
    if (!applicant) return;

    try {
      // Update applicant status to Accepted
      await this.userService.updateUser(applicant.userId, {
        phase: Phase.ACCEPTED,
        status: ApplicationStatus.ACCEPTED,
        isAccepted: true
      });

      // Update local state
      this.applicant.set({
        ...applicant,
        phase: Phase.ACCEPTED,
        status: ApplicationStatus.ACCEPTED,
        isAccepted: true
      });

      console.log('Successfully accepted to program');
      
      // Refresh the current view
      window.location.reload();

    } catch (error) {
      console.error('Error accepting to program:', error);
    }
  }

  // Flagging methods
  hasFlag(field: string): boolean {
    // Check Phase 1 flags
    const phase1Flag = this.flaggingResult()?.flags?.some(flag => flag.field === field);
    // Check Phase 3 flags
    const phase3Flag = this.phase3FlaggingResult()?.flags?.some(flag => flag.field === field);
    return phase1Flag || phase3Flag || false;
  }

  getFlagColor(field: string): string {
    // Check Phase 1 flags first
    let flag = this.flaggingResult()?.flags?.find(f => f.field === field);
    // If not found, check Phase 3 flags
    if (!flag) {
      flag = this.phase3FlaggingResult()?.flags?.find(f => f.field === field);
    }
    return flag ? `flag-${flag.severity}` : '';
  }

  getFlagMessage(field: string): string {
    // Check Phase 1 flags first
    let flag = this.flaggingResult()?.flags?.find(f => f.field === field);
    // If not found, check Phase 3 flags
    if (!flag) {
      flag = this.phase3FlaggingResult()?.flags?.find(f => f.field === field);
    }
    return flag?.message || '';
  }

  getFieldDisplayName(field: string): string {
    const fieldNames: { [key: string]: string } = {
      // Phase 1 fields
      'linkedInProfile': 'LinkedIn Profile',
      'companyWebsite': 'Company Website',
      'email': 'Email Domain',
      'founderCount': 'Number of Founders',
      'serviceHistory': 'Military Service',
      'serviceUnit': 'Combat Unit Service',
      'pitchDeck': 'Pitch Deck',
      'grandmaTest': 'Company Description',
      // Phase 3 fields
      'problemCustomer': 'Problem & Customer Description',
      'capacity': 'Team Capacity',
      'previousFounders': 'Previous Co-Founders Left',
      'equityBreakdown': 'Equity Breakdown',
      'isIncorporated': 'Company Incorporation',
      'hasIpAssignment': 'IP Assignment Agreements',
      'hasFounderVesting': 'Founder Vesting',
      'hasBoardStructure': 'Board Structure',
      'willAmendDocuments': 'Will Amend Documents',
      'agreesToIncorporate': 'Agrees to Incorporate',
      'incorporationLocation': 'Incorporation Location'
    };
    return fieldNames[field] || field;
  }

  // Interview management
  async showInterviewerAssignment() {
    try {
      console.log('🔄 Loading interviewers for assignment change...');
      
      // Load available interviewers
      const availableInterviewers = await this.interviewerService.getAllInterviewers();
      
      if (availableInterviewers.length === 0) {
        this.error.set('No interviewers available. Please add at least one interviewer first.');
        return;
      }

      this.interviewers.set(availableInterviewers);
      this.isAdvancingToPhase4.set(false); // This is just changing interviewer, not advancing
      
      // Show interviewer selection modal
      this.showInterviewerSelection.set(true);
      
    } catch (error: any) {
      console.error('❌ Error loading interviewers:', error);
      this.error.set(error.message || 'Failed to load interviewers');
    }
  }

  async loadInterviewerData() {
    try {
      // Load all interviewers for name lookup
      const allInterviewers = await this.interviewerService.getAllInterviewers();
      this.allInterviewers.set(allInterviewers);
      console.log('✅ Loaded interviewers for name lookup:', allInterviewers.length);
    } catch (error) {
      console.error('❌ Error loading interviewer data:', error);
    }
  }

  async loadInterviewData() {
    const applicant = this.applicant();
    if (!applicant?.userId) return;

    try {
      // Ensure interviewers are loaded
      if (this.allInterviewers().length === 0) {
        await this.loadInterviewerData();
      }
      
      const interview = await this.interviewerService.getInterviewByApplicantId(applicant.userId);
      this.interview.set(interview);
      
      if (interview) {
        // Populate forms with existing data
        this.interviewForm.patchValue({
          status: interview.status || InterviewStatus.NOT_YET_SCHEDULED
        });
        
        this.notesForm.patchValue({
          notes: interview.notes || ''
        });
      }
    } catch (error) {
      console.error('Error loading interview data:', error);
    }
  }

  getInterviewerName(): string {
    const applicant = this.applicant();
    if (!applicant?.interviewerId) return 'Not assigned';
    
    // Only use the loaded interviewer data from allInterviewers (loaded on component init)
    const interviewer = this.allInterviewers().find(i => i.id === applicant.interviewerId);
    return interviewer?.name || 'Loading...';
  }

  async saveNotes() {
    const interview = this.interview();
    if (!interview?.id) return;

    try {
      await this.interviewerService.updateInterview(interview.id, {
        notes: this.notesForm.value.notes
      });
      
      // Update local interview data
      const updatedInterview = { ...interview, notes: this.notesForm.value.notes };
      this.interview.set(updatedInterview);
      
      this.notesForm.markAsPristine();
      console.log('✅ Interview notes saved');
    } catch (error) {
      console.error('❌ Error saving notes:', error);
    }
  }

  async updateInterviewStatus() {
    const interview = this.interview();
    if (!interview?.id) return;

    try {
      await this.interviewerService.updateInterview(interview.id, {
        status: this.interviewForm.value.status
      });
      
      // Update local interview data
      const updatedInterview = { ...interview, status: this.interviewForm.value.status };
      this.interview.set(updatedInterview);
      
      this.interviewForm.markAsPristine();
      console.log('✅ Interview status updated');
    } catch (error) {
      console.error('❌ Error updating status:', error);
    }
  }

  showDocumentUrlModal() {
    const interview = this.interview();
    if (interview?.documentUrl) {
      this.documentForm.patchValue({
        documentUrl: interview.documentUrl
      });
    }
    this.showDocumentModal.set(true);
  }

  closeDocumentModal() {
    this.showDocumentModal.set(false);
    this.documentForm.reset();
  }

  async saveDocumentUrl() {
    const interview = this.interview();
    if (!interview?.id) return;

    try {
      const documentUrl = this.documentForm.value.documentUrl;
      await this.interviewerService.updateInterview(interview.id, {
        documentUrl: documentUrl
      });
      
      // Update local interview data
      const updatedInterview = { ...interview, documentUrl: documentUrl };
      this.interview.set(updatedInterview);
      
      this.closeDocumentModal();
      console.log('✅ Document URL saved');
    } catch (error) {
      console.error('❌ Error saving document URL:', error);
    }
  }

  viewDocument() {
    const documentUrl = this.interview()?.documentUrl;
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
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

  async reevaluatePhase3Flags() {
    const phase3App = this.phase3Application();
    const applicant = this.applicant();
    
    if (!phase3App || !applicant) {
      console.error('Phase 3 application or applicant not found');
      return;
    }

    this.isReevaluatingPhase3.set(true);

    try {
      console.log('🔄 Starting Phase 3 flags and OpenAI reevaluation...');

      // 1. Run flagging analysis
      const flaggingResult = await this.flaggingService.analyzePhase3Application(phase3App);
      this.phase3FlaggingResult.set(flaggingResult);
      console.log('✅ Phase 3 flags reevaluated:', flaggingResult);

      // 2. Run OpenAI analysis if problemCustomer field exists
      if (phase3App.productInfo?.problemCustomer) {
        console.log('🤖 Starting OpenAI analysis...');
        
        // Set processing flag first
        const updatedApp = {
          ...phase3App,
          llmAnalysis: {
            problemCustomerScore: phase3App.llmAnalysis?.problemCustomerScore ?? 0,
            isSpecific: phase3App.llmAnalysis?.isSpecific ?? false,
            hasClearTarget: phase3App.llmAnalysis?.hasClearTarget ?? false,
            hasDefinedProblem: phase3App.llmAnalysis?.hasDefinedProblem ?? false,
            feedback: phase3App.llmAnalysis?.feedback ?? '',
            strengths: phase3App.llmAnalysis?.strengths ?? [],
            weaknesses: phase3App.llmAnalysis?.weaknesses ?? [],
            suggestions: phase3App.llmAnalysis?.suggestions ?? [],
            analyzedAt: phase3App.llmAnalysis?.analyzedAt ?? new Date(),
            gradingModel: phase3App.llmAnalysis?.gradingModel ?? 'gpt-5-mini',
            tokenUsage: phase3App.llmAnalysis?.tokenUsage,
            processing: true
          }
        };
        this.phase3Application.set(updatedApp);

        try {
          const analysis = await this.openaiService.analyzeProblemCustomer(phase3App.productInfo.problemCustomer);
          
          // Update application with analysis results
          const finalApp = {
            ...phase3App,
            llmAnalysis: {
              problemCustomerScore: analysis.score,
              isSpecific: analysis.isSpecific,
              hasClearTarget: analysis.hasClearTarget,
              hasDefinedProblem: analysis.hasDefinedProblem,
              feedback: analysis.feedback,
              strengths: analysis.strengths,
              weaknesses: analysis.weaknesses,
              suggestions: analysis.suggestions,
              analyzedAt: new Date(),
              gradingModel: 'gpt-5-mini',
              processing: false
            }
          };

          // Save to database
          await this.applicationService.updatePhase3Application(phase3App.id!, finalApp);
          this.phase3Application.set(finalApp);
          
          console.log('✅ OpenAI analysis completed and saved:', analysis);
        } catch (openaiError) {
          console.error('❌ OpenAI analysis failed:', openaiError);
          
          // Clear processing flag on error
          const errorApp = {
            ...phase3App,
            llmAnalysis: {
              problemCustomerScore: phase3App.llmAnalysis?.problemCustomerScore ?? 0,
              isSpecific: phase3App.llmAnalysis?.isSpecific ?? false,
              hasClearTarget: phase3App.llmAnalysis?.hasClearTarget ?? false,
              hasDefinedProblem: phase3App.llmAnalysis?.hasDefinedProblem ?? false,
              feedback: phase3App.llmAnalysis?.feedback ?? '',
              strengths: phase3App.llmAnalysis?.strengths ?? [],
              weaknesses: phase3App.llmAnalysis?.weaknesses ?? [],
              suggestions: phase3App.llmAnalysis?.suggestions ?? [],
              analyzedAt: phase3App.llmAnalysis?.analyzedAt ?? new Date(),
              gradingModel: phase3App.llmAnalysis?.gradingModel ?? 'gpt-5-mini',
              tokenUsage: phase3App.llmAnalysis?.tokenUsage,
              processing: false
            }
          };
          this.phase3Application.set(errorApp);
        }
      }

      console.log('✅ Phase 3 reevaluation completed');
      
    } catch (error) {
      console.error('❌ Phase 3 reevaluation failed:', error);
      this.error.set('Failed to reevaluate Phase 3 flags and analysis');
    } finally {
      this.isReevaluatingPhase3.set(false);
    }
  }

  async rejectPhase3Application() {
    const applicant = this.applicant();
    
    if (!applicant) {
      console.error('Applicant not found');
      return;
    }

    // Confirm rejection
    const confirmed = confirm(
      `Are you sure you want to reject ${applicant.name}'s Phase 3 application? This will:\n\n` +
      `• Set their status to "rejected"\n` +
      `• Send them a rejection email\n` +
      `• This action cannot be undone\n\n` +
      `Click OK to proceed or Cancel to abort.`
    );

    if (!confirmed) {
      return;
    }

    this.rejectingPhase3.set(true);

    try {
      console.log(`❌ Rejecting Phase 3 application for applicant: ${applicant.userId}`);

      await this.userService.rejectPhase3Application(applicant.userId);

      // Update the local applicant data
      this.applicant.set({
        ...applicant,
        status: 'rejected' as any
      });

      console.log('✅ Phase 3 application rejected successfully');
      
    } catch (error) {
      console.error('❌ Error rejecting Phase 3 application:', error);
      this.error.set('Failed to reject Phase 3 application');
    } finally {
      this.rejectingPhase3.set(false);
    }
  }

  async acceptApplicant() {
    const applicant = this.applicant();
    
    if (!applicant) {
      console.error('Applicant not found');
      return;
    }

    // Confirm acceptance
    const confirmed = confirm(
      `Are you sure you want to accept ${applicant.name} into the program? This will:\n\n` +
      `• Set their status to "ACCEPTED"\n` +
      `• This action can be undone later if needed\n\n` +
      `Click OK to proceed or Cancel to abort.`
    );

    if (!confirmed) {
      return;
    }

    this.isAcceptingApplicant.set(true);
    
    try {
      console.log(`✅ Accepting applicant: ${applicant.userId}`);

      await this.userService.updateUser(applicant.userId, {
        status: ApplicationStatus.ACCEPTED,
        phase: Phase.ACCEPTED
      });

      // Update the local applicant data
      this.applicant.set({
        ...applicant,
        status: ApplicationStatus.ACCEPTED,
        phase: Phase.ACCEPTED
      });

      console.log('✅ Applicant accepted successfully');
      
    } catch (error) {
      console.error('❌ Error accepting applicant:', error);
      this.error.set('Failed to accept applicant');
    } finally {
      this.isAcceptingApplicant.set(false);
    }
  }

  async rejectApplicant() {
    const applicant = this.applicant();
    
    if (!applicant) {
      console.error('Applicant not found');
      return;
    }

    // Confirm rejection
    const confirmed = confirm(
      `Are you sure you want to reject ${applicant.name} at Phase 4? This will:\n\n` +
      `• Set their status to "PHASE_4_REJECTED"\n` +
      `• This action can be undone later if needed\n\n` +
      `Click OK to proceed or Cancel to abort.`
    );

    if (!confirmed) {
      return;
    }

    this.isRejectingApplicant.set(true);
    
    try {
      console.log(`❌ Rejecting applicant at Phase 4: ${applicant.userId}`);

      await this.userService.updateUser(applicant.userId, {
        status: ApplicationStatus.PHASE_4_REJECTED
      });

      // Update the local applicant data
      this.applicant.set({
        ...applicant,
        status: ApplicationStatus.PHASE_4_REJECTED
      });

      console.log('✅ Applicant rejected at Phase 4 successfully');
      
    } catch (error) {
      console.error('❌ Error rejecting applicant:', error);
      this.error.set('Failed to reject applicant');
    } finally {
      this.isRejectingApplicant.set(false);
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

  // Phase 3 application helper methods
  getProductStageDisplay(stage?: string): string {
    const stages: { [key: string]: string } = {
      'LIVE_PAYING': 'Live with paying customers',
      'LIVE_BETA': 'Live with non-paying/beta users',
      'FUNCTIONAL_PROTOTYPE': 'Functional prototype (MVP)',
      'PRE_PROTOTYPE': 'Pre-prototype / Idea stage'
    };
    return stages[stage || ''] || stage || 'Not specified';
  }

  getCapacityDisplay(capacity?: string): string {
    if (capacity === 'ALL_FULLTIME') return 'All full-time';
    if (capacity === 'OTHER') return 'Other';
    return capacity || 'Not specified';
  }

  getBooleanDisplay(value?: boolean): string {
    if (value === true) return 'Yes';
    if (value === false) return 'No';
    return 'Not specified';
  }

  getIncorporationAgreementDisplay(agreement?: string): string {
    if (agreement === 'AGREE') return 'Agrees to incorporate as Delaware C-Corp';
    if (agreement === 'DISCUSS') return 'Would like to discuss alternative structures';
    return agreement || 'Not specified';
  }

  getEquityCategoryDisplay(category: string): string {
    const categories: { [key: string]: string } = {
      'founder': 'Founder',
      'employee': 'Employee',
      'investor': 'Investor',
      'total': 'Total',
      'grandTotal': 'Grand Total'
    };
    return categories[category] || category;
  }

  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  formatDate(date?: Date): string {
    if (!date) return 'Not available';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  }

  getEquityBreakdown(): any[] {
    return this.phase3Application()?.fundingInfo?.equityBreakdown || [];
  }

  /**
   * Get CSS class for OpenAI analysis score display
   */
  getAnalysisScoreClass(score: number): string {
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  // Rating and Assignment methods
  toggleRatingDropdown(applicantId?: string): void {
    if (!applicantId) return;
    if (this.activeRatingDropdown() === applicantId) {
      this.activeRatingDropdown.set(null); // Close if same dropdown
    } else {
      this.activeRatingDropdown.set(applicantId); // Open this dropdown
    }
  }

  toggleAssignedDropdown(applicantId?: string): void {
    if (!applicantId) return;
    if (this.activeAssignedDropdown() === applicantId) {
      this.activeAssignedDropdown.set(null); // Close if same dropdown
    } else {
      this.activeAssignedDropdown.set(applicantId); // Open this dropdown
    }
  }

  async setApplicantRating(applicant: ApplicantUser, rating: number | null): Promise<void> {
    try {
      await this.userService.updateUser(applicant.userId, { rating });
      
      // Update local state
      this.applicant.set({ ...applicant, rating });
      
      // Close dropdown
      this.activeRatingDropdown.set(null);
      
      console.log(`✅ Updated rating for ${applicant.name} to ${rating || 'no rating'}`);
    } catch (error) {
      console.error('❌ Error updating rating:', error);
      // Keep dropdown open on error so user can try again
    }
  }

  async setApplicantAssignment(applicant: ApplicantUser, assignedTo: string | null): Promise<void> {
    try {
      await this.userService.updateUser(applicant.userId, { assignedTo });
      
      // Update local state
      this.applicant.set({ ...applicant, assignedTo });
      
      // Close dropdown
      this.activeAssignedDropdown.set(null);
      
      console.log(`✅ Updated assignment for ${applicant.name} to ${this.getAssignedDisplay(assignedTo)}`);
    } catch (error) {
      console.error('❌ Error updating assignment:', error);
      // Keep dropdown open on error so user can try again
    }
  }

  getRatingDisplay(rating: number | null | undefined): string {
    if (rating === null || rating === undefined) return '—';
    switch (rating) {
      case 1: return '1';
      case 2: return '2';
      case 3: return '3';
      default: return '—';
    }
  }

  getAssignedDisplay(assignedTo: string | null | undefined): string {
    if (!assignedTo) return 'None';
    const admin = this.adminUsers().find(admin => admin.userId === assignedTo);
    return admin?.name || 'Unknown';
  }
}