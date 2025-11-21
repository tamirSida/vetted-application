import { ApplicantUser } from '../../../models';

export interface Phase1SignupTemplateData {
  applicant: ApplicantUser;
}

export class Phase1SignupDashboardTemplate {
  static generateTemplate(data: Phase1SignupTemplateData): string {
    return `
      <div class="phase-content">
        <div class="phase-card">
          <h2>Phase 1: Application Signup</h2>
          <p>Complete your initial application to get started with the Vetted Accelerator program.</p>
          <a href="/application/phase1" class="btn btn-primary">
            <i class="fas fa-edit"></i>
            Start Application
          </a>
        </div>
      </div>
    `;
  }
}