import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { GuestService } from '../../services/guest.service';
import { CommunicationService } from '../../services/share.service';
import { QrCodeService } from '../../services/qr-code.service';
import { SpinnerComponent } from "../../components/spinner/spinner";
import { AddGuestModalComponent } from "../../components/add-guest-modal/add-guest-modal";
import { ImportGuestsModalComponent } from "../../components/import-guests-modal/import-guests-modal";
import { ErrorModalComponent } from "../../components/error-modal/error-modal";
import { ConfirmDeleteModalComponent } from "../../components/confirm-delete-modal/confirm-delete-modal";
import { AlertConfig, ConditionalAlertComponent } from '../../components/conditional-alert/conditional-alert.component';
import { animate, style, transition, trigger } from '@angular/animations';
import { GuestManagementTourService } from '../../../tours/services/guest-management-tour.service';
import { PaymentService } from '../../services/payment.service';
import { PaymentModalComponent, PaymentProofData } from '../../components/payment-modal/payment-modal.component';
import { PRICE_PER_GUEST } from '../pricing/pricing.component';
import { GuestLimitAlertComponent } from '../../components/guest-limit-alert/guest-limit-alert.component';
import { EventService } from '../../services/event.service';


interface Guest {
  id: number;
  name: string;
  email: string;
  table_number: string;
  notification_mode: string,
  phone?: string;
  status: 'confirmed' | 'pending' | 'declined' | 'present';
  dietaryRestrictions?: string;
  plusOne?: boolean;
  responseDate?: string;
  qrCodeGenerated?: boolean;
  qrCodeUrl?: string;
}

interface GuestLimitAlertConfig {
  maxGuests: number;
  eventName: string;
}

type FilterStatus = 'all' | 'confirmed' | 'pending' | 'declined' | 'present';

@Component({
  selector: 'app-guest-list',
  standalone: true,
  imports: [CommonModule, FormsModule,
            SpinnerComponent, GuestLimitAlertComponent,
            AddGuestModalComponent, PaymentModalComponent,
            ImportGuestsModalComponent, ErrorModalComponent,
            ConfirmDeleteModalComponent, ConditionalAlertComponent],
  templateUrl: 'guest-list.component.html',
  styleUrl: 'guest-list.component.scss',
  animations: [
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0, transform: 'translateY(-10px)' }),
        animate(
          '300ms ease-out',
          style({ height: '*', opacity: 1, transform: 'translateY(0)' })
        )
      ]),
      transition(':leave', [
        animate(
          '200ms ease-in',
          style({ height: 0, opacity: 0, transform: 'translateY(-10px)' })
        )
      ])
    ])
  ]
})
export class GuestListComponent implements OnInit{
  viewMode: 'grid' | 'table' = 'grid';
  searchTerm = '';
  selectedGuest = signal<Guest | null>(null);
  showAddGuestModal = signal(false);
  showImportModal = signal(false);
  filteredGuests: Guest[] = [];
  eventId: number | undefined;
  guestId: number | undefined;
  guestIdList: number[] = [];
  isAllSelected: boolean = false;
  currentUser: User | null = null;
  showErrorModal = false;
  errorMessage = '';
  eventTitle: string = '';
  isLoading: boolean = false;
  loading: boolean = false;
  loadingDelete: boolean = false;
  isModalLoading: boolean = false;
  showDeleteModal = false;
  canSend: boolean = true;
  canDelete: boolean = true;
  selectedGuestId: number | null = null;
  itemsPerPage = 12;
  currentPage = 1;
  modalAction: string | undefined;
  warningMessage: string = "";
  eventsId: number | undefined;
  guest_list_header_extended: string = '';

  paymentStatus: 'pending' | 'under_review' | 'validated' | 'rejected' | null = null;
  eventPayment: any = null;
  currentQuotaPaid: number = 0;
  quotaNotPaid: number = 0;
  showPaymentModal = false;
  isSubmittingProof = false;
  showGuestLimitAlert = false;
  alertConfigs: GuestLimitAlertConfig | null = null;
  PRICE_PER_GUEST = PRICE_PER_GUEST;

  filterStatus = signal<FilterStatus>('all');
  filters: { label: string; value: FilterStatus }[] = [
    { label: 'Tous', value: 'all' },
    { label: 'Confirmés', value: 'confirmed' },
    { label: 'En attente', value: 'pending' },
    { label: 'Refusés', value: 'declined' },
    // { label: 'Présent', value: 'present' },
  ];

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

  guests: Guest[] = [];
  pollingInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private guestService: GuestService,
    private qrCodeService: QrCodeService,
    private paymentService: PaymentService,
    private eventService: EventService,
    private communicationService: CommunicationService,
    private guestManagementTour: GuestManagementTourService
  ) {this.loadViewModeFromStorage()}

  ngOnInit(): void {
    const result = this.route.snapshot.paramMap.get('eventId') || '';
    this.eventId = Number(result);
    console.log("this.eventId :: ", this.eventId);
    this.getGuestsByEvent();
    this.loadGuestsData();
    this.loadPaymentStatus();
    this.communicationService.message$.subscribe(msg => {
      console.log("msg :: ", localStorage.getItem('variable'));
      if (msg) {
        this.eventTitle = msg;
        console.log("Size: ", this.eventTitle.length);
        if(this.eventTitle.length > 29){
          this.guest_list_header_extended = "guest-list-header-extended";
        }
      }else{
        this.eventTitle = localStorage.getItem('variable') || "";
        console.log("Size: ", this.eventTitle.length);
        if(this.eventTitle.length > 29){
          this.guest_list_header_extended = "guest-list-header-extended";
        }
      }
    });
    this.communicationService.triggerAction$.subscribe((action) => {
      console.log('Action reçue:', action);

      if (action.msg === 'reload') {
        this.closeImportModal(action.alertConfig);
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Polling toutes les 15 secondes pour les mises à jour
    // this.pollingInterval = setInterval(() => {
    //   console.log("⏱️ Polling pour les mises à jour...");
    //   this.loadCurrentUserData();
    // }, 25000);
  }

  ngAfterViewInit() {
    const alreadySeenheader = localStorage.getItem('header-tour');
      this.communicationService.sendRequest(alreadySeenheader);

      this.communicationService.response$.subscribe(result => {
          console.log('Réponse reçue :', result);

          if(result){
            console.log('Traitement valide');
            const alreadySeen = localStorage.getItem('guest-list-tour');
            if (!alreadySeen) {
              this.guestManagementTour.initTour();
              setTimeout(() => {
                this.guestManagementTour.start();
              }, 500);
              localStorage.setItem('guest-list-tour', 'true');
              localStorage.setItem('header-tour', 'true');
            }
          }
      });
  }

  ngOnDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  loadCurrentUserData() {
    this.authService.getMe().subscribe({
      next: (data) => {
        console.log("🔄 Données utilisateur mises à jour :", data)
        this.currentUser = data;
      }
    });
  }

  getGuestsByEvent(){
    if (this.eventId) {
      this.isLoading = true;
      this.guestService.getGuestsForEvent(this.eventId).subscribe(
        (response) => {
          console.log("[getGuestsByEvent] Response :: ", response.guests);
          this.guests = response.guests.map(res => {
            const uper = res.rsvp_status
            const data = {
                id: Number(res.guest_id),
                eventId: res.event_id,
                name: res.full_name,
                email: res.email,
                notification_mode: res.notification_mode,
                table_number: res.table_number,
                phone: res.phone_number,
                status: uper.toLowerCase() as 'confirmed' | 'pending' | 'declined' | 'present',
                dietaryRestrictions: res.dietary_restrictions,
                plusOne: res.has_plus_one ? true : false,
                responseDate: res.response_date ? res.response_date.split('T')[0] : '',
                qrCodeGenerated: res.qr_code_url ? true : false,
                qrCodeUrl: res.qr_code_url
            };
            return data;
          });
          //console.log(" this.guests :: ",  this.guests);
          this.isLoading = false;
          this.filterGuests();
        },
        (error) => {
          this.isLoading = false;
          console.error('❌ Erreur de recupération :', error.message.split(':')[4]);
          //console.log("Message :: ", error.message);
          this.errorMessage = error.message || 'Erreur de connexion';
        }
      );
    }
  }

  filterGuests() {
    this.filteredGuests = this.guests.filter((guest) => {
      const matchesSearch =
        guest.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        guest.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (guest.phone && guest.phone.includes(this.searchTerm));
      const matchesStatus = this.filterStatus() === 'all' || guest.status === this.filterStatus();
      return matchesSearch && matchesStatus;
    });
    console.log("filteredGuests :: ", this.filteredGuests);
  }

  setFilterStatus(status: 'all' | 'confirmed' | 'pending' | 'declined' | 'present') {
    this.filterStatus.set(status);
    this.filterGuests();
    this.toggleSelectAll({ target: { checked: false } });
  }

  goToGuestDetail(guestId: number){
    this.router.navigate(['/events', this.eventId, 'guests', guestId]);
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
        return 'Présent';
      default:
        return status;
    }
  }

  getStatusCount(status: string): number {
    if (status === 'all') return this.guests.length;
    return this.guests.filter(g => g.status === status).length;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  viewGuestDetails(guest: Guest) {
    //console.log("guest:: ", guest)
    this.selectedGuest.set(guest);
  }

  closeGuestDetails() {
    this.selectedGuest.set(null);
  }

  editGuest(guest: Guest) {
    this.send('personal');
    this.router.navigate(['/events', this.eventId, 'guests', guest.id, 'edit']);
  }
  send(message: any) {
    this.communicationService.sendMessage(message);
  }

  // Start Logique checkbox du tableau
  onGuestSelected(guest: any, event: any) {
    const checked = event.target.checked;
    const guestId = Number(guest.id);  // 🔥 Normalisation

    if (checked) {
      if (!this.guestIdList.includes((guestId))) {
        this.guestIdList.push(guestId);
        console.log('Ajouter seulement si pas déjà ajouté : ', this.guestIdList);
      }
    } else {
      this.guestIdList = this.guestIdList.filter(id => id !== guestId);
      console.log('Retirer si décoché : ', this.guestIdList);
    }

    console.log('Guest sélectionné : ', this.guestIdList, 'checked:', checked);
    for (const guest of this.guestIdList.map(id => this.guests.find(g => g.id === id))) {
      console.log('Guest status : ', guest?.status);
      if (guest?.status !== 'pending') {
        console.log('Guest non valide pour envoi : ', guest);
        this.canDelete = false;
        this.canSend = true;
        break;
      }else{
        this.canSend = false;
        this.canDelete = false;
      }
    }

    // Mise à jour du "select all"
    this.isAllSelected = this.guestIdList.length === this.guests.length;
  }

  toggleSelectAll(event: any) {
    this.isAllSelected = event.target.checked;
    if (this.isAllSelected) {
      console.log('[toggleSelectAll] this.filteredGuests : ', this.filteredGuests);
      if(this.filterStatus()==='all'){
        for (const guest of this.filteredGuests) {
          console.log('Guest status : ', guest.status);
          if (guest.status !== 'pending') {
            console.log('Guest non valide pour envoi : ', guest);
            this.canDelete = false;
            this.canSend = true;
            break;
          }else{
            this.canSend = false;
            this.canDelete = false;
          }
        }
        console.log('canSend : ', this.canSend, 'canDelete : ', this.canDelete);
        this.guestIdList = this.guests.map(guest => Number(guest.id));
        console.log('Tous les invités sélectionnés : ', this.guestIdList);
      }else if(this.filterStatus()==='confirmed'){
        this.guestIdList = [];
        this.canSend = true;
        this.canDelete = false;
        this.guestIdList = this.filteredGuests
                          .filter(g => g.status === 'confirmed')
                          .map(g => g.id);
        console.log('Tous les invités sélectionnés : ', this.guestIdList);
      }else if(this.filterStatus()==='pending'){
        this.guestIdList = [];
        this.canSend = false;
        this.canDelete = false;
        this.guestIdList = this.filteredGuests
                          .filter(g => g.status === 'pending')
                          .map(g => g.id);
        console.log('Tous les invités sélectionnés : ', this.guestIdList);
      }else if(this.filterStatus()==='declined'){
        this.guestIdList = [];
        this.canSend = true;
        this.canDelete = false;
        this.guestIdList = this.filteredGuests
                          .filter(g => g.status === 'declined')
                          .map(g => g.id);
        console.log('Tous les invités sélectionnés : ', this.guestIdList);
      }
    } else {
      this.guestIdList = [];
    }
  }

  deleteSelectedGuests() {
    if (this.guestIdList.length === 0) return;
    this.filteredGuests = this.filteredGuests.filter(
      guest => !this.guestIdList.includes(guest.id)
    );
    this.guests = this.guests.filter(
      guest => !this.guestIdList.includes(guest.id)
    );
    this.guestIdList = [];
    this.isAllSelected = false;
    console.log('Guests après suppression :', this.guests);
  }
  // End Logique checkbox

  deleteInvitationFromModal(guest: Guest) {
    if (this.selectedGuest()) {
      this.loadingDelete = true;
      this.guestService.revokeInvitation(Number(guest.id)).subscribe(
        (response) => {
          console.log("[revokeInvitation] response :: ", response);
          for (const key in this.guests) {
            const data = this.guests[key];
            if(Number(data.id) == Number(guest.id)){
              data.qrCodeGenerated = false;
              data.qrCodeUrl = "";
            }
          }
          this.filterGuests();
          this.loadingDelete = false;
        },
        (error) => {
          this.loadingDelete = false;
          console.error('❌ [deleteInvitationFromModal] Erreur :', error.message);
          console.log("Message :: ", error.message);
          this.errorMessage = error.message || 'Erreur de connexion';
        }
      );
    }
  }

  deleteGuest(guestId: number) {
    this.isLoading = true;
    this.guestService.deleteGuest(Number(guestId), Number(this.eventId)).subscribe(
      (response) => {
        console.log("response :: ", response);
        this.guests = this.guests.filter(g => g.id !== guestId);
        this.filteredGuests = this.filteredGuests.filter(g => g.id !== guestId);
        this.guestIdList = this.guestIdList.filter(id => id !== guestId);

      this.isLoading = false;
        this.isLoading = false;
      },
      (error) => {
        this.isLoading = false;
        console.error('❌ [deleteGuest] Erreur :', error.message);
        console.log("Message :: ", error.message);
        this.errorMessage = error.message || 'Erreur de connexion';
      }
    );
  }

  deleteSeveralGuests(guestIdList: number[]) {
    this.loadingDelete = true;

    this.guestService.deleteSeveralGuests(guestIdList, Number(this.eventId)).subscribe(
      (response) => {
        console.log("response :: ", response);
        // Filtrer les guests pour ne garder que ceux non sélectionnés
        this.deleteSelectedGuests()
        this.loadingDelete = false;
      },
      (error) => {
        this.loadingDelete = false;
        console.error('❌ [deleteGuest] Erreur :', error.message);
        console.log("Message :: ", error.message);
        this.errorMessage = error.message || 'Erreur de connexion';
      }
    );
  }

  sendSeveralGuestInvitation(guestIdList: number[]) {
    this.loading = true;
    this.qrCodeService.generateSeveralQRCode(guestIdList).subscribe(
      (response) => {
        console.log("[sendSeveralGuestInvitation] response :: ", response);
        for (const res of response) {
          const guest = this.guests.find(g => g.id === res.id);
          if (guest) {
            guest.qrCodeGenerated = true;
            guest.qrCodeUrl = res.qrUrl;
          }
        }

        this.filterGuests();
        this.loading = false;
      },
      (error) => {
        this.loading = false;
        if(error.status === 409){
          this.closeModal();
          this.triggerError();
          this.errorMessage = "Ces invités ont déjà réçu une invitation !";
          console.log("Message :: ", this.errorMessage);
        }
      }
    );
  }

  get isQuotaFullyCovered(): boolean {
    if (!this.eventPayment) return false;
    if (this.eventPayment.status !== 'validated') return false;
    const totalInvitationSent  = Number(this.eventPayment.total_sent_invitations ?? 0);
    const totalValidatedQuota = Number(this.eventPayment.total_validated_quota   ?? 0);
    if (totalValidatedQuota === 0) return false;
    return totalInvitationSent < totalValidatedQuota;
  }

  generateQRCode(guestId: number) {
    if (!this.isQuotaFullyCovered) {
      this.selectedGuest.set(null);
      this.showGuestLimitAlert = true;
      this.alertConfigs = {
        maxGuests: this.totalGuests,
        eventName: '',
      }
      return;
    }
    if (this.selectedGuest()) {
      this.isModalLoading = true;
      console.log(" :Start generateQRCode: ");
      this.qrCodeService.generateQRCode(Number(guestId)).subscribe(
        (response) => {
          for (const key in this.guests) {
            const data = this.guests[key];
            if(Number(data.id) == Number(guestId)){
              data.qrCodeGenerated = true;
              data.qrCodeUrl = response.qrUrl;
            }
          }
          this.isModalLoading = false;
          console.log(" :End generateQRCode: ");
        },
        (error) => {
          this.isModalLoading = false;
          console.error('❌ [generateQRCode] Erreur :', error.message);
          //console.log("Message :: ", error.message);
          this.errorMessage = error.message || 'Erreur de connexion';
        }
      );
    }
  }

  onGuestAdded(newGuest: any) {
    const datas = [{
        eventId: this.eventId,
        fullName: newGuest.name,
        email: newGuest.email,
        phoneNumber: newGuest.phone,
        rsvpStatus: "pending",
        guesthasPlusOneAutoriseByAdmin: newGuest.plusOne,
        notificationMode: newGuest.notificationMode
      }];
    console.log("datas :: ", datas);
      this.isLoading = true;
      this.guestService.addGuest(datas).subscribe(
      (response) => {
        //console.log("Response :: ", response.guests);
        this.isLoading = false;
        this.getGuestsByEvent();
        this.filterGuests();
        this.closeAddGuestModal();
      },
      (error) => {
        this.isLoading = false;

        console.error('❌ Erreur HTTP :', error.error.error);
        this.errorMessage = error.error.error || 'Erreur de connexion';
        if (error.status === 409) {
          this.triggerError();
          this.errorMessage = "Vous essayez d'enregistrer un invité qui existe déjà.";
          return;
        }else{
          this.triggerError(error.error.error || error.error.message);
        }
      }
    );
  }

  onAlertDismissed(): void {
    this.showGuestLimitAlert = false;
  }

  onUpgradeClicked(): void {
    this.onAlertDismissed();
    this.openPaymentModal();
  }

  downloadQRCode(guest: any) {
    console.log("[downloadQRCode] Guest : ", guest);
    if (!guest.qrCodeUrl) {
      this.triggerError();
      this.errorMessage = "Le QR code n'est pas disponible pour cet invité.";
      return;
    }else if(guest.status == 'pending'){
      this.triggerError();
      this.errorMessage = "L'invité doit d'abord confirmer sa présence.";
      return;
    }

    this.qrCodeService.downloadQrCode(guest.id, guest.qrCodeUrl);
  }

  openAddGuestModal() {
    this.showAddGuestModal.set(true);
  }

  closeAddGuestModal() {
    this.showAddGuestModal.set(false);
  }

  sendReminder() {
    // Récupérer uniquement les invités avec le statut "pending"
    const pendingGuests = this.guests.filter(g => g.status === 'pending' && g.qrCodeUrl !== null);
    // Extraire uniquement leurs IDs
    const pendingGuestIds = pendingGuests.map(g => g.id);
    console.log("pendingGuestIds :: ", pendingGuestIds);
    if(pendingGuestIds.length===0){
      this.closeModal();
      this.triggerError();
      this.errorMessage = "✉️ Veuillez d'abord envoyer une invitation aux invités donc le statut est en attente.";
    }else{
      // alert(`✉️ Invitation renvoyée à ${this.getStatusCount('pending')}`);
      this.reSendInvitation(pendingGuestIds);
    }
  }
  reSendInvitation(pendingGuestIds: number[]) {
    this.loading = true;
    if(this.modalAction=='resend'){
      this.guestService.sendReminderMail(pendingGuestIds).subscribe(
        (response) => {
          this.loading = false;
        },
        (error) => {
          this.loading = false;
          console.error('❌ [sendReminderMail] Erreur :', error.message);
          console.log("Message :: ", error.message);
          this.errorMessage = error.message || 'Erreur de connexion';
        }
      );
    }
    this.closeModal();
  }

  onProofSubmitted(data: PaymentProofData) {
    console.log("##Data: ", data);
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
        console.log("### this.eventPayment: ", this.eventPayment);
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
        console.log("### max_guests: ", res[0].max_guests);
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

  openImportModal() {
    this.showImportModal.set(true);
    this.eventsId = this.eventId;
  }

  closeImportModal(alertConfig?: any) {
    this.showImportModal.set(false);
    //this.showErrorModal = true;
  }

  navigateToEventPage(){
    this.router.navigate(['/events', this.eventId]);
  }

  get totalGuests(): number {
    return this.guests.length;
  }

  get confirmedCount(): number {
    return this.guests.filter(g => g.status === 'confirmed').length;
  }

  get pendingCount(): number {
    return this.guests.filter(g => g.status === 'pending').length;
  }

  get declinedCount(): number {
    return this.guests.filter(g => g.status === 'declined').length;
  }

  get presentCount(): number {
    return this.guests.filter(g => g.status === 'present').length;
  }

  // Logique error-modal
  triggerError(errorMessage?: string) {
    console.log("TriggerError with message :: ", errorMessage);
    this.errorMessage = errorMessage || "Impossible de charger les invités. Veuillez réessayer.";
    this.showErrorModal = true;
  }

  closeErrorModal() {
    this.showErrorModal = false;
  }

  // Logique modal de suppréssion
  openDeleteModal(guest: any, modalAction?: string) {
    this.modalAction = modalAction;
    this.guestId = guest?.id;

    const showPaymentAlert = () => {
      this.selectedGuest.set(null);
      this.showGuestLimitAlert = true;
      this.alertConfigs = {
        maxGuests: this.totalGuests,
        eventName: ''
      };
    };

    switch (modalAction) {
      case 'one':
        this.selectedGuestId = guest.id;
        this.warningMessage =
          "Êtes-vous sûr de vouloir supprimer cet invité ?";
        this.showDeleteModal = true;
        break;

      case 'delete':
        this.warningMessage =
          "Êtes-vous sûr de vouloir supprimer ces invités ?";
        this.showDeleteModal = true;
        break;

      case 'send':
        if (!this.isQuotaFullyCovered) {
          showPaymentAlert();
          return;
        }

        this.warningMessage =
          "Êtes-vous sûr de vouloir envoyer une invitation à tous ces invités ?";
        this.showDeleteModal = true;
        break;

      case 'resend':
        if (!this.isQuotaFullyCovered) {
          showPaymentAlert();
          return;
        }

        this.warningMessage =
          "Êtes-vous sûr de vouloir renvoyer une invitation aux invités en attente ?";
        this.showDeleteModal = true;
        break;
    }
  }

  confirmDelete() {
    if (this.selectedGuestId !== null) {
      this.deleteGuest(Number(this.selectedGuestId))
    }

    if(this.modalAction=='delete'){
      this.deleteSeveralGuests(this.guestIdList);
    }
    this.closeModal();
  }

  sendInvitation(){
    if(this.modalAction=='send'){
      this.sendSeveralGuestInvitation(this.guestIdList);
    }
    this.closeModal();
  }

  closeModal() {
    this.showDeleteModal = false;
    this.selectedGuestId = null;
  }

  loadGuestsData() {
    console.log("Chargement des données des invités...");
    for (const guest of this.guests) {
      console.log("guest.status: ", guest.status);
      if (guest.status === 'confirmed') {
        this.alertConfig = {
          condition: true,
          type: 'success',
          title: 'Présence confirmée',
          message: 'Vous pouvez déjà attribuer une table aux invités confirmés.',
          // icon: '✓',
          dismissible: true,
          autoClose: true,
          duration: 5000,
        };
      };
      break;
    }
  }

  //Change le mode d'affichage (grille ou tableau)
  setViewMode(mode: 'grid' | 'table'): void {
    this.viewMode = mode;
    this.saveViewModeToStorage();
  }


  //Sauvegarde le mode d'affichage dans le localStorage
  private saveViewModeToStorage(): void {
    try {
      localStorage.setItem('guest-view-mode', this.viewMode);
    } catch (error) {
      console.warn('Impossible de sauvegarder le mode d\'affichage:', error);
    }
  }

  //Charge le mode d'affichage depuis le localStorage
  private loadViewModeFromStorage(): void {
    try {
      const savedMode = localStorage.getItem('guest-view-mode') as 'grid' | 'table';
      if (savedMode && (savedMode === 'grid' || savedMode === 'table')) {
        this.viewMode = savedMode;
      }
    } catch (error) {
      console.warn('Impossible de charger le mode d\'affichage:', error);
      this.viewMode = 'grid';
    }
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

