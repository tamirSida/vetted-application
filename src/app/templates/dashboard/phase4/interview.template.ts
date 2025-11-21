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
          <p>We were impressed with your application for the Vetted Accelerator and would like to invite you to the final phase of our process which is a Zoom meeting with one of our team members:</p>
          
          <div class="interview-section">
            <p>[interviewer Schedule]</p>
            <p><strong>BUTTON TEXT - Schedule with [Interviewer Name], [Interviewer Title]</strong></p>
          </div>
          
          <p>Please click the link to schedule a time that works best for you.</p>
          
          <p>Feel free to reach out to Eden at eden@thevetted.vc, if you have any questions before the meeting.</p>
          
          <!-- Component will be rendered by parent component -->
        </div>
      </div>
    `;
  }
}