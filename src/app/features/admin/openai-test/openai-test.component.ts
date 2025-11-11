import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OpenAIService, ProblemCustomerAnalysis } from '../../../services/openai.service';

@Component({
  selector: 'app-openai-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="test-container">
      <div class="test-header">
        <h1>OpenAI Service Test Page</h1>
        <p>Test the Problem & Customer analysis using GPT-5-mini</p>
      </div>

      <div class="test-content">
        <!-- Input Section -->
        <div class="input-section">
          <h2>Input</h2>
          <div class="form-group">
            <label for="problem-text">Problem & Customer Description:</label>
            <textarea 
              id="problem-text"
              [(ngModel)]="problemText"
              placeholder="Enter the customer problem description to analyze..."
              rows="4"
              [disabled]="isLoading()"></textarea>
          </div>
          
          <div class="example-buttons">
            <h3>Try Example Inputs:</h3>
            <div class="button-group">
              <button 
                (click)="loadGoodExample()"
                [disabled]="isLoading()"
                class="example-button good">
                Load Good Example
              </button>
              <button 
                (click)="loadBadExample()"
                [disabled]="isLoading()"
                class="example-button bad">
                Load Bad Example
              </button>
            </div>
          </div>

          <div class="action-buttons">
            <button 
              (click)="analyzeText()"
              [disabled]="isLoading() || !problemText.trim()"
              class="analyze-button">
              @if (isLoading()) {
                <i class="fas fa-spinner fa-spin"></i>
                Analyzing...
              } @else {
                <i class="fas fa-brain"></i>
                Analyze with GPT-5-mini
              }
            </button>
            
            <button 
              (click)="clearResults()"
              [disabled]="isLoading()"
              class="clear-button">
              <i class="fas fa-trash"></i>
              Clear
            </button>
          </div>
        </div>

        <!-- Results Section -->
        @if (error()) {
          <div class="error-section">
            <h2>Error</h2>
            <div class="error-content">
              <i class="fas fa-exclamation-triangle"></i>
              <span>{{ error() }}</span>
            </div>
          </div>
        }

        @if (rawResponse()) {
          <div class="raw-response-section">
            <h2>Raw API Response</h2>
            <div class="json-display">
              <pre>{{ rawResponse() | json }}</pre>
            </div>
          </div>
        }

        @if (analysis()) {
          <div class="analysis-section">
            <h2>Structured Analysis Result</h2>
            
            <!-- Score Card -->
            <div class="score-card">
              <div class="score-display">
                <span class="score-number" [class]="getScoreClass(analysis()!.score)">
                  {{ analysis()!.score }}
                </span>
                <span class="score-label">/ 10</span>
              </div>
              
              <!-- Criteria Indicators -->
              <div class="criteria-indicators">
                <div class="criterion" [class.met]="analysis()!.isSpecific">
                  <i [class]="analysis()!.isSpecific ? 'fas fa-check' : 'fas fa-times'"></i>
                  <span>Specific Target</span>
                </div>
                <div class="criterion" [class.met]="analysis()!.hasClearTarget">
                  <i [class]="analysis()!.hasClearTarget ? 'fas fa-check' : 'fas fa-times'"></i>
                  <span>Clear Target</span>
                </div>
                <div class="criterion" [class.met]="analysis()!.hasDefinedProblem">
                  <i [class]="analysis()!.hasDefinedProblem ? 'fas fa-check' : 'fas fa-times'"></i>
                  <span>Defined Problem</span>
                </div>
              </div>
            </div>

            <!-- Detailed Feedback -->
            <div class="feedback-content">
              <div class="feedback-item">
                <h3><i class="fas fa-comment"></i> Feedback</h3>
                <p>{{ analysis()!.feedback }}</p>
              </div>

              @if (analysis()!.strengths.length > 0) {
                <div class="feedback-item strengths">
                  <h3><i class="fas fa-thumbs-up"></i> Strengths</h3>
                  <ul>
                    @for (strength of analysis()!.strengths; track $index) {
                      <li>{{ strength }}</li>
                    }
                  </ul>
                </div>
              }

              @if (analysis()!.weaknesses.length > 0) {
                <div class="feedback-item weaknesses">
                  <h3><i class="fas fa-thumbs-down"></i> Weaknesses</h3>
                  <ul>
                    @for (weakness of analysis()!.weaknesses; track $index) {
                      <li>{{ weakness }}</li>
                    }
                  </ul>
                </div>
              }

              @if (analysis()!.suggestions.length > 0) {
                <div class="feedback-item suggestions">
                  <h3><i class="fas fa-lightbulb"></i> Suggestions</h3>
                  <ul>
                    @for (suggestion of analysis()!.suggestions; track $index) {
                      <li>{{ suggestion }}</li>
                    }
                  </ul>
                </div>
              }
            </div>

            <!-- Token Usage (if available) -->
            @if (tokenUsage()) {
              <div class="token-usage">
                <h3><i class="fas fa-calculator"></i> Token Usage</h3>
                <div class="usage-stats">
                  <span>Input: {{ tokenUsage()!.input_tokens || 'N/A' }}</span>
                  <span>Output: {{ tokenUsage()!.output_tokens || 'N/A' }}</span>
                  <span>Reasoning: {{ tokenUsage()!.reasoning_tokens || 'N/A' }}</span>
                  <span>Total: {{ tokenUsage()!.total_tokens || 'N/A' }}</span>
                </div>
              </div>
            }
          </div>
        }

        <!-- Examples Reference -->
        <div class="examples-section">
          <h2>Evaluation Criteria Reference</h2>
          
          <div class="examples-grid">
            <div class="examples-column good-examples">
              <h3><i class="fas fa-check-circle"></i> Good Examples (Score 8-10)</h3>
              <ul>
                <li>"Operations managers at independent logistics companies (10–50 trucks) who struggle with route optimization and driver scheduling due to outdated, manual processes."</li>
                <li>"Parents of children with ADHD who feel overwhelmed managing school communication, therapy coordination, and home routines."</li>
                <li>"New dental practice owners in the U.S. who are unsure how to attract their first 100 patients and manage billing and insurance systems."</li>
              </ul>
            </div>
            
            <div class="examples-column bad-examples">
              <h3><i class="fas fa-times-circle"></i> Bad Examples (Score 1-4)</h3>
              <ul>
                <li>"Small businesses that need help with marketing." <em>(Too broad)</em></li>
                <li>"Everyone who wants to be more productive." <em>(Too general)</em></li>
                <li>"Gen Z consumers who like technology." <em>(Vague demographic)</em></li>
                <li>"People who want an easier life." <em>(No actionable insight)</em></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .test-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .test-header {
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e5e7eb;
    }

    .test-header h1 {
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .test-content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Input Section */
    .input-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
    }

    textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-family: inherit;
      resize: vertical;
      min-height: 100px;
    }

    textarea:focus {
      outline: none;
      border-color: #3b82f6;
      ring: 2px;
      ring-color: #3b82f6;
      ring-opacity: 0.5;
    }

    /* Button Styles */
    .button-group, .action-buttons {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .example-button, .analyze-button, .clear-button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s;
    }

    .example-button.good {
      background: #dcfce7;
      color: #166534;
    }

    .example-button.bad {
      background: #fef2f2;
      color: #991b1b;
    }

    .analyze-button {
      background: #3b82f6;
      color: white;
    }

    .clear-button {
      background: #6b7280;
      color: white;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Results Sections */
    .error-section, .analysis-section, .raw-response-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .error-content {
      background: #fef2f2;
      color: #991b1b;
      padding: 1rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Score Card */
    .score-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .score-display {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .score-number {
      font-size: 3rem;
      font-weight: bold;
    }

    .score-number.high { color: #059669; }
    .score-number.medium { color: #d97706; }
    .score-number.low { color: #dc2626; }

    .score-label {
      font-size: 1.5rem;
      color: #6b7280;
    }

    .criteria-indicators {
      display: flex;
      gap: 1rem;
    }

    .criterion {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      background: #f3f4f6;
      color: #6b7280;
    }

    .criterion.met {
      background: #dcfce7;
      color: #166534;
    }

    /* Feedback Content */
    .feedback-content {
      display: grid;
      gap: 1.5rem;
    }

    .feedback-item h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #374151;
      margin-bottom: 0.75rem;
    }

    .feedback-item.strengths h3 { color: #059669; }
    .feedback-item.weaknesses h3 { color: #dc2626; }
    .feedback-item.suggestions h3 { color: #3b82f6; }

    /* JSON Display */
    .json-display {
      background: #1f2937;
      color: #f9fafb;
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
    }

    .json-display pre {
      margin: 0;
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 0.875rem;
    }

    /* Examples Section */
    .examples-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .examples-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    @media (max-width: 768px) {
      .examples-grid {
        grid-template-columns: 1fr;
      }
    }

    .examples-column h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .good-examples h3 { color: #059669; }
    .bad-examples h3 { color: #dc2626; }

    .examples-column ul {
      list-style: none;
      padding: 0;
    }

    .examples-column li {
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      border-radius: 8px;
      line-height: 1.5;
    }

    .good-examples li {
      background: #f0fdf4;
      border-left: 3px solid #22c55e;
    }

    .bad-examples li {
      background: #fef2f2;
      border-left: 3px solid #ef4444;
    }

    .examples-column li em {
      font-style: italic;
      color: #6b7280;
      font-size: 0.9em;
    }

    /* Token Usage */
    .token-usage {
      margin-top: 1.5rem;
      padding: 1rem;
      background: #f8fafc;
      border-radius: 8px;
    }

    .usage-stats {
      display: flex;
      gap: 1rem;
      color: #6b7280;
      font-family: monospace;
    }
  `]
})
export class OpenAITestComponent {
  private openaiService = inject(OpenAIService);

  // Signals for reactive state
  problemText = '';
  isLoading = signal(false);
  analysis = signal<ProblemCustomerAnalysis | null>(null);
  rawResponse = signal<any>(null);
  tokenUsage = signal<any>(null);
  error = signal<string>('');

  // Example texts
  goodExampleText = `Operations managers at independent logistics companies (10–50 trucks) who struggle with route optimization and driver scheduling due to outdated, manual processes.`;
  
  badExampleText = `Small businesses that need help with marketing.`;

  async analyzeText() {
    if (!this.problemText.trim()) {
      this.error.set('Please enter some text to analyze');
      return;
    }

    this.isLoading.set(true);
    this.error.set('');
    this.analysis.set(null);
    this.rawResponse.set(null);
    this.tokenUsage.set(null);

    try {
      console.log('🔍 Starting OpenAI analysis for text:', this.problemText);
      
      // Store the raw response by making the call manually
      const request = {
        model: 'gpt-5-mini',
        input: `You are an expert startup advisor analyzing customer problem descriptions. 

EVALUATION CRITERIA:
- Specific target customer (role, company size, industry)
- Clear problem statement tied to that customer
- Actionable insights vs vague generalizations

GOOD EXAMPLES (Score 8-10):
- "Operations managers at independent logistics companies (10–50 trucks) who struggle with route optimization and driver scheduling due to outdated, manual processes."
- "Parents of children with ADHD who feel overwhelmed managing school communication, therapy coordination, and home routines."
- "New dental practice owners in the U.S. who are unsure how to attract their first 100 patients and manage billing and insurance systems."

BAD EXAMPLES (Score 1-4):
- "Small businesses that need help with marketing." (Too broad)
- "Everyone who wants to be more productive." (Too general)
- "Gen Z consumers who like technology." (Vague demographic)
- "People who want an easier life." (No actionable insight)

Analyze this customer problem description: "${this.problemText}"

Provide analysis in JSON format:
{
  "score": <number 1-10>,
  "isSpecific": <boolean>,
  "hasClearTarget": <boolean>, 
  "hasDefinedProblem": <boolean>,
  "feedback": "<detailed explanation of score>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "suggestions": ["<suggestion 1>", "<suggestion 2>"]
}`,
        reasoning: { effort: 'low' as const },
        text: { verbosity: 'medium' as const },
        max_output_tokens: 800
      };

      const rawResponse = await this.openaiService.callOpenAI(request);
      this.rawResponse.set(rawResponse);
      
      // Set token usage if available
      if (rawResponse.usage) {
        this.tokenUsage.set(rawResponse.usage);
      }

      // Extract and parse JSON from the new Responses API format
      let analysisText: string;
      if (rawResponse.output && rawResponse.output.length > 0) {
        // New Responses API format - get text from the message content
        const messageOutput = rawResponse.output.find((item: any) => item.type === 'message');
        if (messageOutput && messageOutput.content && messageOutput.content.length > 0) {
          analysisText = messageOutput.content[0].text;
        } else {
          throw new Error('No message content found in response');
        }
      } else if (rawResponse.output_text) {
        // Fallback to old format
        analysisText = rawResponse.output_text;
      } else {
        throw new Error('No output found in response');
      }
      
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : analysisText;
      
      const result = JSON.parse(jsonText);
      
      console.log('✅ OpenAI analysis completed:', result);
      this.analysis.set(result);
      
    } catch (error: any) {
      console.error('❌ OpenAI analysis failed:', error);
      this.error.set(error.message || 'Failed to analyze text');
      
      // If the error includes raw response, show it for debugging
      if (error.response) {
        this.rawResponse.set(error.response);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  loadGoodExample() {
    this.problemText = this.goodExampleText;
    this.clearResults();
  }

  loadBadExample() {
    this.problemText = this.badExampleText;
    this.clearResults();
  }

  clearResults() {
    this.analysis.set(null);
    this.rawResponse.set(null);
    this.tokenUsage.set(null);
    this.error.set('');
  }

  getScoreClass(score: number): string {
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }
}