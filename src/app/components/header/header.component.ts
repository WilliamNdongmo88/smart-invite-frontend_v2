import { Component, ElementRef, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { map, Observable, Subscription, take } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { CommunicationService } from '../../services/share.service';
import { NotificationService } from '../../services/notification.service';
import { AlertConfig, ConditionalAlertComponent } from "../conditional-alert/conditional-alert.component";
import { HeaderTourService } from '../../../tours/services/header-tour.service';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'invitation' | 'reminder' | 'update' | 'info';
  date: string;
  is_read: boolean;
}
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, ConditionalAlertComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  showNotifications = signal(false);
  isAuthenticated = false;
  isShowHeader = true;
  isScanning = false;
  currentUser: User | null = null;
  current_user =  'gratuit';
  private authSub!: Subscription;
  isMobile!: Observable<boolean>;
  eventId: number = 0;
  errorMessage = '';
  // Configuration de l'alerte conditionnelle
  alertConfig: AlertConfig = {
    condition: false,
    type: 'error',
    title: '',
    message: '',
    icon: '',
    dismissible: true,
    autoClose: true,
    duration: 10000,
  };

  touchStartX = 0;
  touchEndX = 0;
  swipeThreshold = 150; // pixels pour déclencher la suppression
  isSwiping = false;
  notifications: Notification[] = [];
  globalPaymentStatus: 'validated' | 'pending' | 'rejected' | null = null;
  isRedirectToPricing = signal(false);

  constructor(
              private elementRef: ElementRef,
              private router: Router,
              private route: ActivatedRoute,
              private authService: AuthService,
              private breakpointObserver: BreakpointObserver,
              private notificationService: NotificationService,
              private communicationService: CommunicationService,
              private headerTourService: HeaderTourService
            ) {}

  mobileMenuOpen = signal(false);

  ngOnInit() {
    this.isMobile = this.breakpointObserver.observe(['(max-width: 768px)']).pipe(map(res => res.matches));

    // On écoute l’état d’authentification
    this.authSub = this.authService.isAuthenticated$.subscribe(status => {
      this.isAuthenticated = status;
      //console.log('[HeaderComponent] isAuthenticated ? ', this.isAuthenticated);
    });
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      //console.log("---this.currentUser :: ", this.currentUser)
    });
    this.communicationService.message$.subscribe(msg => {
      //console.log("msg = ", localStorage.getItem('variable'));
      if (msg && msg!==null && msg!==undefined) {
        //console.log("[msg] :: ", msg);
        this.isScanning = true;
        this.eventId = msg;
      }else{
        this.isScanning = false;
      }
    });
    this.communicationService.triggerAction$.subscribe(() => {
      //console.log("HeaderCmp → Trigger reçu ! Exécution de la méthode loadNotifications()");
      this.loadNotifications();
    });
    this.communicationService.triggerAction$.subscribe((action) => {
      if (action) {
        this.isAuthenticated = action;
      }
      if (action === 'refresh') {
        this.loadNotifications();
      }
      if (action === 'hide-scanner') {
        this.isScanning = false;
      }
    });
    this.communicationService.request$.subscribe(data => {
      if (!data) {
        this.isMobile
          .pipe(take(1))
          .subscribe(isMobile => {
            if (isMobile) {
              this.toggleMobileMenu(true);
              this.isRedirectToPricing.set(true);
            }
            this.headerTourService.initTour();
            setTimeout(() => {
              this.headerTourService.start();
              const tour = this.headerTourService.getTour();
              tour.once('complete', () => {
                if (isMobile) {
                  this.toggleMobileMenu(false);
                }
                this.communicationService.sendResponse(true);
              });
              tour.once('cancel', () => {
                if (isMobile) {
                  this.toggleMobileMenu(false);
                }
                this.communicationService.sendResponse(true);
              });
            }, isMobile ? 800 : 500);
          });
      }
    });
    this.loadNotifications();
    this.loadPaymentStatusForCurrentEvent();
  }

  loadPaymentStatusForCurrentEvent(){
    if (this.currentUser?.id) {
      this.authService.getUserInfoForfait(this.currentUser.id).subscribe(
        (response) => {
          this.currentUser = {
              id: response.user.id,
              email: response.user.email,
              name: response.user.name,
              role: response.user.role
            }
        },
        (error) => {
          //console.log("Message :: ", error.message);
          this.errorMessage = error.message || 'Erreur de connexion';
        }
      );
    }
  }

  loadNotifications() {
    this.notificationService.getNotifications().subscribe({
      next: (responses: any[]) => {
        if (!this.currentUser) return;

        this.notifications = responses
          .filter(n => n.organizer_id === this.currentUser?.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        ////console.log('[loadNotifications] notifications filtrées ::', this.notifications);
      },
      error: (err) => {
        this.errorMessage = err?.error?.error || 'Erreur lors du chargement des notifications.';
        console.error('[loadNotifications] Erreur :', err);
        if(err.status === 401 && this.errorMessage.includes(`Token invalide ou expiré`)){
          this.loadAlertModal();
        }
      }
    });
  }

  navigateToAccueil() {
    this.router.navigate(['/user-accueil']);
  }

  goToPageAdmin() {
    if(this.currentUser?.role !== 'admin'){
      return;
    }
    this.router.navigate(['/admin']);
    this.isScanning = false;
    this.mobileMenuOpen.set(false);
  }

  goToPageManager() {
    if(this.currentUser?.role !== 'manager'){
      return;
    }
    this.router.navigate(['/manager']);
    this.isScanning = false;
    this.mobileMenuOpen.set(false);
  }

  goToProfile() {
    this.router.navigate(['/profile']);
    this.mobileMenuOpen.set(false);
  }

  toggleMobileMenu(force?: boolean) {
    if (force === false) {
      this.mobileMenuOpen.set(false);
      return;
    }
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
    if(!this.isRedirectToPricing) this.navigateToPricing();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);

    if (!clickedInside && this.mobileMenuOpen()) {
      this.toggleMobileMenu(false);
    }
    if(!clickedInside && this.showNotifications()){
      this.closeNotifications();
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  scrollTo(sectionId: string) {
    //console.log('Scroll vers la section :', sectionId);
    const element = document.getElementById(sectionId);

    if (element) {
      const headerOffset = 30;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  navigateToHome(){
    this.router.navigate(['/']);
    this.scrollTo('features');
  }

  logout() {
    this.authService.logout();
    this.isAuthenticated = false;
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    this.authSub.unsubscribe();
  }

  navigateToScanner() {
    //console.log('isAuthenticated:', this.isAuthenticated);

    if (!this.isAuthenticated) {
      this.router.navigate(
        ['/login'],
        { queryParams: { returnUrl: '/event-scan-list' } }
      );
      return;
    }

    // Si déjà connecté
    this.router.navigate(['/scanner']);
  }


  scanQrCode(){
    const currentUrl = this.router.url;
    ////console.log('Current path :', currentUrl);
    const segments = currentUrl.split('/').filter(Boolean);

    const basePath = `${segments[0]}/${segments[1]}`;
    ////console.log('Base path :', basePath);

    if(currentUrl.includes('guests')){
      this.send(this.eventId);
      this.router.navigate([basePath,'qr-scanner']);
      this.mobileMenuOpen.set(false);
    }else{
      this.send(this.eventId);
      this.router.navigate(['events',this.eventId,'qr-scanner']);
      this.mobileMenuOpen.set(false);
    }
  }

  send(message: any) {
    this.communicationService.sendMessage(message);
  }

  get unreadNotifications(): number {
    return this.notifications.filter(n => !n.is_read).length;
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'invitation':
        return '📧';
      case 'reminder':
        return '🔔';
      case 'update':
        return '📝';
      case 'info':
        return 'ℹ️';
      default:
        return '📬';
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  markAsRead(notification: Notification) {
    notification.is_read = true;
    this.notificationService.updateNotificationReading(notification.id, notification.is_read).subscribe({
      next: (response: any) => {
        //console.log('[markAsRead] response :: ', response);
      },
      error: (err) => {
        this.errorMessage = err.error.error || 'Erreur lors de la mise a jour.';
        console.error('[markAsRead] Erreur :', err.error.error);
      }
    });
  }

  markAsReadAndDelete(notification: Notification){
    notification.is_read = true;
    this.notificationService.deleteNotificationReading(notification.id).subscribe({
      next: (response: any) => {
        //console.log('[markAsReadAndDelete] response :: ', response);
        this.notifications = this.notifications.filter(n => n.id != notification.id);
      },
      error: (err) => {
        this.errorMessage = err.error.error || 'Erreur lors de la mise a jour.';
        console.error('[markAsReadAndDelete] Erreur :', err.error.error);
      }
    });
  }

startTouch(event: TouchEvent, notification: any) {
  this.touchStartX = event.touches[0].clientX - 150;
  this.isSwiping = false;
}

moveTouch(event: TouchEvent, notification: any) {
  const deltaX = event.touches[0].clientX - (this.touchStartX + 150);
  const notifItem = (event.target as HTMLElement).closest('.notification-item') as HTMLElement;

  if (notifItem) {
    notifItem.style.transform = `translateX(${deltaX}px)`;
    notifItem.style.transition = 'none';
  }

  // Si le mouvement dépasse un petit seuil, on considère que c'est un swipe
  if (Math.abs(deltaX) > 150) {
    this.isSwiping = true;
  }

  this.touchEndX = event.touches[0].clientX;
}

endTouch(event: TouchEvent, notification: any) {
  const deltaX = this.touchEndX - (this.touchStartX + 150);
  const notifItem = (event.target as HTMLElement).closest('.notification-item') as HTMLElement;

  if (notifItem) {
    notifItem.style.transition = 'transform 0.3s ease';
    notifItem.style.transform = 'translateX(0)';
  }

  if (this.touchEndX != 0 && Math.abs(deltaX) > this.swipeThreshold) {
    this.markAsReadAndDelete(notification);
    this.touchEndX = 0;
  }
}

  navigateToPricing() {
    this.router.navigate(['/payment']);
  }

  openNotifications() {
    this.showNotifications.set(true);
  }

  closeNotifications() {
    this.showNotifications.set(false);
  }

  loadAlertModal() {
    //console.log("### Message :: ", this.errorMessage);
    // Notification si token expiré
    if (this.errorMessage.includes(`Token invalide ou expiré`)) {
      this.alertConfig = {
        condition: true,
        type: 'error',
        title: 'Token invalide ou expiré',
        message: 'Veuillez vous reconnecter s\'il vous plaît',
        icon: '✕',
        dismissible: true,
        autoClose: true,
        duration: 5000,
      };
    }
  }
}

