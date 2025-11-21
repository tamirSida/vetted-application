import { ApplicantUser } from '../../../models';

export interface Phase2WebinarTemplateData {
  applicant: ApplicantUser;
}

export class Phase2WebinarDashboardTemplate {
  static generateTemplate(data: Phase2WebinarTemplateData): string {
    return `
      <div class="phase-content">
        <div class="phase-card">
          <h2>Phase 2: Webinar Attendance</h2>
          <p>Attend one of our webinars to learn more about the Vetted Accelerator program.</p>
          <!-- Component will be rendered by parent component -->
        </div>
      </div>
    `;
  }
}