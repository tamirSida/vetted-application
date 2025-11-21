import { ApplicantUser } from '../../../models';

export interface Phase4InterviewTemplateData {
  applicant: ApplicantUser;
}

export class Phase4InterviewDashboardTemplate {
  static generateTemplate(data: Phase4InterviewTemplateData): string {
    return `
      <div class="phase-content">
        <div class="phase-card">
          <h2>Phase 4: Interview</h2>
          <p>Schedule and complete your interview with our team.</p>
          <!-- Component will be rendered by parent component -->
        </div>
      </div>
    `;
  }
}