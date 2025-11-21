import { ApplicantUser } from '../../../models';

export interface Phase1PendingTemplateData {
  applicant: ApplicantUser;
  submissionDate?: Date;
}

export class Phase1PendingDashboardTemplate {
  static generateTemplate(data: Phase1PendingTemplateData): string {
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
      <div class="status-message pending">
        <div class="status-icon">⏳</div>
        <h3>Account Under Review</h3>
        <p>Your account is pending approval. We will be in touch soon!</p>
        <small>Submitted on ${submissionDateDisplay}</small>
      </div>
    `;
  }
}
