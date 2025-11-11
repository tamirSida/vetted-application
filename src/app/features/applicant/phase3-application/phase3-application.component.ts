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
  selector: 'app-phase3-application-tabbed',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EquityTableComponent],
  template: `
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
            <div class="progress-summary">
              <span class="progress-text">{{ overallProgress }}% Complete</span>
              <div class="mini-progress-bar">
                <div class="mini-progress-fill" [style.width.%]="overallProgress"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Progress Section with Gamification -->
      <section class="progress-section">
        <div class="progress-container">
          <div class="progress-bar-container">
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="overallProgress"></div>
            </div>
            <div class="progress-label">{{ overallProgress }}% Complete - {{ getProgressMessage() }}</div>
          </div>

          <div class="tab-navigation">
            <button
              *ngFor="let title of tabTitles; let i = index"
              class="tab-button"
              [class.active]="currentTab === i"
              [class.completed]="tabProgress[i]"
              (click)="switchTab(i)"
              [disabled]="i > currentTab + 1">
              <div class="tab-number">{{ i + 1 }}</div>
              <span class="tab-title">{{ title }}</span>
              <i *ngIf="tabProgress[i]" class="fas fa-check tab-check"></i>
            </button>
          </div>
        </div>
      </section>

      <!-- Main Content with Tabs -->
      <main class="main-content">
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
                <label class="form-label">Product Stage: How far along are you in building the service or product?</label>
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
                <label for="tractionDetails" class="form-label">
                  Traction Details: Describe the traction as of above, for example 100 unpaid users within 3 months of beta launch / five paying customers with average ACV of $20K/year/ launching MVP in Q3 of this year.
                </label>
                <textarea
                  id="tractionDetails"
                  formControlName="tractionDetails"
                  rows="4"
                  class="form-textarea"
                  placeholder="Describe your current traction metrics..."></textarea>
                <div class="word-count">
                  {{ getWordCount('tractionDetails') }}/300 words
                </div>
              </div>

              <!-- Problem & Customer -->
              <div class="form-group">
                <label for="problemCustomer" class="form-label">
                  Problem & Customer: Who is the exact person you're helping, and what problem do they face? Be specific — not just a company or age group, but a real role or situation. (Example: "New moms recovering from childbirth who struggle to find time for healthy meals" or "Office managers at small law firms who waste hours ordering supplies.")
                </label>
                <textarea
                  id="problemCustomer"
                  formControlName="problemCustomer"
                  rows="4"
                  class="form-textarea"
                  placeholder="Describe the specific person and problem you're solving..."></textarea>
                <div class="word-count">
                  {{ getWordCount('problemCustomer') }}/300 words
                </div>
              </div>

              <!-- Video Pitch -->
              <div class="form-group">
                <label for="videoPitch" class="form-label">
                  Video Pitch: Please provide a link to a 1-2 minute unlisted YouTube video where the founding team introduces themselves and what you're building.
                </label>
                <input
                  type="url"
                  id="videoPitch"
                  formControlName="videoPitch"
                  class="form-input"
                  placeholder="https://www.youtube.com/..."
                  required>
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
                <label for="coFounders" class="form-label">
                  Co-Founders: Please list all co-founders, their roles, and a link to their LinkedIn profiles.
                </label>
                <textarea
                  id="coFounders"
                  formControlName="coFounders"
                  rows="4"
                  class="form-textarea"
                  placeholder="List each co-founder with their role and LinkedIn profile..."></textarea>
                <div class="word-count">
                  {{ getWordCount('coFounders') }}/300 words
                </div>
              </div>

              <!-- Capacity -->
              <div class="form-group">
                <label class="form-label">Capacity: What are you and your co-founders current capacity?</label>
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
                    placeholder="Explain the current capacity of you and your co-founders..."
                    required></textarea>
                </div>
              </div>

              <!-- Previous Collaboration -->
              <div class="form-group">
                <label for="previousCollaboration" class="form-label">
                  Have any team members worked together before? If so, describe how.
                </label>
                <textarea
                  id="previousCollaboration"
                  formControlName="previousCollaboration"
                  rows="3"
                  class="form-textarea"
                  placeholder="Describe any previous working relationships..."></textarea>
                <div class="word-count">
                  {{ getWordCount('previousCollaboration') }}/300 words
                </div>
              </div>

              <!-- Previous Founders -->
              <div class="form-group">
                <label class="form-label">Previous Founders: Have you had any co-founders who are no longer with the company?</label>
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
                    If yes, please briefly explain the circumstances of their departure and any severance or equity agreements that were made.
                  </label>
                  <textarea
                    id="previousFoundersExplanation"
                    formControlName="previousFoundersExplanation"
                    rows="3"
                    class="form-textarea"
                    placeholder="Explain the circumstances of departure and any agreements..."
                    required></textarea>
                </div>
              </div>

              <!-- Equity Split & Roles -->
              <div class="form-group">
                <label for="equitySplitRoles" class="form-label">
                  Equity Split + Roles: Please briefly describe how you decided on the equity split between the founders and on the role each one would have.
                </label>
                <textarea
                  id="equitySplitRoles"
                  formControlName="equitySplitRoles"
                  rows="4"
                  class="form-textarea"
                  placeholder="Describe the decision process for equity distribution and role assignments..."></textarea>
                <div class="word-count">
                  {{ getWordCount('equitySplitRoles') }}/300 words
                </div>
              </div>

              <!-- Additional Team Members -->
              <div class="form-group">
                <label for="additionalTeamMembers" class="form-label">
                  Additional team members who are not founders: List the roles
                </label>
                <textarea
                  id="additionalTeamMembers"
                  formControlName="additionalTeamMembers"
                  rows="3"
                  class="form-textarea"
                  placeholder="List non-founder team members and their roles..."></textarea>
                <div class="word-count">
                  {{ getWordCount('additionalTeamMembers') }}/300 words
                </div>
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
                <label class="form-label">Funding History: Have you raised any capital to date?</label>
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
                    placeholder="e.g. $150K on a post-money safe with a $XM cap"
                    required></textarea>
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
                  (rowsChanged)="onEquityRowsChanged($event)">
                </app-equity-table>
              </div>
            </div>

            <!-- Tab 4: Legal & Corporate Structure -->
            <div *ngIf="currentTab === 3" class="tab-panel active">
              <div class="tab-header">
                <h3><i class="fas fa-balance-scale"></i> Legal & Corporate Structure</h3>
                <p>Ensuring your company is set up for venture-scale success is a core part of the Vetted program. Please answer the following questions honestly.</p>
              </div>

              <!-- Is Incorporated -->
              <div class="form-group">
                <label class="form-label">Is your company incorporated?</label>
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

              <!-- Corporation Details -->
              <div *ngIf="applicationForm.get('isIncorporated')?.value === 'true'" class="conditional-section">
                <!-- Incorporation Location -->
                <div class="form-group">
                  <label for="incorporationLocation" class="form-label">
                    Where is the company incorporated? (State or Country)
                  </label>
                  <input
                    type="text"
                    id="incorporationLocation"
                    formControlName="incorporationLocation"
                    class="form-input"
                    placeholder="e.g., Delaware, California, etc."
                    required>
                </div>

                <!-- Venture Standard Terms -->
                <div class="venture-terms-section">
                  <h4 class="section-subtitle">Venture Standard Terms</h4>
                  <p class="section-description">Does your company currently have the following venture standard terms in place?</p>
                  
                  <!-- IP Assignment -->
                  <div class="form-group">
                    <label class="form-label">Intellectual Property Assignment Agreements (PIIA) for all founders and employees?</label>
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
                  <div class="form-group">
                    <label class="form-label">Founder vesting schedules (typically 4 years with a 1-year cliff)?</label>
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
                  <div class="form-group">
                    <label class="form-label">Board structure appropriate for venture funding (typically odd number of directors with investor representation)?</label>
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

                  <!-- Amendment Willingness -->
                  <div class="form-group">
                    <label class="form-label">If any of the above are missing, would you be willing to amend your corporate documents to include these terms?</label>
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
                        No
                      </label>
                    </div>
                  </div>

                  <!-- Amendment Explanation -->
                  <div *ngIf="applicationForm.get('willAmendDocuments')?.value === 'false'" class="conditional-field">
                    <label for="amendDocumentsExplanation" class="form-label">
                      Please explain why you would not be willing to make these amendments:
                    </label>
                    <textarea
                      id="amendDocumentsExplanation"
                      formControlName="amendDocumentsExplanation"
                      rows="3"
                      class="form-textarea"
                      placeholder="Explain your concerns about amending corporate documents..."
                      required></textarea>
                  </div>
                </div>
              </div>

              <!-- Not Incorporated Section -->
              <div *ngIf="applicationForm.get('isIncorporated')?.value === 'false'" class="conditional-section">
                <div class="form-group">
                  <label class="form-label">If accepted into the program, would you be willing to incorporate as a Delaware C-Corp with venture standard terms?</label>
                  <div class="radio-group">
                    <label class="radio-option">
                      <input 
                        type="radio"
                        [checked]="applicationForm.get('agreesToIncorporate')?.value === 'AGREE'"
                        (click)="toggleRadioButton('agreesToIncorporate', 'AGREE')">
                      <span class="checkmark"></span>
                      Yes, I agree to incorporate as a Delaware C-Corp
                    </label>
                    <label class="radio-option">
                      <input 
                        type="radio"
                        [checked]="applicationForm.get('agreesToIncorporate')?.value === 'DISCUSS'"
                        (click)="toggleRadioButton('agreesToIncorporate', 'DISCUSS')">
                      <span class="checkmark"></span>
                      I'd like to discuss alternative structures
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

            <button
              *ngIf="currentTab === totalTabs - 1"
              type="button"
              class="nav-btn success"
              (click)="submitApplication()"
              [disabled]="isSubmitting || !applicationForm.valid">
              <i *ngIf="isSubmitting" class="fas fa-spinner fa-spin"></i>
              <i *ngIf="!isSubmitting" class="fas fa-paper-plane"></i>
              {{ isSubmitting ? 'Submitting...' : 'Submit Application' }}
            </button>
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

    .mini-progress-bar {
      width: 120px;
      height: 4px;
      background: rgba(255,255,255,0.3);
      border-radius: 2px;
      margin-top: 0.5rem;
    }

    .mini-progress-fill {
      height: 100%;
      background: #10b981;
      border-radius: 2px;
      transition: width 0.3s ease;
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

    .progress-bar-container {
      margin-bottom: 2rem;
      text-align: center;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      border-radius: 4px;
      transition: width 0.5s ease;
    }

    .progress-label {
      color: #6b7280;
      font-size: 0.9rem;
      font-weight: 500;
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

    .radio-option input[type="radio"], .checkbox-option input[type="checkbox"] {
      margin: 0;
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
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .save-draft-btn:hover:not(:disabled) {
      background: rgba(255,255,255,0.2);
    }

    .save-draft-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
    }
  `]
})
export class Phase3ApplicationTabbedComponent implements OnInit, OnDestroy {
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

  // Tab navigation and gamification
  currentTab = 0;
  totalTabs = 4;
  tabTitles = [
    'Product & Traction',
    'Team',
    'Funding',
    'Legal & Corporate Structure'
  ];

  // Progress tracking for gamification
  tabProgress: boolean[] = [false, false, false, false];
  overallProgress = 0;
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
    } finally {
      this.isLoading = false;
      this.updateProgress();
    }
  }

  private initializeForm() {
    this.applicationForm = this.fb.group({
      // Product & Traction (Tab 1)
      productStage: [null, Validators.required],
      tractionDetails: ['', [Validators.required, this.wordCountValidator(300)]],
      problemCustomer: ['', [Validators.required, this.wordCountValidator(300)]],
      videoPitch: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],

      // Team (Tab 2)
      coFounders: ['', [Validators.required, this.wordCountValidator(300)]],
      capacity: [null, Validators.required],
      capacityOther: [''],
      previousCollaboration: ['', this.wordCountValidator(300)],
      previousFounders: [null, Validators.required],
      previousFoundersExplanation: [''],
      equitySplitRoles: ['', [Validators.required, this.wordCountValidator(300)]],
      additionalTeamMembers: ['', this.wordCountValidator(300)],

      // Funding (Tab 3)
      hasRaisedCapital: [null, Validators.required],
      fundingDetails: ['', this.wordCountValidator(300)],

      // Legal (Tab 4)
      isIncorporated: [null, Validators.required],
      incorporationLocation: [''],
      hasIpAssignment: [null],
      hasFounderVesting: [null],
      hasBoardStructure: [null],
      willAmendDocuments: [null],
      amendDocumentsExplanation: [''],
      agreesToIncorporate: [null]
    });

    if (!this.equityRows || this.equityRows.length === 0) {
      this.equityRows = [];
    }

    // Setup conditional validation for capacityOther
    this.applicationForm.get('capacity')?.valueChanges.subscribe(value => {
      const capacityOtherControl = this.applicationForm.get('capacityOther');
      if (value === 'OTHER') {
        capacityOtherControl?.setValidators([Validators.required]);
      } else {
        capacityOtherControl?.clearValidators();
      }
      capacityOtherControl?.updateValueAndValidity();
    });

    // Setup conditional validation for previousFoundersExplanation
    this.applicationForm.get('previousFounders')?.valueChanges.subscribe(value => {
      const explanationControl = this.applicationForm.get('previousFoundersExplanation');
      if (value === 'true') {
        explanationControl?.setValidators([Validators.required]);
      } else {
        explanationControl?.clearValidators();
      }
      explanationControl?.updateValueAndValidity();
    });

    // Setup conditional validation for fundingDetails
    this.applicationForm.get('hasRaisedCapital')?.valueChanges.subscribe(value => {
      const fundingDetailsControl = this.applicationForm.get('fundingDetails');
      if (value === 'true') {
        fundingDetailsControl?.setValidators([Validators.required, this.wordCountValidator(300)]);
      } else {
        fundingDetailsControl?.clearValidators();
      }
      fundingDetailsControl?.updateValueAndValidity();
    });

    // Setup conditional validation for incorporationLocation
    this.applicationForm.get('isIncorporated')?.valueChanges.subscribe(value => {
      const incorporationLocationControl = this.applicationForm.get('incorporationLocation');
      if (value === 'true') {
        incorporationLocationControl?.setValidators([Validators.required]);
      } else {
        incorporationLocationControl?.clearValidators();
      }
      incorporationLocationControl?.updateValueAndValidity();
    });

    // Setup conditional validation for amendDocumentsExplanation
    this.applicationForm.get('willAmendDocuments')?.valueChanges.subscribe(value => {
      const explanationControl = this.applicationForm.get('amendDocumentsExplanation');
      if (value === 'false') {
        explanationControl?.setValidators([Validators.required]);
      } else {
        explanationControl?.clearValidators();
      }
      explanationControl?.updateValueAndValidity();
    });

    // Setup conditional validation for agreesToIncorporate
    this.applicationForm.get('isIncorporated')?.valueChanges.subscribe(value => {
      const agreesToIncorporateControl = this.applicationForm.get('agreesToIncorporate');
      if (value === 'false') {
        agreesToIncorporateControl?.setValidators([Validators.required]);
      } else {
        agreesToIncorporateControl?.clearValidators();
      }
      agreesToIncorporateControl?.updateValueAndValidity();
    });
  }

  // Tab navigation methods
  switchTab(tabIndex: number) {
    if (tabIndex <= this.currentTab + 1) {
      this.currentTab = tabIndex;
      this.updateProgress();
    }
  }

  nextTab() {
    if (this.currentTab < this.totalTabs - 1) {
      this.validateCurrentTab();
      this.currentTab++;
      this.updateProgress();
    }
  }

  previousTab() {
    if (this.currentTab > 0) {
      this.currentTab--;
    }
  }

  validateCurrentTab(): boolean {
    const formValid = this.isCurrentTabValid();
    this.tabProgress[this.currentTab] = formValid;
    this.updateProgress();
    return formValid;
  }

  isCurrentTabValid(): boolean {
    const formValue = this.applicationForm.value;
    switch (this.currentTab) {
      case 0: // Product & Traction
        return !!(formValue.productStage && formValue.tractionDetails && formValue.problemCustomer && formValue.videoPitch);
      case 1: // Team
        const hasCapacity = formValue.capacity !== null;
        const hasCapacityExplanation = formValue.capacity !== 'OTHER' || formValue.capacityOther;
        const hasPreviousFoundersAnswer = formValue.previousFounders !== null;
        const hasPreviousFoundersExplanation = formValue.previousFounders !== 'true' || formValue.previousFoundersExplanation;
        return !!(formValue.coFounders && hasCapacity && hasCapacityExplanation && hasPreviousFoundersAnswer && hasPreviousFoundersExplanation && formValue.equitySplitRoles);
      case 2: // Funding
        const hasFundingAnswer = formValue.hasRaisedCapital !== null;
        const hasFundingDetails = formValue.hasRaisedCapital !== 'true' || formValue.fundingDetails;
        return !!(hasFundingAnswer && hasFundingDetails && this.equityRows.length > 0);
      case 3: // Legal
        const hasIncorporationAnswer = formValue.isIncorporated !== null;
        const hasIncorporationLocation = formValue.isIncorporated !== 'true' || formValue.incorporationLocation;
        const hasAgreesToIncorporate = formValue.isIncorporated !== 'false' || formValue.agreesToIncorporate !== null;
        return !!(hasIncorporationAnswer && hasIncorporationLocation && hasAgreesToIncorporate);
      default:
        return false;
    }
  }

  updateProgress() {
    const completedTabs = this.tabProgress.filter(completed => completed).length;
    this.overallProgress = Math.round((completedTabs / this.totalTabs) * 100);
  }

  canProceedToNext(): boolean {
    return this.isCurrentTabValid();
  }

  getProgressMessage(): string {
    if (this.overallProgress === 0) return "Let's get started! 🚀";
    if (this.overallProgress < 50) return "Great progress! Keep going! 💪";
    if (this.overallProgress < 100) return "Almost there! You're doing great! 🎯";
    return "Fantastic! All sections complete! 🎉";
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


  // Equity table methods
  onEquityRowsChanged(rows: EquityBreakdownRow[]) {
    this.equityRows = rows;
    this.updateProgress();
  }

  // Form submission methods
  async saveDraft() {
    if (!this.canSave()) return;

    try {
      this.isSaving = true;
      this.errorMessage = '';

      const applicationData = this.buildApplicationData('DRAFT');

      if (this.existingApplication?.id) {
        await this.applicationService.updatePhase3Application(this.existingApplication.id, applicationData);
      } else {
        const created = await this.applicationService.createPhase3Application(applicationData);
        this.existingApplication = created;
      }

      this.successMessage = 'Draft saved successfully!';
      setTimeout(() => this.successMessage = '', 3000);
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
      this.errorMessage = '';

      const applicationData = this.buildApplicationData('SUBMITTED');

      if (this.existingApplication?.id) {
        await this.applicationService.updatePhase3Application(this.existingApplication.id, applicationData);
      } else {
        await this.applicationService.createPhase3Application(applicationData);
      }

      this.successMessage = 'Application submitted successfully!';
      this.phaseCompleted.emit();

      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 2000);
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to submit application';
    } finally {
      this.isSubmitting = false;
    }
  }

  private canSave(): boolean {
    return !this.isSaving && !this.isSubmitting && this.applicationForm.valid;
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
      submittedAt: status === 'SUBMITTED' ? new Date() : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private populateFormFromApplication(app: Phase3Application) {
    this.applicationForm.patchValue({
      productStage: app.productInfo.productStage,
      tractionDetails: app.productInfo.tractionDetails,
      problemCustomer: app.productInfo.problemCustomer,
      videoPitch: app.productInfo.videoPitch,

      coFounders: app.teamInfo.coFounders,
      capacity: app.teamInfo.capacity,
      capacityOther: app.teamInfo.capacityOther,
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
        this.saveDraft();
      }
    }, 30000);
  }

  ngOnDestroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
  }

  private wordCountValidator(maxWords: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const wordCount = control.value.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
      return wordCount > maxWords ? { wordCount: { max: maxWords, actual: wordCount } } : null;
    };
  }
}
