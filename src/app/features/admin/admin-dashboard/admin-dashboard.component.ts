import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { DocumentSnapshot } from '@angular/fire/firestore';
import { AuthService } from '../../../services/auth.service';
import { CohortService } from '../../../services/cohort.service';
import { UserService } from '../../../services/user.service';
import { SettingsService, SystemSettings } from '../../../services/settings.service';
import { InterviewerService } from '../../../services/interviewer.service';
import { ApplicantUser, AdminUser, ViewerUser, Cohort, UserRole, Phase, Webinar, ApplicationStatus, Interviewer, InterviewerCreateRequest } from '../../../models';

type AdminView = 'applicants' | 'cohorts' | 'admin' | 'settings';
type AdminSubView = 'users' | 'interviewers';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="admin-container">
      <!-- Header -->
      <header class="admin-header">
        <div class="header-content">
          <div class="header-left">
            <img src="/images/logo.png" alt="Logo" class="logo">
            <div class="admin-info">
              <h1>Admin Dashboard</h1>
              <p>{{ currentUser()?.email }}</p>
            </div>
          </div>
          <div class="test-links">
            <button class="test-link-btn" (click)="navigateToOpenAITest()">
              <i class="fas fa-brain"></i>
              OpenAI Test
            </button>
          </div>
          <button class="sign-out-button" (click)="signOut()">
            <i class="fas fa-sign-out-alt"></i>
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <!-- Navigation -->
      <nav class="admin-nav">
        <button 
          class="nav-button"
          [class.active]="currentView() === 'applicants'"
          (click)="switchView('applicants')">
          <i class="fas fa-users"></i>
          Applicants
        </button>
        <button 
          class="nav-button"
          [class.active]="currentView() === 'cohorts'"
          (click)="switchView('cohorts')">
          <i class="fas fa-calendar-alt"></i>
          Cohort Management
        </button>
        <button 
          class="nav-button"
          [class.active]="currentView() === 'admin'"
          (click)="switchView('admin')">
          <i class="fas fa-user-shield"></i>
          Admin Management
        </button>
        <button 
          class="nav-button"
          [class.active]="currentView() === 'settings'"
          (click)="switchView('settings')">
          <i class="fas fa-cog"></i>
          Settings
        </button>
      </nav>

      <!-- Main Content -->
      <main class="admin-main">
        <!-- Loading State -->
        <div *ngIf="isLoading()" class="loading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Loading...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error()" class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>{{ error() }}</p>
        </div>

        <!-- Success Message -->
        <div *ngIf="success()" class="success-message">
          <i class="fas fa-check-circle"></i>
          <p>{{ success() }}</p>
        </div>

        <!-- Applicants View -->
        <div *ngIf="currentView() === 'applicants' && !isLoading()" class="applicants-view">
          <div class="view-header">
            <h2>
              <i class="fas fa-users"></i>
              Applicants Management
            </h2>
            <div class="controls">
              <div class="page-size-selector">
                <label for="page-size">Page Size:</label>
                <select id="page-size" (change)="changePageSize($event)" [value]="pageSize()">
                  <option *ngFor="let size of pageSizeOptions" [value]="size" [selected]="size === pageSize()">{{ size }}</option>
                </select>
              </div>
            </div>
          </div>

          <div *ngIf="applicants().length === 0" class="empty-state">
            <i class="fas fa-user-slash"></i>
            <h3>No Applicants Found</h3>
            <p>No applicants have registered yet.</p>
          </div>

          <div *ngIf="applicants().length > 0" class="table-container">
            <table class="applicants-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Company</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let applicant of applicants()" class="table-row" (click)="viewApplicantDetails(applicant)">
                  <td>{{ applicant.name }}</td>
                  <td>
                    <a [href]="'mailto:' + applicant.email" class="email-link" (click)="$event.stopPropagation()">
                      {{ applicant.email }}
                    </a>
                  </td>
                  <td>
                    <span [class]="'status-badge status-' + applicant.status.toLowerCase().replace('_', '-')">
                      {{ getStatusDisplayName(applicant.status) }}
                    </span>
                  </td>
                  <td>{{ applicant.profileData?.companyName || 'Not specified' }}</td>
                  <td>
                    <button class="table-action-btn delete-btn" (click)="$event.stopPropagation(); deleteApplicant(applicant)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div class="pagination-controls">
              <div class="pagination-info">
                Page {{ currentPage() }} • Showing {{ applicants().length }} items
              </div>
              <div class="pagination-buttons">
                <button 
                  class="pagination-btn" 
                  (click)="loadPreviousPage('applicants')" 
                  [disabled]="currentPage() <= 1">
                  <i class="fas fa-chevron-left"></i>
                  Previous
                </button>
                <button 
                  class="pagination-btn" 
                  (click)="loadNextPage('applicants')" 
                  [disabled]="!hasMoreApplicants()">
                  Next
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Cohorts View -->
        <div *ngIf="currentView() === 'cohorts' && !isLoading()" class="cohorts-view">
          <div class="view-header">
            <h2>
              <i class="fas fa-calendar-alt"></i>
              Cohort Management
            </h2>
            <div class="controls">
              <div class="page-size-selector">
                <label for="page-size-cohorts">Page Size:</label>
                <select id="page-size-cohorts" (change)="changePageSize($event)" [value]="pageSize()">
                  <option *ngFor="let size of pageSizeOptions" [value]="size" [selected]="size === pageSize()">{{ size }}</option>
                </select>
              </div>
              <button class="primary-button" (click)="toggleCohortForm()">
                <i class="fas fa-plus"></i>
                Create Cohort
              </button>
            </div>
          </div>

          <!-- Cohort Form -->
          <div *ngIf="showCohortForm()" class="form-container">
            <form [formGroup]="cohortForm" (ngSubmit)="saveCohort()" class="create-form">
              <h3>{{ editingCohort() ? 'Edit Cohort' : 'Create New Cohort' }}</h3>
              
              <div class="form-group">
                <label for="cohort-number">Cohort Number</label>
                <div class="cohort-input-container">
                  <span class="cohort-prefix">Cohort #</span>
                  <input
                    type="number"
                    id="cohort-number"
                    formControlName="cohortNumber"
                    placeholder="5"
                    min="1"
                    max="999"
                    class="form-input cohort-number-input"
                  />
                </div>
                <small class="form-helper">Preview: {{ getCohortPreview() }}</small>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="app-start-date">Application Start Date & Time (ET)</label>
                  <div class="datetime-row">
                    <input
                      type="date"
                      id="app-start-date"
                      formControlName="applicationStartDate"
                      class="form-input date-input"
                    />
                    <input
                      type="time"
                      id="app-start-time"
                      formControlName="applicationStartTime"
                      class="form-input time-input"
                      placeholder="HH:MM"
                    />
                  </div>
                  <small class="timezone-note">Time will be converted from Eastern Time to UTC</small>
                </div>
                <div class="form-group">
                  <label for="app-end-date">Application End Date & Time (ET)</label>
                  <div class="datetime-row">
                    <input
                      type="date"
                      id="app-end-date"
                      formControlName="applicationEndDate"
                      class="form-input date-input"
                    />
                    <input
                      type="time"
                      id="app-end-time"
                      formControlName="applicationEndTime"
                      class="form-input time-input"
                      placeholder="HH:MM"
                    />
                  </div>
                  <small class="timezone-note">Time will be converted from Eastern Time to UTC</small>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="program-start">Program Start Date (ET)</label>
                  <input
                    type="date"
                    id="program-start"
                    formControlName="programStartDate"
                    class="form-input"
                  />
                  <small class="timezone-note">Date will be converted from Eastern Time to UTC</small>
                </div>
                <div class="form-group">
                  <label for="program-end">Program End Date (ET)</label>
                  <input
                    type="date"
                    id="program-end"
                    formControlName="programEndDate"
                    class="form-input"
                  />
                  <small class="timezone-note">Date will be converted from Eastern Time to UTC</small>
                </div>
              </div>

              <!-- Webinar Sessions Section -->
              <div class="form-section">
                <div class="section-header">
                  <h4>
                    <i class="fas fa-video"></i>
                    Webinar Sessions
                  </h4>
                  <button type="button" class="secondary-button small" (click)="addWebinar()">
                    <i class="fas fa-plus"></i>
                    Add Webinar
                  </button>
                </div>

                <div class="webinars-list" formArrayName="webinars">
                  <div *ngIf="webinars.length === 0" class="empty-webinars">
                    <p>No webinar sessions added yet. Click "Add Webinar" to create one.</p>
                  </div>
                  
                  <div 
                    *ngFor="let webinar of webinars.controls; let i = index" 
                    [formGroupName]="i" 
                    class="webinar-item">
                    <div class="webinar-header">
                      <h5>Webinar {{ i + 1 }}</h5>
                      <button type="button" class="delete-button small" (click)="removeWebinar(i)">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                    
                    <div class="webinar-code-display" *ngIf="getWebinarCode(i)">
                      <div class="code-section">
                        <label>Webinar Code:</label>
                        <div class="code-value">
                          <span class="code">{{ getWebinarCode(i) }}</span>
                          <button type="button" class="copy-btn" (click)="copyWebinarCode(getWebinarCode(i)!)" title="Copy code">
                            <i class="fas fa-copy"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div class="form-row">
                      <div class="form-group">
                        <label [for]="'webinar-date-' + i">Date & Time (ET)</label>
                        <div class="datetime-row">
                          <input
                            type="date"
                            [id]="'webinar-date-' + i"
                            formControlName="date"
                            class="form-input date-input"
                          />
                          <input
                            type="time"
                            [id]="'webinar-time-' + i"
                            formControlName="time"
                            class="form-input time-input"
                          />
                        </div>
                        <small class="timezone-note">Will be converted from Eastern Time to UTC</small>
                      </div>
                      <div class="form-group">
                        <label [for]="'webinar-url-' + i">Meeting URL</label>
                        <input
                          type="url"
                          [id]="'webinar-url-' + i"
                          formControlName="link"
                          placeholder="https://zoom.us/j/..."
                          class="form-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="secondary-button" (click)="toggleCohortForm()">
                  Cancel
                </button>
                <button type="submit" class="primary-button" [disabled]="cohortForm.invalid || isSubmitting()">
                  <i class="fas fa-{{ editingCohort() ? 'save' : 'plus' }}"></i>
                  {{ editingCohort() ? 'Save Changes' : 'Create Cohort' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Cohorts Grid -->
          <div *ngIf="cohorts().length === 0" class="empty-state">
            <i class="fas fa-calendar-times"></i>
            <h3>No Cohorts Created</h3>
            <p>Create your first cohort to start accepting applications.</p>
          </div>

          <div *ngIf="cohorts().length > 0" class="cohorts-container">
            <div class="cohorts-grid">
              <div *ngFor="let cohort of cohorts()" class="cohort-card">
                <div class="cohort-header">
                  <h3>{{ cohort.name }}</h3>
                  <span [class]="'status-badge cohort-' + getCohortStatus(cohort)">
                    {{ getCohortStatusDisplay(cohort) }}
                  </span>
                </div>

                <div class="cohort-timeline">
                  <div class="timeline-item">
                    <i class="fas fa-calendar-plus"></i>
                    <span>Applications: {{ cohort.applicationStartDate | date:'short' }} - {{ cohort.applicationEndDate | date:'short' }}</span>
                  </div>
                  <div class="timeline-item">
                    <i class="fas fa-play-circle"></i>
                    <span>Program: {{ cohort.programStartDate | date:'shortDate' }} - {{ cohort.programEndDate | date:'shortDate' }}</span>
                  </div>
                  <div class="timeline-item">
                    <i class="fas fa-users"></i>
                    <span>Applicants: {{ cohort.currentApplicantCount || 0 }}</span>
                  </div>
                  <div class="timeline-item" *ngIf="cohort.webinars && cohort.webinars.length > 0">
                    <i class="fas fa-video"></i>
                    <span>Webinars: {{ cohort.webinars.length }}</span>
                  </div>
                </div>

                <div class="cohort-actions">
                  <button class="action-button edit-button" (click)="editCohort(cohort)">
                    <i class="fas fa-edit"></i>
                    Edit
                  </button>
                  <button class="action-button delete-button" (click)="deleteCohort(cohort.id!)">
                    <i class="fas fa-trash"></i>
                    Delete
                  </button>
                </div>
              </div>
            </div>
            
            <div class="pagination-controls">
              <div class="pagination-info">
                Page {{ currentPage() }} • Showing {{ cohorts().length }} items
              </div>
              <div class="pagination-buttons">
                <button 
                  class="pagination-btn" 
                  (click)="loadPreviousPage('cohorts')" 
                  [disabled]="currentPage() <= 1">
                  <i class="fas fa-chevron-left"></i>
                  Previous
                </button>
                <button 
                  class="pagination-btn" 
                  (click)="loadNextPage('cohorts')" 
                  [disabled]="!hasMoreCohorts()">
                  Next
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Admin Management View -->
        <div *ngIf="currentView() === 'admin' && !isLoading()" class="admin-management-view">
          <div class="view-header">
            <h2>
              <i class="fas fa-user-shield"></i>
              User Management
            </h2>
          </div>

          <!-- Admin Sub-Navigation -->
          <nav class="admin-sub-nav">
            <button 
              class="sub-nav-button"
              [class.active]="currentAdminSubView() === 'users'"
              (click)="switchAdminSubView('users')">
              <i class="fas fa-users"></i>
              Users
            </button>
            <button 
              class="sub-nav-button"
              [class.active]="currentAdminSubView() === 'interviewers'"
              (click)="switchAdminSubView('interviewers')">
              <i class="fas fa-user-tie"></i>
              Interviewers
            </button>
          </nav>

          <!-- Users Tab -->
          <div *ngIf="currentAdminSubView() === 'users'">
            <div class="sub-view-header">
              <div class="controls">
                <div class="page-size-selector">
                  <label for="page-size-admin">Page Size:</label>
                  <select id="page-size-admin" (change)="changePageSize($event)" [value]="pageSize()">
                    <option *ngFor="let size of pageSizeOptions" [value]="size" [selected]="size === pageSize()">{{ size }}</option>
                  </select>
                </div>
                <button class="primary-button" (click)="toggleAdminForm()">
                  <i class="fas fa-user-plus"></i>
                  Create Admin/Viewer
                </button>
              </div>
            </div>

          <!-- Admin Form -->
          <div *ngIf="showAdminForm()" class="form-container">
            <form [formGroup]="adminForm" (ngSubmit)="createAdmin()" class="create-form">
              <h3>Create New Admin or Viewer</h3>
              
              <div class="form-group">
                <label for="admin-name">Name</label>
                <input
                  type="text"
                  id="admin-name"
                  formControlName="name"
                  placeholder="Full Name"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label for="admin-email">Email</label>
                <input
                  type="email"
                  id="admin-email"
                  formControlName="email"
                  placeholder="admin@example.com"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label for="admin-role">Role</label>
                <select id="admin-role" formControlName="role" class="form-input">
                  <option value="ADMIN">Admin (Full Access)</option>
                  <option value="VIEWER">Viewer (Read Only)</option>
                </select>
              </div>

              <!-- Password is auto-generated for admin/viewer users -->

              <div class="form-actions">
                <button type="button" class="secondary-button" (click)="toggleAdminForm()">
                  Cancel
                </button>
                <button type="submit" class="primary-button" [disabled]="adminForm.invalid || isSubmitting()">
                  <i class="fas fa-user-plus"></i>
                  Create {{ adminForm.get('role')?.value === 'ADMIN' ? 'Admin' : 'Viewer' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Admins Grid -->
          <div *ngIf="adminUsers().length === 0 && viewerUsers().length === 0" class="empty-state">
            <i class="fas fa-user-slash"></i>
            <h3>No Admin Users Found</h3>
            <p>Create admin and viewer accounts to manage the system.</p>
          </div>

          <div *ngIf="adminUsers().length > 0 || viewerUsers().length > 0" class="admin-users-container">
            <!-- Admins Section -->
            <div *ngIf="adminUsers().length > 0" class="admin-section">
              <h3><i class="fas fa-user-cog"></i> Administrators</h3>
              <div class="admin-users-grid">
                <div *ngFor="let admin of adminUsers()" class="admin-card">
                  <div class="admin-header">
                    <div class="admin-info">
                      <h4>{{ admin.name }}</h4>
                      <p class="admin-email">{{ admin.email }}</p>
                    </div>
                    <span class="role-badge admin-role">
                      <i class="fas fa-crown"></i>
                      Admin
                    </span>
                  </div>
                  
                  <div class="admin-details">
                    <div class="detail-item">
                      <strong>Status:</strong> 
                      <span [class]="'status-indicator ' + (admin.isActive ? 'active' : 'inactive')">
                        {{ admin.isActive ? 'Active' : 'Inactive' }}
                      </span>
                    </div>
                    <div class="detail-item">
                      <strong>Created:</strong> {{ admin.createdAt | date:'short' }}
                    </div>
                  </div>

                  <div class="admin-actions">
                    <button class="action-button toggle-button" (click)="toggleAdminStatus(admin)">
                      <i class="fas {{ admin.isActive ? 'fa-pause' : 'fa-play' }}"></i>
                      {{ admin.isActive ? 'Deactivate' : 'Activate' }}
                    </button>
                    <button class="action-button delete-button" (click)="deleteAdminUser(admin.userId)">
                      <i class="fas fa-trash"></i>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Viewers Section -->
            <div *ngIf="viewerUsers().length > 0" class="viewer-section">
              <h3><i class="fas fa-eye"></i> Viewers</h3>
              <div class="admin-users-grid">
                <div *ngFor="let viewer of viewerUsers()" class="admin-card">
                  <div class="admin-header">
                    <div class="admin-info">
                      <h4>{{ viewer.name }}</h4>
                      <p class="admin-email">{{ viewer.email }}</p>
                    </div>
                    <span class="role-badge viewer-role">
                      <i class="fas fa-eye"></i>
                      Viewer
                    </span>
                  </div>
                  
                  <div class="admin-details">
                    <div class="detail-item">
                      <strong>Access:</strong> 
                      <span [class]="'status-indicator ' + (viewer.canView ? 'active' : 'inactive')">
                        {{ viewer.canView ? 'Can View' : 'No Access' }}
                      </span>
                    </div>
                    <div class="detail-item">
                      <strong>Created:</strong> {{ viewer.createdAt | date:'short' }}
                    </div>
                  </div>

                  <div class="admin-actions">
                    <button class="action-button toggle-button" (click)="toggleViewerAccess(viewer)">
                      <i class="fas {{ viewer.canView ? 'fa-eye-slash' : 'fa-eye' }}"></i>
                      {{ viewer.canView ? 'Revoke Access' : 'Grant Access' }}
                    </button>
                    <button class="action-button delete-button" (click)="deleteViewerUser(viewer.userId)">
                      <i class="fas fa-trash"></i>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="pagination-controls">
              <div class="pagination-info">
                Page {{ currentPage() }} • Showing {{ adminUsers().length + viewerUsers().length }} items
              </div>
              <div class="pagination-buttons">
                <button 
                  class="pagination-btn" 
                  (click)="loadPreviousPage('admin')" 
                  [disabled]="currentPage() <= 1">
                  <i class="fas fa-chevron-left"></i>
                  Previous
                </button>
                <button 
                  class="pagination-btn" 
                  (click)="loadNextPage('admin')" 
                  [disabled]="!hasMoreAdmins() && !hasMoreViewers()">
                  Next
                  <i class="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Interviewers Tab -->
        <div *ngIf="currentAdminSubView() === 'interviewers'">
          <div class="sub-view-header">
            <div class="controls">
              <button class="primary-button" (click)="toggleInterviewerForm()">
                <i class="fas fa-user-tie"></i>
                Add Interviewer
              </button>
            </div>
          </div>

          <!-- Interviewer Form -->
          <div *ngIf="showInterviewerForm()" class="form-container">
            <form [formGroup]="interviewerForm" (ngSubmit)="createInterviewer()" class="create-form">
              <h3>Add New Interviewer</h3>
              
              <div class="form-group">
                <label for="interviewer-user">Select User</label>
                <select id="interviewer-user" formControlName="userId" class="form-input">
                  <option value="">Select an Admin or Viewer</option>
                  <option *ngFor="let user of eligibleInterviewers()" [value]="user.userId">
                    {{ user.name }} ({{ user.email }}) - {{ user.role }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="interviewer-calendar">Calendar URL</label>
                <input
                  type="url"
                  id="interviewer-calendar"
                  formControlName="calendarUrl"
                  placeholder="https://calendly.com/your-link"
                  class="form-input"
                />
                <small class="form-hint">Enter your Google Calendar or Calendly URL for scheduling</small>
              </div>

              <div class="form-actions">
                <button type="button" class="secondary-button" (click)="toggleInterviewerForm()">
                  Cancel
                </button>
                <button type="submit" class="primary-button" [disabled]="interviewerForm.invalid || isSubmitting()">
                  <i class="fas fa-user-tie"></i>
                  Add Interviewer
                </button>
              </div>
            </form>
          </div>

          <!-- Interviewers List -->
          <div *ngIf="interviewers().length === 0" class="empty-state">
            <i class="fas fa-user-tie"></i>
            <h3>No Interviewers Found</h3>
            <p>Add your first interviewer to enable Phase 4 interviews.</p>
          </div>

          <div *ngIf="interviewers().length > 0" class="interviewers-container">
            <div class="admin-users-grid">
              <div *ngFor="let interviewer of interviewers()" class="admin-card">
                <div class="admin-header">
                  <div class="admin-info">
                    <h4>{{ interviewer.name }}</h4>
                    <p class="admin-email">{{ interviewer.email }}</p>
                  </div>
                  <span class="role-badge interviewer-role">
                    <i class="fas fa-user-tie"></i>
                    Interviewer
                  </span>
                </div>
                
                <div class="admin-details">
                  <div class="detail-item">
                    <strong>Role:</strong> {{ interviewer.role }}
                  </div>
                  <div class="detail-item">
                    <strong>Calendar:</strong> 
                    <a [href]="interviewer.calendarUrl" target="_blank" class="calendar-link">
                      <i class="fas fa-external-link-alt"></i>
                      View Calendar
                    </a>
                  </div>
                  <div class="detail-item">
                    <strong>Status:</strong> 
                    <span [class]="'status-indicator ' + (interviewer.isActive ? 'active' : 'inactive')">
                      {{ interviewer.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                </div>

                <div class="admin-actions">
                  <button class="action-button edit-button" (click)="editInterviewerCalendar(interviewer)">
                    <i class="fas fa-edit"></i>
                    Edit Calendar
                  </button>
                  <button class="action-button delete-button" (click)="deleteInterviewer(interviewer.id!)">
                    <i class="fas fa-trash"></i>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        <!-- Settings View -->
        <div *ngIf="currentView() === 'settings' && !isLoading()" class="settings-view">
          <div class="view-header">
            <h2>
              <i class="fas fa-cog"></i>
              System Settings
            </h2>
          </div>

          <div class="settings-content">
            <div class="setting-group">
              <div class="setting-item">
                <div class="setting-info">
                  <h3>Skip Phase 2 (Webinar)</h3>
                  <p>When enabled, applicants will automatically advance from Phase 1 directly to Phase 3, skipping the webinar requirement. This does not affect existing Phase 2 applicants.</p>
                </div>
                <div class="setting-control">
                  <label class="toggle-switch">
                    <input 
                      type="checkbox" 
                      [checked]="systemSettings().skipPhase2"
                      (change)="toggleSkipPhase2()"
                      [disabled]="isSubmitting()">
                    <span class="slider"></span>
                  </label>
                  <span class="toggle-label">
                    {{ systemSettings().skipPhase2 ? 'Enabled' : 'Disabled' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    /* Main Container & Layout */
    .admin-container {
      min-height: 100vh;
      background: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* Header */
    .admin-header {
      background: #1e40af;
      color: white;
      padding: 1.5rem 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header-content {
      width: 100%;
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

    .admin-info h1 {
      margin: 0 0 0.25rem 0;
      font-size: 1.4rem;
      font-weight: 600;
    }

    .admin-info p {
      margin: 0;
      opacity: 0.85;
      font-size: 0.85rem;
      font-weight: 400;
    }

    .sign-out-button {
      background: rgba(255, 255, 255, 0.15);
      border: 1.5px solid rgba(255, 255, 255, 0.4);
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      transition: all 0.3s ease;
      white-space: nowrap;
      backdrop-filter: blur(4px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .sign-out-button:hover {
      background: rgba(255, 255, 255, 0.25);
      border-color: rgba(255, 255, 255, 0.6);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .sign-out-button:active {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }

    /* Test Links */
    .test-links {
      display: flex;
      gap: 0.75rem;
    }

    .test-link-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
      white-space: nowrap;
      backdrop-filter: blur(4px);
    }

    .test-link-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-1px);
    }

    .test-link-btn:active {
      transform: translateY(0);
    }

    @media (max-width: 1024px) {
      .test-links {
        display: none;
      }
    }

    /* Navigation */
    .admin-nav {
      background: #1e40af;
      padding: 1rem 2rem;
      display: flex;
      gap: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .nav-button {
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid transparent;
      padding: 0.75rem 1.25rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      color: white;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .nav-button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .nav-button.active {
      background: white;
      color: #1e40af;
      border-color: white;
    }

    /* Main Content */
    .admin-main {
      padding: 2rem;
      background: white;
      min-height: calc(100vh - 140px);
      max-width: 1400px;
      margin: 0 auto;
    }

    /* States */
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 200px;
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
      margin-bottom: 2rem;
    }

    .success-message {
      background: #f0fdf4;
      color: #166534;
      padding: 1rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      border-left: 4px solid #22c55e;
      margin-bottom: 2rem;
    }

    /* View Header */
    .view-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e5e7eb;
    }

    .view-header h2 {
      margin: 0;
      color: #1f2937;
      font-size: 1.5rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Buttons */
    .primary-button {
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

    .primary-button:hover:not(:disabled) {
      background: #2563eb;
    }

    .primary-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .secondary-button {
      background: #6b7280;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: background-color 0.3s;
    }

    .secondary-button:hover {
      background: #374151;
    }

    .secondary-button.small {
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
    }

    .delete-button.small {
      padding: 0.5rem;
      font-size: 0.8rem;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    .delete-button.small:hover {
      background: #b91c1c;
    }

    /* Tables */
    .table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid #e5e7eb;
    }

    .applicants-table {
      width: 100%;
      border-collapse: collapse;
    }

    .applicants-table th {
      background: #f8fafc;
      color: #374151;
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.9rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .applicants-table td {
      padding: 1rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .table-row {
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .table-row:hover {
      background: #f8fafc;
    }

    .email-link {
      color: #3b82f6;
      text-decoration: none;
    }

    .email-link:hover {
      text-decoration: underline;
    }

    .table-action-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.3s;
    }

    .table-action-btn:hover {
      background: #2563eb;
    }

    /* Status Badges */
    .status-badge, .phase-badge, .role-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status-accepted { background: #dcfce7; color: #166534; }
    .status-rejected { background: #fee2e2; color: #991b1b; }
    .status-pending { background: #fef3c7; color: #92400e; }

    /* Phase status badges */
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

    .phase-signup { background: #e0e7ff; color: #3730a3; }
    .phase-webinar { background: #fef3c7; color: #92400e; }
    .phase-in-depth-application { background: #dbeafe; color: #1e40af; }
    .phase-interview { background: #e0e7ff; color: #5b21b6; }
    .phase-accepted { background: #dcfce7; color: #166534; }

    .admin-role { background: #f3f4f6; color: #374151; }
    .viewer-role { background: #f3f4f6; color: #374151; }
    .interviewer-role { background: #f3f4f6; color: #374151; }

    /* Sub Navigation */
    .admin-sub-nav {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 1rem;
    }

    .sub-nav-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: white;
      color: #6b7280;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .sub-nav-button:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    .sub-nav-button.active {
      background: #3b82f6;
      border-color: #3b82f6;
      color: white;
    }

    .sub-view-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .calendar-link {
      color: #3b82f6;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
    }

    .calendar-link:hover {
      text-decoration: underline;
    }

    .form-hint {
      color: #6b7280;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .edit-button {
      background: #10b981;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background-color 0.2s;
    }

    .edit-button:hover {
      background: #059669;
    }

    /* Forms */
    .form-container {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .create-form h3 {
      margin: 0 0 1.5rem 0;
      color: #374151;
      font-size: 1.3rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.9rem;
      transition: border-color 0.3s;
    }

    .form-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
    }

    .cohort-input-container {
      display: flex;
      align-items: center;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      overflow: hidden;
    }

    .cohort-prefix {
      background: #f3f4f6;
      color: #374151;
      padding: 0.75rem 1rem;
      font-weight: 500;
      font-size: 0.9rem;
      border-right: 1px solid #d1d5db;
    }

    .cohort-number-input {
      border: none !important;
      border-radius: 0 !important;
      flex: 1;
      min-width: 80px;
    }

    .cohort-number-input:focus {
      box-shadow: none !important;
    }

    .cohort-input-container:focus-within {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-helper {
      color: #6b7280;
      font-size: 0.8rem;
      margin-top: 0.25rem;
      font-weight: 500;
    }

    .datetime-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .date-input {
      flex: 2;
    }

    .time-input {
      flex: 1;
      min-width: 100px;
    }

    .timezone-note {
      color: #6b7280;
      font-size: 0.75rem;
      margin-top: 0.25rem;
      display: block;
      font-style: italic;
    }

    /* Form Sections */
    .form-section {
      border-top: 1px solid #e5e7eb;
      margin-top: 2rem;
      padding-top: 2rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .section-header h4 {
      margin: 0;
      color: #374151;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Webinar Forms */
    .webinars-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .empty-webinars {
      text-align: center;
      padding: 2rem;
      color: #6b7280;
      background: #f9fafb;
      border-radius: 8px;
      border: 2px dashed #d1d5db;
    }

    .empty-webinars p {
      margin: 0;
      font-style: italic;
    }

    .webinar-item {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.5rem;
    }

    .webinar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .webinar-header h5 {
      margin: 0;
      color: #374151;
      font-size: 1rem;
      font-weight: 600;
    }

    .webinar-code-display {
      margin: 1rem 0;
      padding: 1rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }

    .code-section label {
      display: block;
      font-weight: 600;
      color: #374151;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .code-value {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .code-value .code {
      font-family: 'Courier New', monospace;
      font-size: 1.25rem;
      font-weight: bold;
      background: #1f2937;
      color: #f9fafb;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      letter-spacing: 0.1em;
    }

    .copy-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .copy-btn:hover {
      background: #2563eb;
    }

    .copy-btn i {
      font-size: 0.875rem;
    }

    /* Grids */
    .cohorts-grid, .admin-users-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .cohort-card, .admin-card {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .cohort-card:hover, .admin-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    /* Cohort Cards */
    .cohort-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .cohort-header h3 {
      margin: 0;
      color: #374151;
      font-size: 1.2rem;
    }

    .timeline-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      padding: 0.5rem;
      background: #f8fafc;
      border-radius: 6px;
      font-size: 0.9rem;
    }

    .timeline-item i {
      color: #3b82f6;
      width: 16px;
    }

    /* Admin Cards */
    .admin-card .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      background: transparent;
      color: inherit;
      padding: 0;
      box-shadow: none;
    }

    .admin-info h4 {
      margin: 0 0 0.25rem 0;
      color: #374151;
      font-size: 1.1rem;
    }

    .admin-email {
      margin: 0;
      color: #6b7280;
      font-size: 0.9rem;
    }

    .admin-details {
      margin-bottom: 1rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .status-indicator.active { color: #059669; }
    .status-indicator.inactive { color: #dc2626; }

    /* Actions */
    .cohort-actions, .admin-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-button {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }

    .edit-button { background: #3b82f6; color: white; }
    .edit-button:hover { background: #2563eb; }

    .delete-button { background: #dc2626; color: white; }
    .delete-button:hover { background: #b91c1c; }

    .toggle-button { background: #6b7280; color: white; }
    .toggle-button:hover { background: #374151; }

    /* Sections */
    .admin-users-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .admin-section h3, .viewer-section h3 {
      color: #374151;
      font-size: 1.2rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Empty States */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: #6b7280;
    }

    .empty-state i {
      font-size: 4rem;
      margin-bottom: 1rem;
      color: #9ca3af;
    }

    .empty-state h3 {
      margin: 0 0 1rem 0;
      color: #374151;
      font-size: 1.3rem;
    }

    /* Pagination */
    .controls {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
    }

    .page-size-selector label {
      font-weight: 500;
      color: #374151;
    }

    .page-size-selector select {
      padding: 0.5rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: white;
      cursor: pointer;
    }

    .pagination-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-top: 1px solid #e5e7eb;
      background: #f8fafc;
    }

    .pagination-info {
      font-size: 0.9rem;
      color: #6b7280;
    }

    .pagination-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .pagination-btn {
      background: white;
      border: 1px solid #d1d5db;
      color: #374151;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }

    .pagination-btn:hover:not(:disabled) {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    .pagination-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .admin-main { padding: 1rem; }
      .header-content { 
        flex-direction: column; 
        gap: 1rem; 
        align-items: center;
      }
      .header-left {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }
      .logo {
        height: 36px;
      }
      .admin-info h1 {
        font-size: 1.2rem;
      }
      .admin-nav { flex-direction: column; }
      .view-header { flex-direction: column; gap: 1rem; align-items: flex-start; }
      .form-row { grid-template-columns: 1fr; }
      .cohorts-grid, .admin-users-grid { grid-template-columns: 1fr; }
      .form-actions { flex-direction: column; }
      .pagination-controls { flex-direction: column; gap: 1rem; }
      .pagination-buttons { justify-content: center; }
      .sign-out-button {
        padding: 0.6rem 1.2rem;
        font-size: 0.85rem;
      }
      .setting-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
      .setting-control {
        align-self: stretch;
        justify-content: space-between;
      }
    }

    /* Settings View */
    .settings-view {
      max-width: 1200px;
    }

    .settings-content {
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }

    .setting-group {
      border-bottom: 1px solid #e5e7eb;
    }

    .setting-group:last-child {
      border-bottom: none;
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2rem;
      gap: 2rem;
    }

    .setting-info h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
    }

    .setting-info p {
      margin: 0;
      color: #6b7280;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .setting-control {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-shrink: 0;
    }

    .toggle-label {
      font-weight: 500;
      font-size: 0.875rem;
      color: #374151;
      min-width: 60px;
    }

    /* Toggle Switch */
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 60px;
      height: 34px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 17px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    .toggle-switch input:checked + .slider {
      background-color: #3b82f6;
    }

    .toggle-switch input:focus + .slider {
      box-shadow: 0 0 1px #3b82f6;
    }

    .toggle-switch input:checked + .slider:before {
      transform: translateX(26px);
    }

    .toggle-switch input:disabled + .slider {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private cohortService = inject(CohortService);
  private userService = inject(UserService);
  private settingsService = inject(SettingsService);
  private interviewerService = inject(InterviewerService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // Signals
  currentView = signal<AdminView>('applicants');
  currentAdminSubView = signal<AdminSubView>('users');
  isLoading = signal(false);
  isSubmitting = signal(false);
  error = signal('');
  success = signal('');

  currentUser = signal<AdminUser | ViewerUser | null>(null);
  applicants = signal<ApplicantUser[]>([]);
  cohorts = signal<Cohort[]>([]);
  adminUsers = signal<AdminUser[]>([]);
  viewerUsers = signal<ViewerUser[]>([]);
  interviewers = signal<Interviewer[]>([]);
  eligibleInterviewers = signal<{userId: string, name: string, email: string, role: UserRole}[]>([]);
  systemSettings = signal<SystemSettings>({ skipPhase2: true });

  // Pagination
  pageSize = signal(25);
  currentPage = signal(1);
  
  // Pagination states for each view
  applicantsLastDoc = signal<DocumentSnapshot | null>(null);
  cohortsLastDoc = signal<DocumentSnapshot | null>(null);
  adminsLastDoc = signal<DocumentSnapshot | null>(null);
  viewersLastDoc = signal<DocumentSnapshot | null>(null);
  
  hasMoreApplicants = signal(false);
  hasMoreCohorts = signal(false);
  hasMoreAdmins = signal(false);
  hasMoreViewers = signal(false);
  
  pageSizeOptions = [5, 10, 25, 50, 100];

  // Form states
  showCohortForm = signal(false);
  showAdminForm = signal(false);
  showInterviewerForm = signal(false);
  editingCohort = signal<Cohort | null>(null);

  // Forms
  cohortForm: FormGroup;
  adminForm: FormGroup;
  interviewerForm: FormGroup;

  constructor() {
    this.cohortForm = this.fb.group({
      cohortNumber: ['', [Validators.required, Validators.min(1), Validators.max(999)]],
      applicationStartDate: ['', Validators.required],
      applicationStartTime: ['', Validators.required],
      applicationEndDate: ['', Validators.required],
      applicationEndTime: ['', Validators.required],
      programStartDate: ['', Validators.required],
      programEndDate: ['', Validators.required],
      webinars: this.fb.array([])
    });

    this.adminForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['ADMIN', Validators.required]
    });

    this.interviewerForm = this.fb.group({
      userId: ['', Validators.required],
      calendarUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]]
    });
  }

  get webinars(): FormArray {
    return this.cohortForm.get('webinars') as FormArray;
  }

  ngOnInit() {
    this.loadCurrentUser();
    this.loadData();
    this.loadSettings();
  }

  private loadCurrentUser() {
    this.authService.currentUser$.subscribe(user => {
      if (user && (user.role === UserRole.ADMIN || user.role === UserRole.VIEWER)) {
        this.currentUser.set(user as AdminUser | ViewerUser);
      }
    });
  }

  private async loadData() {
    try {
      this.isLoading.set(true);
      this.error.set('');

      if (this.currentView() === 'applicants') {
        await this.loadApplicantsPage(true);
      } else if (this.currentView() === 'cohorts') {
        await this.loadCohortsPage(true);
      } else if (this.currentView() === 'admin') {
        await Promise.all([
          this.loadAdminsPage(true),
          this.loadViewersPage(true),
          this.loadInterviewers(),
          this.loadEligibleInterviewers()
        ]);
      }
    } catch (error: any) {
      this.error.set(error.message || 'Failed to load data');
    } finally {
      this.isLoading.set(false);
    }
  }

  switchView(view: AdminView) {
    this.currentView.set(view);
    this.success.set('');
    this.error.set('');
    this.resetPagination();
    if (view === 'settings') {
      this.loadSettings();
    } else {
      this.loadData();
    }
  }

  async signOut() {
    try {
      await this.authService.signOut();
      this.router.navigate(['/auth/login']);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  navigateToOpenAITest() {
    this.router.navigate(['/admin/openai-test']);
  }

  // Timezone conversion methods
  private getETOffset(date: Date): string {
    const year = date.getFullYear();
    
    // Calculate 2nd Sunday in March
    const march = new Date(year, 2, 1); // March 1st
    const daysUntilFirstSunday = (7 - march.getDay()) % 7;
    const firstSundayMarch = 1 + daysUntilFirstSunday;
    const secondSundayMarch = firstSundayMarch + 7;
    const edtStart = new Date(year, 2, secondSundayMarch, 2, 0, 0); // 2 AM
    
    // Calculate 1st Sunday in November
    const november = new Date(year, 10, 1); // November 1st
    const daysUntilFirstSundayNov = (7 - november.getDay()) % 7;
    const firstSundayNovember = 1 + daysUntilFirstSundayNov;
    const edtEnd = new Date(year, 10, firstSundayNovember, 2, 0, 0); // 2 AM
    
    // Check if date is within EDT period
    const isEDT = date >= edtStart && date < edtEnd;
    
    // Return proper ET offset (EST = -05:00, EDT = -04:00)
    return isEDT ? '-04:00' : '-05:00';
  }

  // Extract time for form display (convert from UTC back to ET)
  private extractTimeInET(date: Date | any): string {
    let dateObj: Date;
    
    // Handle Firestore Timestamp objects
    if (date && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else if (date) {
      dateObj = new Date(date);
    } else {
      console.error('No date provided to extractTimeInET:', date);
      return '';
    }
    
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date passed to extractTimeInET:', date);
      return '';
    }
    
    const etTime = dateObj.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return etTime;
  }

  // Extract date for form display (convert from UTC back to ET)
  private extractDateInET(date: Date | any): string {
    let dateObj: Date;
    
    // Handle Firestore Timestamp objects
    if (date && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else if (date) {
      dateObj = new Date(date);
    } else {
      console.error('No date provided to extractDateInET:', date);
      return '';
    }
    
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date passed to extractDateInET:', date);
      return '';
    }
    
    const etDate = dateObj.toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return etDate;
  }

  convertETToUTC(dateString: string, timeString: string): Date {
    if (!dateString || !timeString) {
      throw new Error('Both date and time are required');
    }
    
    // Parse date components
    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Create date treating the input as ET timezone
    const etOffset = this.getETOffset(new Date(year, month - 1, day));
    const etISOString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000${etOffset}`;
    
    return new Date(etISOString);
  }

  convertETDateToUTC(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return this.convertETToUTC(dateString, '00:00');
  }

  // Applicants methods
  viewApplicantDetails(applicant: ApplicantUser) {
    this.router.navigate(['/admin/applicant', applicant.userId]);
  }

  getPhaseDisplayName(phase: Phase): string {
    const phaseNames = {
      [Phase.SIGNUP]: 'Sign Up',
      [Phase.WEBINAR]: 'Webinar',
      [Phase.IN_DEPTH_APPLICATION]: 'Application',
      [Phase.INTERVIEW]: 'Interview',
      [Phase.ACCEPTED]: 'Accepted'
    };
    return phaseNames[phase] || phase;
  }

  getStatusDisplayName(status: ApplicationStatus): string {
    const statusNames = {
      [ApplicationStatus.PHASE_1]: 'Phase 1',
      [ApplicationStatus.PHASE_2]: 'Phase 2',
      [ApplicationStatus.PHASE_3]: 'Phase 3',
      [ApplicationStatus.PHASE_3_IN_PROGRESS]: 'Phase 3 In Progress',
      [ApplicationStatus.PHASE_3_SUBMITTED]: 'Phase 3 Submitted',
      [ApplicationStatus.PHASE_3_REJECTED]: 'Phase 3 Rejected',
      [ApplicationStatus.PHASE_4]: 'Phase 4 (Interview)',
      [ApplicationStatus.PHASE_4_INTERVIEW_SCHEDULED]: 'Phase 4 Interview Scheduled',
      [ApplicationStatus.PHASE_4_POST_INTERVIEW]: 'Phase 4 Post Interview',
      [ApplicationStatus.PHASE_4_REJECTED]: 'Phase 4 Rejected',
      [ApplicationStatus.ACCEPTED]: 'Accepted'
    };
    return statusNames[status] || status;
  }

  getCohortName(cohortId: string): string {
    const cohort = this.cohorts().find(c => c.id === cohortId);
    return cohort?.name || 'Unknown';
  }

  // Cohort methods
  toggleCohortForm() {
    this.showCohortForm.set(!this.showCohortForm());
    if (!this.showCohortForm()) {
      this.cohortForm.reset();
      this.editingCohort.set(null);
      this.webinars.clear();
    }
  }

  editCohort(cohort: Cohort) {
    if (!cohort.id) {
      this.error.set('Cannot edit cohort: missing ID');
      return;
    }
    
    this.editingCohort.set(cohort);
    
    // Extract cohort number from name (e.g., "Cohort #001" -> 1)
    const cohortNumber = parseInt(cohort.name.replace(/\D/g, ''), 10) || 1;
    
    // Convert UTC dates to ET for editing
    this.cohortForm.patchValue({
      cohortNumber: cohortNumber,
      applicationStartDate: this.extractDateInET(cohort.applicationStartDate),
      applicationStartTime: this.extractTimeInET(cohort.applicationStartDate),
      applicationEndDate: this.extractDateInET(cohort.applicationEndDate),
      applicationEndTime: this.extractTimeInET(cohort.applicationEndDate),
      programStartDate: this.extractDateInET(cohort.programStartDate),
      programEndDate: this.extractDateInET(cohort.programEndDate)
    });

    // Clear existing webinars and add cohort webinars
    this.webinars.clear();
    if (cohort.webinars && cohort.webinars.length > 0) {
      cohort.webinars.forEach(webinar => {
        this.webinars.push(this.fb.group({
          date: [this.extractDateInET(webinar.timestamp), Validators.required],
          time: [this.extractTimeInET(webinar.timestamp), Validators.required],
          link: [webinar.link, [Validators.required, Validators.pattern(/^https?:\/\/.+/)]]
        }));
      });
    }
    
    this.showCohortForm.set(true);
  }

  formatCohortName(cohortNumber: number): string {
    if (!cohortNumber) return 'Cohort #000';
    return `Cohort #${cohortNumber.toString().padStart(3, '0')}`;
  }

  getCohortPreview(): string {
    const cohortNumber = this.cohortForm.get('cohortNumber')?.value;
    return this.formatCohortName(cohortNumber);
  }

  addWebinar() {
    const webinarGroup = this.fb.group({
      date: ['', Validators.required],
      time: ['', Validators.required],
      link: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]]
    });
    
    this.webinars.push(webinarGroup);
  }

  removeWebinar(index: number) {
    this.webinars.removeAt(index);
  }

  getWebinarCode(index: number): string | null {
    // For existing webinars from database - check if we're editing a cohort
    const editingCohort = this.editingCohort();
    if (editingCohort?.webinars && editingCohort.webinars[index]) {
      return editingCohort.webinars[index].code || null;
    }
    return null;
  }

  async copyWebinarCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      this.success.set('Webinar code copied to clipboard!');
      setTimeout(() => this.success.set(''), 2000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      this.success.set(`Webinar code: ${code}`);
      setTimeout(() => this.success.set(''), 5000);
    }
  }

  async saveCohort() {
    if (this.cohortForm.invalid || this.isSubmitting()) return;

    try {
      this.isSubmitting.set(true);
      this.error.set('');

      const formValue = this.cohortForm.value;
      const cohortName = this.formatCohortName(formValue.cohortNumber);
      
      // Convert ET dates to UTC
      const applicationStartUTC = this.convertETToUTC(formValue.applicationStartDate, formValue.applicationStartTime);
      const applicationEndUTC = this.convertETToUTC(formValue.applicationEndDate, formValue.applicationEndTime);
      const programStartUTC = this.convertETDateToUTC(formValue.programStartDate);
      const programEndUTC = this.convertETDateToUTC(formValue.programEndDate);
      
      // Convert webinar dates to UTC
      const webinars: Partial<Webinar>[] = formValue.webinars?.map((webinar: any, index: number) => ({
        num: index + 1,
        timestamp: this.convertETToUTC(webinar.date, webinar.time),
        link: webinar.link,
        code: this.generateWebinarCode()
      })) || [];
      
      const editingCohort = this.editingCohort();
      
      if (editingCohort && editingCohort.id) {
        // Update existing cohort
        await this.cohortService.updateCohort(editingCohort.id, {
          name: cohortName,
          applicationStartDate: applicationStartUTC,
          applicationEndDate: applicationEndUTC,
          programStartDate: programStartUTC,
          programEndDate: programEndUTC,
          webinars: webinars
        });
        
        this.success.set('Cohort updated successfully!');
        // Ensure we stay on cohorts view and refresh
        this.currentView.set('cohorts');
        await this.loadCohortsPage(true);
      } else {
        // Create new cohort
        await this.cohortService.createCohort({
          name: cohortName,
          applicationStartDate: applicationStartUTC,
          applicationEndDate: applicationEndUTC,
          programStartDate: programStartUTC,
          programEndDate: programEndUTC,
          webinars: webinars
        });

        this.success.set('Cohort created successfully!');
        // Ensure we stay on cohorts view and refresh
        this.currentView.set('cohorts');
        await this.loadCohortsPage(true);
      }

      this.toggleCohortForm();
      setTimeout(() => this.success.set(''), 5000);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to save cohort');
      setTimeout(() => this.error.set(''), 5000);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private generateWebinarCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  getCohortStatus(cohort: Cohort): string {
    const now = new Date();
    if (now < cohort.applicationStartDate) return 'upcoming';
    if (now <= cohort.applicationEndDate) return 'accepting';
    if (now < cohort.programStartDate) return 'closed';
    if (now <= cohort.programEndDate) return 'in-progress';
    return 'completed';
  }

  getCohortStatusDisplay(cohort: Cohort): string {
    const status = this.getCohortStatus(cohort);
    const statusNames = {
      upcoming: 'Upcoming',
      accepting: 'Accepting Applications',
      closed: 'Applications Closed',
      'in-progress': 'In Progress',
      completed: 'Completed'
    };
    return statusNames[status as keyof typeof statusNames] || status;
  }

  async deleteCohort(cohortId: string) {
    if (!confirm('Are you sure you want to delete this cohort?')) return;

    this.isSubmitting.set(true);
    try {
      await this.cohortService.deleteCohort(cohortId);
      this.success.set('Cohort deleted successfully!');
      setTimeout(() => this.success.set(''), 5000);
      
      // Ensure we stay on cohorts view and refresh
      this.currentView.set('cohorts');
      await this.loadCohortsPage(true);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to delete cohort');
      setTimeout(() => this.error.set(''), 5000);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // Admin management methods
  toggleAdminForm() {
    this.showAdminForm.set(!this.showAdminForm());
    if (!this.showAdminForm()) {
      this.adminForm.reset({ role: 'ADMIN' });
    }
  }

  async createAdmin() {
    if (this.adminForm.invalid || this.isSubmitting()) return;

    try {
      this.isSubmitting.set(true);
      this.error.set('');

      const formValue = this.adminForm.value;
      
      const userId = await this.userService.createUser({
        name: formValue.name,
        email: formValue.email,
        role: formValue.role
      });
      
      // Reload the current view data
      await this.loadData();
      
      this.success.set(`${formValue.role === 'ADMIN' ? 'Admin' : 'Viewer'} created successfully!`);
      this.toggleAdminForm();
      
      setTimeout(() => this.success.set(''), 5000);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to create user');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async toggleAdminStatus(admin: AdminUser) {
    try {
      const newStatus = !admin.isActive;
      await this.userService.toggleAdminStatus(admin.userId, newStatus);
      
      this.adminUsers.update(admins => 
        admins.map(a => a.userId === admin.userId ? { ...a, isActive: newStatus } : a)
      );
      
      this.success.set(`Admin ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      setTimeout(() => this.success.set(''), 3000);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to update admin status');
    }
  }

  async toggleViewerAccess(viewer: ViewerUser) {
    try {
      const newAccess = !viewer.canView;
      await this.userService.toggleViewerAccess(viewer.userId, newAccess);
      
      this.viewerUsers.update(viewers => 
        viewers.map(v => v.userId === viewer.userId ? { ...v, canView: newAccess } : v)
      );
      
      this.success.set(`Viewer access ${newAccess ? 'granted' : 'revoked'} successfully!`);
      setTimeout(() => this.success.set(''), 3000);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to update viewer access');
    }
  }

  async deleteAdminUser(userId: string) {
    if (!confirm('Are you sure you want to remove this admin?')) return;
    
    try {
      await this.userService.deleteUser(userId);
      this.adminUsers.update(admins => admins.filter(a => a.userId !== userId));
      this.success.set('Admin removed successfully!');
      setTimeout(() => this.success.set(''), 3000);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to remove admin');
    }
  }

  async deleteViewerUser(userId: string) {
    if (!confirm('Are you sure you want to remove this viewer?')) return;
    
    try {
      await this.userService.deleteUser(userId);
      this.viewerUsers.update(viewers => viewers.filter(v => v.userId !== userId));
      this.success.set('Viewer removed successfully!');
      setTimeout(() => this.success.set(''), 3000);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to remove viewer');
    }
  }

  // Interviewer Management Methods
  switchAdminSubView(subView: AdminSubView) {
    this.currentAdminSubView.set(subView);
  }

  async loadInterviewers() {
    try {
      const interviewers = await this.interviewerService.getAllInterviewers();
      this.interviewers.set(interviewers);
    } catch (error: any) {
      console.error('Error loading interviewers:', error);
    }
  }

  async loadEligibleInterviewers() {
    try {
      const eligible = await this.interviewerService.getEligibleInterviewers();
      this.eligibleInterviewers.set(eligible);
    } catch (error: any) {
      console.error('Error loading eligible interviewers:', error);
    }
  }

  toggleInterviewerForm() {
    this.showInterviewerForm.set(!this.showInterviewerForm());
    if (!this.showInterviewerForm()) {
      this.interviewerForm.reset();
    }
  }

  async createInterviewer() {
    if (this.interviewerForm.invalid || this.isSubmitting()) return;

    try {
      this.isSubmitting.set(true);
      this.error.set('');

      const formValue = this.interviewerForm.value;
      
      await this.interviewerService.createInterviewer({
        userId: formValue.userId,
        calendarUrl: formValue.calendarUrl
      });
      
      this.success.set('Interviewer created successfully!');
      this.toggleInterviewerForm();
      await this.loadInterviewers();
      await this.loadEligibleInterviewers();
      
      setTimeout(() => this.success.set(''), 5000);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to create interviewer');
      setTimeout(() => this.error.set(''), 5000);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async deleteInterviewer(interviewerId: string) {
    if (!confirm('Are you sure you want to remove this interviewer?')) return;
    
    try {
      await this.interviewerService.deleteInterviewer(interviewerId);
      this.interviewers.update(interviewers => interviewers.filter(i => i.id !== interviewerId));
      await this.loadEligibleInterviewers(); // Refresh eligible list
      
      this.success.set('Interviewer removed successfully!');
      setTimeout(() => this.success.set(''), 3000);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to remove interviewer');
      setTimeout(() => this.error.set(''), 5000);
    }
  }

  async updateInterviewerCalendar(interviewer: Interviewer, newCalendarUrl: string) {
    try {
      await this.interviewerService.updateInterviewer(interviewer.id!, {
        calendarUrl: newCalendarUrl
      });
      
      this.interviewers.update(interviewers => 
        interviewers.map(i => i.id === interviewer.id ? { ...i, calendarUrl: newCalendarUrl } : i)
      );
      
      this.success.set('Calendar URL updated successfully!');
      setTimeout(() => this.success.set(''), 3000);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to update calendar URL');
      setTimeout(() => this.error.set(''), 5000);
    }
  }

  getSelectedUserName(userId: string): string {
    const user = this.eligibleInterviewers().find(u => u.userId === userId);
    return user ? user.name : 'Select a user';
  }

  editInterviewerCalendar(interviewer: Interviewer) {
    const newUrl = prompt('Enter new calendar URL:', interviewer.calendarUrl);
    if (newUrl && newUrl !== interviewer.calendarUrl) {
      this.updateInterviewerCalendar(interviewer, newUrl);
    }
  }

  async deleteApplicant(applicant: ApplicantUser) {
    const confirmMessage = `Are you sure you want to delete applicant "${applicant.name}"?\n\nThis will permanently remove:\n- Their user account\n- Their application data\n- All associated records\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) return;
    
    try {
      // TODO: Also delete associated application data when implemented
      await this.userService.deleteUser(applicant.userId);
      
      // Update the local state
      this.applicants.update(apps => apps.filter(a => a.userId !== applicant.userId));
      
      this.success.set(`Applicant "${applicant.name}" deleted successfully!`);
      setTimeout(() => this.success.set(''), 3000);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to delete applicant');
      setTimeout(() => this.error.set(''), 5000);
    }
  }

  // Pagination methods
  resetPagination() {
    this.currentPage.set(1);
    this.applicantsLastDoc.set(null);
    this.cohortsLastDoc.set(null);
    this.adminsLastDoc.set(null);
    this.viewersLastDoc.set(null);
    this.hasMoreApplicants.set(false);
    this.hasMoreCohorts.set(false);
    this.hasMoreAdmins.set(false);
    this.hasMoreViewers.set(false);
  }

  changePageSize(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.pageSize.set(parseInt(target.value));
    this.resetPagination();
    this.loadData();
  }

  async loadApplicantsPage(reset = false) {
    try {
      const lastDoc = reset ? null : this.applicantsLastDoc();
      const result = await this.userService.getApplicantsPaginated(this.pageSize(), lastDoc || undefined);
      
      if (reset) {
        this.applicants.set(result.users);
      } else {
        this.applicants.update(current => [...current, ...result.users]);
      }
      
      this.applicantsLastDoc.set(result.lastDoc);
      this.hasMoreApplicants.set(result.hasMore);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to load applicants');
    }
  }

  async loadCohortsPage(reset = false) {
    try {
      const lastDoc = reset ? null : this.cohortsLastDoc();
      const result = await this.cohortService.getCohortsPaginated(this.pageSize(), lastDoc || undefined);
      
      if (reset) {
        this.cohorts.set(result.cohorts);
      } else {
        this.cohorts.update(current => [...current, ...result.cohorts]);
      }
      
      this.cohortsLastDoc.set(result.lastDoc);
      this.hasMoreCohorts.set(result.hasMore);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to load cohorts');
    }
  }

  async loadAdminsPage(reset = false) {
    try {
      const lastDoc = reset ? null : this.adminsLastDoc();
      const result = await this.userService.getAdminsPaginated(this.pageSize(), lastDoc || undefined);
      
      if (reset) {
        this.adminUsers.set(result.users);
      } else {
        this.adminUsers.update(current => [...current, ...result.users]);
      }
      
      this.adminsLastDoc.set(result.lastDoc);
      this.hasMoreAdmins.set(result.hasMore);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to load admins');
    }
  }

  async loadViewersPage(reset = false) {
    try {
      const lastDoc = reset ? null : this.viewersLastDoc();
      const result = await this.userService.getViewersPaginated(this.pageSize(), lastDoc || undefined);
      
      if (reset) {
        this.viewerUsers.set(result.users);
      } else {
        this.viewerUsers.update(current => [...current, ...result.users]);
      }
      
      this.viewersLastDoc.set(result.lastDoc);
      this.hasMoreViewers.set(result.hasMore);
    } catch (error: any) {
      this.error.set(error.message || 'Failed to load viewers');
    }
  }

  async loadNextPage(view: string) {
    this.currentPage.update(page => page + 1);
    
    switch (view) {
      case 'applicants':
        await this.loadApplicantsPage();
        break;
      case 'cohorts':
        await this.loadCohortsPage();
        break;
      case 'admins':
        await this.loadAdminsPage();
        break;
      case 'viewers':
        await this.loadViewersPage();
        break;
    }
  }

  async loadPreviousPage(view: string) {
    if (this.currentPage() <= 1) return;
    
    this.currentPage.update(page => page - 1);
    this.resetPagination();
    
    // Load from beginning up to current page
    let currentPageNum = 1;
    const targetPage = this.currentPage();
    
    while (currentPageNum < targetPage) {
      switch (view) {
        case 'applicants':
          await this.loadApplicantsPage();
          break;
        case 'cohorts':
          await this.loadCohortsPage();
          break;
        case 'admins':
          await this.loadAdminsPage();
          break;
        case 'viewers':
          await this.loadViewersPage();
          break;
      }
      currentPageNum++;
    }
  }

  // Settings Methods
  async loadSettings() {
    try {
      this.isLoading.set(true);
      const settings = await this.settingsService.getSettings();
      this.systemSettings.set(settings);
    } catch (error) {
      console.error('Error loading settings:', error);
      this.error.set('Failed to load system settings');
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleSkipPhase2() {
    try {
      this.isSubmitting.set(true);
      this.error.set('');
      this.success.set('');

      const newValue = await this.settingsService.toggleSkipPhase2();
      
      // Update local state
      this.systemSettings.update(settings => ({
        ...settings,
        skipPhase2: newValue
      }));

      this.success.set(`Phase 2 skip ${newValue ? 'enabled' : 'disabled'} successfully`);
    } catch (error: any) {
      console.error('Error toggling Phase 2 skip:', error);
      this.error.set(error.message || 'Failed to update setting');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}