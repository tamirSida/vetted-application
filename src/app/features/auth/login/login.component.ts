import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1>Vetted Accelerator</h1>
        <h2>Sign In</h2>
        <p>Authentication page coming soon...</p>
        
        <div class="quick-links">
          <h3>Quick Navigation:</h3>
          <a href="/dashboard" class="nav-link">Applicant Dashboard</a>
          <a href="/admin" class="nav-link">Admin Dashboard</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 1rem;
    }

    .login-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      text-align: center;
      max-width: 400px;
      width: 100%;
    }

    h1 {
      color: #374151;
      margin-bottom: 0.5rem;
      font-size: 1.8rem;
    }

    h2 {
      color: #6b7280;
      margin-bottom: 1rem;
      font-size: 1.3rem;
    }

    p {
      color: #9ca3af;
      margin-bottom: 2rem;
    }

    .quick-links h3 {
      color: #374151;
      margin-bottom: 1rem;
      font-size: 1rem;
    }

    .nav-link {
      display: block;
      background: #667eea;
      color: white;
      padding: 0.75rem 1rem;
      margin-bottom: 0.5rem;
      text-decoration: none;
      border-radius: 6px;
      transition: background-color 0.3s;
    }

    .nav-link:hover {
      background: #5a67d8;
    }
  `]
})
export class LoginComponent {}