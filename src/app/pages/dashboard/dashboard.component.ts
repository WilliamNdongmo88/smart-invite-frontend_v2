import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { MatIcon } from "@angular/material/icon";
import { EventService } from '../../services/event.service';
import { AuthService, User } from '../../services/auth.service';
import { CommunicationService } from '../../services/share.service';
import { filter, map, Observable } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { SpinnerComponent } from "../../components/spinner/spinner";
import { DashboardTourService } from '../../../tours/services/dashboard-tour.service';

interface Event {
  id: number;
  title: string;
  date: string;
  location: string;
  totalGuests: number;
  confirmedGuests: number;
  pendingGuests: number;
  declinedGuests: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIcon, SpinnerComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  organizerId: number | undefined;
  currentUser: User | null = null;
  errorMessage: string = '';
  isMobile!: Observable<boolean>;

  events: Event[] = [];
  isLoading = false;

  constructor(
    private router: Router,
    private eventService: EventService,
    private authService: AuthService,
    private communicationService: CommunicationService,
    private breakpointObserver: BreakpointObserver,
    private dashboardTourService: DashboardTourService
  ) {}

  ngOnInit(): void {
    this.send(undefined);
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.organizerId = user?.id;
    });
    this.triggerBAction();
    this.getAllEvent();
    this.communicationService.triggerAction$.subscribe((action) => {
      if (action === 'refresh') {
        // FIX: invalider le cache events avant de recharger
        this.eventService.clearCache();
        this.getAllEvent();
      }
    });
    // FIX: recharger au retour de navigation (edit-event, add-event)
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      if (e.url === '/evenements') {
        this.eventService.clearCache();
        this.getAllEvent();
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.isMobile = this.breakpointObserver.observe(['(max-width: 768px)']).pipe(map(res => res.matches));
  }

  ngAfterViewInit() {
    const alreadySeen = localStorage.getItem('dashboard-tour');
    if (!alreadySeen) {
      localStorage.setItem('dashboard-tour', 'true');
      this.dashboardTourService.initTour();
      // Attend que le DOM soit stable (isMobile résolu + rendu Angular terminé)
      setTimeout(() => this.dashboardTourService.start(), 800);
    }
  }

  getAllEvent() {
    if (this.organizerId) {
      this.isLoading = true;
      // FIX: reset du tableau avant chaque chargement (évite les doublons)
      this.events = [];
      this.eventService.getEvents(this.organizerId).subscribe(
        (response) => {
          this.events = response.events.map(elt => ({
            id: elt.event_id,
            title: elt.title,
            date: elt.event_date.split('T')[0],
            location: elt.event_location,
            totalGuests: elt.max_guests,
            confirmedGuests: elt.confirmed_count,
            pendingGuests: elt.pending_count,
            declinedGuests: elt.declined_count
          }));
          this.isLoading = false;
        },
        (error) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Erreur de connexion';
        }
      );
    }
  }

  getTotalGuests(): number {
    return this.events.reduce((sum, e) => sum + Number(e.totalGuests), 0);
  }

  getTotalConfirmed(): number {
    return this.events.reduce((sum, e) => sum + Number(e.confirmedGuests), 0);
  }

  getTotalPending(): number {
    //console.log("TOTAL pendingGuests:: ",this.events.reduce((sum, e) => sum + Number(e.pendingGuests), 0));
    return this.events.reduce((sum, e) => sum + Number(e.pendingGuests), 0);
  }

  getResponseRate(event: Event): number {
    const responded = Number(event.confirmedGuests) + Number(event.declinedGuests);
    return Math.round((responded / Number(event.totalGuests)) * 100);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  openEventDialog(){
    this.router.navigate(['/add-event']);
  }

  navigateToEventDetails(eventId: number): void {
    this.router.navigate(['/events', eventId]);
  }

  editEvent(eventId: number) {
    //alert('✏️ Édition de l\'événement...');
    this.router.navigate(['/events/edit-event', eventId]);
  }

  navigateToInvitePage(eventId: number){
    console.log("eventId ::: ",eventId);
    console.log("---Events---- ::: ",this.events[eventId-1]);
    this.send(this.events[eventId-1].title)
    this.router.navigate(['/events', eventId, 'guests']);
  }
  send(message: any) {
    this.communicationService.sendMessage(message);
  }

  triggerBAction() {
    console.log("DashboardCmp → Je demande à HeaderCmp d’exécuter une action !");
    this.communicationService.triggerSenderAction('refresh');
  }
}

