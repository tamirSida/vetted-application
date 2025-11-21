import { ApplicantUser } from '../../../models';

export interface Phase3SubmittedTemplateData {
  applicant: ApplicantUser;
  submissionDate?: Date;
}

export class Phase3SubmittedDashboardTemplate {
  static generateTemplate(data: Phase3SubmittedTemplateData): string {
    const submissionDateDisplay = data.submissionDate ? 
      new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      }).format(data.submissionDate) : 
      'Recently';

    return `
      <div class="status-message under-review">
        <div class="status-icon">📋</div>
        <h3>Application Under Review</h3>
        <p>We are reviewing your application. This process typically takes 3-5 business days.</p>
        <small>Submitted on ${submissionDateDisplay}</small>
      </div>
    `;
  }
}