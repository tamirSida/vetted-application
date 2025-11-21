import { ApplicantUser } from '../../../models';

export interface Phase3ApplicationTemplateData {
  applicant: ApplicantUser;
}

export class Phase3ApplicationDashboardTemplate {
  static generateTemplate(data: Phase3ApplicationTemplateData): string {
    return `
      <div class="phase-content">
        <div class="phase-card">
          <h2>Phase 3: In-Depth Application</h2>
          <p>Complete your detailed application with technical assessment and essay questions.</p>
          <!-- Component will be rendered by parent component -->
        </div>
      </div>
    `;
  }
}