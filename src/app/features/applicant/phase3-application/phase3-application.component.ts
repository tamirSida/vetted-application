import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApplicantUser } from '../../../models';

@Component({
  selector: 'app-phase3-application',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="phase3-container">
      <header class="phase-header">
        <h2>In-Depth Application</h2>
        <p>Complete your detailed application with technical assessment and essay questions.</p>
      </header>

      <div class="placeholder-content">
        <div class="construction-message">
          <div class="construction-icon">🚧</div>
          <h3>In-Depth Application Form</h3>
          <p>This section will include:</p>
          <ul>
            <li>Technical assessment questions</li>
            <li>Portfolio and GitHub profile links</li>
            <li>Essay questions about your experience</li>
            <li>Code examples and project descriptions</li>
            <li>Draft/save functionality</li>
          </ul>
          <p><strong>Coming soon!</strong></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .phase3-container {
      padding: 2rem;
      text-align: center;
    }

    .phase-header h2 {
      color: #374151;
      font-size: 1.8rem;
      margin: 0 0 0.5rem 0;
    }

    .phase-header p {
      color: #6b7280;
      font-size: 1rem;
      margin: 0 0 2rem 0;
    }

    .placeholder-content {
      max-width: 600px;
      margin: 0 auto;
    }

    .construction-message {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 12px;
      padding: 2rem;
    }

    .construction-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .construction-message h3 {
      color: #374151;
      margin-bottom: 1rem;
    }

    .construction-message ul {
      text-align: left;
      margin: 1rem 0;
      padding-left: 1.5rem;
    }

    .construction-message li {
      color: #6b7280;
      margin-bottom: 0.5rem;
    }
  `]
})
export class Phase3ApplicationComponent {
  @Input() applicant!: ApplicantUser;
  @Output() phaseCompleted = new EventEmitter<void>();
}