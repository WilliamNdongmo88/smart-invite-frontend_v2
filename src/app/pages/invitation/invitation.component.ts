import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QrCodeGenerationResponse } from '../../models/qrcode.interface';
import { QrCodeService } from '../../services/qr-code.service';
import { ActivatedRoute, Router } from '@angular/router';
import { GuestService } from '../../services/guest.service';
import { Event } from '../../services/guest.service';
import { EventService } from '../../services/event.service';
import { MatIcon } from "@angular/material/icon";

type ResponseType = 'confirmed' | 'declined' | null;

interface CountryDialCode {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

@Component({
  selector: 'app-invitation',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIcon],
  templateUrl: './invitation.component.html',
  styleUrls: ['./invitation.component.scss']
})
export class InvitationComponent implements OnInit{
  generatedQrCode: QrCodeGenerationResponse | null = null;
  response = signal<ResponseType>(null);
  dietaryRestrictions = '';
  name = '';
  email = '';
  phone = '';
  phoneLocalNumber = '';
  selectedCountryCode = 'CM';
  countryDialCodes: CountryDialCode[] = [
    { name: 'Cameroun', code: 'CM', dialCode: '+237', flag: '🇨🇲' },
    { name: 'France', code: 'FR', dialCode: '+33', flag: '🇫🇷' },
    { name: 'Belgique', code: 'BE', dialCode: '+32', flag: '🇧🇪' },
    { name: 'Canada', code: 'CA', dialCode: '+1', flag: '🇨🇦' },
    { name: 'Etats-Unis', code: 'US', dialCode: '+1', flag: '🇺🇸' },
    { name: 'Suisse', code: 'CH', dialCode: '+41', flag: '🇨🇭' },
    { name: 'Bresil', code: 'BR', dialCode: '+55', flag: '🇧🇷' },
    { name: 'Maurice', code: 'MU', dialCode: '+230', flag: '🇲🇺' },
    { name: 'Tchad', code: 'TD', dialCode: '+235', flag: '🇹🇩' },
    { name: 'Royaume-Uni', code: 'GB', dialCode: '+44', flag: '🇬🇧' },
    { name: 'Allemagne', code: 'DE', dialCode: '+49', flag: '🇩🇪' },
    { name: 'Espagne', code: 'ES', dialCode: '+34', flag: '🇪🇸' },
    { name: 'Italie', code: 'IT', dialCode: '+39', flag: '🇮🇹' },
    { name: 'Maroc', code: 'MA', dialCode: '+212', flag: '🇲🇦' },
    { name: 'Algerie', code: 'DZ', dialCode: '+213', flag: '🇩🇿' },
    { name: 'Tunisie', code: 'TN', dialCode: '+216', flag: '🇹🇳' },
    { name: 'Senegal', code: 'SN', dialCode: '+221', flag: '🇸🇳' },
    { name: "Cote d'Ivoire", code: 'CI', dialCode: '+225', flag: '🇨🇮' },
    { name: 'Mali', code: 'ML', dialCode: '+223', flag: '🇲🇱' },
    { name: 'Burkina Faso', code: 'BF', dialCode: '+226', flag: '🇧🇫' },
    { name: 'Benin', code: 'BJ', dialCode: '+229', flag: '🇧🇯' },
    { name: 'Togo', code: 'TG', dialCode: '+228', flag: '🇹🇬' },
    { name: 'Gabon', code: 'GA', dialCode: '+241', flag: '🇬🇦' },
    { name: 'Congo', code: 'CG', dialCode: '+242', flag: '🇨🇬' },
    { name: 'RDC', code: 'CD', dialCode: '+243', flag: '🇨🇩' },
    { name: 'Nigeria', code: 'NG', dialCode: '+234', flag: '🇳🇬' },
    { name: 'Ghana', code: 'GH', dialCode: '+233', flag: '🇬🇭' },
    { name: 'Kenya', code: 'KE', dialCode: '+254', flag: '🇰🇪' },
    { name: 'Afrique du Sud', code: 'ZA', dialCode: '+27', flag: '🇿🇦' }
  ];
  plusOneName = '';
  plusOneNameDietRestr = '';
  token = '';
  guestId : number = 0;
  eventId : number = 0;
  url = ''
  linkType = '';
  plusOne = false;
  loading = false;
  isValidating = true;
  isFromGeneratedLink = false;
  showWeddingCivilLocation = false;
  submitted = signal(false);
  concernedEvent: string = "";
  errorMessage: string | null = null;
  errorPhoneMessage: string | null = null;
  additionalInfo: string = '';
  notificationMethod: 'whatsapp' | 'email' = 'whatsapp';
  notificationMeans = {
    whatsapp: true,
    email: false
  };

  data: Event = {
    guestId: 0,
    guestName: '',
    rsvpStatus: '',
    guestHasPlusOneAutoriseByAdmin: false,
    guestHasPlusOne: false,
    plusOneName: '',
    eventTitle: '',
    description: '',
    eventHasPlusOne: false,
    footRestriction: false,
    eventDate: '',
    eventTime: '',
    banquetTime: '',
    eventCivilLocation: '',
    eventLocation: '',
    emailOrganizer: ''
  };

  constructor(
      private qrCodeService: QrCodeService,
      private guestService: GuestService,
      private eventService: EventService,
      private route: ActivatedRoute,
      private router: Router
  ) {}

  ngOnInit(): void {
      const result = this.route.snapshot.paramMap.get('token') || '';
      this.token = result;
      this.linkType = result.split(":")[1].split("-")[2];
      console.log("Token reçu :: ", result);
      this.getUser(this.token.split(':')[1]);
      if(result.includes('a11a') || result.includes('a22a')){
        this.isFromGeneratedLink = true;
        this. eventId= Number(result.split(':')[0]);
        this.getEventById();
      }else{
        this.guestId = Number(result.split(':')[0]);
        this.getEventByGuest();
      }
      this.getQrCodeImageUrl();
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getUser(token: string) {
      this.eventService.getUserByToken(token).subscribe({
        next: (response: any) => {
          console.log('[getUser] response :: ', response);
          if(response.message == 'Le service est en maintenance.'){
            this.router.navigate(['/maintenance']);
          }else{
            console.log("Service accessible.");
          }
        },
        error: (error) => {
          console.error('[getUser] Erreur :', error);
        }
      });
  }

  checkResponse() {
    this.isValidating = false;
    this.errorMessage = "";
    console.log("isValidating :", this.isValidating);
  }
  submitResponse() {
    console.log("this.response():: ", this.response())
    const payload = {
      //notificationMode: this.notificationMethod,// Je commente parce que j'ai oublié si la condition if(!this.isFromGeneratedLink) se déclenche souvent.
      rsvpToken: this.token,
      rsvpStatus: this.response(),
      dietaryRestrictions: this.dietaryRestrictions || null,
      hasPlusOne: this.plusOne,
      plusOneName: this.plusOne ? this.plusOneName : null,
      plusOneNameDietRestr: this.plusOne ? this.plusOneNameDietRestr : null
    };
    console.log('Payload envoyé au backend :', payload);
    this.isValidating = true;
    this.loading = true;
    if(!this.isFromGeneratedLink){
      if(this.guestId==0) return;
      this.guestService.updateGuest(this.guestId, payload).subscribe({
        next: (response: any) => {
          console.log('[updateGuest] response :: ', response);
          this.loading = false;
          this.submitted.set(true);
        },
        error: (err) => {
          this.loading = false;
          if (err.status === 402) {
              this.errorMessage = "Cet événement n'est pas encore disponible. Le paiement de l'organisateur est en attente de validation.";
          } else {
              this.errorMessage = err.error?.error || err.error?.message || 'Erreur lors de la soumission de votre réponse.';
          }
          console.error('[updateGuest] Erreur :', err.error.error);
        }
      });
    }else{
      const numero = this.buildInternationalPhoneNumber();
      const numeroSansPlus = numero.replace('+', '');
      const data = {
        eventId: this.eventId,
        fullName: this.name,
        email: this.email,
        phoneNumber: numeroSansPlus,
        rsvpStatus: this.response(),
        guestHasPlusOneAutoriseByAdmin: this.linkType == 'a11a' ? false : true,
        dietaryRestrictions: this.dietaryRestrictions || null,
        hasPlusOne: this.plusOne,
        plusOneName: this.plusOne ? this.plusOneName : null,
        plusOneNameDietRestr: this.plusOne ? this.plusOneNameDietRestr : null,
        token: this.token.split(':')[1],
        notificationMode: this.notificationMethod
      };
      console.log('Data envoyé au backend :', data);
      if(this.validateForm()){
        this.guestService.addGuestFromGenerateLink(data).subscribe({
          next: (response: any) => {
            console.log('[updateGuest] response :: ', response);
            this.loading = false;
            this.submitted.set(true);
          },
          error: (err) => {
            this.loading = false;
            if (err.status === 402) {
                this.errorMessage = "Cet événement n'est pas encore disponible. Le paiement de l'organisateur est en attente de validation.";
            } else {
                this.errorMessage = err.error?.error || err.error?.message || 'Erreur lors de la soumission de votre réponse.';
            }
            console.log('[addGuest] Err :', err);
          }
        });
      }else{
        console.log('this.validateForm() ', this.validateForm());
        this.errorMessage = 'Veuillez remplir correctement tous les champs.';
        this.loading = false;
      }
    }
  }

  validateForm(): boolean {
    const name = this.name?.trim() || '';
    const email = this.email?.trim() || '';
    const phone = this.buildInternationalPhoneNumber();

    // EMAIL MODE
    if (this.notificationMethod === 'email') {

      if (!name || !email) {
        return false;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return false;
      }
    }

    // WHATSAPP MODE
    if (this.notificationMethod === 'whatsapp') {

      if (!name || !phone) {
        return false;
      }

      const phoneRegex = /^(\+?\d{6,15})$/;

      if (!phoneRegex.test(phone)) {
        return false;
      }
    }

    return true;
  }

  getQrCodeImageUrl() {
    if (this.token && this.guestId || this.token && this.eventId) {
      this.qrCodeService.viewQrCode(this.token).subscribe({
        next: (response: any) => {
          console.log('###response :: ', response);
          if(response.qrCodeUrl){
            this.url = response.qrCodeUrl;
          }else{
            this.url = response.imageUrl;
          }

        },
        error: (err) => {
          console.error('Erreur lors du chargement du QR code :', err);
        }
      });
    }
  }

  getEventByGuest(){
    if (this.guestId) {
      this.guestService.getEventByGuest(this.guestId).subscribe({
        next: (response: any) => {
          console.log('response :: ', response);
          if(response.rsvpStatus == 'confirmed'){
            this.response.set('confirmed');
            this.submitted.set(true);
          }
          if(response.rsvpStatus == 'declined'){
            this.response.set('declined');
            this.submitted.set(true);
          }else{
            this.concernedEvent = response.event_name_concerned1 +' et '+ response.event_name_concerned2;
            if (!response?.eventDate) {
              console.error('event_date manquant');
              return;
            }
            const eventDate = new Date(response.eventDate);
            if (isNaN(eventDate.getTime())) {
              console.error('Format de date invalide:', response.eventDate);
              return;
            }
            const date = eventDate.toISOString().split('T')[0];
            const time = eventDate.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'UTC'
            });

            if(response.type=="wedding"){
              this.showWeddingCivilLocation = true;
            }else{
              this.showWeddingCivilLocation = false;
            }

            this.data = {
              guestId: response.guestId,
              guestName: response.guestName,
              rsvpStatus: response.rsvpStatus,
              guestHasPlusOneAutoriseByAdmin: response.guestHasPlusOneAutoriseByAdmin,
              guestHasPlusOne: response.guestHasPlusOne,
              plusOneName: response.plusOneName,
              eventTitle: response.eventTitle,
              description: response.description,
              eventHasPlusOne: response.eventHasPlusOne,
              footRestriction: response.eventFootRestriction,
              eventDate: date,
              eventTime: time,
              banquetTime: response.banquetTime.split(':00')[0],
              eventCivilLocation: response.eventCivilLocation,
              eventLocation: response.eventLocation,
              emailOrganizer: response.emailOrganizer
            };
            this.changeStyle();
          }
        },
        error: (err) => {
          console.error('[getEventByGuest] Erreur :', err);
        }
      });
    }
  }

  getEventById(){
    if (this.eventId) {
      this.eventService.getEventById(this.eventId).subscribe({
        next: (response: any) => {
          console.log('response event :: ', response);
          const event = response[0];
          this.concernedEvent = response.event_name_concerned1 +' et '+ response.event_name_concerned2;
          if (!event.event_date) {
            console.error('event_date manquant');
            return;
          }
          const eventDate = new Date(event.event_date);
          if (isNaN(eventDate.getTime())) {
            console.error('Format de date invalide:', event.event_date);
            return;
          }
          const date = eventDate.toISOString().split('T')[0];
          const time = eventDate.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC'
          });

          if(event.type=="wedding"){
            this.showWeddingCivilLocation = true;
          }else{
            this.showWeddingCivilLocation = false;
          }

          this.data = {
            guestId: 0,
            guestName: '',
            rsvpStatus: '',
            guestHasPlusOneAutoriseByAdmin: this.linkType == 'a11a' ? false : true,
            guestHasPlusOne: false,
            plusOneName: '',
            eventTitle: event.title,
            description: event.description,
            eventHasPlusOne: event.has_plus_one,
            footRestriction: event.foot_restriction,
            eventDate: date,
            eventTime: time,
            banquetTime: event.banquet_time.split(':00')[0],
            eventCivilLocation: event.event_civil_location,
            eventLocation: event.event_location,
            emailOrganizer: event.emailOrganizer
          };
          this.changeStyle();
        },
        error: (err) => {
          console.error('[getEventById] Erreur :', err);
        }
      });
    }
  }

  boxChecked() {
    console.log("Plus one :", this.plusOne);
    if (this.plusOne) {
      this.isValidating = true;
      this.errorMessage = '';
    }else{
      this.isValidating = false;
      this.errorMessage = '';
    }
  }

  checkField() {
    console.log('isValidating :', this.isValidating);

    const plusOneName = this.plusOneName?.trim() || '';
    const name = this.name?.trim() || '';
    const email = this.email?.trim() || '';
    const phone = this.buildInternationalPhoneNumber();

    // Reset
    this.errorMessage = '';
    this.errorPhoneMessage = '';
    this.loading = false;

    // Vérifie si au moins un champ est rempli
    let hasValue
    if(this.notificationMethod == 'email'){
      hasValue = plusOneName.length > 0 || name.length > 0 || email.length > 0;
    }
    if(this.notificationMethod == 'whatsapp'){
      hasValue = plusOneName.length > 0 || name.length > 0 || phone.length > 0;
    }
    console.log("hasValue:", hasValue)

    // Aucun champ rempli
    if (!hasValue) {
      this.isValidating = true;
      this.loading = true;
      return;
    }

    // Validation du téléphone si renseigné
    if (phone.length > 0) {

      // Retire le "+"
      const digitsOnly = phone.replace(/^\+/, '');

      // Vérifie que ce sont bien des chiffres
      const isOnlyDigits = /^\d+$/.test(digitsOnly);

      if (!isOnlyDigits) {
        this.isValidating = true;
        this.errorPhoneMessage =
          'Le numéro ne doit contenir que des chiffres.';
        return;
      }

      // Vérifie la longueur
      if (digitsOnly.length < 8 || digitsOnly.length > 15) {
        this.isValidating = true;
        this.errorPhoneMessage =
          'Le numéro doit comporter entre 8 et 15 chiffres.';
        return;
      }
    }

    // Tout est OK
    this.isValidating = false;
    this.loading = false;
  }

  toggleNotificationMeans() {
    this.notificationMethod = this.notificationMethod === 'whatsapp' ? 'email' : 'whatsapp';
    this.notificationMeans.email = !this.notificationMeans.whatsapp;

  }

  onCountryDialCodeChange() {
    this.phone = this.buildInternationalPhoneNumber();
    if (this.phoneLocalNumber.trim()) {
      this.checkField();
    }
  }

  onPhoneLocalNumberChange(value: string) {
    this.phoneLocalNumber = value;
    this.phone = this.buildInternationalPhoneNumber();
    this.checkField();
  }

  buildInternationalPhoneNumber(): string {
    const phoneValue = this.phoneLocalNumber.trim();

    if (!phoneValue) {
      return '';
    }

    const sanitizedPhone = phoneValue.replace(/[^\d+]/g, '');

    if (sanitizedPhone.startsWith('+')) {
      return `+${sanitizedPhone.slice(1).replace(/\D/g, '')}`;
    }

    const nationalNumber = sanitizedPhone.replace(/\D/g, '').replace(/^0+/, '');
    return nationalNumber ? `${this.getSelectedCountryDialCode()}${nationalNumber}` : '';
  }

  private getSelectedCountryDialCode(): string {
    return this.countryDialCodes.find(country => country.code === this.selectedCountryCode)?.dialCode || '+237';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);

    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  changeStyle() {
    if(this.data.guestHasPlusOne == true ||
       (this.data.guestHasPlusOneAutoriseByAdmin == true && this.data.eventHasPlusOne == true)){
      this.additionalInfo = 'additional-info';
    }
  }
}
