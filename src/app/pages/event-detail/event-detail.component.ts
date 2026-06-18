import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { EventService } from '../../services/event.service';
import { GuestService } from '../../services/guest.service';
import { CommunicationService } from '../../services/share.service';
import { AddGuestModalComponent } from "../../components/add-guest-modal/add-guest-modal";
import { ErrorModalComponent } from "../../components/error-modal/error-modal";
import { ImportGuestsModalComponent } from "../../components/import-guests-modal/import-guests-modal";
import { SpinnerComponent } from "../../components/spinner/spinner";
import { ConfirmDeleteModalComponent } from "../../components/confirm-delete-modal/confirm-delete-modal";
import { BreakpointObserver } from '@angular/cdk/layout';
import { map, Observable } from 'rxjs';
import { QrCodeService } from '../../services/qr-code.service';
import { AlertConfig, ConditionalAlertComponent } from "../../components/conditional-alert/conditional-alert.component";
import { AddLinkModalComponent } from "../../components/add-invitation-link-modal/add-link-modal";
import { environment } from '../../../environment/environment';
import { MatIcon } from "@angular/material/icon";
import { EventDetailTourService } from '../../../tours/services/event-details-tour';
import { PaymentService } from '../../services/payment.service';
import { PaymentModalComponent, PaymentProofData } from '../../components/payment-modal/payment-modal.component';
import { GuestLimitAlertComponent } from '../../components/guest-limit-alert/guest-limit-alert.component';
import { PRICE_PER_GUEST } from '../pricing/pricing.component';

interface Guest {
  id: string;
  name: string;
  email: string;
  status: 'confirmed' | 'pending' | 'declined' | 'present';
  dietaryRestrictions?: string;
  plusOnedietaryRestrictions?: string;
  plusOne?: boolean;
  plusOneName?: string;
  responseDate?: string;
  tableNumber?: string;
}

interface Event {
  id: number;
  title: string;
  type: string;
  date: string;
  time: string;
  banquetTime: string;
  civilLocation: string;
  showWeddingReligiousLocation: boolean;
  religiousLocation: string;
  religiousTime: string;
  location: string;
  description: string;
  totalGuests: number;
  confirmedGuests: number;
  pendingGuests: number;
  declinedGuests: number;
}

interface GuestLimitAlertConfig {
  maxGuests: number;
  eventName: string;
}

type FilterStatus = 'all' | 'confirmed' | 'pending' | 'declined' | 'present';
//type LinkTypes = 'unique' | 'couple';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink,
            AddGuestModalComponent, ErrorModalComponent,
            ImportGuestsModalComponent, SpinnerComponent,
            ConfirmDeleteModalComponent, PaymentModalComponent,
            ConditionalAlertComponent, AddLinkModalComponent,
            GuestLimitAlertComponent, MatIcon],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss']
})
export class EventDetailComponent implements OnInit{
  showAddGuestModal = signal(false);
  showAddLinkModal = signal(false);
  showImportModal = signal(false);
  searchTerm = '';
  filteredGuests: Guest[] = [];
  eventId: number | undefined;
  guestId: number | undefined;
  currentUser: User | null = null;
  errorMessage: string = '';
  isLoading: boolean = false;
  showErrorModal = false;
  showDeleteModal = false;
  isScanning = true;
  showWeddingCivilLocation = false;
  loading: boolean = false;
  modalAction: string | undefined;
  warningMessage: string = "";
  rsvpStatus: string = "";
  url = '';
  PRICE_PER_GUEST = PRICE_PER_GUEST;

  paymentStatus: 'pending' | 'under_review' | 'validated' | 'rejected' | null = null;
  eventPayment: any = null;
  currentQuotaPaid: number = 0;
  quotaNotPaid: number = 0;
  showPaymentModal = false;
  isSubmittingProof = false;
  showGuestLimitAlert = false;
  alertConfigs: GuestLimitAlertConfig | null = null;

  itemsPerPage = 6;
  currentPage = 1;

  isMobile!: Observable<boolean>;
  filterStatus = signal<FilterStatus>('confirmed');
  //linkTypes = signal<LinkTypes>('unique');
  selectedMode: 'create' | 'edit' | 'partage' = 'create';
  eventToShare: Event | undefined;
  linkToEdit: any;
  allLinks: any[] = [];

  filters: { label: string; value: FilterStatus }[] = [
    { label: 'Confirmés', value: 'confirmed' },
    { label: 'En attente', value: 'pending' },
    { label: 'Refusés', value: 'declined' },
    { label: 'Présents', value: 'present' },
  ];

  links: { id?: number; label: string; value: string }[] = [
    // { label: '🔗 Partagé le lien unique (limite d\'utilisation 2)', value: 'unique' },
    // { label: '🔗 Partagé le lien couple (limite d\'utilisation  2)', value: 'couple' }
  ];

  // Configuration de l'alerte conditionnelle
  alertConfig: AlertConfig = {
    condition: false,
    type: 'success',
    title: '',
    message: '',
    icon: '',
    dismissible: true,
    autoClose: false,
    duration: 5000,
  };

  event: Event = {
    id: 0,
    title: '',
    type: '',
    date: '',
    time: '',
    banquetTime: '',
    civilLocation: '',
    location: '',
    showWeddingReligiousLocation: false,
    religiousLocation: '',
    religiousTime: '',
    description: '',
    totalGuests: 0,
    confirmedGuests: 0,
    pendingGuests: 0,
    declinedGuests: 0
  };

  guests: Guest[] = [];
  private apiUrl: string | undefined;
  private isProd = environment.production;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private paymentService: PaymentService,
    private eventService: EventService,
    private guestService: GuestService,
    private qrcodeService: QrCodeService,
    private breakpointObserver: BreakpointObserver,
    private communicationService: CommunicationService,
    private eventDetailTourService: EventDetailTourService
  ) {
        if (this.isProd) {
          this.apiUrl = environment.apiUrlProd;
        } else {
          this.apiUrl = environment.apiUrlDev;
        }
  }

  ngOnInit(){
    const result = this.route.snapshot.paramMap.get('eventId') || '';
    this.eventId = Number(result);
    this.getOneEvent();
    this.getGuestsByEvent();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.sendEventIdToHeaderComponent(this.eventId);
    this.isMobile = this.breakpointObserver.observe(['(max-width: 768px)']).pipe(map(res => res.matches));
    //console.log("this.isMobile::", this.isMobile)
    this.getLinks();
    this.loadPaymentStatus();
    this.setFilterStatus('confirmed');
  }

  ngAfterViewInit(): void {
    const alreadySeen = localStorage.getItem('event-detail-tour');
    if (!alreadySeen) {
      this.eventDetailTourService.initTour();
      setTimeout(() => {
        this.eventDetailTourService.start();
      }, 500);
      localStorage.setItem(
        'event-detail-tour',
        'true'
      );
    }
  }

  getOneEvent() {
    if (!this.eventId) return;

    this.eventService.getEventById(this.eventId).subscribe(
      (response) => {
        //console.log("[getOneEvent] response: ", response);
        const res = response[0];

        if (!res?.event_date) {
          console.error('event_date manquant');
          return;
        }

        const eventDate = new Date(res.event_date);

        if (isNaN(eventDate.getTime())) {
          console.error('Format de date invalide:', res.event_date);
          return;
        }

        const date = eventDate.toISOString().split('T')[0];

        const time = eventDate.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC'
        });

        if(res.type=="wedding"){
          this.showWeddingCivilLocation = true;
        }else{
          this.showWeddingCivilLocation = false;
        }
        const banquetTime = res.banquet_time
          ? res.banquet_time.split(':').slice(0, 2).join(':')
          : '';
        const religiousTime = res.religious_time
          ? res.religious_time.split(':').slice(0, 2).join(':')
          : '';

        this.event = {
          id: res.event_id,
          title: res.title,
          type: res.type,
          date,
          time,
          banquetTime: banquetTime, //"21:00:00"
          civilLocation: res.event_civil_location,
          location: res.event_location,
          showWeddingReligiousLocation: res.show_wedding_religious_location,
          religiousLocation: res.religious_location,
          religiousTime: religiousTime,
          description: res.description,
          totalGuests: res.max_guests,
          confirmedGuests: res.confirmed_count,
          pendingGuests: res.pending_count,
          declinedGuests: res.declined_count,
        };
        //console.log("[getOneEvent] Event: ", this.event);
      },
      (error) => {
        console.log("Message :: ", error.message);
        this.errorMessage = error.message || 'Erreur de connexion';
      }
    );
  }

  getGuestsByEvent(){
    if (this.eventId) {
      this.isLoading = true;
      this.guestService.getGuestsForEvent(this.eventId).subscribe(
        (response) => {
          //console.log("Response :: ", response.guests);
          response.guests.map(res => {
            if (!res.response_date){
              console.error('response_date manquant');
              return;
            }
            const uper = res.rsvp_status
            const data = {
                id: String(res.guest_id),
                name: res.full_name,
                email: res.email,
                phoneNumber: res.phone_number,
                tableNumber: res.table_number,
                status: uper.toLowerCase() as 'confirmed' | 'pending' | 'declined',
                dietaryRestrictions: res.dietary_restrictions,
                plusOnedietaryRestrictions: res.plus_one_name_diet_restr,
                plusOne: res.has_plus_one ? true : false,
                plusOneName: res.plus_one_name,
                responseDate: res.response_date.split('T')[0],
            };
            this.guests.push(data);
            //this.loadEventData();
            return data;
          });
          // console.log(" this.guests :: ",  this.guests);
          this.isLoading = false;
          this.filterGuests();
        },
        (error) => {
          this.isLoading = false;
          console.log("Message :: ", error.message);
          this.errorMessage = error.message || 'Erreur de connexion';
        }
      );
    }
  }

  loadEventData() {
    // Exemple 1 : Notification si RSVP confirmé
    if (this.guests[0].status === 'present') {
      this.alertConfig = {
        condition: true,
        type: 'success',
        title: '✓ Présence confirmée',
        message: 'Merci d\'avoir confirmé votre présence à cet événement !',
        icon: '✓',
        dismissible: true,
        autoClose: true,
        duration: 5000,
      };
    }

    // Exemple 2 : Notification si RSVP en attente
    if (this.guests[0].status === 'pending') {
      this.alertConfig = {
        condition: true,
        type: 'warning',
        title: '⏳ En attente de réponse',
        message: 'Veuillez confirmer ou refuser votre présence à cet événement',
        icon: '⏳',
        dismissible: true,
        autoClose: false, // Ne pas fermer automatiquement
        duration: 0,
      };
    }

    // Exemple 3 : Notification si token expiré
    if (this.guests[0].status === 'declined') {
      this.alertConfig = {
        condition: true,
        type: 'error',
        title: '✕ Présence refusée',
        message: 'Vous avez refusé l\'invitation à cet événement',
        icon: '✕',
        dismissible: true,
        autoClose: true,
        duration: 5000,
      };
    }
  }

  filterGuests() {
    this.filteredGuests = this.guests.filter((guest) => {
      const matchesSearch =
        guest.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        guest.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = this.filterStatus() === 'all' || guest.status === this.filterStatus();
      return matchesSearch && matchesStatus;
    });
    console.log("this.filteredGuests  :: ", this.filteredGuests );
  }

  get isQuotaFullyCovered(): boolean {
    if (!this.eventPayment) return false;
    if (this.eventPayment.status !== 'validated') return false;
    const totalSent  = Number(this.eventPayment.total_sent_invitations ?? 0);
    const totalQuota = Number(this.eventPayment.total_validated_quota   ?? 0);
    if (totalQuota === 0) return false;
    return totalSent < totalQuota;
  }

  get invitationsRemaining(): number {
    if (!this.eventPayment || this.eventPayment.status !== 'validated') return 0;
    const totalQuota = Number(this.eventPayment.total_validated_quota   ?? 0);
    const totalSent  = Number(this.eventPayment.total_sent_invitations  ?? 0);
    return Math.max(0, totalQuota - totalSent);
  }

  get sentInvitations(): number {
    return Number(this.eventPayment?.total_sent_invitations ?? 0);
  }

  get needsAdditionalPayment(): boolean {
    if (!this.eventPayment || this.eventPayment.status !== 'validated') return false;
    const totalValidatedQuota = Number(this.eventPayment.total_validated_quota ?? 0);
    return Number(this.event.totalGuests) > totalValidatedQuota;
  }

  onProofSubmitted(data: PaymentProofData) {
    this.isSubmittingProof = true;
    const formData = new FormData();
    formData.append('file', data.proofFile, data.proofFile.name);
    formData.append('eventId', String(data.eventId));
    formData.append('quota', String(data.quota));
    if (data.proofReference) formData.append('proofReference', data.proofReference);

    // Initialiser le paiement puis soumettre la preuve
    this.paymentService.initEventPayment(data.eventId, data.quota).subscribe({
      next: () => {
        this.paymentService.submitPaymentProof(formData).subscribe({
          next: () => {
            this.isSubmittingProof = false;
            this.loadPaymentStatus();
          },
          error: (err) => {
            this.isSubmittingProof = false;
            this.triggerError();
            this.errorMessage = err.error?.error || 'Erreur lors de la soumission.';
          }
        });
      },
      error: (err) => {
        this.isSubmittingProof = false;
        this.triggerError();
        this.errorMessage = err.error?.error || 'Erreur lors de l\'initialisation.';
      }
    });
  }

  loadPaymentStatus() {
    if (!this.eventId) return;
    this.paymentService.getEventPayment(this.eventId).subscribe({
      next: (res) => {
        this.eventPayment = res.payment;
        this.paymentStatus = res.payment?.status ?? null;
        if (this.paymentStatus) {
          this.currentQuotaPaid = Number(res.payment?.total_validated_quota ?? res.payment?.quota ?? 0);
          this.loadCurrentEvent();
        }else{
          this.currentQuotaPaid = 0;
          this.loadCurrentEvent();
        }
      },
      error: () => { this.paymentStatus = null; }
    });
  }

  loadCurrentEvent(){
    if (!this.eventId) return;
    this.eventService.getEventById(this.eventId).subscribe({
      next: (res) => {
        // console.log("### max_guests: ", res[0].max_guests);
        // console.log("### this.currentQuotaPaid: ", this.currentQuotaPaid);
        this.quotaNotPaid = res[0].max_guests - this.currentQuotaPaid;
      },
      error: () => { this.paymentStatus = null; }
    });
  }

  openPaymentModal() {
    this.showPaymentModal = true;
  }

  closePaymentModal() {
    this.showPaymentModal = false;
  }


  setFilterStatus(status: 'all' | 'confirmed' | 'pending' | 'declined' | 'present') {
    this.isScanning = true;
    this.rsvpStatus = status;
    console.log("rsvpStatus:: ", this.rsvpStatus);
    if(status=='present') this.isScanning = false;
    this.filterStatus.set(status);
    this.filterGuests();
  }

  getStatusCount(status: string): number {
    if (status === 'all') return this.guests.length;
    return this.guests.filter(g => g.status === status).length;
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'confirmed':
        return '✓';
      case 'pending':
        return '⏳';
      case 'declined':
        return '✕';
      case 'present':
        return '✓✓';
      default:
        return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'Confirmé';
      case 'pending':
        return 'En attente';
      case 'declined':
        return 'Refusé';
      case 'present':
        return 'Présent';
      default:
        return status;
    }
  }

  getFilterLabel(status: string): string {
    switch (status) {
      case 'all':
        return 'Tous';
      case 'confirmed':
        return 'Confirmés';
      case 'pending':
        return 'En attente';
      case 'declined':
        return 'Refusés';
      case 'present':
        return 'Présent le jour j';
      default:
        return status;
    }
  }

  getPercentage(count: number): number {
    return Math.round((count / this.event.totalGuests) * 100);
  }

  getResponseRate(): number {
    const responded = Number(this.event.confirmedGuests) + Number(this.event.declinedGuests);
    return Math.round((responded / this.event.totalGuests) * 100);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  sendInvitations() {
    this.send(this.event.title)
    this.router.navigate(['/events', this.event.id, 'guests']);
  }

  sendReminder() {
    this.send(this.event.title)
    this.router.navigate(['/events', this.event.id, 'guests']);
  }

  getQrCodeImageUrl(): Promise<string> {// Attention token en dur, à travailler dans cette methode getLinks()
    return new Promise((resolve, reject) => {
      this.qrcodeService.viewQrCode('71c39ddd-ceb3-a11a-a88b-d88a7bf0ee6b').subscribe({
        next: (response: any) => {
          console.log('###response :: ', response);
          const url = response.qrCodeUrl ?? response.imageUrl;
          resolve(url);
        },
        error: (err) => {
          console.error('Erreur lors du chargement du QR code :', err);
          reject(err);
        }
      });
    });
  }

  editEvent() {
    //alert('✏️ Édition de l\'événement...');
    this.router.navigate(['/events/edit-event', this.event.id]);
  }

  openDeleteModal(modalAction?: string) {
    this.modalAction = modalAction;

    if(modalAction=='delete'){
      this.warningMessage = "Êtes-vous sûr de vouloir supprimer cet événement ?";
      this.showDeleteModal = true;
    }
  }

  deleteEvent() {
    this.isLoading = false;
    this.eventService.deleteEvent(Number(this.eventId)).subscribe(
      (response) => {
        console.log("[deleteEvent] response :: ", response);
        this.isLoading = false;
        this.triggerBAction();
        this.router.navigate(['/evenements']);
      },
      (error) => {
        this.isLoading = false;
        if (error.status === 409) {
          this.errorMessage = error.error.error;
          this.triggerError();
          this.errorMessage = this.errorMessage;
          console.warn(this.errorMessage);
        } else {
          this.errorMessage = "Une erreur est survenue.";
        }
      }
    );
  }

  triggerBAction() {
    this.communicationService.triggerSenderAction('refresh');
  }

  onGuestAdded(newGuest: any) {
    const datas = [{
        eventId: this.eventId,
        fullName: newGuest.name,
        email: newGuest.email,
        phoneNumber: newGuest.phone,
        rsvpStatus: "PENDING",
        hasPlusOne: newGuest.plusOne
      }];

      this.isLoading = true;
      this.guestService.addGuest(datas).subscribe(
      (response) => {
        console.log("[onGuestAdded] Response :: ", response.guests);
        this.isLoading = false;
        this.getGuestsByEvent();
        this.closeAddGuestModal();
      },
      (error) => {
        this.isLoading = false;

        console.error('❌ Erreur HTTP :', error);

        if (error.status === 409) {
          this.triggerError();
          this.errorMessage = "Vous essayez d'enregistrer un invité qui existe déjà.";
          return;
        }

        this.errorMessage = "Une erreur est survenue, veuillez réessayer.";
      }
    );
  }

  onLinkAdded(newLink: any) {
    //console.log("newLink :: ", newLink);
    const data = {
      eventId: this.eventId,
      type: newLink.type,
      usedLimitCount: newLink.used_limit_count,
      dateLimitLink: newLink.date_limit_link
    };
    console.log("isQuotaFullyCovered :: ", this.isQuotaFullyCovered);
    if (newLink.mode === 'create' && !this.isQuotaFullyCovered) {
      this.closeAddLinkModal();
      this.showGuestLimitAlert = true;
      this.alertConfigs = {
        maxGuests: this.event.totalGuests,
        eventName: this.event.title
      }
      return;
    }
    this.isLoading = true;
    if(newLink.mode=='create'){
      this.eventService.addLink(data).subscribe(
        (response) => {
          console.log("[onLinkAdded] Response :: ", response);
          this.isLoading = false;
          this.closeAddLinkModal();
          this.links = [];
          this.getLinks();
        },
        (error) => {
          this.isLoading = false;
          console.error('❌ Erreur :', error.message);
          if(error.status === 409){
            this.triggerError();
            this.errorMessage = "Erreur lors de la génération du lien";
            console.log("Message :: ", this.errorMessage);
          }
        }
      );
    }else if(newLink.mode=='edit'){
      this.eventService.updateLink(this.linkToEdit.id, data).subscribe(
        (response) => {
          console.log("[onLinkAdded] Response :: ", response);
          this.isLoading = false;
          this.closeAddLinkModal();
          this.links = [];
          this.getLinks();
        },
        (error) => {
          this.isLoading = false;
          console.error('❌ Erreur :', error.message);
          if(error.status === 409){
            this.triggerError();
            this.errorMessage = "Erreur lors de la mise à jour du lien";
            console.log("Message :: ", this.errorMessage);
          }
        }
      );
    }
  }

  getLinks(){
    this.eventService.getLink().subscribe(
      (response) => {
        console.log("[getLinks] Response :: ", response);
        const linksArray: any[] = [];
        for (const link of response) {
          if(this.eventId == link.event_id) linksArray.push(link);
        }
        console.log("linksArray :: ", linksArray);
        for (const link of linksArray) {
          const data = {
            id: link.id,
            label: `🔗 Partagé le lien ${link.type} (utilisé ${link.used_count}/${link.limit_count})`,
            value:`${link.link}`,
          };
          this.links.push(data);
        }
        this.allLinks = response;
      },
      (error) => {
        this.isLoading = false;
        console.error('❌ Erreur :', error.message);
        if(error.status === 409){
          this.triggerError();
          this.errorMessage = "Erreur lors de la génération du lien";
          console.log("Message :: ", this.errorMessage);
        }
      }
    );
  }

  resetTabLinks(){
    this.links = [];
    this.getLinks();
  }

  onAlertDismissed(): void {
    this.showGuestLimitAlert = false;
  }

  onUpgradeClicked(): void {
    this.onAlertDismissed();
    this.openPaymentModal();
  }

  onManageClicked(): void {
    console.log('Redirection vers la gestion des invités');
  }

  editGuest(guest: Guest) {
    alert(`✏️ Édition de ${guest.name}...`);
  }

  shareLink() {
    alert('🔗 Lien partagé !');
  }

  exportCSV() {
    alert('📊 Export CSV en cours...');
  }

  exportPDF() {
    console.log("rsvpStatus:: ", this.rsvpStatus);
    const date = this.formatDate(this.event.date);
    const data = {
      event:{
        eventTitle: this.event.title,
        eventDate: date,
        eventTime: this.event.time,
        eventDateTime: this.event.date+'T'+this.event.time+':00.000Z',// 2025-11-25T01:08:00.000Z
        eventLocation: this.event.location,
        guestRsvpStatus: this.rsvpStatus
      },
      filteredGuests: this.filteredGuests
    };
    console.log("data :: ", data);
    this.loading = true;
    this.qrcodeService.downloadGuestsPdf(data).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'invites-present.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error('Erreur téléchargement PDF', err);
      }
    });
  }

  exportExcel() {
    alert('📈 Export Excel en cours...');
  }

  sendEventIdToHeaderComponent(eventId: number){
    this.send(eventId);
  }
  navigateToInvitePage(){
    this.send(this.event.title)
    this.router.navigate(['/events', this.event.id, 'guests']);
  }
  send(message: any) {
    console.log("message::", message)
    this.communicationService.sendMessage(message);
  }

  openAddGuestModal() {
    this.showAddGuestModal.set(true);
  }

  closeAddGuestModal() {
    this.showAddGuestModal.set(false);
  }

  openAddLinkModal(mode: any, event?: any, link?: any) {
    // console.log("mode:: ", mode);
    // console.log("this.allLinks:: ", this.allLinks);
    if(mode=='partage'){
      for (const elt of this.allLinks) {
        if(elt.id==link.id){
          // console.log("link trouvé:: ", link);
          this.linkToEdit = link;
          this.eventToShare = event;
        }
      }
      this.selectedMode = mode;

      this.showAddLinkModal.set(true);
    }else{
      this.selectedMode = mode;
      this.showAddLinkModal.set(true);
    }
  }

  closeAddLinkModal() {
    this.showAddLinkModal.set(false);
  }

  openImportModal() {
    this.showImportModal.set(true);
  }

  closeImportModal() {
    this.showImportModal.set(false);
  }

  // Logique error-modal
  triggerError() {
    this.showErrorModal = true;
  }

  closeErrorModal() {
    this.showErrorModal = false;
  }

  confirmDelete() {
    this.deleteEvent()
    this.closeModal();
  }

  closeModal() {
    this.showDeleteModal = false;
  }

  // Logique pagination
  get totalPages() {
    return Math.ceil(this.filteredGuests.length / this.itemsPerPage);
  }

  totalPagesArray() {
    return Array(this.totalPages)
      .fill(0)
      .map((_, i) => i + 1);
  }

  paginatedGuests() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    //console.log("this.filteredGuests.slice :: ", this.filteredGuests.slice(startIndex, startIndex + this.itemsPerPage))
    return this.filteredGuests.slice(startIndex, startIndex + this.itemsPerPage);
  }

  goToPage(page: number) {
    this.currentPage = page;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }
}

