import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { InvitationComponent } from './pages/invitation/invitation.component';
import { EventDetailComponent } from './pages/event-detail/event-detail.component';
import { SignupComponent } from './pages/signup/signup.component';
import { LoginComponent } from './pages/login/login.component';
import { AuthGuard } from './guards/auth.guard';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { AddEventComponent } from './pages/add-event/add-event.component';
import { GuestListComponent } from './pages/guests/guest-list.component';
import { GuestDetailComponent } from './pages/guest-detail/guest-detail.component';
import { EditEventComponent } from './pages/edit-event/edit-event.component';
import { EditGuestComponent } from './pages/edit-guest/edit-guest.component';
import { QRScannerComponent } from './pages/qr-scanner/qr-scanner.component';
import { PricingComponent } from './pages/pricing/pricing.component';
import { ContactComponent } from './pages/contact/contact.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { EventScanListComponent } from './pages/event-scan-list/event-scan-list';
import { InvitationEditorComponent } from './pages/invitation-editor/invitation-editor.component';
import { FeedbackComponent } from './components/feedback/feedback.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { MaintenanceComponent } from './pages/maintenance/maintenance.component';
import { TermsOfServiceComponent } from './pages/terms-of-service/terms-of-service.component';
import { PrivacyPolicyComponent } from './pages/privacy-policy/privacy-policy.component';
import { VerificationCodeComponent } from './pages/verification-code/verification-code.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'signup',
    component: SignupComponent,
  },
   {
    path: 'activate-account',
    component: VerificationCodeComponent,
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
  },
  {
    path: 'evenements',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'add-event',
    component: AddEventComponent,
  },
  {
    path: 'events/edit-event/:eventId',
    component: EditEventComponent,
  },
  {
    path: 'events/:eventId',
    component: EventDetailComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'event-scan-list',
    component: EventScanListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'invitations/:token',
    component: InvitationComponent,
    // canActivate: [AuthGuard]
  },
  {
  path: 'invitation-editor',
    component: InvitationEditorComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'feedback',
    component: FeedbackComponent,
    // canActivate: [AuthGuard]
  },
  {
    path: 'maintenance',
    component: MaintenanceComponent,
  },
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'events/:eventId/guests',
    component: GuestListComponent,
  },
  {
    path: 'events/:eventId/guests/:guestId',
    component: GuestDetailComponent,
  },
  {
    path: 'events/:eventId/guests/:guestId/edit',
    component: EditGuestComponent,
  },
  {
    path: 'events/:eventId/qr-scanner',
    component: QRScannerComponent,
  },
  {
    path: 'payment',
    component: PricingComponent,
  },
  {
    path: 'contact',
    component: ContactComponent,
  },
  {
    path: 'terms-of-service',
    component: TermsOfServiceComponent,
  },
  {
    path: 'privacy-policy',
    component: PrivacyPolicyComponent,
  },
  // {
  //   path: '/404',
  //   component: NotFoundComponent,
  // },
  {
    path: '**',
    redirectTo: '',
  },
];
