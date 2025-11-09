# Vetted Accelerator Application System

## High Level Design (HLD)

### Technology Stack
- **Frontend Framework**: Angular 20.3.0 (standalone components, latest)
- **Authentication & Database**: Firebase (Auth, Firestore NoSQL, Storage)
- **Deployment**: Netlify (hosting + cloud functions)
- **AI Integration**: OpenAI (LLM grading for applications)
- **Email Service**: Resend
- **Architecture**: Mobile-first, template-oriented, constants-driven

### System Architecture

#### User Hierarchy (3 Levels)
1. **Admin Users**
   - Full read/write permissions
   - Can manage cohorts, users, applications
   - Can override phase progression rules
   - Access to shared admin/viewer dashboard

2. **Viewer Users** 
   - Read-only access to all data
   - Same dashboard as admins but no write permissions
   - Can view applicant progress and applications

3. **Applicant Users**
   - Restricted to their own application flow
   - Progress through sequential phases
   - Access to dedicated applicant dashboard

#### Data Models

##### Core Entities
```typescript
// Phase Enum
enum Phase {
  SIGNUP = 'SIGNUP',
  WEBINAR = 'WEBINAR', 
  IN_DEPTH_APPLICATION = 'IN_DEPTH_APPLICATION',
  INTERVIEW = 'INTERVIEW',
  ACCEPTED = 'ACCEPTED'
}

// User Hierarchy
interface BaseUser {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminUser extends BaseUser {
  role: UserRole.ADMIN;
  isActive: boolean;
  permissions?: string[];
}

interface ViewerUser extends BaseUser {
  role: UserRole.VIEWER;
  canView: boolean;
  accessLevel?: 'BASIC' | 'FULL';
}

interface ApplicantUser extends BaseUser {
  role: UserRole.APPLICANT;
  applicationId?: string;
  isAccepted: boolean | null;
  phase: Phase;
  webinarAttended: number | null; // Webinar ID number
  interviewerId?: string; // Admin user ID
  cohortId: string;
  profileData?: object;
}
```

##### Cohort Management
```typescript
interface Cohort {
  id?: string;
  programStartDate: Date; // UTC
  programEndDate: Date; // UTC  
  applicationStartDate: Date; // UTC
  applicationEndDate: Date; // UTC
  name: string;
  description?: string;
  maxApplicants?: number;
  currentApplicantCount?: number;
  isActive: boolean;
  webinars: Webinar[];
  createdAt: Date;
  updatedAt: Date;
}
```

##### Webinar System
```typescript
interface Webinar {
  id?: string;
  num: number; // Auto-incremented 1,2,3...
  link: string; // Zoom meeting URL
  timestamp: Date; // UTC
  code: string; // 6-character unique code
  cohortId: string;
  title?: string;
  description?: string;
  maxAttendees?: number;
  attendeeCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

##### Application System
```typescript
interface BaseApplication {
  id?: string;
  applicantId: string;
  cohortId: string;
  phase: Phase;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewerId?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'COMPLETED' | 'REJECTED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Phase1Application extends BaseApplication {
  phase: Phase.SIGNUP;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    linkedIn?: string;
    location: string;
  };
  backgroundInfo: {
    currentRole?: string;
    company?: string;
    experience: string;
    education: string;
    skills: string[];
  };
  motivation: {
    whyApplying: string;
    goals: string;
    availability: string;
  };
}

interface Phase3Application extends BaseApplication {
  phase: Phase.IN_DEPTH_APPLICATION;
  technicalAssessment: {
    portfolioLinks: string[];
    githubProfile?: string;
    codeExamples: object[];
  };
  essayQuestions: {
    questionId: string;
    question: string;
    answer: string;
    wordCount: number;
  }[];
  llmGrading?: {
    score: number;
    feedback: string;
    gradedAt: Date;
    gradingModel: string;
  };
}
```

### Core Business Logic

#### Phase Progression Rules
1. **Sequential Progression**: Users must complete phases in order (SIGNUP → WEBINAR → IN_DEPTH_APPLICATION → INTERVIEW → ACCEPTED)
2. **Admin Override**: Admins can move users to any phase regardless of prerequisites
3. **Automatic Progression**: Only webinar code validation triggers automatic advancement
4. **Manual Gates**: Admin approval required for Phase 1→2 and Phase 3→4

#### Webinar System
- **6-Character Codes**: Auto-generated unique codes (A-Z, 0-9)
- **Time-Based Validation**: Codes valid for 24 hours after webinar
- **One-Time Use**: Each applicant can only attend one webinar
- **Auto-Progression**: Valid code automatically moves Phase 2 → Phase 3

#### Cohort Management
- **No Overlaps**: System prevents overlapping application or program periods
- **Single Active Cohort**: Only one cohort can have active applications at a time
- **UTC Storage**: All timestamps stored in UTC, input in ET and converted
- **Date Validation**: Enforces logical date progression (app period before program period)

#### Application Draft/Submit System
- **Phase 1 & 3 Applications**: Can be saved as drafts and resumed
- **Status Tracking**: DRAFT → SUBMITTED → UNDER_REVIEW → COMPLETED/REJECTED
- **Admin Review**: Full visibility into application progress and content

## Functional Requirements (FR)

### FR-1: User Authentication & Authorization
- **FR-1.1**: Firebase Authentication integration
- **FR-1.2**: Role-based access control (Admin/Viewer/Applicant)
- **FR-1.3**: Session management and auto-logout
- **FR-1.4**: Password reset and email verification

### FR-2: Applicant Dashboard Experience
- **FR-2.1**: **Phase 1 (Sign Up)**
  - Display Phase 1 application form
  - Save draft functionality
  - Submit for review
  - Show "pending approval" status after submission

- **FR-2.2**: **Phase 2 (Webinar)**
  - Display webinar dates and links
  - "I attended a webinar" button
  - 6-character code input field
  - Automatic progression on valid code

- **FR-2.3**: **Phase 3 (Application)**
  - Display in-depth application form
  - Save draft functionality  
  - Submit for review
  - Show "under review" status after submission

- **FR-2.4**: **Phase 4 (Interview)**
  - Display interviewer contact information
  - Show interview scheduling status

- **FR-2.5**: **Phase 5 (Accepted)**
  - Congratulations message
  - Next steps information

### FR-3: Admin/Viewer Dashboard
- **FR-3.1**: **Applicant Management**
  - View all applicants and their phases
  - Review Phase 1 and Phase 3 applications
  - Approve/reject applications
  - Manually advance applicant phases (admin override)
  - Assign interviewers

- **FR-3.2**: **Cohort Management**
  - Create new cohorts with ET→UTC conversion
  - Edit cohort details
  - Prevent overlapping cohorts
  - Activate/deactivate cohorts
  - View applicant count per cohort

- **FR-3.3**: **Webinar Management**
  - Create webinars for cohorts
  - Generate unique 6-character codes
  - View webinar attendance
  - Edit webinar details

- **FR-3.4**: **User Management**
  - View all system users
  - Create admin/viewer accounts
  - Manage user permissions
  - Deactivate users

### FR-4: Webinar Code System
- **FR-4.1**: Auto-generate unique 6-character codes (A-Z, 0-9)
- **FR-4.2**: Validate codes within 24-hour window after webinar
- **FR-4.3**: Prevent duplicate webinar attendance
- **FR-4.4**: Record attendance with timestamp and IP
- **FR-4.5**: Automatically advance applicant from Phase 2 → Phase 3

### FR-5: Data Management
- **FR-5.1**: **UTC Timestamp Handling**
  - Store all dates in UTC
  - Accept input in ET timezone
  - Display dates in user's timezone

- **FR-5.2**: **Application Persistence**
  - Save draft applications
  - Allow resume editing before submission
  - Version control for application changes
  - Audit trail of all modifications

- **FR-5.3**: **File Storage**
  - Firebase Storage integration
  - Resume/portfolio uploads
  - Image attachments
  - File size and type validation

### FR-6: Integration Requirements
- **FR-6.1**: **OpenAI Integration**
  - Automated grading of essay questions
  - Feedback generation
  - Score normalization
  - Manual override capabilities

- **FR-6.2**: **Email Notifications (Resend)**
  - Application status updates
  - Phase progression notifications
  - Interview scheduling emails
  - Admin notifications for new submissions

- **FR-6.3**: **Netlify Deployment**
  - Cloud function endpoints
  - Environment configuration
  - Automated deployments
  - Performance monitoring

### FR-7: Mobile-First Design
- **FR-7.1**: Responsive design for all screen sizes
- **FR-7.2**: Touch-friendly interface elements
- **FR-7.3**: Optimized loading for mobile networks
- **FR-7.4**: Progressive Web App capabilities

### FR-8: Security & Compliance
- **FR-8.1**: Secure API endpoints with authentication
- **FR-8.2**: Input validation and sanitization
- **FR-8.3**: Rate limiting on sensitive operations
- **FR-8.4**: Data encryption in transit and at rest
- **FR-8.5**: GDPR compliance for user data

### FR-9: Performance Requirements
- **FR-9.1**: Page load times under 3 seconds
- **FR-9.2**: Real-time updates for phase changes
- **FR-9.3**: Optimized database queries
- **FR-9.4**: Cached static content delivery

### FR-10: Administrative Features
- **FR-10.1**: System analytics and reporting
- **FR-10.2**: Bulk operations for user management
- **FR-10.3**: Data export capabilities
- **FR-10.4**: System configuration management
- **FR-10.5**: Audit logging for all admin actions

## Implementation Status

### ✅ Completed
- Angular 20.3.0 project setup with Firebase integration
- Complete data model implementation
- Authentication service with role-based access control
- Webinar service with code generation and validation
- Cohort service with overlap prevention and UTC handling
- Phase progression service with admin override capabilities
- Route guards and permission system
- Constants and configuration management
- Comprehensive .gitignore setup

### 🚧 In Progress
- UI component development
- Admin/Viewer dashboard implementation
- Applicant dashboard with phase tracking

### ⏳ Pending
- OpenAI integration for LLM grading
- Resend email service integration
- Firebase Storage setup
- Netlify deployment configuration
- Mobile-first responsive design implementation
- Performance optimization
- Testing and quality assurance

## Development Guidelines

### Code Organization
- Feature-based module structure
- Standalone components with Angular 20
- Template-oriented development with extensive constants
- Mobile-first responsive design principles
- Comprehensive TypeScript typing

### Security Best Practices
- Never commit Firebase credentials or API keys
- Use environment variables for all sensitive data
- Implement proper input validation
- Follow principle of least privilege for user permissions
- Regular security audits and dependency updates

### Testing Strategy
- Unit tests for all services and components
- Integration tests for critical user flows
- E2E testing for complete application scenarios
- Performance testing for mobile devices
- Security testing for authentication and authorization

---

*This document serves as the single source of truth for the Vetted Accelerator Application System architecture and requirements. It should be updated as the system evolves.*