import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, AbstractControl, ValidationErrors } from '@angular/forms';
import { ApplicantUser, Phase3Application, EquityBreakdownRow, Phase, ApplicationStatus } from '../../../models';
import { ApplicationService } from '../../../services/application.service';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { OpenAIService } from '../../../services/openai.service';
import { StorageService } from '../../../services/storage.service';
import { EmailService } from '../../../services/email.service';
import { APP_CONSTANTS } from '../../../constants';
import { EquityTableComponent } from './equity-table.component';
import { Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

@Component({
  selector: 'app-phase3-application-tabbed',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EquityTableComponent],
  template: `
    <!-- Loading Overlay Popup -->
    <div *ngIf="isSubmitting" class="loading-overlay">
      <div class="loading-popup">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <h3>Submitting Your Application</h3>
        <p>Please wait while we process your submission...</p>
        <div class="loading-steps">
          <div class="step" [class.active]="true">
            <i class="fas fa-check"></i> Saving application data
          </div>
          <div class="step" [class.active]="submissionProgress >= 2">
            <i class="fas fa-check"></i> Updating your status
          </div>
          <div class="step" [class.active]="submissionProgress >= 3">
            <i class="fas fa-check"></i> Sending confirmation email
          </div>
          <div class="step" [class.active]="submissionProgress >= 4">
            <i class="fas fa-check"></i> Application submitted successfully!
          </div>
          <div class="step" [class.active]="submissionProgress >= 5">
            <i class="fas fa-check"></i> Directing to DashBoard
          </div>
        </div>

      </div>
    </div>

    <div class="phase3-container">
      <!-- Blue Header with Logo -->
      <header class="app-header">
        <div class="header-content">
          <div class="header-left">
            <img src="/images/logo.png" alt="Vetted Accelerator" class="logo">
            <div class="header-info">
              <h1>In-Depth Application</h1>
              <p>{{ applicant?.name }}</p>
            </div>
          </div>
          <div class="header-right">
          </div>
        </div>
      </header>

      <!-- Progress Section with Gamification -->
      <section class="progress-section">
        <div class="progress-container">

          <div class="tab-navigation">
            <button
              *ngFor="let title of tabTitles; let i = index"
              class="tab-button"
              [class.active]="currentTab === i"
              (click)="switchTab(i)"
              [disabled]="i > currentTab + 1">
              <div class="tab-number">{{ i + 1 }}</div>
              <span class="tab-title">{{ title }}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Main Content with Tabs -->
      <main class="main-content">
        <!-- Field Legend -->
        <div *ngIf="!isLoading" class="field-legend">
          <div class="legend-item">
            <span class="legend-required">
              <span class="required-asterisk">*</span> Required field
            </span>
          </div>
          <div class="legend-item">
            <span class="legend-optional">
              <span class="optional-label">(Optional)</span> Optional field
            </span>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading your application...</p>
        </div>

        <!-- Success/Error Messages -->
        <div *ngIf="successMessage" class="alert alert-success">
          <i class="fas fa-check-circle"></i>
          {{ successMessage }}
        </div>

        <div *ngIf="errorMessage" class="alert alert-error">
          <i class="fas fa-exclamation-circle"></i>
          {{ errorMessage }}
        </div>

        <!-- Tabbed Form Content -->
        <div *ngIf="!isLoading" class="tab-content">
          <form [formGroup]="applicationForm" class="application-form">

            <!-- Tab 1: Product & Traction -->
            <div *ngIf="currentTab === 0" class="tab-panel active">
              <div class="tab-header">
                <h3><i class="fas fa-rocket"></i> Product & Traction</h3>
                <p>Tell us about your product and market traction</p>
              </div>

              <!-- Product Stage -->
              <div class="form-group">
                <label class="form-label required">Product Stage: How far along are you in building the service or product? <span class="required-asterisk">*</span></label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input
                      type="radio"
                      [checked]="applicationForm.get('productStage')?.value === 'LIVE_PAYING'"
                      (click)="toggleRadioButton('productStage', 'LIVE_PAYING')">
                    <span class="checkmark"></span>
                    Live with paying customers
                  </label>
                  <label class="radio-option">
                    <input
                      type="radio"
                      [checked]="applicationForm.get('productStage')?.value === 'LIVE_BETA'"
                      (click)="toggleRadioButton('productStage', 'LIVE_BETA')">
                    <span class="checkmark"></span>
                    Live with non-paying/beta users
                  </label>
                  <label class="radio-option">
                    <input
                      type="radio"
                      [checked]="applicationForm.get('productStage')?.value === 'FUNCTIONAL_PROTOTYPE'"
                      (click)="toggleRadioButton('productStage', 'FUNCTIONAL_PROTOTYPE')">
                    <span class="checkmark"></span>
                    Functional prototype (MVP)
                  </label>
                  <label class="radio-option">
                    <input
                      type="radio"
                      [checked]="applicationForm.get('productStage')?.value === 'PRE_PROTOTYPE'"
                      (click)="toggleRadioButton('productStage', 'PRE_PROTOTYPE')">
                    <span class="checkmark"></span>
                    Pre-prototype / Idea stage
                  </label>
                </div>
              </div>

              <!-- Traction Details -->
              <div class="form-group">
                <label for="tractionDetails" class="form-label required">
                  Traction Details: Describe the traction above. For example 100 unpaid users within 3 months of beta launch / five paying customers with average ACV of $20K/year/ launching MVP in Q3 of this year. <span class="required-asterisk">*</span>
                </label>
                <textarea
                  id="tractionDetails"
                  formControlName="tractionDetails"
                  rows="4"
                  class="form-textarea"
                  maxlength="3000"
                  placeholder="..."></textarea>
                <div class="word-count">
                  {{ getWordCount('tractionDetails') }}/300 words
                </div>
              </div>

              <!-- Problem & Customer -->
              <div class="form-group">
                <label for="problemCustomer" class="form-label required">
                  Problem & Customer: Who is the exact person you're helping, and what problem do they face? Be specific — not just a company or age group, but a real role or situation. (Example: "New moms recovering from childbirth who struggle to find time for healthy meals" or "Office managers at small law firms who waste hours ordering supplies.") <span class="required-asterisk">*</span>
                </label>
                <textarea
                  id="problemCustomer"
                  formControlName="problemCustomer"
                  rows="4"
                  class="form-textarea"
                  maxlength="3000"
                  placeholder="Describe the specific person and problem you're solving..."></textarea>
                <div class="word-count">
                  {{ getWordCount('problemCustomer') }}/300 words
                </div>
              </div>

              <!-- Company Deck Upload -->
              <div class="form-group">
                <div class="deck-upload-section">
                  <label class="form-label" [class.required]="!hasP1Deck" [class.optional]="hasP1Deck">
                    Upload Company Deck
                    <span *ngIf="!hasP1Deck" class="required-asterisk">*</span>
                    <span *ngIf="hasP1Deck" class="optional-label">(Optional - You may refine your deck)</span>
                  </label>
                  <div class="deck-requirement-text">
                    <p>{{ getDeckRequirementText() }}</p>
                  </div>

                  @if (!getSelectedDeckFile() && !getUploadedDeckUrl()) {
                    <div class="upload-area" (click)="deckFileInput.click()">
                      <i class="fas fa-cloud-upload-alt"></i>
                      <p>Upload your company deck (PDF only)</p>
                      <p class="upload-note">Max 10MB</p>
                    </div>
                  }
                  <input #deckFileInput type="file" accept=".pdf" (change)="onDeckFileSelect($event)" style="display: none;">

                  @if (getIsDeckUploading()) {
                    <div class="file-preview uploading">
                      <i class="fas fa-spinner fa-spin"></i>
                      <span>Uploading {{ getSelectedDeckFile()?.name }}...</span>
                    </div>
                  } @else if (getUploadedDeckUrl() && getSelectedDeckFile()) {
                    <div class="file-preview uploaded">
                      <i class="fas fa-file-pdf"></i>
                      <span>{{ getSelectedDeckFile()?.name }} (Uploaded)</span>
                      <button type="button" class="remove-file" (click)="removeDeckFile()">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  }
                </div>
              </div>

              <!-- Video Pitch -->
              <div class="form-group">
                <label for="videoPitch" class="form-label required">
                  Video Pitch: Please provide a link to a 1-2 minute unlisted YouTube video where the founding team introduces themselves and what you're building, or any URL of a publicly visible video. <span class="required-asterisk">*</span>
                </label>
                <input
                  type="url"
                  id="videoPitch"
                  formControlName="videoPitch"
                  class="form-input"
                  [class.invalid-url]="showUrlError"
                  placeholder="https://www.youtube.com/..."
                  (paste)="onVideoPitchPaste($event)"
                  (input)="onVideoPitchInput($event)"
                  (blur)="onVideoPitchBlur()"
                  required>
                <div *ngIf="showUrlError" class="url-error-message">
                  URL only
                </div>
              </div>
            </div>

            <!-- Tab 2: Team -->
            <div *ngIf="currentTab === 1" class="tab-panel active">
              <div class="tab-header">
                <h3><i class="fas fa-users"></i> Team</h3>
                <p>Information about your founding team and key members</p>
              </div>

              <!-- Co-Founders -->
              <div class="form-group">
                <label for="coFounders" class="form-label required">
                  Co-Founders: Please list all co-founders, their roles, and a link to their LinkedIn profiles. <span class="required-asterisk">*</span>
                </label>
                <textarea
                  id="coFounders"
                  formControlName="coFounders"
                  rows="4"
                  class="form-textarea"
                  maxlength="3000"
                  placeholder="List each co-founder with their role and LinkedIn profile..."></textarea>
                <div class="word-count">
                  {{ getWordCount('coFounders') }}/300 words
                </div>
              </div>

              <!-- Capacity -->
              <div class="form-group">
                <label class="form-label required">Capacity: What are you and your co-founders current capacity? <span class="required-asterisk">*</span></label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input
                      type="radio"
                      [checked]="applicationForm.get('capacity')?.value === 'ALL_FULLTIME'"
                      (click)="toggleRadioButton('capacity', 'ALL_FULLTIME')">
                    <span class="checkmark"></span>
                    All full-time
                  </label>
                  <label class="radio-option">
                    <input
                      type="radio"
                      [checked]="applicationForm.get('capacity')?.value === 'OTHER'"
                      (click)="toggleRadioButton('capacity', 'OTHER')">
                    <span class="checkmark"></span>
                    Other
                  </label>
                </div>

                <!-- Conditional text input when "Other" is selected -->
                <div *ngIf="applicationForm.get('capacity')?.value === 'OTHER'" class="conditional-field">
                  <label for="capacityOther" class="form-label">
                    Please explain:
                  </label>
                  <textarea
                    id="capacityOther"
                    formControlName="capacityOther"
                    rows="3"
                    class="form-textarea"
                    maxlength="1000"
                    placeholder="Explain the current capacity of you and your co-founders..."
                    required></textarea>
                </div>
              </div>

              <!-- Previous Collaboration -->
              <div class="form-group">
                <label class="form-label required">Have any team members worked together before? <span class="required-asterisk">*</span></label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input
                      type="radio"
                      [checked]="applicationForm.get('hasPreviousCollaboration')?.value === 'true'"
                      (click)="toggleRadioButton('hasPreviousCollaboration', 'true')">
                    <span class="checkmark"></span>
                    Yes
                  </label>
                  <label class="radio-option">
                    <input
                      type="radio"
                      [checked]="applicationForm.get('hasPreviousCollaboration')?.value === 'false'"
                      (click)="toggleRadioButton('hasPreviousCollaboration', 'false')">
                    <span class="checkmark"></span>
                    No
                  </label>
                </div>

                <!-- Conditional explanation when "Yes" is selected -->
                <div *ngIf="applicationForm.get('hasPreviousCollaboration')?.value === 'true'" class="conditional-field">
                  <label for="previousCollaboration" class="form-label">
                    Briefly tell us about your previous working relationships with your co-founders.
                  </label>
                  <textarea
                    id="previousCollaboration"
                    formControlName="previousCollaboration"
                    rows="3"
                    class="form-textarea"
                    maxlength="3000"
                    placeholder="Describe the previous working relationships..."
                    required></textarea>
                  <div class="word-count">
                    {{ getWordCount('previousCollaboration') }}/300 words
                  </div>
                </div>
              </div>

              <!-- Previous Founders -->
              <div class="form-group">
                <label class="form-label required">Previous Founders: Have you had any co-founders who are no longer with the company? <span class="required-asterisk">*</span></label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input
                      type="radio"
                      [checked]="applicationForm.get('previousFounders')?.value === 'true'"
                      (click)="toggleRadioButton('previousFounders', 'true')">
                    <span class="checkmark"></span>
                    Yes
                  </label>
                  <label class="radio-option">
                    <input
                      type="radio"
                      [checked]="applicationForm.get('previousFounders')?.value === 'false'"
                      (click)="toggleRadioButton('previousFounders', 'false')">
                    <span class="checkmark"></span>
                    No
                  </label>
                </div>

                <!-- Conditional explanation when "Yes" is selected -->
                <div *ngIf="applicationForm.get('previousFounders')?.value === 'true'" class="conditional-field">
                  <label for="previousFoundersExplanation" class="form-label">
                    Briefly explain the circumstances of their departure and any severance or equity agreements that were made.
                  </label>
                  <textarea
                    id="previousFoundersExplanation"
                    formControlName="previousFoundersExplanation"
                    rows="3"
                    class="form-textarea"
                    maxlength="3000"
                    placeholder="Explain the circumstances of departure and any severance agreements..."
                    required></textarea>
                </div>
              </div>

              <!-- Equity Split & Roles -->
              <div class="form-group">
                <label for="equitySplitRoles" class="form-label required">
                  Equity Split + Roles: Please briefly describe how you decided on the equity split between the founders and on the role each one would have. <span class="required-asterisk">*</span>
                </label>
                <textarea
                  id="equitySplitRoles"
                  formControlName="equitySplitRoles"
                  rows="4"
                  class="form-textarea"
                  maxlength="3000"
                  placeholder="Describe the decision process for equity distribution and role assignments..."></textarea>
                <div class="word-count">
                  {{ getWordCount('equitySplitRoles') }}/300 words
                </div>
              </div>

              <!-- Additional Team Members -->
              <div class="form-group">
                <label for="additionalTeamMembers" class="form-label optional">
                  Additional team members who are not founders: List the roles <span class="optional-label">(Optional)</span>
                </label>
                <textarea
                  id="additionalTeamMembers"
                  formControlName="additionalTeamMembers"
                  rows="3"
                  class="form-textarea"
                  maxlength="3000"
                  placeholder="List non-founder team members and their roles..."></textarea>
              </div>
            </div>

            <!-- Tab 3: Funding -->
            <div *ngIf="currentTab === 2" class="tab-panel active">
              <div class="tab-header">
                <h3><i class="fas fa-dollar-sign"></i> Funding</h3>
                <p>Your funding history and equity structure</p>
              </div>

              <!-- Has Raised Capital -->
              <div class="form-group">
                <label class="form-label required">Funding History: Have you raised any capital to date? <span class="required-asterisk">*</span></label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input
                      type="radio"
                      [checked]="applicationForm.get('hasRaisedCapital')?.value === 'true'"
                      (click)="toggleRadioButton('hasRaisedCapital', 'true')">
                    <span class="checkmark"></span>
                    Yes
                  </label>
                  <label class="radio-option">
                    <input
                      type="radio"
                      [checked]="applicationForm.get('hasRaisedCapital')?.value === 'false'"
                      (click)="toggleRadioButton('hasRaisedCapital', 'false')">
                    <span class="checkmark"></span>
                    No
                  </label>
                </div>

                <!-- Conditional funding details when "Yes" is selected -->
                <div *ngIf="applicationForm.get('hasRaisedCapital')?.value === 'true'" class="conditional-field">
                  <label for="fundingDetails" class="form-label">
                    What is the total amount of capital you have raised to date and on what terms (e.g. $150K on a post-money safe with a $XM cap)?
                  </label>
                  <textarea
                    id="fundingDetails"
                    formControlName="fundingDetails"
                    rows="4"
                    class="form-textarea"
                    maxlength="3000"
                    placeholder="e.g. $150K on a post-money safe with a $XM cap"
                    required></textarea>
                  <div class="word-count">
                    {{ getWordCount('fundingDetails') }}/300 words
                  </div>
                </div>
              </div>

              <!-- Equity Breakdown Table -->
              <div class="form-group">
                <label class="form-label required">Equity Breakdown: Please provide a simple CAP table or equity breakdown <span class="required-asterisk">*</span></label>
                <app-equity-table
                  [equityRows]="equityRows"
                  (rowsChanged)="onEquityRowsChanged($event)">
                </app-equity-table>
              </div>
            </div>

            <!-- Tab 4: Legal & Corporate Structure -->
            <div *ngIf="currentTab === 3" class="tab-panel active">
              <div class="tab-header">
                <h3><i class="fas fa-balance-scale"></i> Part 4: Legal & Corporate Structure</h3>
                <p>Ensuring your company is set up for venture-scale success is a core part of the Vetted program. Please answer the following questions honestly.</p>
              </div>

              <!-- Question 1: Is Incorporated -->
              <div class="form-group">
                <label class="form-label required">Is your company incorporated? <span class="required-asterisk">*</span></label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input
                      type="radio"
                      [checked]="applicationForm.get('isIncorporated')?.value === 'true'"
                      (click)="toggleRadioButton('isIncorporated', 'true')">
                    <span class="checkmark"></span>
                    Yes
                  </label>
                  <label class="radio-option">
                    <input
                      type="radio"
                      [checked]="applicationForm.get('isIncorporated')?.value === 'false'"
                      (click)="toggleRadioButton('isIncorporated', 'false')">
                    <span class="checkmark"></span>
                    No
                  </label>
                </div>
              </div>

              <!-- If Yes - Incorporation Location -->
              <div *ngIf="applicationForm.get('isIncorporated')?.value === 'true'" class="conditional-field">
                <div class="form-group">
                  <label for="incorporationLocation" class="form-label">
                    Country & State/Province of Incorporation:
                  </label>
                  <input
                    type="text"
                    id="incorporationLocation"
                    formControlName="incorporationLocation"
                    class="form-input"
                    maxlength="200"
                    placeholder="e.g., Delaware, USA or Ontario, Canada"
                    required>
                </div>

                <!-- Question 2: Corporate Structure Components -->
                <div class="form-group">
                  <label class="form-label">
                    Does your current corporate structure include all of the following?
                  </label>

                  <!-- IP Assignment -->
                  <div class="sub-question">
                    <label class="form-label">IP Assignment (All IP developed by founders/employees has been assigned to the company by an IP Assignment agreement):</label>
                    <div class="radio-group">
                      <label class="radio-option">
                        <input
                          type="radio"
                          [checked]="applicationForm.get('hasIpAssignment')?.value === 'true'"
                          (click)="toggleRadioButton('hasIpAssignment', 'true')">
                        <span class="checkmark"></span>
                        Yes
                      </label>
                      <label class="radio-option">
                        <input
                          type="radio"
                          [checked]="applicationForm.get('hasIpAssignment')?.value === 'false'"
                          (click)="toggleRadioButton('hasIpAssignment', 'false')">
                        <span class="checkmark"></span>
                        No
                      </label>
                    </div>
                  </div>

                  <!-- Founder Vesting -->
                  <div class="sub-question">
                    <label class="form-label">Founder Shares: There are vesting schedules for all founders:</label>
                    <div class="radio-group">
                      <label class="radio-option">
                        <input
                          type="radio"
                          [checked]="applicationForm.get('hasFounderVesting')?.value === 'true'"
                          (click)="toggleRadioButton('hasFounderVesting', 'true')">
                        <span class="checkmark"></span>
                        Yes
                      </label>
                      <label class="radio-option">
                        <input
                          type="radio"
                          [checked]="applicationForm.get('hasFounderVesting')?.value === 'false'"
                          (click)="toggleRadioButton('hasFounderVesting', 'false')">
                        <span class="checkmark"></span>
                        No
                      </label>
                    </div>
                  </div>

                  <!-- Board Structure -->
                  <div class="sub-question">
                    <label class="form-label">Founder Board Seats: Founder Board seats are tied to employment/service with the company?:</label>
                    <div class="radio-group">
                      <label class="radio-option">
                        <input
                          type="radio"
                          [checked]="applicationForm.get('hasBoardStructure')?.value === 'true'"
                          (click)="toggleRadioButton('hasBoardStructure', 'true')">
                        <span class="checkmark"></span>
                        Yes
                      </label>
                      <label class="radio-option">
                        <input
                          type="radio"
                          [checked]="applicationForm.get('hasBoardStructure')?.value === 'false'"
                          (click)="toggleRadioButton('hasBoardStructure', 'false')">
                        <span class="checkmark"></span>
                        No
                      </label>
                    </div>
                  </div>
                </div>

                <!-- Question 3: Amendment Willingness (only show if any structure item is missing) -->
                <div *ngIf="showAmendmentQuestion()" class="form-group">
                  <label class="form-label">
                    Are you open to amending your corporate documents to include these standard venture terms?
                  </label>
                  <div class="radio-group">
                    <label class="radio-option">
                      <input
                        type="radio"
                        [checked]="applicationForm.get('willAmendDocuments')?.value === 'true'"
                        (click)="toggleRadioButton('willAmendDocuments', 'true')">
                      <span class="checkmark"></span>
                      Yes
                    </label>
                    <label class="radio-option">
                      <input
                        type="radio"
                        [checked]="applicationForm.get('willAmendDocuments')?.value === 'false'"
                        (click)="toggleRadioButton('willAmendDocuments', 'false')">
                      <span class="checkmark"></span>
                      No, please explain:
                    </label>
                  </div>

                  <!-- Amendment Explanation -->
                  <div *ngIf="applicationForm.get('willAmendDocuments')?.value === 'false'" class="conditional-field">
                    <textarea
                      id="amendDocumentsExplanation"
                      formControlName="amendDocumentsExplanation"
                      rows="3"
                      class="form-textarea"
                      maxlength="2000"
                      placeholder="Please explain why..."
                      required></textarea>
                  </div>
                </div>
              </div>

              <!-- Question 4: Not Incorporated Section -->
              <div *ngIf="applicationForm.get('isIncorporated')?.value === 'false'" class="conditional-section">
                <div class="form-group">
                  <label class="form-label">
                    Do you agree to sign a side letter obligating you to incorporate with the standard venture terms listed above (IP Assignment, Vesting, Board Structure) prior to the start of the program?
                  </label>
                  <div class="radio-group">
                    <label class="radio-option">
                      <input
                        type="radio"
                        [checked]="applicationForm.get('agreesToIncorporate')?.value === 'AGREE'"
                        (click)="toggleRadioButton('agreesToIncorporate', 'AGREE')">
                      <span class="checkmark"></span>
                      I agree.
                    </label>
                    <label class="radio-option">
                      <input
                        type="radio"
                        [checked]="applicationForm.get('agreesToIncorporate')?.value === 'DISCUSS'"
                        (click)="toggleRadioButton('agreesToIncorporate', 'DISCUSS')">
                      <span class="checkmark"></span>
                      I would like to discuss this further.
                    </label>
                  </div>
                </div>
              </div>
            </div>

          </form>

          <!-- Tab Navigation -->
          <div class="tab-navigation-bottom">
            <button
              type="button"
              class="nav-btn secondary"
              (click)="previousTab()"
              [disabled]="currentTab === 0">
              <i class="fas fa-chevron-left"></i>
              Previous
            </button>

            <div class="tab-indicator">
              {{ currentTab + 1 }} of {{ totalTabs }}
            </div>

            <button
              *ngIf="currentTab < totalTabs - 1"
              type="button"
              class="nav-btn primary"
              (click)="nextTab()"
              [disabled]="!canProceedToNext()">
              Next
              <i class="fas fa-chevron-right"></i>
            </button>

            <div
              *ngIf="currentTab === totalTabs - 1"
              class="submit-button-container"
              [class.has-tooltip]="!applicationForm.valid && !isSubmitting">
              <!-- Debug Button (Temporary) - Uncomment if needed for debugging -->
              <!--
              <button
                type="button"
                class="nav-btn debug-btn"
                (click)="checkValidationErrors()"
                style="background: #f59e0b; margin-right: 10px;">
                <i class="fas fa-bug"></i>
                Check Errors
              </button>
              -->

              <button
                type="button"
                class="nav-btn success"
                (click)="submitApplication()"
                [disabled]="isSubmitting || !applicationForm.valid">
                <i *ngIf="isSubmitting" class="fas fa-spinner fa-spin"></i>
                <i *ngIf="!isSubmitting" class="fas fa-paper-plane"></i>
                {{ isSubmitting ? 'Submitting...' : 'Submit Application' }}
              </button>
              <div
                *ngIf="!applicationForm.valid && !isSubmitting"
                class="submit-tooltip"
                [innerHTML]="getSubmitButtonTooltip()">
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="app-footer">
        <div class="footer-content">
          <div class="footer-left">
            <p>&copy; 2025 Vetted Accelerator. All rights reserved.</p>
          </div>
          <div class="footer-right">
            <button type="button" class="save-draft-btn" (click)="saveDraft()" [disabled]="isSaving">
              <i *ngIf="isSaving" class="fas fa-spinner fa-spin"></i>
              <i *ngIf="!isSaving" class="fas fa-save"></i>
              {{ isSaving ? 'Saving...' : 'Save Draft' }}
            </button>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    /* Loading Overlay */
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease-in-out;
    }

    .loading-popup {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease-in-out;
    }

    .loading-spinner {
      margin-bottom: 1rem;
    }

    .loading-spinner i {
      font-size: 3rem;
      color: #1e40af;
      animation: spin 1s linear infinite;
    }

    .loading-popup h3 {
      margin: 0 0 0.5rem 0;
      color: #1e40af;
      font-size: 1.25rem;
    }

    .loading-popup p {
      margin: 0 0 1.5rem 0;
      color: #6b7280;
    }

    .loading-steps {
      text-align: left;
      margin-top: 1.5rem;
    }

    .step {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0;
      color: #9ca3af;
      transition: color 0.3s ease;
    }

    .step.active {
      color: #10b981;
    }

    .step i {
      width: 16px;
      font-size: 0.875rem;
    }

    .redirect-button {
      background: #1e40af;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 1.5rem auto 0;
      transition: all 0.2s ease;
      animation: slideIn 0.3s ease-in-out;
    }

    .redirect-button:hover {
      background: #1e40af;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* AI Analysis Styles */
    .analysis-loading {
      text-align: center;
      padding: 3rem;
      color: #6b7280;
    }

    .analysis-loading .loading-spinner {
      margin-bottom: 1rem;
    }

    .analysis-loading .loading-spinner i {
      font-size: 3rem;
      color: #1e40af;
    }

    .analysis-error {
      text-align: center;
      padding: 3rem;
      color: #dc2626;
    }

    .analysis-error .error-icon i {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .retry-button {
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.75rem 1.5rem;
      margin-top: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-left: auto;
      margin-right: auto;
    }

    .retry-button:hover {
      background: #b91c1c;
    }

    .analysis-results {
      max-width: none;
    }

    .analysis-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid #e5e7eb;
    }

    .analysis-section h4 {
      color: #1e40af;
      margin: 0 0 1rem 0;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .analysis-section h5 {
      color: #374151;
      margin: 1rem 0 0.5rem 0;
      font-size: 1rem;
    }

    .analysis-content {
      line-height: 1.6;
    }

    .metric {
      display: flex;
      flex-direction: column;
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: #f8fafc;
      border-radius: 6px;
    }

    .metric label {
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.25rem;
    }

    .metric span {
      color: #6b7280;
    }

    .competitors-group {
      margin-bottom: 1.5rem;
    }

    .competitor {
      background: #f8fafc;
      border-radius: 6px;
      padding: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .competitor strong {
      color: #1e40af;
      display: block;
      margin-bottom: 0.25rem;
    }

    .competitor p {
      margin: 0;
      color: #6b7280;
      font-size: 0.9rem;
    }

    .differentiator {
      background: #f0f9ff;
      border: 1px solid #0ea5e9;
      border-radius: 8px;
      padding: 1rem;
    }

    .differentiator p {
      margin: 0;
      color: #0c4a6e;
    }

    .investment-thesis {
      background: #f0fdf4;
      border: 1px solid #22c55e;
      border-radius: 8px;
      padding: 1rem;
    }

    .investment-thesis label {
      font-weight: 600;
      color: #166534;
      display: block;
      margin-bottom: 0.5rem;
    }

    .investment-thesis p {
      margin: 0;
      color: #166534;
      font-size: 1rem;
    }

    .analysis-placeholder {
      text-align: center;
      padding: 4rem 2rem;
      color: #6b7280;
    }

    .analysis-placeholder .placeholder-icon i {
      font-size: 4rem;
      color: #d1d5db;
      margin-bottom: 1rem;
    }

    .analysis-placeholder h4 {
      margin: 0 0 0.5rem 0;
      color: #374151;
    }

    .phase3-container {
      min-height: 100vh;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Blue Header */
    .app-header {
      background: #1e40af;
      color: white;
      padding: 1.5rem 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 2rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .logo {
      height: 48px;
      width: auto;
      filter: brightness(0) invert(1);
    }

    .header-info h1 {
      margin: 0 0 0.25rem 0;
      font-size: 1.4rem;
      font-weight: 600;
    }

    .header-info p {
      margin: 0;
      opacity: 0.85;
      font-size: 0.85rem;
      font-weight: 400;
    }

    .progress-summary {
      text-align: right;
    }

    .progress-text {
      font-weight: 600;
      font-size: 0.9rem;
    }


    /* Progress Section */
    .progress-section {
      background: white;
      border-bottom: 1px solid #e5e7eb;
      padding: 2rem 0;
    }

    .progress-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
    }


    .tab-navigation {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .tab-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem 1.5rem;
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      color: #374151;
      position: relative;
      min-width: 160px;
    }

    .tab-button:hover:not(:disabled) {
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
    }

    .tab-button.active {
      background: #667eea;
      border-color: #667eea;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .tab-button.completed {
      border-color: #10b981;
      background: #f0fdf4;
    }

    .tab-button.completed .tab-number {
      background: #10b981;
      color: white;
    }

    .tab-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .tab-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e5e7eb;
      color: #6b7280;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }

    .tab-button.active .tab-number {
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .tab-title {
      font-size: 0.85rem;
      font-weight: 500;
      text-align: center;
      line-height: 1.3;
    }

    .tab-check {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      color: #10b981;
      font-size: 0.8rem;
    }

    /* Main Content */
    .main-content {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Field Legend */
    .field-legend {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
      display: flex;
      gap: 2rem;
      font-size: 0.9rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
    }

    .legend-required,
    .legend-optional {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-weight: 500;
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

    .alert {
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .alert-success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }

    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
    }

    .tab-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .application-form {
      padding: 0;
    }

    .tab-panel {
      padding: 2rem;
    }

    .tab-header {
      margin-bottom: 2rem;
      text-align: center;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 1.5rem;
    }

    .tab-header h3 {
      margin: 0 0 0.5rem 0;
      color: #1f2937;
      font-size: 1.5rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .tab-header p {
      margin: 0;
      color: #6b7280;
      font-size: 1rem;
    }

    .form-group {
      margin-bottom: 2rem;
    }

    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      color: #374151;
      font-weight: 500;
      font-size: 0.95rem;
    }

    .form-label.required {
      position: relative;
    }

    .form-label.optional {
      color: #6b7280;
    }

    .required-asterisk {
      color: #ef4444;
      font-weight: 700;
      margin-left: 0.25rem;
      font-size: 1rem;
    }

    .optional-label {
      color: #6b7280;
      font-weight: 400;
      font-size: 0.85em;
      font-style: italic;
    }

    .form-input, .form-textarea {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s ease;
      font-family: inherit;
    }

    .form-input:focus, .form-textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    /* Validation States */
    .form-input.ng-invalid.ng-touched,
    .form-textarea.ng-invalid.ng-touched {
      border-color: #ef4444;
      background-color: #fef2f2;
    }

    .form-input.ng-invalid.ng-touched:focus,
    .form-textarea.ng-invalid.ng-touched:focus {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }

    .form-input.ng-valid.ng-touched,
    .form-textarea.ng-valid.ng-touched {
      border-color: #10b981;
    }

    /* Required field indicator for empty required fields */
    .form-group.has-error .form-input,
    .form-group.has-error .form-textarea {
      border-color: #fbbf24;
      background-color: #fffbeb;
    }

    .form-group.has-error .form-label.required::after {
      content: ' (Required)';
      color: #f59e0b;
      font-weight: 400;
      font-size: 0.85em;
    }

    /* Real-time URL validation styling */
    .form-input.invalid-url {
      border-color: #ef4444;
      background-color: #fef2f2;
    }

    .url-error-message {
      margin-top: 0.25rem;
      color: #ef4444;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .form-textarea {
      resize: vertical;
    }

    .word-count {
      text-align: right;
      font-size: 0.8rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }

    .radio-group, .checkbox-group {
      display: grid;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .radio-option, .checkbox-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      padding: 0.75rem;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .radio-option:hover, .checkbox-option:hover {
      border-color: #d1d5db;
      background: #f9fafb;
    }

    .radio-option input[type="radio"]:checked + .checkmark,
    .radio-option:has(input[type="radio"]:checked) {
      border-color: #667eea;
      background: #f0f4ff;
    }

    .radio-option input[type="radio"], .checkbox-option input[type="checkbox"] {
      margin: 0;
      accent-color: #667eea;
    }

    /* Required radio group styling */
    .form-group.required-radio .radio-group {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 0.5rem;
    }

    .form-group.required-radio.has-error .radio-group {
      border-color: #fbbf24;
      background: #fffbeb;
    }

    .conditional-section {
      margin-top: 1.5rem;
      padding-left: 1rem;
      border-left: 3px solid #e5e7eb;
    }

    .conditional-field {
      margin-top: 1rem;
      padding-left: 1rem;
    }


    .sub-question {
      margin: 1rem 0;
      padding: 1rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    .sub-question .form-label {
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .venture-terms-section {
      margin-top: 1.5rem;
    }

    .section-subtitle {
      margin: 1.5rem 0 0.5rem 0;
      color: #1f2937;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .section-description {
      margin: 0 0 1.5rem 0;
      color: #6b7280;
      font-size: 0.9rem;
      font-style: italic;
    }

    /* Tab Navigation Bottom */
    .tab-navigation-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }

    .nav-btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .nav-btn.secondary {
      background: #6b7280;
      color: white;
    }

    .nav-btn.primary {
      background: #667eea;
      color: white;
    }

    .nav-btn.success {
      background: #10b981;
      color: white;
    }

    .nav-btn:hover:not(:disabled) {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .nav-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .tab-indicator {
      font-size: 0.9rem;
      color: #6b7280;
      font-weight: 500;
    }

    /* Submit Button Tooltip */
    .submit-button-container {
      position: relative;
      display: inline-block;
    }

    .submit-tooltip {
      position: absolute;
      bottom: 120%;
      left: 50%;
      transform: translateX(-50%);
      background: #374151;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.875rem;
      line-height: 1.4;
      white-space: pre-line;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      min-width: 250px;
      max-width: 350px;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
      pointer-events: none;
    }

    .submit-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 8px solid transparent;
      border-top-color: #374151;
    }

    .submit-button-container:hover .submit-tooltip,
    .submit-button-container.has-tooltip:hover .submit-tooltip,
    .submit-button-container.has-tooltip:active .submit-tooltip {
      opacity: 1;
      visibility: visible;
    }

    /* Mobile touch support */
    @media (hover: none) {
      .submit-button-container.has-tooltip .submit-tooltip {
        opacity: 0;
        visibility: hidden;
      }

      .submit-button-container.has-tooltip:active .submit-tooltip,
      .submit-button-container.has-tooltip:focus-within .submit-tooltip {
        opacity: 1;
        visibility: visible;
      }
    }

    /* Footer */
    .app-footer {
      background: #1e40af;
      color: white;
      padding: 1.5rem 0;
    }

    .footer-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-left p {
      margin: 0;
      font-size: 0.9rem;
      opacity: 0.8;
    }

    .save-draft-btn {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      border: 2px solid #059669;
      color: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
    }

    .save-draft-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #047857 0%, #059669 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4);
    }

    .save-draft-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: 0 2px 8px rgba(5, 150, 105, 0.2);
    }

    /* Deck Upload Styles */
    .deck-upload-section {
      margin-top: 1rem;
    }

    .deck-requirement-text {
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      color: #0369a1;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .upload-area {
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: #f8fafc;
    }

    .upload-area:hover {
      border-color: #667eea;
      background: #f1f5f9;
    }

    .upload-area i {
      font-size: 2rem;
      color: #667eea;
      margin-bottom: 0.5rem;
    }

    .upload-area p {
      margin: 0.25rem 0;
      color: #64748b;
    }

    .upload-note {
      font-size: 0.8rem !important;
      color: #94a3b8 !important;
    }

    .file-preview {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: white;
    }

    .file-preview.uploading {
      border-color: #667eea;
      background: #f8fafc;
    }

    .file-preview.uploaded {
      border-color: #10b981;
      background: #f0fdf4;
    }

    .file-preview i {
      font-size: 1.25rem;
      color: #667eea;
    }

    .file-preview.uploaded i {
      color: #10b981;
    }

    .remove-file {
      margin-left: auto;
      background: none;
      border: none;
      color: #ef4444;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .remove-file:hover {
      background: #fee2e2;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .progress-container {
        padding: 0 1rem;
      }

      .tab-navigation {
        gap: 0.5rem;
      }

      .tab-button {
        min-width: 120px;
        padding: 0.75rem 1rem;
      }

      .main-content {
        padding: 1rem;
      }

      .tab-panel {
        padding: 1.5rem;
      }

      .tab-navigation-bottom {
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
      }

      .footer-content {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }

      .field-legend {
        flex-direction: column;
        gap: 0.75rem;
        padding: 0.75rem;
      }

      .legend-item {
        justify-content: center;
      }
    }
  `]
})
export class Phase3ApplicationTabbedComponent implements OnInit, OnDestroy {
  @Input() applicant?: ApplicantUser;
  @Output() phaseCompleted = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private applicationService = inject(ApplicationService);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private openaiService = inject(OpenAIService);
  private storageService = inject(StorageService);
  private emailService = inject(EmailService);
  private router = inject(Router);

  applicationForm!: FormGroup;
  equityRows: EquityBreakdownRow[] = [];

  isLoading = true;
  isSaving = false;
  isSubmitting = false;
  submissionProgress = 0;

  // Deck upload state
  selectedDeckFile: File | null = null;
  uploadedDeckUrl = '';
  uploadedDeckFilePath = '';
  isDeckUploading = false;
  hasP1Deck = false;
  showUrlError = false;

  // Tab navigation and gamification
  currentTab = 0;
  totalTabs = 4;
  tabTitles = [
    'Product & Traction',
    'Team',
    'Funding',
    'Legal & Corporate Structure'
  ];

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
      if (!this.applicant) {
        combineLatest([
          this.authService.authInitialized$,
          this.authService.currentUser$
        ]).subscribe(async ([authInitialized, user]) => {
          if (!authInitialized) {
            return;
          }

          if (user && user.role === 'APPLICANT') {
            this.applicant = user as ApplicantUser;
            await this.loadExistingApplication();
            this.setupAutoSave();
          } else {
            this.router.navigate(['/auth/login']);
          }
        });
      } else {
        await this.loadExistingApplication();
        this.setupAutoSave();
      }
    } catch (error) {
      console.error('Error loading applicant data:', error);
    }
  }

  private async loadExistingApplication() {
    try {
      this.isLoading = true;

      if (!this.applicant) {
        throw new Error('Applicant data not available');
      }

      // Load P3 application
      const existingApp = await this.applicationService.getPhase3Application(
        this.applicant.userId,
        this.applicant.cohortId
      );

      if (existingApp) {
        this.existingApplication = existingApp;
        this.populateFormFromApplication(existingApp);
      }

      // Check if user has P1 deck
      await this.checkP1DeckStatus();
    } catch (error) {
      console.error('Error loading existing application:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private initializeForm() {
    this.applicationForm = this.fb.group({
      // Product & Traction (Tab 1)
      productStage: [null, Validators.required],
      tractionDetails: ['', [Validators.required, this.wordCountValidator(300), this.charLimitValidator(3000)]],
      problemCustomer: ['', [Validators.required, this.wordCountValidator(300), this.charLimitValidator(3000)]],
      videoPitch: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],

      // Team (Tab 2)
      coFounders: ['', [Validators.required, this.wordCountValidator(300), this.charLimitValidator(3000)]],
      capacity: [null, Validators.required],
      capacityOther: ['', this.charLimitValidator(1000)],
      hasPreviousCollaboration: [null, Validators.required],
      previousCollaboration: ['', [this.wordCountValidator(300), this.charLimitValidator(3000)]],
      previousFounders: [null, Validators.required],
      previousFoundersExplanation: ['', this.charLimitValidator(3000)],
      equitySplitRoles: ['', [Validators.required, this.wordCountValidator(300), this.charLimitValidator(3000)]],
      additionalTeamMembers: ['', this.charLimitValidator(3000)],

      // Funding (Tab 3)
      hasRaisedCapital: [null, Validators.required],
      fundingDetails: ['', [this.wordCountValidator(300), this.charLimitValidator(3000)]],

      // Legal (Tab 4)
      isIncorporated: [null, Validators.required],
      incorporationLocation: ['', this.charLimitValidator(200)],
      hasIpAssignment: [null],
      hasFounderVesting: [null],
      hasBoardStructure: [null],
      willAmendDocuments: [null],
      amendDocumentsExplanation: ['', this.charLimitValidator(2000)],
      agreesToIncorporate: [null]
    });

    if (!this.equityRows || this.equityRows.length === 0) {
      this.equityRows = [];
    }

    // Setup conditional validation for capacityOther
    this.applicationForm.get('capacity')?.valueChanges.subscribe(value => {
      const capacityOtherControl = this.applicationForm.get('capacityOther');
      if (value === 'OTHER') {
        capacityOtherControl?.setValidators([Validators.required, this.charLimitValidator(1000)]);
      } else {
        capacityOtherControl?.setValidators([this.charLimitValidator(1000)]);
      }
      capacityOtherControl?.updateValueAndValidity();
    });

    // Setup conditional validation for previousCollaboration
    this.applicationForm.get('hasPreviousCollaboration')?.valueChanges.subscribe(value => {
      const previousCollaborationControl = this.applicationForm.get('previousCollaboration');
      if (value === 'true') {
        previousCollaborationControl?.setValidators([Validators.required, this.wordCountValidator(300), this.charLimitValidator(3000)]);
      } else {
        previousCollaborationControl?.setValidators([this.wordCountValidator(300), this.charLimitValidator(3000)]);
      }
      previousCollaborationControl?.updateValueAndValidity();
    });

    // Setup conditional validation for previousFoundersExplanation
    this.applicationForm.get('previousFounders')?.valueChanges.subscribe(value => {
      const explanationControl = this.applicationForm.get('previousFoundersExplanation');
      if (value === 'true') {
        explanationControl?.setValidators([Validators.required, this.charLimitValidator(3000)]);
      } else {
        explanationControl?.setValidators([this.charLimitValidator(3000)]);
      }
      explanationControl?.updateValueAndValidity();
    });

    // Setup conditional validation for fundingDetails
    this.applicationForm.get('hasRaisedCapital')?.valueChanges.subscribe(value => {
      const fundingDetailsControl = this.applicationForm.get('fundingDetails');
      if (value === 'true') {
        fundingDetailsControl?.setValidators([Validators.required, this.wordCountValidator(300), this.charLimitValidator(3000)]);
      } else {
        fundingDetailsControl?.setValidators([this.wordCountValidator(300), this.charLimitValidator(3000)]);
      }
      fundingDetailsControl?.updateValueAndValidity();
    });


    // Setup conditional validation for amendDocumentsExplanation
    this.applicationForm.get('willAmendDocuments')?.valueChanges.subscribe(value => {
      const explanationControl = this.applicationForm.get('amendDocumentsExplanation');
      const isIncorporated = this.applicationForm.get('isIncorporated')?.value;

      // Only add validators if company is incorporated AND willAmendDocuments is false
      if (isIncorporated === 'true' && value === 'false') {
        explanationControl?.setValidators([Validators.required, this.charLimitValidator(2000)]);
      } else {
        explanationControl?.setValidators([this.charLimitValidator(2000)]);
      }
      explanationControl?.updateValueAndValidity();
    });

    // Setup conditional validation for incorporation-related fields
    this.applicationForm.get('isIncorporated')?.valueChanges.subscribe(value => {
      const agreesToIncorporateControl = this.applicationForm.get('agreesToIncorporate');
      const incorporationLocationControl = this.applicationForm.get('incorporationLocation');
      const hasIpAssignmentControl = this.applicationForm.get('hasIpAssignment');
      const hasFounderVestingControl = this.applicationForm.get('hasFounderVesting');
      const hasBoardStructureControl = this.applicationForm.get('hasBoardStructure');
      const willAmendDocumentsControl = this.applicationForm.get('willAmendDocuments');
      const amendDocumentsExplanationControl = this.applicationForm.get('amendDocumentsExplanation');

      if (value === 'false') {
        // Company not incorporated - only require agreesToIncorporate
        agreesToIncorporateControl?.setValidators([Validators.required]);
        incorporationLocationControl?.clearValidators();
        hasIpAssignmentControl?.clearValidators();
        hasFounderVestingControl?.clearValidators();
        hasBoardStructureControl?.clearValidators();
        willAmendDocumentsControl?.clearValidators();
        amendDocumentsExplanationControl?.clearValidators(); // Clear validators completely

        // Clear values for fields that shouldn't be filled when not incorporated
        incorporationLocationControl?.setValue('');
        hasIpAssignmentControl?.setValue(null);
        hasFounderVestingControl?.setValue(null);
        hasBoardStructureControl?.setValue(null);
        willAmendDocumentsControl?.setValue(null);
        amendDocumentsExplanationControl?.setValue('');
      } else if (value === 'true') {
        // Company is incorporated - require incorporation fields
        agreesToIncorporateControl?.clearValidators();
        agreesToIncorporateControl?.setValue(null);
        incorporationLocationControl?.setValidators([Validators.required, this.charLimitValidator(200)]);
        hasIpAssignmentControl?.setValidators([Validators.required]);
        hasFounderVestingControl?.setValidators([Validators.required]);
        hasBoardStructureControl?.setValidators([Validators.required]);
        // Don't set validators for willAmendDocuments and amendDocumentsExplanation here
        // They will be handled by their own change listeners
      } else {
        // No incorporation answer yet - clear all related validators
        agreesToIncorporateControl?.clearValidators();
        incorporationLocationControl?.clearValidators();
        hasIpAssignmentControl?.clearValidators();
        hasFounderVestingControl?.clearValidators();
        hasBoardStructureControl?.clearValidators();
        willAmendDocumentsControl?.clearValidators();
        amendDocumentsExplanationControl?.clearValidators();
      }

      // Update validity for all affected controls
      agreesToIncorporateControl?.updateValueAndValidity();
      incorporationLocationControl?.updateValueAndValidity();
      hasIpAssignmentControl?.updateValueAndValidity();
      hasFounderVestingControl?.updateValueAndValidity();
      hasBoardStructureControl?.updateValueAndValidity();
      willAmendDocumentsControl?.updateValueAndValidity();
      amendDocumentsExplanationControl?.updateValueAndValidity();
    });

  }

  // Tab navigation methods
  switchTab(tabIndex: number) {
    if (tabIndex <= this.currentTab + 1) {
      this.currentTab = tabIndex;
    }
  }

  nextTab() {
    if (this.currentTab < this.totalTabs - 1) {
      this.validateCurrentTab();
      this.currentTab++;
    }
  }

  previousTab() {
    if (this.currentTab > 0) {
      this.currentTab--;
    }
  }

  validateCurrentTab(): boolean {
    const formValid = this.isCurrentTabValid();
    return formValid;
  }

  isCurrentTabValid(): boolean {
    const formValue = this.applicationForm.value;
    switch (this.currentTab) {
      case 0: // Product & Traction
        const hasRequiredDeck = !this.isDeckRequired() || this.getUploadedDeckUrl() || this.getSelectedDeckFile();
        return !!(formValue.productStage && formValue.tractionDetails && formValue.problemCustomer && formValue.videoPitch && hasRequiredDeck);
      case 1: // Team
        const hasCapacity = formValue.capacity !== null;
        const hasCapacityExplanation = formValue.capacity !== 'OTHER' || formValue.capacityOther;
        const hasPreviousCollaborationAnswer = formValue.hasPreviousCollaboration !== null;
        const hasPreviousCollaborationExplanation = formValue.hasPreviousCollaboration !== 'true' || formValue.previousCollaboration;
        const hasPreviousFoundersAnswer = formValue.previousFounders !== null;
        const hasPreviousFoundersExplanation = formValue.previousFounders !== 'true' || formValue.previousFoundersExplanation;
        return !!(formValue.coFounders && hasCapacity && hasCapacityExplanation && hasPreviousCollaborationAnswer && hasPreviousCollaborationExplanation && hasPreviousFoundersAnswer && hasPreviousFoundersExplanation && formValue.equitySplitRoles);
      case 2: // Funding
        const hasFundingAnswer = formValue.hasRaisedCapital !== null;
        const hasFundingDetails = formValue.hasRaisedCapital !== 'true' || formValue.fundingDetails;
        const hasFounders = this.equityRows.filter(row => row.category === 'founder').length > 0;
        const hasFoundersWithShares = this.equityRows.filter(row => row.category === 'founder' && (row.shares || 0) > 0).length > 0;
        return !!(hasFundingAnswer && hasFundingDetails && this.equityRows.length > 0 && hasFounders && hasFoundersWithShares);
      case 3: // Legal
        const hasIncorporationAnswer = formValue.isIncorporated !== null;

        if (formValue.isIncorporated === 'true') {
          // Company is incorporated - check incorporation location and corporate structure
          const hasIncorporationLocation = formValue.incorporationLocation;
          const hasIpAssignment = formValue.hasIpAssignment !== null;
          const hasFounderVesting = formValue.hasFounderVesting !== null;
          const hasBoardStructure = formValue.hasBoardStructure !== null;

          // Check if amendment question is required
          const needsAmendmentAnswer = this.showAmendmentQuestion();
          const hasAmendmentAnswer = !needsAmendmentAnswer || formValue.willAmendDocuments !== null;
          const hasAmendmentExplanation = formValue.willAmendDocuments !== 'false' || formValue.amendDocumentsExplanation;

          return !!(hasIncorporationLocation && hasIpAssignment && hasFounderVesting && hasBoardStructure && hasAmendmentAnswer && hasAmendmentExplanation);
        } else if (formValue.isIncorporated === 'false') {
          // Company is not incorporated - only check agreement to incorporate
          const hasAgreesToIncorporate = formValue.agreesToIncorporate !== null;
          return hasAgreesToIncorporate;
        } else {
          // No answer to incorporation question yet
          return false;
        }
      default:
        return false;
    }
  }


  canProceedToNext(): boolean {
    return this.isCurrentTabValid();
  }


  // Word count helper
  getWordCount(fieldName: string): number {
    const value = this.applicationForm.get(fieldName)?.value || '';
    return value.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
  }

  // Radio button toggle helper
  toggleRadioButton(fieldName: string, value: string) {
    const currentValue = this.applicationForm.get(fieldName)?.value;
    if (currentValue === value) {
      // If the same value is selected, deselect it
      this.applicationForm.get(fieldName)?.setValue(null);
    } else {
      // Otherwise, select the new value
      this.applicationForm.get(fieldName)?.setValue(value);
    }
  }

  showAmendmentQuestion(): boolean {
    // Show the amendment question only if any of the corporate structure items is "false" (No)
    const hasIpAssignment = this.applicationForm.get('hasIpAssignment')?.value;
    const hasFounderVesting = this.applicationForm.get('hasFounderVesting')?.value;
    const hasBoardStructure = this.applicationForm.get('hasBoardStructure')?.value;

    return hasIpAssignment === 'false' || hasFounderVesting === 'false' || hasBoardStructure === 'false';
  }

  // Get validation error messages for disabled submit button tooltip
  getSubmitButtonTooltip(): string {
    if (this.applicationForm.valid) {
      return '';
    }

    const errors: string[] = [];
    const formValue = this.applicationForm.value;

    // Check Tab 1: Product & Traction
    if (!formValue.productStage) errors.push('• Select your product stage');
    if (!formValue.tractionDetails || formValue.tractionDetails.trim() === '') errors.push('• Describe your traction details');
    if (!formValue.problemCustomer || formValue.problemCustomer.trim() === '') errors.push('• Describe your problem & customer');
    if (!formValue.videoPitch || formValue.videoPitch.trim() === '') errors.push('• Provide a video pitch URL');
    if (this.isDeckRequired() && !this.getUploadedDeckUrl() && !this.getSelectedDeckFile()) errors.push('• Upload your company deck');

    // Check Tab 2: Team
    if (!formValue.coFounders || formValue.coFounders.trim() === '') errors.push('• List your co-founders');
    if (formValue.capacity === null || formValue.capacity === undefined) errors.push('• Select team capacity');
    if (formValue.capacity === 'OTHER' && (!formValue.capacityOther || formValue.capacityOther.trim() === '')) errors.push('• Explain your team capacity');
    if (formValue.hasPreviousCollaboration === null || formValue.hasPreviousCollaboration === undefined) errors.push('• Answer previous collaboration question');
    if (formValue.hasPreviousCollaboration === 'true' && (!formValue.previousCollaboration || formValue.previousCollaboration.trim() === '')) errors.push('• Explain previous collaboration');
    if (formValue.previousFounders === null || formValue.previousFounders === undefined) errors.push('• Answer previous founders question');
    if (formValue.previousFounders === 'true' && (!formValue.previousFoundersExplanation || formValue.previousFoundersExplanation.trim() === '')) errors.push('• Explain previous founders departure');
    if (!formValue.equitySplitRoles || formValue.equitySplitRoles.trim() === '') errors.push('• Describe equity split and roles');

    // Check Tab 3: Funding
    if (formValue.hasRaisedCapital === null || formValue.hasRaisedCapital === undefined) errors.push('• Answer funding history question');
    if (formValue.hasRaisedCapital === 'true' && (!formValue.fundingDetails || formValue.fundingDetails.trim() === '')) errors.push('• Provide funding details');
    if (this.equityRows.length === 0) errors.push('• Add equity breakdown entries');
    if (this.equityRows.filter(row => row.category === 'founder').length === 0) errors.push('• Add at least one initial shareholder/founder');
    if (this.equityRows.filter(row => row.category === 'founder' && (row.shares || 0) > 0).length === 0) errors.push('• At least one initial shareholder must have shares greater than 0');

    // Check Tab 4: Legal
    if (formValue.isIncorporated === null || formValue.isIncorporated === undefined) errors.push('• Answer incorporation question');
    if (formValue.isIncorporated === 'true') {
      if (!formValue.incorporationLocation || formValue.incorporationLocation.trim() === '') errors.push('• Provide incorporation location');

      // Check corporate structure questions when incorporated
      if (formValue.hasIpAssignment === null || formValue.hasIpAssignment === undefined) errors.push('• Answer IP assignment question');
      if (formValue.hasFounderVesting === null || formValue.hasFounderVesting === undefined) errors.push('• Answer founder vesting question');
      if (formValue.hasBoardStructure === null || formValue.hasBoardStructure === undefined) errors.push('• Answer board structure question');

      // Check amendment willingness if any corporate structure item is "No"
      if (this.showAmendmentQuestion()) {
        if (formValue.willAmendDocuments === null || formValue.willAmendDocuments === undefined) errors.push('• Answer amendment willingness question');
        if (formValue.willAmendDocuments === 'false' && (!formValue.amendDocumentsExplanation || formValue.amendDocumentsExplanation.trim() === '')) errors.push('• Explain why you cannot amend documents');
      }
    }
    if (formValue.isIncorporated === 'false' && (formValue.agreesToIncorporate === null || formValue.agreesToIncorporate === undefined)) errors.push('• Answer incorporation agreement question');

    return errors.length > 0 ?
      `<strong>Complete the following to submit:</strong><br><br>${errors.join('<br>')}` :
      '';
  }

  // Check if a specific tab is valid
  isTabValid(tabIndex: number): boolean {
    const formValue = this.applicationForm.value;
    switch (tabIndex) {
      case 0: // Product & Traction
        return !!(formValue.productStage && formValue.tractionDetails && formValue.problemCustomer && formValue.videoPitch);
      case 1: // Team
        const hasCapacity = formValue.capacity !== null;
        const hasCapacityExplanation = formValue.capacity !== 'OTHER' || formValue.capacityOther;
        const hasPreviousCollaborationAnswer = formValue.hasPreviousCollaboration !== null;
        const hasPreviousCollaborationExplanation = formValue.hasPreviousCollaboration !== 'true' || formValue.previousCollaboration;
        const hasPreviousFoundersAnswer = formValue.previousFounders !== null;
        const hasPreviousFoundersExplanation = formValue.previousFounders !== 'true' || formValue.previousFoundersExplanation;
        return !!(formValue.coFounders && hasCapacity && hasCapacityExplanation && hasPreviousCollaborationAnswer && hasPreviousCollaborationExplanation && hasPreviousFoundersAnswer && hasPreviousFoundersExplanation && formValue.equitySplitRoles);
      case 2: // Funding
        const hasFundingAnswer = formValue.hasRaisedCapital !== null;
        const hasFundingDetails = formValue.hasRaisedCapital !== 'true' || formValue.fundingDetails;
        const hasFounders = this.equityRows.filter(row => row.category === 'founder').length > 0;
        const hasFoundersWithShares = this.equityRows.filter(row => row.category === 'founder' && (row.shares || 0) > 0).length > 0;
        return !!(hasFundingAnswer && hasFundingDetails && this.equityRows.length > 0 && hasFounders && hasFoundersWithShares);
      case 3: // Legal
        const hasIncorporationAnswer = formValue.isIncorporated !== null;

        if (formValue.isIncorporated === 'true') {
          // Company is incorporated - check incorporation location and corporate structure
          const hasIncorporationLocation = formValue.incorporationLocation;
          const hasIpAssignment = formValue.hasIpAssignment !== null;
          const hasFounderVesting = formValue.hasFounderVesting !== null;
          const hasBoardStructure = formValue.hasBoardStructure !== null;

          // Check if amendment question is required
          const needsAmendmentAnswer = this.showAmendmentQuestion();
          const hasAmendmentAnswer = !needsAmendmentAnswer || formValue.willAmendDocuments !== null;
          const hasAmendmentExplanation = formValue.willAmendDocuments !== 'false' || formValue.amendDocumentsExplanation;

          return !!(hasIncorporationLocation && hasIpAssignment && hasFounderVesting && hasBoardStructure && hasAmendmentAnswer && hasAmendmentExplanation);
        } else if (formValue.isIncorporated === 'false') {
          // Company is not incorporated - only check agreement to incorporate
          const hasAgreesToIncorporate = formValue.agreesToIncorporate !== null;
          return hasAgreesToIncorporate;
        } else {
          // No answer to incorporation question yet
          return false;
        }
      default:
        return false;
    }
  }


  // Equity table methods
  onEquityRowsChanged(rows: EquityBreakdownRow[]) {
    this.equityRows = rows;
  }

  // Form submission methods
  async saveDraft(isAutoSave: boolean = false) {
    if (!this.canSave()) return;

    try {
      this.isSaving = true;
      this.errorMessage = '';

      const applicationData = this.buildApplicationData('DRAFT');

      // If this is the first save (no existing application), update user status to IN_PROGRESS
      const isFirstSave = !this.existingApplication?.id;

      if (this.existingApplication?.id) {
        await this.applicationService.updatePhase3Application(this.existingApplication.id, applicationData);
      } else {
        const created = await this.applicationService.createPhase3Application(applicationData);
        this.existingApplication = created;
      }

      // Update user status to PHASE_3_IN_PROGRESS on first save
      if (isFirstSave) {
        console.log('🔄 First save - updating user status to PHASE_3_IN_PROGRESS');
        const currentUser = this.authService.getCurrentUser();
        if (currentUser?.userId) {
          console.log('👤 Updating user:', currentUser.userId);
          await this.userService.updateUser(currentUser.userId, {
            status: ApplicationStatus.PHASE_3_IN_PROGRESS
          });

          // Refresh the auth service's user data to ensure any navigation shows correct state
          await this.authService.refreshCurrentUser();
          console.log('✅ User status updated to PHASE_3_IN_PROGRESS');
        } else {
          console.warn('⚠️ No current user found for status update');
        }
      } else {
        console.log('📝 Updating existing draft application');
      }

      // Only show success message for manual saves, not auto-saves
      if (!isAutoSave) {
        this.successMessage = isFirstSave
          ? 'Draft saved successfully! Your status has been updated to Phase 3 In Progress.'
          : 'Draft saved successfully!';
        setTimeout(() => this.successMessage = '', 4000);
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to save draft';
    } finally {
      this.isSaving = false;
    }
  }

  async submitApplication() {
    if (!this.applicationForm.valid) return;

    try {
      this.isSubmitting = true;
      this.submissionProgress = 1;
      this.errorMessage = '';

      const applicationData = this.buildApplicationData('SUBMITTED');

      // Submit the application
      let submittedApplication: Phase3Application;
      if (this.existingApplication?.id) {
        await this.applicationService.updatePhase3Application(this.existingApplication.id, applicationData);
        submittedApplication = { ...this.existingApplication, ...applicationData } as Phase3Application;
      } else {
        submittedApplication = await this.applicationService.createPhase3Application(applicationData);
      }

      // Update user status to PHASE_3_SUBMITTED
      this.submissionProgress = 2;
      const currentUser = this.authService.getCurrentUser();
      if (currentUser?.userId) {
        await this.userService.updateUser(currentUser.userId, {
          status: ApplicationStatus.PHASE_3_SUBMITTED
        });

        // Refresh the auth service's user data to ensure dashboard shows correct state
        await this.authService.refreshCurrentUser();
        this.submissionProgress = 3;

        // Send Phase 3 submitted confirmation email
        if (this.applicant) {
          try {
            console.log('📧 Sending Phase 3 submitted email to:', this.applicant.email);
            const emailResult = await this.emailService.sendPhase3SubmittedEmail(this.applicant);

            if (emailResult.success) {
              console.log('✅ Phase 3 submitted email sent successfully');
            } else {
              console.error('❌ Failed to send Phase 3 submitted email:', emailResult.error);
            }
          } catch (emailError) {
            console.error('❌ Email service error during Phase 3 submission:', emailError);
          }
        }
      }

      // Trigger AI analysis in the background (fire and forget)
      this.submissionProgress = 4;
      try {
        await this.triggerAIAnalysis();
        console.log('🤖 AI analysis triggered successfully');
      } catch (error) {
        console.error('Failed to trigger AI analysis:', error);
        // Don't fail submission if AI analysis fails
      }

      this.submissionProgress = 5;
      this.successMessage = 'Application submitted successfully!';
      this.phaseCompleted.emit();

      // Auto-redirect after showing completion for 2 seconds
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 2000);
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to submit application';
    } finally {
      // Only reset on error, success will redirect
      if (this.submissionProgress < 5) {
        this.submissionProgress = 0;
        this.isSubmitting = false;
      }
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }


  private async triggerAIAnalysis(): Promise<void> {
    if (!this.applicant) return;

    try {
      // Collect Phase 1 data
      const phase1Data = await this.getPhase1Data();
      
      // Collect Phase 3 data
      const phase3Data = this.buildApplicationData('SUBMITTED');

      // Trigger background function
      const response = await fetch('/.netlify/functions/ai-analysis-background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicantId: this.applicant.userId,
          cohortId: this.applicant.cohortId,
          phase1Data,
          phase3Data,
          deckUrl: this.uploadedDeckUrl
            || this.existingApplication?.productInfo?.companyDeck?.fileUrl
            || phase1Data?.extendedInfo?.pitchDeck?.fileUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to trigger AI analysis');
      }

      console.log('🚀 AI analysis triggered successfully');
    } catch (error) {
      console.error('❌ Failed to trigger AI analysis:', error);
      throw error;
    }
  }

  private async getPhase1Data(): Promise<any> {
    if (!this.applicant) return {};

    try {
      // Fetch Phase 1 application data
      const db = getFirestore();
      const phase1Query = query(
        collection(db, 'applications'),
        where('applicantId', '==', this.applicant.userId),
        where('phase', '==', 'SIGNUP')
      );
      
      const querySnapshot = await getDocs(phase1Query);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data();
      }
    } catch (error) {
      console.error('Error fetching Phase 1 data:', error);
    }
    
    return {};
  }

  /**
   * Trigger OpenAI analysis in the background after submission
   * This happens asynchronously - user doesn't wait for it
   */
  private async triggerOpenAIAnalysis(application: Phase3Application): Promise<void> {
    try {
      console.log('🤖 Starting OpenAI analysis for Problem & Customer field...');

      // Set processing flag
      if (application.id) {
        await this.applicationService.updatePhase3Application(application.id, {
          ...application,
          llmAnalysis: {
            problemCustomerScore: 0,
            isSpecific: false,
            hasClearTarget: false,
            hasDefinedProblem: false,
            feedback: '',
            strengths: [],
            weaknesses: [],
            suggestions: [],
            analyzedAt: new Date(),
            gradingModel: 'gpt-5-mini',
            processing: true
          }
        });
      }

      // Analyze the Problem & Customer field
      const analysis = await this.openaiService.analyzeProblemCustomer(application.productInfo.problemCustomer);

      // Update application with analysis results
      if (application.id) {
        await this.applicationService.updatePhase3Application(application.id, {
          ...application,
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
        });
      }

      console.log('✅ OpenAI analysis completed and saved to database');

    } catch (error) {
      console.error('❌ OpenAI analysis failed:', error);

      // Update application to clear processing flag on error
      if (application.id) {
        try {
          await this.applicationService.updatePhase3Application(application.id, {
            ...application,
            llmAnalysis: {
              problemCustomerScore: 0,
              isSpecific: false,
              hasClearTarget: false,
              hasDefinedProblem: false,
              feedback: 'Analysis failed - please retry manually',
              strengths: [],
              weaknesses: [],
              suggestions: [],
              analyzedAt: new Date(),
              gradingModel: 'gpt-5-mini',
              processing: false
            }
          });
        } catch (updateError) {
          console.error('Failed to clear processing flag:', updateError);
        }
      }
    }
  }

  private canSave(): boolean {
    return !this.isSaving && !this.isSubmitting;
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
        ...(this.uploadedDeckUrl ? {
          companyDeck: {
            fileUrl: this.uploadedDeckUrl,
            fileName: this.selectedDeckFile?.name || ''
          }
        } : {}),
        productStage: formValue.productStage,
        tractionDetails: formValue.tractionDetails,
        problemCustomer: formValue.problemCustomer,
        videoPitch: formValue.videoPitch
      },
      teamInfo: {
        coFounders: formValue.coFounders,
        capacity: formValue.capacity,
        capacityOther: formValue.capacityOther,
        hasPreviousCollaboration: formValue.hasPreviousCollaboration === 'true',
        previousCollaboration: formValue.previousCollaboration,
        previousFounders: formValue.previousFounders === 'true',
        previousFoundersExplanation: formValue.previousFoundersExplanation,
        equitySplitRoles: formValue.equitySplitRoles,
        additionalTeamMembers: formValue.additionalTeamMembers
      },
      fundingInfo: {
        hasRaisedCapital: formValue.hasRaisedCapital === 'true',
        fundingDetails: formValue.fundingDetails,
        equityBreakdown: this.equityRows
      },
      legalInfo: {
        isIncorporated: formValue.isIncorporated === 'true',
        incorporationLocation: formValue.incorporationLocation,
        hasIpAssignment: formValue.hasIpAssignment === 'true',
        hasFounderVesting: formValue.hasFounderVesting === 'true',
        hasBoardStructure: formValue.hasBoardStructure === 'true',
        willAmendDocuments: formValue.willAmendDocuments === 'true',
        amendDocumentsExplanation: formValue.amendDocumentsExplanation,
        agreesToIncorporate: formValue.agreesToIncorporate
      },
      ...(status === 'SUBMITTED' ? { submittedAt: new Date() } : {}),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private populateFormFromApplication(app: Phase3Application) {
    // Load existing deck data if available
    if (app.productInfo.companyDeck?.fileUrl) {
      this.uploadedDeckUrl = app.productInfo.companyDeck.fileUrl;
      this.selectedDeckFile = app.productInfo.companyDeck.fileName ?
        new File([], app.productInfo.companyDeck.fileName, { type: 'application/pdf' }) :
        null;
    }

    this.applicationForm.patchValue({
      productStage: app.productInfo.productStage,
      tractionDetails: app.productInfo.tractionDetails,
      problemCustomer: app.productInfo.problemCustomer,
      videoPitch: app.productInfo.videoPitch,

      coFounders: app.teamInfo.coFounders,
      capacity: app.teamInfo.capacity,
      capacityOther: app.teamInfo.capacityOther,
      hasPreviousCollaboration: app.teamInfo.hasPreviousCollaboration ? 'true' : 'false',
      previousCollaboration: app.teamInfo.previousCollaboration,
      previousFounders: app.teamInfo.previousFounders ? 'true' : 'false',
      previousFoundersExplanation: app.teamInfo.previousFoundersExplanation,
      equitySplitRoles: app.teamInfo.equitySplitRoles,
      additionalTeamMembers: app.teamInfo.additionalTeamMembers,

      hasRaisedCapital: app.fundingInfo.hasRaisedCapital ? 'true' : 'false',
      fundingDetails: app.fundingInfo.fundingDetails,

      isIncorporated: app.legalInfo.isIncorporated ? 'true' : 'false',
      incorporationLocation: app.legalInfo.incorporationLocation,
      hasIpAssignment: app.legalInfo.hasIpAssignment ? 'true' : 'false',
      hasFounderVesting: app.legalInfo.hasFounderVesting ? 'true' : 'false',
      hasBoardStructure: app.legalInfo.hasBoardStructure ? 'true' : 'false',
      willAmendDocuments: app.legalInfo.willAmendDocuments ? 'true' : 'false',
      amendDocumentsExplanation: app.legalInfo.amendDocumentsExplanation,
      agreesToIncorporate: app.legalInfo.agreesToIncorporate
    });

    if (app.fundingInfo.equityBreakdown && app.fundingInfo.equityBreakdown.length > 0) {
      this.equityRows = [...app.fundingInfo.equityBreakdown];
    }

  }

  private setupAutoSave() {
    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      if (this.canSave()) {
        this.saveDraft(true); // Pass true to indicate this is auto-save
      }
    }, 30000);
  }

  ngOnDestroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }

  // Deck upload methods - getter methods for template
  getSelectedDeckFile(): File | null {
    return this.selectedDeckFile;
  }

  getUploadedDeckUrl(): string {
    return this.uploadedDeckUrl;
  }

  getIsDeckUploading(): boolean {
    return this.isDeckUploading;
  }

  async onDeckFileSelect(event: any): Promise<void> {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (file.type !== 'application/pdf') {
      this.errorMessage = 'Please upload a PDF file only.';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage = 'File size must be less than 10MB.';
      return;
    }

    this.selectedDeckFile = file;
    this.errorMessage = '';

    // Auto-upload the file
    await this.uploadDeckFile();
  }

  async uploadDeckFile(): Promise<void> {
    if (!this.selectedDeckFile || !this.applicant) return;

    this.isDeckUploading = true;
    this.errorMessage = '';

    try {
      const result = await this.storageService.uploadPitchDeck(this.selectedDeckFile, this.applicant.userId);

      this.uploadedDeckUrl = result.downloadURL;
      this.uploadedDeckFilePath = result.filePath;
      this.successMessage = 'Company deck uploaded successfully!';

      setTimeout(() => this.successMessage = '', 3000);

    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to upload deck. Please try again.';
    } finally {
      this.isDeckUploading = false;
    }
  }

  async removeDeckFile(): Promise<void> {
    if (this.uploadedDeckFilePath) {
      try {
        await this.storageService.deletePitchDeck(this.uploadedDeckFilePath);
      } catch (error) {
        console.error('Error deleting deck file:', error);
      }
    }

    this.selectedDeckFile = null;
    this.uploadedDeckUrl = '';
    this.uploadedDeckFilePath = '';
  }

  getDeckRequirementText(): string {
    // Check if user has uploaded a deck in P1 application
    const hasP1Deck = this.checkIfUserHasP1Deck();

    if (hasP1Deck) {
      return "You may upload again if you've refined your deck";
    } else {
      return "You must upload your company deck";
    }
  }

  private async checkP1DeckStatus(): Promise<void> {
    try {
      if (!this.applicant) return;

      // Fetch P1 application data
      const p1Application = await this.applicationService.getApplicationByApplicantId(
        this.applicant.userId
      );

      if (p1Application?.extendedInfo?.pitchDeck?.fileUrl) {
        this.hasP1Deck = true;
      }
    } catch (error) {
      console.error('Error checking P1 deck status:', error);
      // Default to false if we can't check
      this.hasP1Deck = false;
    }
  }

  private checkIfUserHasP1Deck(): boolean {
    return this.hasP1Deck;
  }

  isDeckRequired(): boolean {
    return !this.hasP1Deck;
  }

  // Real-time URL validation for video pitch
  private isValidUrl(url: string): boolean {
    if (!url || url.trim() === '') return true; // Don't show error for empty field

    try {
      const urlPattern = /^https?:\/\/.+/;
      return urlPattern.test(url.trim());
    } catch {
      return false;
    }
  }

  onVideoPitchPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';

    if (this.isValidUrl(pastedText)) {
      this.applicationForm.get('videoPitch')?.setValue(pastedText);
      this.showUrlError = false;
    } else {
      this.showUrlError = true;
    }
  }

  onVideoPitchInput(event: any): void {
    const value = event.target.value;
    this.showUrlError = !this.isValidUrl(value);
  }

  onVideoPitchBlur(): void {
    const value = this.applicationForm.get('videoPitch')?.value;
    this.showUrlError = !this.isValidUrl(value);
  }

  private wordCountValidator(maxWords: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const wordCount = control.value.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
      return wordCount > maxWords ? { wordCount: { max: maxWords, actual: wordCount } } : null;
    };
  }

  private charLimitValidator(maxChars: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const charCount = control.value.length;
      return charCount > maxChars ? { charLimit: { max: maxChars, actual: charCount } } : null;
    };
  }

  // Debug method to check validation errors
  checkValidationErrors() {
    console.log('🐛 VALIDATION DEBUG REPORT');
    console.log('========================');

    const formValue = this.applicationForm.value;
    console.log('📋 Current Form Values:', formValue);
    console.log('✅ Form Valid:', this.applicationForm.valid);
    console.log('📊 Form Status:', this.applicationForm.status);

    // Check each form control
    console.log('\n🔍 Individual Control Status:');
    Object.keys(this.applicationForm.controls).forEach(key => {
      const control = this.applicationForm.get(key);
      if (control) {
        console.log(`  ${key}:`, {
          value: control.value,
          valid: control.valid,
          errors: control.errors,
          status: control.status,
          validators: control.validator ? 'Has validators' : 'No validators'
        });
      }
    });

    // Check current tab validation
    console.log('\n📋 Current Tab (3 - Legal) Validation:');
    console.log('  isIncorporated:', formValue.isIncorporated);

    if (formValue.isIncorporated === 'true') {
      console.log('  Company IS incorporated - checking corporate structure:');
      console.log('    incorporationLocation:', formValue.incorporationLocation);
      console.log('    hasIpAssignment:', formValue.hasIpAssignment);
      console.log('    hasFounderVesting:', formValue.hasFounderVesting);
      console.log('    hasBoardStructure:', formValue.hasBoardStructure);

      const showAmendment = this.showAmendmentQuestion();
      console.log('    showAmendmentQuestion():', showAmendment);

      if (showAmendment) {
        console.log('    willAmendDocuments:', formValue.willAmendDocuments);
        console.log('    amendDocumentsExplanation:', formValue.amendDocumentsExplanation);
      }
    } else if (formValue.isIncorporated === 'false') {
      console.log('  Company IS NOT incorporated - checking agreement:');
      console.log('    agreesToIncorporate:', formValue.agreesToIncorporate);
    } else {
      console.log('  No incorporation answer yet');
    }

    // Check equity breakdown
    console.log('\n💰 Equity Breakdown:');
    console.log('  equityRows.length:', this.equityRows.length);
    console.log('  equityRows:', this.equityRows);

    const founderRows = this.equityRows.filter(row => row.category === 'founder');
    const foundersWithShares = founderRows.filter(row => (row.shares || 0) > 0);
    console.log('  founderRows:', founderRows.length);
    console.log('  foundersWithShares:', foundersWithShares.length);

    // Check current tab validity
    console.log('\n🎯 Tab Validation Results:');
    for (let i = 0; i < this.totalTabs; i++) {
      const isValid = this.isTabValid(i);
      console.log(`  Tab ${i} (${this.tabTitles[i]}): ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    }

    console.log('\n🚀 Overall Form Validation:');
    console.log('  canProceedToNext():', this.canProceedToNext());
    console.log('  isCurrentTabValid():', this.isCurrentTabValid());
    console.log('  applicationForm.valid:', this.applicationForm.valid);

    console.log('\n🎯 Submit Button Tooltip:');
    console.log(this.getSubmitButtonTooltip());

    console.log('========================');
    console.log('🐛 END VALIDATION DEBUG');
  }
}
