import { Component, signal, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import jsQR from 'jsqr';
import { QrCodeService } from '../../services/qr-code.service';
import { GuestService } from '../../services/guest.service';
import { EventService } from '../../services/event.service';
import { map, Observable } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NotificationService } from '../../services/notification.service';
import { HttpErrorResponse } from '@angular/common/http';

interface ScanResult {
  success: boolean;
  guestId?: string;
  guestName?: string;
  eventName?: string;
  tableNumber?: string;
  message: string;
}

interface Guest {
  id?: string;
  eventId?: number
  name: string;
  email: string;
  phone: string;
  notification_mode: 'email' | 'whatsapp'
  status: 'confirmed' | 'pending' | 'declined' | 'present';
  dietaryRestrictions?: string;
  plusOnedietaryRestrictions?: string;
  plusOne?: boolean;
  plusOneName?: string;
  responseDate?: string;
  eventDate: string
}

type FilterStatus = 'all' | 'confirmed' | 'pending' | 'declined' | 'present';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'qr-scanner.component.html',
  styleUrl: 'qr-scanner.component.scss'
})
export class QRScannerComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  cameraActive = signal(false);
  autoCapture = signal(true);
  soundEnabled = signal(true);
  manualCode = '';
  scanResult = signal<ScanResult | null>(null);
  scannedCount = signal(0);
  successCount = signal(0);
  errorCount = signal(0);

  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  token: string = '';
  guestId: number = 0;
  eventId: number = 0;
  isValid: boolean = false;
  loading: boolean = false;
  private isScanning: boolean = false;
  public isEffetScanning: boolean = false;
  datas: any[] = [];
  data = {
        eventTitle: '',
        guestName: '',
        hasPlusOne: '',
        plusOneName: ''
  };
  userConnected = {
    id: 0,
    name: '',
    email: '',
    role: ''
  };

  event = {
    eventTitle: '',
    eventDate: '',
    eventTime: '',
    eventDateTime: '',
    eventLocation: '',
    guestRsvpStatus: ''
  }

  filterStatus = signal<FilterStatus>('present');
  filteredGuests: Guest[] = [];
  guests: Guest[] = [];
  searchTerm = '';
  itemsPerPage = 6;
  currentPage = 1;
  isMobile!: Observable<boolean>;
  isOpen = true;
  isMessage = false;
  noMessage = false;
  thankMessage = '';
  messageError = '';
  canSendThankMessage = false;

  // NOUVELLES PROPRIÉTÉS POUR L'OPTIMISATION
  private dataMap = new Map<number, any>();
  private lastScanTime = 0;
  private readonly SCAN_INTERVAL = 200; // Scanner toutes les 200ms au lieu de chaque frame (~16ms)
  private readonly SCAN_SCALE = 0.7;    // Réduire la taille de l'image de 30% pour jsQR

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private qrcodeService: QrCodeService,
    private guestService: GuestService,
    private eventService: EventService,
    private notificationService: NotificationService,
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit() {
    this.userConnected = JSON.parse(localStorage.getItem('currentUser') || '');
    console.log('this.userConnected', this.userConnected);
    const result = this.route.snapshot.paramMap.get('eventId') || '';
    this.eventId = Number(result);
    console.log("eventId :::", this.eventId);
    this.getEventAndInvitationRelated();
    this.getCheckInParam();
    this.isMobile = this.breakpointObserver.observe(['(max-width: 768px)']).pipe(map(res => res.matches));
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  // OPTIMISATION : Pré-indexer les données pour une recherche instantanée (O(1))
  getEventAndInvitationRelated(){
    this.eventService.getEventAndInvitationRelated(this.eventId).subscribe(
        (response) => {
            this.datas = response;
            // Création d'une Map pour éviter la boucle 'for' dans addCheckIn
            this.dataMap.clear();
            this.datas.forEach(elt => {
                if (elt.guestId) this.dataMap.set(Number(elt.guestId), elt);
            });
            this.getListScannedGuest();
        },
        (error) => {
            console.error('❌ [getEventAndInvitationRelated] Erreur :', error.message);
            console.log("Message :: ", error.message);
        }
    );
  }

  startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(stream => {

        this.stream = stream;

        const video = this.videoElement.nativeElement;
        video.srcObject = stream;

        // Attendre que la caméra soit prête AVANT de scanner
        video.onloadedmetadata = () => {
            console.log("Activé camera ...");
            this.cameraActive.set(true);
            video.play();
            this.isScanning = true;   // Activation du scan
            if(this.autoCapture()) this.scanQRCode();
        };
    })
    .catch(err => {
        console.error("Erreur d'accès à la caméra:", err);
    });
  }

  stopCamera() {
    this.isScanning = false;   // Empêche toute nouvelle frame
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.cameraActive.set(false);
  }

  // scanQRCodes() {
  //   if (!this.cameraActive() || !this.isScanning) return;

  //   const video = this.videoElement.nativeElement;
  //   const canvas = this.canvasElement.nativeElement;
  //   const context = canvas.getContext("2d", { willReadFrequently: true });

  //   if (!context) return;

  //   if (video.videoWidth === 0 || video.videoHeight === 0) {
  //       this.animationFrameId = requestAnimationFrame(() => this.scanQRCode());
  //       return;
  //   }

  //   canvas.width = video.videoWidth;
  //   canvas.height = video.videoHeight;
  //   context.drawImage(video, 0, 0, canvas.width, canvas.height);

  //   const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  //   const qrCode = jsQR(imageData.data, canvas.width, canvas.height);

  //   if (qrCode?.data) {
  //       console.log('QR détecté:', qrCode.data);

  //       this.isScanning = false;              // Stop immédiat de la boucle
  //       cancelAnimationFrame(this.animationFrameId!);

  //       this.processQRCode(qrCode.data);      // Un seul appel
  //       return;
  //   }

  //   this.animationFrameId = requestAnimationFrame(() => this.scanQRCode());
  // }
  // OPTIMISATION : Gestion du cycle de scan plus efficace
  scanQRCode() {
    if (!this.cameraActive() || !this.isScanning) return;

    const now = Date.now();
    if (now - this.lastScanTime < this.SCAN_INTERVAL) {
        this.animationFrameId = requestAnimationFrame(() => this.scanQRCode());
        return;
    }
    this.lastScanTime = now;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context || video.videoWidth === 0) {
        this.animationFrameId = requestAnimationFrame(() => this.scanQRCode());
        return;
    }

    // OPTIMISATION : Réduction de la résolution pour jsQR
    // Un QR code n'a pas besoin de 1080p pour être lu.
    // Réduire la taille divise drastiquement le nombre de pixels à analyser.
    const scanWidth = video.videoWidth * this.SCAN_SCALE;
    const scanHeight = video.videoHeight * this.SCAN_SCALE;

    if (canvas.width !== scanWidth) {
        canvas.width = scanWidth;
        canvas.height = scanHeight;
    }

    context.drawImage(video, 0, 0, scanWidth, scanHeight);
    const imageData = context.getImageData(0, 0, scanWidth, scanHeight);

    // jsQR est synchrone et gourmand en CPU.
    // En réduisant imageData, on accélère cette ligne :
    const qrCode = jsQR(imageData.data, scanWidth, scanHeight, {
        inversionAttempts: "dontInvert", // Gain de performance si les QR ne sont pas inversés
    });

    if (qrCode?.data) {
        this.isScanning = false;
        this.isEffetScanning = true;
        cancelAnimationFrame(this.animationFrameId!);
        this.processQRCode(qrCode.data);
        return;
    }

    this.animationFrameId = requestAnimationFrame(() => this.scanQRCode());
  }

  captureFrame() {
    console.log("Manuel...")
    if (!this.cameraActive() || !this.isScanning) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) return;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
        this.animationFrameId = requestAnimationFrame(() => this.scanQRCode());
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const qrCode = jsQR(imageData.data, canvas.width, canvas.height);

    if (qrCode?.data) {
        console.log('QR détecté:', qrCode.data);
        this.isEffetScanning = true;
        this.isScanning = false;              // Stop immédiat de la boucle
        cancelAnimationFrame(this.animationFrameId!);

        this.processQRCode(qrCode.data);      // Un seul appel
        return;
    }

    this.animationFrameId = requestAnimationFrame(() => this.scanQRCode());
  }

  processQRCode(qrCode: string) {
    this.scannedCount.update(count => count + 1);

    //console.log("qrcode:: ", qrCode);
    this.guestId = Number(qrCode.split('view/')[1].split(':')[0]);
    this.token = qrCode.split('view/')[1].split(':')[1]+':'+qrCode.split('view/')[1].split(':')[2];
    console.log("this.guestId:: ", this.guestId);
    console.log("this.token:: ", this.token);
    this.qrcodeService.viewPdfs(qrCode).subscribe(
    (response) => {
        console.log("###response :: ", response);
        this.addCheckIn();
    },
    (error: HttpErrorResponse) => {
        console.error('❌ [viewPdfs] Erreur HTTP');
        console.error('➡️ Message :', error.message);

        if (this.soundEnabled()) this.playErrorSound();
        if(error.status == 404){
          this.errorCount.update(count => count + 1);
          this.scanResult.set({
              success: false,
              message: 'Invité introuvable',
          });
        }else{
          this.errorCount.update(count => count + 1);
          this.scanResult.set({
              success: false,
              message: 'Code QR invalide ou non reconnu',
          });
        }
      }
    );
  }

  // OPTIMISATION : Recherche instantanée
  addCheckIn(){
    const now = new Date().toISOString();
    const checkinTime = now.split('.')[0].replace('T', ' ');

    // Utilisation de la Map au lieu de la boucle 'for...of' sur this.datas
    const elt = this.dataMap.get(this.guestId);

    if (elt) {
        const data = {
            eventId: elt.eventId,
            guestId: elt.guestId,
            invitationId: elt.invitationId,
            token: this.token,
            scannedBy: this.userConnected.name,
            scanStatus: 'VALID',
            checkinTime: checkinTime
        };

        // Mise à jour des données locales pour l'affichage
        this.data.eventTitle = elt.title;
        this.data.guestName = elt.guestName;
        this.data.hasPlusOne = elt.hasPlusOne;
        this.data.plusOneName = elt.plusOneName;

        this.qrcodeService.addCheckIn(data).subscribe(
        (response) => {
            console.log("[addCheckIn] response :: ", response);
            const guest = response;
            const event = response;
            this.successCount.update(count => count + 1);

            this.isValid = true;

            // 🎉 Son + message + stop caméra (comme avant)
            if (this.soundEnabled()) this.playSuccessSound();

            this.scanResult.set({
                success: true,
                guestName: guest.has_plus_one ? guest.guestName+' et '+guest.plus_one_name : guest.guestName,
                eventName: event.title,
                tableNumber: guest.table_number,
                message: 'Code QR validé avec succès !'
            });
          this.manageCheckInParameter();
          this.isEffetScanning = false;
        },
        (error) => {
            this.isEffetScanning = false;
            console.error('❌ [getGuestById] Erreur :', error.message);
            this.isValid = false;
            if (this.soundEnabled()) this.playErrorSound();
            this.errorCount.update(count => count + 1);
            this.manageCheckInParameter();
            if(error.message.includes('409 Conflict'))console.warn(error.error.error);
            this.scanResult.set({
                success: false,
                message: error.error.error ? error.error.error : 'Code QR invalide ou non reconnu',
            });
        });
    } else {
        console.error("Invité non trouvé dans la liste locale");
        this.scanResult.set({
            success: false,
            message: 'Invité non trouvé dans la liste locale',
        });
    }
  }

  getListScannedGuest(){
    const guestIds = this.datas.filter(g => g.guestId != null).map(g => g.guestId);
    this.qrcodeService.getListScannedGuests(guestIds).subscribe(
    (responses) => {
      console.log("[getListScannedGuests] response :: ", responses);
      const guests = [];
      const res = responses[0];
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

      this.event = {
        eventTitle: responses[0].title,
        eventDate: date,
        eventTime: time,
        eventDateTime: responses[0].event_date,
        eventLocation: responses[0].event_location,
        guestRsvpStatus: responses[0].rsvp_status
      }
      for (const res of responses) {
        const guest = {
          eventId: res.eventId,
          name: res.guestName,
          email: res.email,
          phone: res.phone_number,
          notification_mode: res.notification_mode,
          eventDate: res.event_date,
          plusOne: res.has_plus_one,
          plusOneName: res.plus_one_name,
          dietaryRestrictions: res.dietary_restrictions || 'Aucune',
          plusOnedietaryRestrictions: res.plus_one_name_diet_restr || 'Aucune',
          status: res.rsvp_status,
        }
        guests.push(guest);
      }
      this.guests = guests;
      //console.log("[getListScannedGuests] this.guests :: ", this.guests);
      this.filterGuests();
    },
    (error) => {
        console.error('❌ [getListScannedGuests] Erreur :', error.message);
    });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.isMessage = false;
    this.noMessage = false;
    // console.log('this.isOpen', this.isOpen)
  }

  manageCheckInParameter(){
    const data = {
      eventId: this.eventId,
      automaticCapture: this.autoCapture(),
      confirmationSound: this.soundEnabled(),
      scannedCodes: this.scannedCount(),
      scannedSuccess: this.successCount(),
      scannedErrors: this.errorCount(),
   }
    console.log('[manageCheckInParameter] data:: ', data);
    this.qrcodeService.createCheckInParam(data).subscribe(
    (response) => {
        console.log("###response :: ", response);
    },
    (error) => {
        console.error('❌ [manageCheckInParameter] Erreur :', error.message);
    });
  }

  getCheckInParam(){
    this.qrcodeService.getCheckInParam(this.eventId).subscribe(
    (response) => {
        console.log("[getCheckInParam] response :: ", response);
        this.autoCapture.set(response.automatic_capture);
        this.soundEnabled.set(response.confirmation_sound);
        this.scannedCount.set(response.scanned_codes);
        this.successCount.set(response.scanned_success);
        this.errorCount.set(response.scanned_errors);
    },
    (error) => {
        console.error('❌ [getCheckInParam] Erreur :', error.message);
    });
  }

  updateCheckInParam(){
    const data = {
      eventId: this.eventId,
      automaticCapture: this.autoCapture(),
      confirmationSound: this.soundEnabled(),
      scannedCodes: this.scannedCount(),
      scannedSuccess: this.successCount(),
      scannedErrors: this.errorCount(),
   }
    console.log('[updateCheckInParam] data:: ', data);
    this.qrcodeService.updateCheckInParam(data).subscribe(
    (response) => {
        console.log("###response :: ", response);
    },
    (error) => {
        console.error('❌ [updateCheckInParam] Erreur :', error.message);
    });
  }

  processManualCode() {
    if (!this.manualCode.trim()) {
      alert('Veuillez entrer un code');
      return;
    }

    this.processQRCode(this.manualCode);
    this.manualCode = '';
  }

  resetScanner() {
    this.scanResult.set(null);
    this.isEffetScanning = false;
    this.startCamera();
  }

  toggleAutoCapture(event: Event) {
    const target = event.target as HTMLInputElement;
    this.autoCapture.set(target.checked);
    this.updateCheckInParam();
  }

  toggleSound() {
    console.log('Mise à jour du signal');

    this.soundEnabled.set(!this.soundEnabled());

    this.updateCheckInParam();
  }

  private playSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = "sine";

        // ✔️ Bonne API
        oscillator.frequency.setValueAtTime(700, audioContext.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.5, audioContext.currentTime + 0.01);

        oscillator.start();

        oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
        console.error("Erreur audio :", e);
    }
  }

  playErrorSound() {
    // Créer et jouer un son d'erreur
    const audioContext = new (window as any).AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 300;
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  }

  filterGuests() {
    console.log("[filterGuests] this.guests :: ", this.guests);
    this.filteredGuests = this.guests
    .filter((guest) => {
      const matchesSearch =
        guest.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        guest.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (guest.phone && guest.phone.includes(this.searchTerm));
      const matchesStatus = this.filterStatus() === 'present' || guest.status === this.filterStatus();
      return matchesSearch && matchesStatus;
    });
    console.log("filteredGuests :: ", this.filteredGuests);
  }

  exportPDF() {
    console.log("[exportPDF] this.guests:: ", this.guests);
    console.log("[exportPDF] this.filteredGuests:: ", this.filteredGuests);
    const data = {
      event: this.event,
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
        console.error('Erreur téléchargement PDF', err);
      }
    });
  }

  thankMessageForm(){
    console.log("Envoie du message en cours... ");
    const eventDateObj = new Date(this.event.eventDate);
    console.log('eventDateObj:', eventDateObj);
    const now = new Date();

    if (eventDateObj > now) {
      console.log('📅 L’événement est dans le futur');
      this.isOpen = true;
      this.noMessage = true;
      this.isMessage = false;
    } else if (eventDateObj < now) {
      console.log("Envoie du message en cours... ");
      this.isOpen = true;
      this.isMessage = true;
    } else {
      console.log('⚡ L’événement est maintenant');
    }
  }
  onMessageChange() {
    // Reset
    this.messageError = '';
    this.canSendThankMessage = false;

    // Message obligatoire
    if (!this.thankMessage || this.thankMessage.trim().length === 0) {
      this.messageError = 'Le message est requis.';
      return;
    }

    // Longueur minimale
    if (this.thankMessage.trim().length < 5) {
      this.messageError = 'Le message doit contenir au moins 5 caractères.';
      return;
    }

    // Longueur max
    if (this.thankMessage.length > 1000) {
      this.messageError = 'Le message ne peut pas dépasser 300 caractères.';
      return;
    }

    // OK
    this.canSendThankMessage = true;
  }

  sendThankMessage() {
    if (!this.canSendThankMessage) return;
    const guests = [];
    let eventId;
    for (const g of this.guests) {
      eventId = g.eventId;
      const guest = {
        full_name: g.name,
        phone_number: g.phone,
        email: g.email,
        notification_mode: g.notification_mode,
      }
      guests.push(guest);
    }
    const data = {
      eventId : eventId,
      guests: guests,
      message: this.thankMessage
    }
    console.log('📨 data :', data);
    this.loading = true;
    this.qrcodeService.sendThankMessage(data).subscribe(
    (response) => {
      console.log("[sendThankMessage] response :: ", response);
      this.thankMessage = '';
      this.canSendThankMessage = false;
      this.notificationService.clearNotificationsCache();
      this.notificationService.getNotifications();
      this.loading = false;
    },
    (error) => {
      this.loading = false;
      console.error('❌ [sendThankMessage] Erreur :', error.message);
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  goToPage(page: number) {
    this.currentPage = page;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  goToDashboard() {
    this.router.navigate(['/evenements']);
  }

  backToEvent(){
    // this.router.navigate(['/events', this.eventId]);
    window.history.back();
  }
}

