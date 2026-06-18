import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GuestService } from '../../services/guest.service';
import { SpinnerComponent } from "../../components/spinner/spinner";
import { CommunicationService } from '../../services/share.service';
import { ConfirmDeleteModalComponent } from "../../components/confirm-delete-modal/confirm-delete-modal";
import { from } from 'rxjs';
import { NavigationService } from '../../services/navigationService ';

interface Guest {
  id: number;
  name: string;
  table_number: string;
  email: string;
  phone?: string;
  notificationMode: 'whatsapp' | 'email';
  status: 'confirmed' | 'pending' | 'declined';
  dietaryRestrictions?: string;
  plusOne: boolean;
  plusOneInfo?: {
    name?: string;
    dietaryRestrictions?: string;
  };
  responseDate?: string;
  notes?: string;
  invitationSentDate?: string;
  qrCodeGenerated?: boolean;
  qrCodeUrl?: string;
}

@Component({
  selector: 'app-edit-guest',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent, ConfirmDeleteModalComponent],
  templateUrl: 'edit-guest.component.html',
  styleUrl: 'edit-guest.component.scss'
})
export class EditGuestComponent implements OnInit {
  activeTab = signal<'personal' | 'response' | 'plusone' | 'notes'>('personal');
  guestId: number = 0;
  isLoading: boolean = false;
  errorMessage: string = '';
  eventId: number = 0;
  eventTile: string = '';
  modalAction: string | undefined;
  warningMessage: string = "";
  showDeleteModal = false;
  showErrorModal = false;
  notificationMeans = {
    whatsapp: true,
    email: false
  };
  notificationMode: 'whatsapp' | 'email' = 'whatsapp';

  originalGuestData: Guest = {
    id: 1,
    name: 'Will',
    table_number: 'Table 5',
    email: 'will@email.com',
    phone: '+33 6 12 34 56 78',
    notificationMode: 'whatsapp',
    status: 'confirmed',
    dietaryRestrictions: 'Végétarien',
    plusOne: true,
    plusOneInfo: {
      name: 'Marie Dupont',
      dietaryRestrictions: 'Sans gluten',
    },
    responseDate: '2025-01-10',
    notes: 'Ami de longue date, très important pour nous',
    invitationSentDate: '2024-12-20',
    qrCodeGenerated: true,
    qrCodeUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="white" width="200" height="200"/%3E%3Crect fill="black" x="10" y="10" width="180" height="180" opacity="0.1"/%3E%3Ctext x="100" y="100" text-anchor="middle" dy=".3em" font-size="20" fill="black"%3EQR Code%3C/text%3E%3C/svg%3E',
  };

  guestData: Guest = { ...this.originalGuestData };

  constructor(
    private route: ActivatedRoute,
    private guestService: GuestService,
    private navigationService: NavigationService,
    private communicationService: CommunicationService,
    private router: Router) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.guestId = Number(params['guestId']);
      this.loadGuest();
    });
    this.communicationService.message$.subscribe(msg => {
      console.log("msg :: ", localStorage.getItem('variable'));
      if (msg) {
        this.activeTab.set(msg);
      }else{
        const storedMsg = localStorage.getItem('variable') as 'personal' | 'response' | 'plusone' | 'notes';
        this.activeTab.set(storedMsg);
      }
    });
  }

  loadGuest() {
    this.isLoading = true;
    this.guestService.getGuestById(Number(this.guestId)).subscribe(
    (response) => {
        console.log("[loadGuest] response :: ", response);
        this.eventId = response.eventId;
        this.eventTile = response.eventTitle;
        this.originalGuestData = {
            id: Number(response.guest_id),
            name: response.full_name,
            table_number: response.table_number,
            email: response.email,
            phone: response.phone_number,
            notificationMode: response.notification_mode || 'whatsapp',
            status: response.rsvp_status as 'confirmed' | 'pending' | 'declined' || 'pending',
            dietaryRestrictions: response.dietary_restrictions,
            plusOne: response.guest_has_plus_one_autorise_by_admin,
            plusOneInfo: {
            name: response.plus_one_name,
            dietaryRestrictions: response.plus_one_name_diet_restr,
            },
            responseDate: response.response_date ? response.response_date.split('T')[0] : null,
            notes: response.notes,
            invitationSentDate: response.invitationSentDate ? response.invitationSentDate.split('T')[0] : null,
            qrCodeGenerated: response.qrCodeUrl ? true : false,
            qrCodeUrl: response.qrCodeUrl
        };
        this.guestData = JSON.parse(JSON.stringify(this.originalGuestData));
        if (!this.guestData.plusOneInfo) {
        this.guestData.plusOneInfo = {};
        }
        this.isLoading = false;
    },
    (error) => {
        this.isLoading = false;
        console.error('❌ [getGuestById] Erreur :', error.message);
        console.log("Message :: ", error.message);
        this.errorMessage = error.message || 'Erreur de connexion';
    }
    );
  }

  onSubmit() {
    console.log('Guest updated:', this.guestData);
    const data = {
        eventId: this.eventId,
        fullName: this.guestData.name,
        tableNumber: this.guestData.table_number,
        email: this.guestData.email,
        phoneNumber: this.guestData.phone,
        notificationMode: this.guestData.notificationMode,
        rsvpStatus: this.guestData.status,
        dietaryRestrictions: this.guestData.dietaryRestrictions,
        guesthasPlusOneAutoriseByAdmin: this.guestData.plusOne,
        plusOneName: this.guestData.plusOneInfo?.name,
        plusOneNameDietRestr: this.guestData.plusOneInfo?.dietaryRestrictions,
        notes: this.guestData.notes,
        fromEditePage: true
    }
    console.log('###data :: ', data);
    this.isLoading = true;
    this.guestService.updateGuest(this.guestId, data).subscribe({
        next: (response: any) => {
          console.log('response :: ', response);
          this.isLoading = false;
          this.router.navigate(['/events', this.eventId, 'guests', this.guestId]);
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Erreur :', err);
        }
      });
  }

  toggleNotificationMode(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    this.guestData.notificationMode = checked
      ? 'whatsapp'
      : 'email';
    console.log('Notification mode updated:', this.guestData.notificationMode);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'Confirmé';
      case 'pending':
        return 'En attente';
      case 'declined':
        return 'Refusé';
      default:
        return status;
    }
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getChanges(): Array<{ field: string; newValue: string }> {
    const changes: Array<{ field: string; newValue: string }> = [];

    if (this.guestData.name !== this.originalGuestData.name) {
      changes.push({ field: 'Nom', newValue: this.guestData.name });
    }
    if (this.guestData.email !== this.originalGuestData.email) {
      changes.push({ field: 'Email', newValue: this.guestData.email });
    }
    if (this.guestData.phone !== this.originalGuestData.phone) {
      changes.push({ field: 'Téléphone', newValue: this.guestData.phone || 'Non spécifié' });
    }
    if (this.guestData.status !== this.originalGuestData.status) {
      changes.push({ field: 'Statut', newValue: this.getStatusLabel(this.guestData.status) });
    }
    if (this.guestData.dietaryRestrictions !== this.originalGuestData.dietaryRestrictions) {
      changes.push({ field: 'Restrictions', newValue: this.guestData.dietaryRestrictions || 'Aucune' });
    }
    if (this.guestData.plusOne !== this.originalGuestData.plusOne) {
      changes.push({ field: '+1 autorisé', newValue: this.guestData.plusOne ? 'Oui' : 'Non' });
    }
    if (this.guestData.notes !== this.originalGuestData.notes) {
      changes.push({ field: 'Notes', newValue: this.guestData.notes || 'Aucune' });
    }

    return changes;
  }

  deleteGuest() {
    this.isLoading = true;
    this.guestService.deleteGuest(this.guestId, this.eventId).subscribe(
      (response) => {
        console.log("response :: ", response);
        this.isLoading = false;
        this.router.navigate(['/guests']);
      },
      (error) => {
        this.isLoading = false;
        console.error('❌ [deleteGuest] Erreur :', error.message);
        console.log("Message :: ", error.message);
        this.errorMessage = error.message || 'Erreur de connexion';
      }
    );
  }

  openDeleteModal(modalAction?: string) {
    this.modalAction = modalAction;

    if(modalAction=='delete'){
      this.warningMessage = `Êtes-vous sûr de vouloir supprimer ${this.guestData.name} ?
      Cette action est irréversible.`;
      this.showDeleteModal = true;
    }
  }

  confirmDelete() {
    if(this.modalAction=='delete'){
      this.deleteGuest();
    }
    this.closeModal();
  }

  closeModal() {
    this.showDeleteModal = false;
  }

  gobackToGuestList() {
    this.send(this.eventTile);
    // this.router.navigate(['/events', this.eventId, 'guests']);
    this.router.navigateByUrl(this.navigationService.back());
  }
  send(message: any) {
    this.communicationService.sendMessage(message);
  }

  gobackToGuestDetail() {
    this.router.navigate(['/events', this.eventId, 'guests', this.guestId]);
  }
}

