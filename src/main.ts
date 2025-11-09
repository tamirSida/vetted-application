import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Suppress AngularFire injection context warnings
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = function(...args: any[]) {
    // Suppress specific AngularFire warnings
    const message = args[0];
    if (typeof message === 'string' && (
      message.includes('Firebase API called outside injection context') ||
      message.includes('Calling Firebase APIs outside of an Injection context')
    )) {
      return; // Don't log these warnings
    }
    // Log all other warnings normally
    originalWarn.apply(console, args);
  };
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
