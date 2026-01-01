import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take, combineLatest, filter, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ApplicationService } from '../services/application.service';
import { ApplicationSettingsService } from '../services/application-settings.service';
import { UserRole, ApplicantUser, Phase, ApplicationStatus } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ApplicationAccessGuard implements CanActivate {
  private authService = inject(AuthService);
  private applicationService = inject(ApplicationService);
  private applicationSettingsService = inject(ApplicationSettingsService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return combineLatest([
      this.authService.authInitialized$,
      this.authService.currentUser$,
      this.applicationSettingsService.applicationSettings$
    ]).pipe(
      filter(([authInitialized, _, __]) => authInitialized), // Wait for auth to initialize
      take(1),
      switchMap(async ([_, currentUser, applicationSettings]) => {
        // Allow access for admin and viewer users (they can always access)
        if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.VIEWER) {
          return true;
        }

        // For applicant users, check application toggle and user phase/status
        if (currentUser?.role === UserRole.APPLICANT) {
          const applicant = currentUser as ApplicantUser;

          // Block access to Phase 3 form if already submitted (prevents auto-save from overwriting)
          if (state.url === '/application/phase3' && applicant.status === ApplicationStatus.PHASE_3_SUBMITTED) {
            console.log('🚫 Phase 3 already submitted, redirecting to dashboard');
            this.router.navigate(['/dashboard']);
            return false;
          }

          // If applications are stopped, check user's progress
          if (!applicationSettings.acceptingApplications) {
            // Allow access if user is in Phase 3 and has already submitted
            if (applicant.phase === Phase.IN_DEPTH_APPLICATION) {
              try {
                const phase3App = await this.applicationService.getPhase3Application(applicant.userId, applicant.cohortId);
                // Allow if they have submitted their Phase 3 application
                if (phase3App && (phase3App.status === 'SUBMITTED' || phase3App.status === 'UNDER_REVIEW' || phase3App.status === 'COMPLETED')) {
                  return true;
                }
              } catch (error) {
                console.error('Error checking Phase 3 application status:', error);
              }
            }
            
            // Allow access if user is in Phase 4 (INTERVIEW) or Phase 5 (ACCEPTED) 
            if (applicant.phase === Phase.INTERVIEW || applicant.phase === Phase.ACCEPTED) {
              return true;
            }
            
            // Block access for Phase 1, Phase 2, and Phase 3 (not submitted)
            this.router.navigate(['/dashboard']);
            return false;
          }
          
          // If applications are accepting, allow access
          return true;
        }

        // No user - allow access to Phase 1 (signup) but block other phases
        if (state.url === '/application/phase1') {
          return true; // Allow unauthenticated users to access signup
        }
        
        // For other application phases, redirect to login
        this.router.navigate(['/auth/login']);
        return false;
      })
    );
  }
}