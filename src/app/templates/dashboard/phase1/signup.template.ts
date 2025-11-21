import { ApplicantUser } from '../../../models';

export interface Phase1SignupTemplateData {
  applicant: ApplicantUser;
}

export class Phase1SignupDashboardTemplate {
  static generateTemplate(data: Phase1SignupTemplateData): string {
    return `
      <div class="phase-content">
        <div class="phase-card">
          <h2>Initial Signup</h2>
          <p>Complete your initial signup to get started with the Vetted Accelerator program.</p>
          <a href="/application/phase1" class="btn btn-primary">
            <i class="fas fa-edit"></i>
            Sign Up
          </a>
        </div>
      </div>
    `;
  }
}
