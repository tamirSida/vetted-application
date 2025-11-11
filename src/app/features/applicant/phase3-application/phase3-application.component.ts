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
                    <input type="radio" formControlName="productStage" value="EARLY_PROTOTYPE">
                    <span class="checkmark"></span>
                    Early prototype/MVP
                  </label>
                  <label class="radio-option">
                    <input type="radio" formControlName="productStage" value="IDEA_STAGE">
                    <span class="checkmark"></span>
                    Idea stage
                  </label>
                </div>
              </div>

              <!-- Traction Details -->
              <div class="form-group">
                <label for="tractionDetails" class="form-label">
                  Traction Details: Describe your traction (users, revenue, partnerships, etc.) (max 300 words)
                </label>
                <textarea 
                  id="tractionDetails" 
                  formControlName="tractionDetails" 
                  rows="4" 
                  class="form-textarea"
                  placeholder="Share your key metrics, user growth, revenue figures, partnerships..."></textarea>
                <div class="word-count">
                  {{ getWordCount('tractionDetails') }}/300 words
                </div>
              </div>

              <!-- Problem & Customer -->
              <div class="form-group">
                <label for="problemCustomer" class="form-label">
                  Problem & Customer: What problem are you solving and for whom? (max 300 words)
                </label>
                <textarea 
                  id="problemCustomer" 
                  formControlName="problemCustomer" 
                  rows="4" 
                  class="form-textarea"
                  placeholder="Describe the specific problem, target customers, and market opportunity..."></textarea>
                <div class="word-count">
                  {{ getWordCount('problemCustomer') }}/300 words
                </div>
              </div>

              <!-- Video Pitch -->
              <div class="form-group">
                <label for="videoPitch" class="form-label">
                  Video Pitch: Please provide a link to a video pitch (optional)
                </label>
                <input 
                  type="url" 
                  id="videoPitch" 
                  formControlName="videoPitch" 
                  class="form-input"
                  placeholder="https://...">
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
                  Co-Founders: Please list all co-founders, their roles, and LinkedIn profiles (max 300 words)
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
              </div>

              <!-- Previous Collaboration -->
              <div class="form-group">
                <label for="previousCollaboration" class="form-label">
                  Have any team members worked together before? If so, describe how. (max 300 words)
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
                    <input type="radio" formControlName="previousFounders" value="true">
                    <span class="checkmark"></span>
                    Yes
                  </label>
                  <label class="radio-option">
                    <input type="radio" formControlName="previousFounders" value="false">
                    <span class="checkmark"></span>
                    No
                  </label>
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
                  Additional team members who are not founders: List the roles (max 300 words)
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
                <label class="form-label">Has Raised Capital: Have you raised any capital?</label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input type="radio" formControlName="hasRaisedCapital" value="true">
                    <span class="checkmark"></span>
                    Yes
                  </label>
                  <label class="radio-option">
                    <input type="radio" formControlName="hasRaisedCapital" value="false">
                    <span class="checkmark"></span>
                    No
                  </label>
                </div>
              </div>

              <!-- Funding Details -->
              <div class="form-group">
                <label for="fundingDetails" class="form-label">
                  Funding Details: If yes, please provide details about funding rounds, investors, amounts (max 300 words)
                </label>
                <textarea 
                  id="fundingDetails" 
                  formControlName="fundingDetails" 
                  rows="4" 
                  class="form-textarea"
                  placeholder="Describe funding rounds, investor types, amounts raised..."></textarea>
                <div class="word-count">
                  {{ getWordCount('fundingDetails') }}/300 words
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
                <p>Your company's legal structure and incorporation status</p>
              </div>

              <!-- Is Incorporated -->
              <div class="form-group">
                <label class="form-label">Is Incorporated: Is your company incorporated?</label>
                <div class="radio-group">
                  <label class="radio-option">
                    <input type="radio" formControlName="isIncorporated" value="true">
                    <span class="checkmark"></span>
                    Yes
                  </label>
                  <label class="radio-option">
                    <input type="radio" formControlName="isIncorporated" value="false">
                    <span class="checkmark"></span>
                    No
                  </label>
                </div>
              </div>

              <!-- Corporation Details -->
              <div *ngIf="applicationForm.get('isIncorporated')?.value === 'true'" class="conditional-section">
                <!-- Corporation Type -->
                <div class="form-group">
                  <label class="form-label">Corporation Type: What type of corporation?</label>
                  <div class="checkbox-group">
                    <label class="checkbox-option" *ngFor="let type of corporationTypes">
                      <input type="checkbox" 
                             [value]="type.value" 
                             (change)="onCorporationTypeChange($event, type.value)">
                      <span class="checkmark"></span>
                      {{ type.label }}
                    </label>
                  </div>
                </div>

                <!-- Other Corporation Type -->
                <div *ngIf="hasOtherCorporationType()" class="form-group">
                  <label for="otherCorporationType" class="form-label">
                    Other Corporation Type: Please specify
                  </label>
                  <input 
                    type="text" 
                    id="otherCorporationType" 
                    formControlName="otherCorporationType" 
                    class="form-input">
                </div>

                <!-- Jurisdiction -->
                <div class="form-group">
                  <label for="jurisdiction" class="form-label">
                    Jurisdiction: Where is the company incorporated?
                  </label>
                  <input 
                    type="text" 
                    id="jurisdiction" 
                    formControlName="jurisdiction" 
                    class="form-input"
                    placeholder="e.g., Delaware, California, etc.">
                </div>

                <!-- Corporate Structure Details -->
                <div *ngIf="!hasAllCorporateStructures()" class="conditional-field">
                  <div class="form-group">
                    <label for="corporateStructureDetails" class="form-label">
                      Corporate Structure Details: Please provide more details about your corporate structure (max 300 words)
                    </label>
                    <textarea 
                      id="corporateStructureDetails" 
                      formControlName="corporateStructureDetails" 
                      rows="3" 
                      class="form-textarea"
                      placeholder="Describe your corporate structure in detail..."></textarea>
                    <div class="word-count">
                      {{ getWordCount('corporateStructureDetails') }}/300 words
                    </div>
                  </div>
                </div>
              </div>

              <!-- Not Incorporated -->
              <div *ngIf="applicationForm.get('isIncorporated')?.value === 'false'" class="conditional-section">
                <div class="form-group">
                  <label for="incorporationPlans" class="form-label">
                    Incorporation Plans: Please explain your plans for incorporation (max 300 words)
                  </label>
                  <textarea 
                    id="incorporationPlans" 
                    formControlName="incorporationPlans" 
                    rows="4" 
                    class="form-textarea"
                    placeholder="Describe your incorporation timeline and plans..."></textarea>
                  <div class="word-count">
                    {{ getWordCount('incorporationPlans') }}/300 words
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
            <p>&copy; 2024 Vetted Accelerator. All rights reserved.</p>
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
      background: #1f2937;
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

  corporationTypes = [
    { value: 'C_CORP', label: 'C-Corporation' },
    { value: 'S_CORP', label: 'S-Corporation' },
    { value: 'LLC', label: 'LLC' },
    { value: 'PARTNERSHIP', label: 'Partnership' },
    { value: 'SOLE_PROPRIETORSHIP', label: 'Sole Proprietorship' },
    { value: 'OTHER', label: 'Other' }
  ];

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
      productStage: ['', Validators.required],
      tractionDetails: ['', [Validators.required, this.wordCountValidator(300)]],
      problemCustomer: ['', [Validators.required, this.wordCountValidator(300)]],
      videoPitch: [''],

      // Team (Tab 2)
      coFounders: ['', [Validators.required, this.wordCountValidator(300)]],
      capacity: ['', Validators.required],
      previousCollaboration: ['', this.wordCountValidator(300)],
      previousFounders: ['', Validators.required],
      equitySplitRoles: ['', [Validators.required, this.wordCountValidator(300)]],
      additionalTeamMembers: ['', this.wordCountValidator(300)],

      // Funding (Tab 3)
      hasRaisedCapital: ['', Validators.required],
      fundingDetails: ['', this.wordCountValidator(300)],

      // Legal (Tab 4)
      isIncorporated: ['', Validators.required],
      corporationType: this.fb.array([]),
      otherCorporationType: [''],
      jurisdiction: [''],
      corporateStructureDetails: ['', this.wordCountValidator(300)],
      incorporationPlans: ['', this.wordCountValidator(300)]
    });

    if (!this.equityRows || this.equityRows.length === 0) {
      this.equityRows = [];
    }
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
        return !!(formValue.productStage && formValue.tractionDetails && formValue.problemCustomer);
      case 1: // Team
        return !!(formValue.coFounders && formValue.capacity);
      case 2: // Funding
        return !!(formValue.hasRaisedCapital !== null && this.equityRows.length > 0);
      case 3: // Legal
        return !!(formValue.isIncorporated !== null);
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

  // Corporation type methods
  onCorporationTypeChange(event: any, type: string) {
    const corporationTypeArray = this.applicationForm.get('corporationType') as FormArray;
    
    if (event.target.checked) {
      corporationTypeArray.push(this.fb.control(type));
    } else {
      const index = corporationTypeArray.controls.findIndex(control => control.value === type);
      if (index >= 0) {
        corporationTypeArray.removeAt(index);
      }
    }
  }

  hasOtherCorporationType(): boolean {
    const corporationTypeArray = this.applicationForm.get('corporationType') as FormArray;
    return corporationTypeArray.controls.some(control => control.value === 'OTHER');
  }

  hasAllCorporateStructures(): boolean {
    const corporationTypeArray = this.applicationForm.get('corporationType') as FormArray;
    return corporationTypeArray.controls.length > 0;
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
        previousCollaboration: formValue.previousCollaboration,
        previousFounders: formValue.previousFounders === 'true',
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
        corporationType: formValue.corporationType || [],
        otherCorporationType: formValue.otherCorporationType,
        jurisdiction: formValue.jurisdiction,
        corporateStructureDetails: formValue.corporateStructureDetails,
        incorporationPlans: formValue.incorporationPlans
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
      previousCollaboration: app.teamInfo.previousCollaboration,
      previousFounders: app.teamInfo.previousFounders ? 'true' : 'false',
      equitySplitRoles: app.teamInfo.equitySplitRoles,
      additionalTeamMembers: app.teamInfo.additionalTeamMembers,
      
      hasRaisedCapital: app.fundingInfo.hasRaisedCapital ? 'true' : 'false',
      fundingDetails: app.fundingInfo.fundingDetails,
      
      isIncorporated: app.legalInfo.isIncorporated ? 'true' : 'false',
      otherCorporationType: app.legalInfo.otherCorporationType,
      jurisdiction: app.legalInfo.jurisdiction,
      corporateStructureDetails: app.legalInfo.corporateStructureDetails,
      incorporationPlans: app.legalInfo.incorporationPlans
    });

    if (app.fundingInfo.equityBreakdown && app.fundingInfo.equityBreakdown.length > 0) {
      this.equityRows = [...app.fundingInfo.equityBreakdown];
    }

    // Set corporation types
    if (app.legalInfo.corporationType && app.legalInfo.corporationType.length > 0) {
      const corporationTypeArray = this.applicationForm.get('corporationType') as FormArray;
      app.legalInfo.corporationType.forEach(type => {
        corporationTypeArray.push(this.fb.control(type));
      });
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