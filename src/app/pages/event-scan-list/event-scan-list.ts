import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { EventService } from '../../services/event.service';
import { AuthService, User } from '../../services/auth.service';
import { CommunicationService } from '../../services/share.service';
import { map, Observable } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';

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
  selector: 'app-event-scan-list',
  standalone: true,
  imports: [CommonModule],// MatIcon
  templateUrl: './event-scan-list.html',
  styleUrls: ['./event-scan-list.scss']
})
export class EventScanListComponent {
  organizerId: number | undefined;
  currentUser: User | null = null;
  errorMessage: string = '';
  isMobile!: Observable<boolean>;

  events: Event[] = [];

  constructor(
    private router: Router, 
    private eventService: EventService,
    private authService: AuthService,
    private communicationService: CommunicationService,
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      console.log("this.currentUser:", this.currentUser);
      this.organizerId = user?.id 
    });
    this.triggerBAction();
    this.getAllEvent();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.isMobile = this.breakpointObserver.observe(['(max-width: 768px)']).pipe(map(res => res.matches));
    console.log("this.isMobile::", this.isMobile)
  }

  getAllEvent(){
    if (this.organizerId) {
      if(this.currentUser?.role!='manager'){
        this.eventService.getEvents(this.organizerId).subscribe(
          (response) => {
            // console.log("Response :: ", response.events);
            response.events.map(elt => {
              const data = {
                id: elt.event_id,
                title: elt.title,
                date: elt.event_date.split('T')[0],     //"2025-12-05T13:30:00.000Z"
                location: elt.event_location,
                totalGuests: elt.max_guests,
                confirmedGuests: elt.confirmed_count,
                pendingGuests: elt.pending_count,
                declinedGuests: elt.declined_count     
              }
              this.events.push(data);
              return data;
            });
            // console.log("this.events :: ", this.events);
          },
          (error) => {
            console.error('❌ Erreur de recupération :', error.message.split(':')[4]);
            //console.log("Message :: ", error.message);
            this.errorMessage = error.message || 'Erreur de connexion';
          }
        );
      }else{
        this.authService.getAllUsersLinkedToManager(this.organizerId).subscribe(
          (response) => {
            //console.log("Response :: ", response.events);
            response.events.map((elt:any) => {
              const data = {
                id: elt.event_id,
                title: elt.title,
                date: elt.event_date.split('T')[0],     //"2025-12-05T13:30:00.000Z"
                location: elt.event_location,
                totalGuests: elt.max_guests,
                confirmedGuests: elt.confirmed_count,
                pendingGuests: elt.pending_count,
                declinedGuests: elt.declined_count     
              }
              this.events.push(data);
              return data;
            });
            // console.log("this.events :: ", this.events);
          },
          (error) => {
            console.error('❌ Erreur de recupération :', error.message.split(':')[4]);
            console.log("Message :: ", error.message);
            this.errorMessage = error.message || 'Erreur de connexion';
          }
        );
      }
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
    const responded = event.confirmedGuests + event.declinedGuests;
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
  

  navigateToScanner(eventId: number): void {
    this.router.navigate(['/events', eventId, 'qr-scanner']);
  }


  navigateToInvitePage(eventId: number){
    this.router.navigate(['/events', eventId, 'qr-scanner']);
  }

  triggerBAction() {
    console.log("DashboardCmp → Je demande à HeaderCmp d’exécuter une action !");
    this.communicationService.triggerSenderAction('refresh');
  }
}

