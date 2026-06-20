import {
  Component, signal, ViewChild, ElementRef,
  OnInit, OnDestroy, inject, DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  eventId?: number;
  name: string;
  email: string;
  phone: string;
  notification_mode: 'email' | 'whatsapp';
  status: 'confirmed' | 'pending' | 'declined' | 'present';
  dietaryRestrictions?: string;
  plusOnedietaryRestrictions?: string;
  plusOne?: boolean;
  plusOneName?: string;
  responseDate?: string;
  eventDate: string;
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

  // ─── Signals ───────────────────────────────────────────────────────────────
  cameraActive = signal(false);
  autoCapture = signal(true);
  soundEnabled = signal(true);
  scanResult = signal<ScanResult | null>(null);
  scannedCount = signal(0);
  successCount = signal(0);
  errorCount = signal(0);

  // ─── Propriétés ────────────────────────────────────────────────────────────
  manualCode = '';
  token: string = '';
  guestId: number = 0;
  eventId: number = 0;
  isValid: boolean = false;
  loading: boolean = false;
  private isScanning: boolean = false;
  public isEffetScanning: boolean = false;
  datas: any[] = [];
  data = { eventTitle: '', guestName: '', hasPlusOne: '', plusOneName: '' };

  // [FIX 1] Valeur par défaut sûre pour userConnected
  userConnected = { id: 0, name: '', email: '', role: '' };

  event = {
    eventTitle: '',
    eventDate: '',
    eventTime: '',
    eventDateTime: '',
    eventLocation: '',
    guestRsvpStatus: ''
  };

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

  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private dataMap = new Map<number, any>();
  private lastScanTime = 0;
  private readonly SCAN_INTERVAL = 200;
  private readonly SCAN_SCALE = 0.7;

  // [FIX 3] AudioContext singleton — évite "AudioContext limit exceeded" sur mobile
  private audioContext: AudioContext | null = null;

  // [FIX 6] DestroyRef pour takeUntilDestroyed
  private destroyRef = inject(DestroyRef);

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
    // [FIX 1] Sécurisation du parsing localStorage
    this.userConnected = this.loadCurrentUser();

    const result = this.route.snapshot.paramMap.get('eventId') || '';
    this.eventId = Number(result);
    this.getEventAndInvitationRelated();
    this.getCheckInParam();
    this.isMobile = this.breakpointObserver
      .observe(['(max-width: 768px)'])
      .pipe(map(res => res.matches));
  }

  ngOnDestroy() {
    this.stopCamera();
    // Fermeture de l'AudioContext singleton
    this.audioContext?.close();
  }

  // ─── [FIX 1] Chargement sécurisé de l'utilisateur ──────────────────────────
  private loadCurrentUser() {
    const defaultUser = { id: 0, name: '', email: '', role: '' };
    const raw = localStorage.getItem('currentUser');
    if (!raw) return defaultUser;
    try {
      return JSON.parse(raw) ?? defaultUser;
    } catch {
      console.error('currentUser: JSON invalide dans localStorage');
      return defaultUser;
    }
  }

  // ─── [FIX 2] Parsing sécurisé du QR Code ───────────────────────────────────
  private parseQRCode(qrCode: string): { guestId: number; token: string } | null {
    try {
      const afterView = qrCode.split('view/')[1];
      if (!afterView) return null;
      const parts = afterView.split(':');
      if (parts.length < 3) return null;
      const guestId = Number(parts[0]);
      if (isNaN(guestId) || guestId <= 0) return null;
      const token = `${parts[1]}:${parts[2]}`;
      return { guestId, token };
    } catch {
      return null;
    }
  }

  // ─── [FIX 3] Accès unique à l'AudioContext ─────────────────────────────────
  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      return this.audioContext;
    } catch {
      return null;
    }
  }

  // ─── Services ──────────────────────────────────────────────────────────────
  getEventAndInvitationRelated() {
    this.eventService.getEventAndInvitationRelated(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))  // [FIX 6]
      .subscribe({
        next: (response) => {
          this.datas = response;
          this.dataMap.clear();
          this.datas.forEach(elt => {
            if (elt.guestId) this.dataMap.set(Number(elt.guestId), elt);
          });
          this.getListScannedGuest();
        },
        error: (error) => console.error('[getEventAndInvitationRelated]', error.message)
      });
  }

  // ─── Caméra ────────────────────────────────────────────────────────────────
  startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        this.stream = stream;
        const video = this.videoElement.nativeElement;
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          this.cameraActive.set(true);
          video.play();
          this.isScanning = true;
          if (this.autoCapture()) this.scanQRCode();
        };
      })
      .catch(err => console.error("Erreur d'accès à la caméra:", err));
  }

  stopCamera() {
    this.isScanning = false;
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
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context || video.videoWidth === 0) {
      this.animationFrameId = requestAnimationFrame(() => this.scanQRCode());
      return;
    }

    const scanWidth = video.videoWidth * this.SCAN_SCALE;
    const scanHeight = video.videoHeight * this.SCAN_SCALE;

    if (canvas.width !== scanWidth) {
      canvas.width = scanWidth;
      canvas.height = scanHeight;
    }

    context.drawImage(video, 0, 0, scanWidth, scanHeight);
    const imageData = context.getImageData(0, 0, scanWidth, scanHeight);
    const qrCode = jsQR(imageData.data, scanWidth, scanHeight, {
      inversionAttempts: 'dontInvert',
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
    if (!this.cameraActive() || !this.isScanning) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d', { willReadFrequently: true });
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
      this.isEffetScanning = true;
      this.isScanning = false;
      cancelAnimationFrame(this.animationFrameId!);
      this.processQRCode(qrCode.data);
      return;
    }

    this.animationFrameId = requestAnimationFrame(() => this.scanQRCode());
  }

  // ─── Traitement QR ─────────────────────────────────────────────────────────
  processQRCode(qrCode: string) {
    this.scannedCount.update(count => count + 1);

    // [FIX 2] Validation du format QR avant tout accès
    const parsed = this.parseQRCode(qrCode);
    if (!parsed) {
      if (this.soundEnabled()) this.playErrorSound();
      this.errorCount.update(count => count + 1);
      this.scanResult.set({ success: false, message: 'Format du QR code invalide' });
      return;
    }

    this.guestId = parsed.guestId;
    this.token = parsed.token;

    this.qrcodeService.viewPdfs(qrCode)
      .pipe(takeUntilDestroyed(this.destroyRef))  // [FIX 6]
      .subscribe({
        next: () => this.addCheckIn(),
        error: (error: HttpErrorResponse) => {
          if (this.soundEnabled()) this.playErrorSound();
          this.errorCount.update(count => count + 1);
          this.scanResult.set({
            success: false,
            message: error.status === 404 ? 'Invité introuvable' : 'Code QR invalide ou non reconnu',
          });
        }
      });
  }

  addCheckIn() {
    const checkinTime = new Date().toISOString().split('.')[0].replace('T', ' ');
    const elt = this.dataMap.get(this.guestId);

    if (!elt) {
      this.scanResult.set({ success: false, message: 'Invité non trouvé dans la liste locale' });
      return;
    }

    const data = {
      eventId: elt.eventId,
      guestId: elt.guestId,
      invitationId: elt.invitationId,
      token: this.token,
      scannedBy: this.userConnected.name,
      scanStatus: 'VALID',
      checkinTime
    };

    this.data = {
      eventTitle: elt.title,
      guestName: elt.guestName,
      hasPlusOne: elt.hasPlusOne,
      plusOneName: elt.plusOneName
    };

    this.qrcodeService.addCheckIn(data)
      .pipe(takeUntilDestroyed(this.destroyRef))  // [FIX 6]
      .subscribe({
        next: (response) => {
          this.successCount.update(count => count + 1);
          this.isValid = true;
          if (this.soundEnabled()) this.playSuccessSound();
          this.scanResult.set({
            success: true,
            guestName: response.has_plus_one
              ? `${response.guestName} et ${response.plus_one_name}`
              : response.guestName,
            eventName: response.title,
            tableNumber: response.table_number,
            message: 'Code QR validé avec succès !'
          });
          this.manageCheckInParameter();
          this.isEffetScanning = false;
        },
        error: (error) => {
          this.isEffetScanning = false;
          this.isValid = false;
          if (this.soundEnabled()) this.playErrorSound();
          this.errorCount.update(count => count + 1);
          this.manageCheckInParameter();
          this.scanResult.set({
            success: false,
            message: error.error?.error ?? 'Code QR invalide ou non reconnu',
          });
        }
      });
  }

  getListScannedGuest() {
    const guestIds = this.datas.filter(g => g.guestId != null).map(g => g.guestId);
    this.qrcodeService.getListScannedGuests(guestIds)
      .pipe(takeUntilDestroyed(this.destroyRef))  // [FIX 6]
      .subscribe({
        next: (responses) => {
          const res = responses[0];
          if (!res?.event_date) { console.error('event_date manquant'); return; }

          const eventDate = new Date(res.event_date);
          if (isNaN(eventDate.getTime())) { console.error('Format de date invalide'); return; }

          this.event = {
            eventTitle: res.title,
            eventDate: eventDate.toISOString().split('T')[0],
            eventTime: eventDate.toLocaleTimeString('fr-FR', {
              hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
            }),
            eventDateTime: res.event_date,  // [FIX 4] stocké pour comparaison exacte
            eventLocation: res.event_location,
            guestRsvpStatus: res.rsvp_status
          };

          this.guests = responses.map((r: any) => ({
            eventId: r.eventId,
            name: r.guestName,
            email: r.email,
            phone: r.phone_number,
            notification_mode: r.notification_mode,
            eventDate: r.event_date,
            plusOne: r.has_plus_one,
            plusOneName: r.plus_one_name,
            dietaryRestrictions: r.dietary_restrictions || 'Aucune',
            plusOnedietaryRestrictions: r.plus_one_name_diet_restr || 'Aucune',
            status: r.rsvp_status,
          }));

          this.filterGuests();
        },
        error: (error) => console.error('[getListScannedGuests]', error.message)
      });
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.isMessage = false;
    this.noMessage = false;
  }

  manageCheckInParameter() {
    const data = {
      eventId: this.eventId,
      automaticCapture: this.autoCapture(),
      confirmationSound: this.soundEnabled(),
      scannedCodes: this.scannedCount(),
      scannedSuccess: this.successCount(),
      scannedErrors: this.errorCount(),
    };
    this.qrcodeService.createCheckInParam(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: (e) => console.error('[manageCheckInParameter]', e.message) });
  }

  getCheckInParam() {
    this.qrcodeService.getCheckInParam(this.eventId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.autoCapture.set(response.automatic_capture);
          this.soundEnabled.set(response.confirmation_sound);
          this.scannedCount.set(response.scanned_codes);
          this.successCount.set(response.scanned_success);
          this.errorCount.set(response.scanned_errors);
        },
        error: (e) => console.error('[getCheckInParam]', e.message)
      });
  }

  updateCheckInParam() {
    const data = {
      eventId: this.eventId,
      automaticCapture: this.autoCapture(),
      confirmationSound: this.soundEnabled(),
      scannedCodes: this.scannedCount(),
      scannedSuccess: this.successCount(),
      scannedErrors: this.errorCount(),
    };
    this.qrcodeService.updateCheckInParam(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: (e) => console.error('[updateCheckInParam]', e.message) });
  }

  // ─── Audio ─────────────────────────────────────────────────────────────────
  // [FIX 3] Réutilisation du singleton AudioContext
  private playSuccessSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.01);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.error('Erreur audio succès:', e);
    }
  }

  private playErrorSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 300;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.error('Erreur audio erreur:', e);
    }
  }

  // ─── Filtres & Pagination ───────────────────────────────────────────────────
  filterGuests() {
    this.filteredGuests = this.guests.filter(guest => {
      const matchesSearch =
        guest.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        guest.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (guest.phone && guest.phone.includes(this.searchTerm));
      const matchesStatus = this.filterStatus() === 'present' || guest.status === this.filterStatus();
      return matchesSearch && matchesStatus;
    });
    this.currentPage = 1;  // [FIX 5] Réinitialisation après filtrage
  }

  exportPDF() {
    const data = { event: this.event, filteredGuests: this.filteredGuests };
    this.loading = true;
    this.qrcodeService.downloadGuestsPdf(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
        error: (err) => console.error('Erreur téléchargement PDF', err)
      });
  }

  thankMessageForm() {
    // [FIX 4] Utilisation de eventDateTime pour comparaison précise (date + heure)
    const eventDateObj = new Date(this.event.eventDateTime);
    const now = new Date();

    if (eventDateObj > now) {
      this.isOpen = true;
      this.noMessage = true;
      this.isMessage = false;
    } else if (eventDateObj < now) {
      this.isOpen = true;
      this.isMessage = true;
    }
  }

  onMessageChange() {
    this.messageError = '';
    this.canSendThankMessage = false;
    if (!this.thankMessage?.trim()) {
      this.messageError = 'Le message est requis.';
      return;
    }
    if (this.thankMessage.trim().length < 5) {
      this.messageError = 'Le message doit contenir au moins 5 caractères.';
      return;
    }
    if (this.thankMessage.length > 1000) {
      this.messageError = 'Le message ne peut pas dépasser 1000 caractères.';
      return;
    }
    this.canSendThankMessage = true;
  }

  sendThankMessage() {
    if (!this.canSendThankMessage) return;
    const guests = this.guests.map(g => ({
      full_name: g.name,
      phone_number: g.phone,
      email: g.email,
      notification_mode: g.notification_mode,
    }));
    const data = {
      eventId: this.guests[0]?.eventId,
      guests,
      message: this.thankMessage
    };
    this.loading = true;
    this.qrcodeService.sendThankMessage(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.thankMessage = '';
          this.canSendThankMessage = false;
          this.notificationService.clearNotificationsCache();
          this.notificationService.getNotifications();
          this.loading = false;
        },
        error: (e) => {
          this.loading = false;
          console.error('[sendThankMessage]', e.message);
        }
      });
  }

  // ─── UI Helpers ────────────────────────────────────────────────────────────
  processManualCode() {
    if (!this.manualCode.trim()) { alert('Veuillez entrer un code'); return; }
    this.processQRCode(this.manualCode);
    this.manualCode = '';
  }

  resetScanner() {
    this.scanResult.set(null);
    this.isEffetScanning = false;
    this.startCamera();
  }

  toggleAutoCapture(event: Event) {
    this.autoCapture.set((event.target as HTMLInputElement).checked);
    this.updateCheckInParam();
  }

  toggleSound() {
    this.soundEnabled.set(!this.soundEnabled());
    this.updateCheckInParam();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  get totalPages() { return Math.ceil(this.filteredGuests.length / this.itemsPerPage); }
  totalPagesArray() { return Array(this.totalPages).fill(0).map((_, i) => i + 1); }
  paginatedGuests() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredGuests.slice(start, start + this.itemsPerPage);
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      confirmed: '✓', pending: '⏳', declined: '✕', present: '✓✓'
    };
    return icons[status] ?? '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      confirmed: 'Confirmé', pending: 'En attente', declined: 'Refusé', present: 'Présent'
    };
    return labels[status] ?? status;
  }

  goToPage(page: number) { this.currentPage = page; }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  goToDashboard() { this.router.navigate(['/evenements']); }
  backToEvent() { window.history.back(); }
}
