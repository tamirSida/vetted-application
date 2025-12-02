import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-pdf-test',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="pdf-test-container">
      <div class="test-header">
        <h1>PDF Parsing Test</h1>
        <p>Test PDF parsing functionality for AI analysis</p>
      </div>

      <div class="test-form">
        <form [formGroup]="testForm" (ngSubmit)="testPdfParsing()">
          <div class="form-group">
            <label for="pdfUrl">PDF URL to Test:</label>
            <input
              type="url"
              id="pdfUrl"
              formControlName="pdfUrl"
              placeholder="Enter PDF URL"
              class="form-control"
            />
            @if (testForm.get('pdfUrl')?.touched && testForm.get('pdfUrl')?.errors) {
              <div class="error-message">Please enter a valid URL</div>
            }
          </div>

          <button type="submit" [disabled]="isLoading() || testForm.invalid" class="test-button">
            @if (isLoading()) {
              <i class="fas fa-spinner fa-spin"></i>
              Testing PDF Parse...
            } @else {
              <i class="fas fa-file-pdf"></i>
              Test PDF Parsing
            }
          </button>
        </form>
      </div>

      @if (error()) {
        <div class="error-result">
          <h3>Error:</h3>
          <pre>{{ error() }}</pre>
        </div>
      }

      @if (result()) {
        <div class="success-result">
          <h3>PDF Text Content:</h3>
          <div class="text-preview">
            <pre>{{ result() | slice:0:1000 }}{{ (result().length || 0) > 1000 ? '...' : '' }}</pre>
          </div>
          <div class="text-stats">
            <p><strong>Total Characters:</strong> {{ result().length || 0 }}</p>
            <p><strong>Total Words:</strong> {{ getWordCount(result()) }}</p>
          </div>
        </div>
      }

      @if (functionResponse()) {
        <div class="function-result">
          <h3>Netlify Function Response:</h3>
          <pre>{{ functionResponse() }}</pre>
        </div>
      }
    </div>
  `,
  styles: [`
    .pdf-test-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .test-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .test-header h1 {
      color: #1a365d;
      margin-bottom: 0.5rem;
    }

    .test-form {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #2d3748;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 1rem;
      box-sizing: border-box;
    }

    .form-control:focus {
      outline: none;
      border-color: #3182ce;
      box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
    }

    .error-message {
      color: #e53e3e;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .test-button {
      background: #3182ce;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .test-button:hover:not(:disabled) {
      background: #2c5aa0;
    }

    .test-button:disabled {
      background: #a0aec0;
      cursor: not-allowed;
    }

    .error-result {
      background: #fed7d7;
      border: 1px solid #fc8181;
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .error-result h3 {
      color: #c53030;
      margin-bottom: 0.5rem;
    }

    .success-result {
      background: #c6f6d5;
      border: 1px solid #68d391;
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .success-result h3 {
      color: #2f855a;
      margin-bottom: 1rem;
    }

    .text-preview {
      background: white;
      padding: 1rem;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      max-height: 400px;
      overflow-y: auto;
      margin-bottom: 1rem;
    }

    .text-preview pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      margin: 0;
      font-family: monospace;
      font-size: 0.875rem;
      line-height: 1.4;
    }

    .text-stats {
      display: flex;
      gap: 2rem;
      margin-top: 1rem;
    }

    .text-stats p {
      margin: 0;
      color: #2d3748;
    }

    .function-result {
      background: #bee3f8;
      border: 1px solid #63b3ed;
      padding: 1rem;
      border-radius: 6px;
    }

    .function-result h3 {
      color: #1e4a72;
      margin-bottom: 1rem;
    }

    .function-result pre {
      background: white;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 0.875rem;
    }

    .fas {
      width: 1em;
    }
  `]
})
export class PdfTestComponent {
  private fb = inject(FormBuilder);

  isLoading = signal(false);
  error = signal<string>('');
  result = signal<string>('');
  functionResponse = signal<string>('');

  testForm: FormGroup;

  constructor() {
    this.testForm = this.fb.group({
      pdfUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/i)]]
    });
  }

  async testPdfParsing(): Promise<void> {
    if (this.testForm.invalid) {
      this.testForm.markAllAsTouched();
      return;
    }

    try {
      this.isLoading.set(true);
      this.error.set('');
      this.result.set('');
      this.functionResponse.set('');

      const pdfUrl = this.testForm.get('pdfUrl')?.value;

      // Test the Netlify function directly
      const response = await fetch('/.netlify/functions/pdf-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pdfUrl }),
      });

      const responseData = await response.text();
      this.functionResponse.set(responseData);

      if (response.ok) {
        const parsedResponse = JSON.parse(responseData);
        if (parsedResponse.success) {
          this.result.set(parsedResponse.text);
        } else {
          this.error.set(parsedResponse.error || 'PDF parsing failed');
        }
      } else {
        this.error.set(`Function call failed: ${response.status} ${response.statusText}`);
      }

    } catch (error: any) {
      this.error.set(`Test failed: ${error.message}`);
    } finally {
      this.isLoading.set(false);
    }
  }

  getWordCount(text: string | null): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).length;
  }
}