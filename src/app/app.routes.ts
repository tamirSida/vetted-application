import { Routes } from '@angular/router';
import { ApplicationAccessGuard } from './guards/application-access.guard';

export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard.component').then(c => c.AdminDashboardComponent)
  },
  {
    path: 'admin/applicant/:id',
    loadComponent: () => import('./features/admin/applicant-detail/applicant-detail.component').then(c => c.ApplicantDetailComponent)
  },
  {
    path: 'admin/openai-test',
    loadComponent: () => import('./features/admin/openai-test/openai-test.component').then(c => c.OpenAITestComponent)
  },
  {
    path: 'admin/pdf-test',
    loadComponent: () => import('./features/admin/pdf-test/pdf-test.component').then(c => c.PdfTestComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/applicant/dashboard/dashboard.component').then(c => c.DashboardComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then(c => c.LoginComponent)
  },
  {
    path: 'application/phase1',
    loadComponent: () => import('./features/applicant/application/phase1/phase1-application.component').then(c => c.Phase1ApplicationComponent),
    canActivate: [ApplicationAccessGuard]
  },
  {
    path: 'application/phase3',
    loadComponent: () => import('./features/applicant/phase3-application/phase3-application.component').then(c => c.Phase3ApplicationTabbedComponent),
    canActivate: [ApplicationAccessGuard]
  },
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  }
];
