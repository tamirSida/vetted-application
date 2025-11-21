import { ApplicantUser } from '../../../models';

export interface Phase5AcceptedTemplateData {
  applicant: ApplicantUser;
}

export class Phase5AcceptedDashboardTemplate {
  static generateTemplate(data: Phase5AcceptedTemplateData): string {
    return `
      <div class="phase-content">
        <div class="phase-card">
          <h2>Phase 5: Accepted</h2>
          <p>Congratulations! You have been accepted to the Vetted Accelerator program.</p>
          <!-- Component will be rendered by parent component -->
        </div>
      </div>
    `;
  }
}