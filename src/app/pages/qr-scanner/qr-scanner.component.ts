import { Component, signal, ViewChild, ElementRef, OnInit, OnDestroy, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

interface ParsedQR {
  guestId: number;
  token: string;
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

  private destroyRef = inject(DestroyRef);

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
  private audioCtx: AudioContext | null = null;

  token: string = '';
  guestId: number = 0;
  eventId: number = 0;
  isValid: boolean = false;
  loading: boolean = false;
  private isScanning: boolean = false;
  public isEffetScanning: boolean = false;
  datas: any[] = [];
  data = { eventTitle: '', guestName: '', hasPlusOne: '', plusOneName: '' };
  userConnected = { id: 0, name: '', email: '', role: '' };

  event = {
    eventTitle: '', eventDate: '', eventTime: '',
    eventDateTime: '', eventLocation: '', guestRsvpStatus: ''
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

  private dataMap = new Map<number, any>();
  private lastScanTime = 0;

  // PERF F1 : intervalle réduit de 200ms → 80ms = ~12 tentatives/sec au lieu de 5
  // Scan toutes les 80ms (~12/sec) au lieu de 200ms (5/sec)
  private readonly SCAN_INTERVAL = 80;
  private readonly SCAN_SCALE = 0.5; // réduit la résolution analysée par jsQR

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
    try {
      const raw = localStorage.getItem('currentUser');
      if (raw) this.userConnected = JSON.parse(raw);
    } catch (e) {
      console.error('[ngOnInit] currentUser invalide en localStorage :', e);
    }

    const result = this.route.snapshot.paramMap.get('eventId') || '';
    this.eventId = Number(result);
    this.getEventAndInvitationRelated();
    this.getCheckInParam();
    this.isMobile = this.breakpointObserver
      .observe(['(max-width: 768px)'])
      .pipe(map(res => res.matches));
  }

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      return this.audioCtx;
    } catch (e) {
      console.error('[getAudioContext] Impossible de créer AudioContext :', e);
      return null;
    }
  }

  getEventAndInvitationRelated() {
    this.eventService.getEventAndInvitationRelated(this.eventId).subscribe({
      next: (response) => {
        this.datas = response;
        this.dataMap.clear();
        this.datas.forEach(elt => {
          if (elt.guestId) this.dataMap.set(Number(elt.guestId), elt);
        });
        this.getListScannedGuest();
      },
      error: (error) => console.error('❌ [getEventAndInvitationRelated] Erreur :', error.message)
    });
  }

  startCamera() {
    // PERF F5 : contrainte de résolution — on demande 640x480 max
    // Les caméras mobiles peuvent fournir 4K par défaut, inutile pour lire un QR
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 }
      }
    })
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
      .catch(err => console.error("❌ Erreur d'accès à la caméra :", err));
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

    // Analyse toute l'image mais à résolution réduite (SCAN_SCALE)
    // pour que jsQR traite moins de pixels sans manquer le QR
    const scanWidth = Math.floor(video.videoWidth * this.SCAN_SCALE);
    const scanHeight = Math.floor(video.videoHeight * this.SCAN_SCALE);

    if (canvas.width !== scanWidth || canvas.height !== scanHeight) {
      canvas.width = scanWidth;
      canvas.height = scanHeight;
    }

    context.drawImage(video, 0, 0, scanWidth, scanHeight);
    const imageData = context.getImageData(0, 0, scanWidth, scanHeight);
    const qrCode = jsQR(imageData.data, scanWidth, scanHeight, { inversionAttempts: 'dontInvert' });

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

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) return;

    // Capture manuelle : pleine résolution pour maximiser les chances de détection
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

  parseQRCode(qrCode: string): ParsedQR | null {
    try {
      const afterView = qrCode.split('view/')[1];
      if (!afterView) return null;
      const parts = afterView.split(':');
      if (parts.length < 3) return null;
      const guestId = Number(parts[0]);
      if (isNaN(guestId) || guestId <= 0) return null;
      const token = `${parts[1]}:${parts[2]}`;
      if (!parts[1] || !parts[2]) return null;
      return { guestId, token };
    } catch {
      return null;
    }
  }

  processQRCode(qrCode: string) {
    this.scannedCount.update(count => count + 1);

    const parsed = this.parseQRCode(qrCode);
    if (!parsed) {
      if (this.soundEnabled()) this.playErrorSound();
      this.errorCount.update(count => count + 1);
      this.scanResult.set({ success: false, message: 'Format de QR code invalide ou non reconnu.' });
      return;
    }

    this.guestId = parsed.guestId;
    this.token = parsed.token;
    this.addCheckIn();
  }

  addCheckIn() {
    const now = new Date().toISOString();
    const checkinTime = now.split('.')[0].replace('T', ' ');
    const elt = this.dataMap.get(this.guestId);

    if (!elt) {
      console.error('❌ [addCheckIn] Invité non trouvé dans la liste locale');
      this.scanResult.set({ success: false, message: 'Invité non trouvé dans la liste locale.' });
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

    this.data.eventTitle = elt.title;
    this.data.guestName = elt.guestName;
    this.data.hasPlusOne = elt.hasPlusOne;
    this.data.plusOneName = elt.plusOneName;

    this.qrcodeService.addCheckIn(data).subscribe({
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
        this.isEffetScanning = false;
        // PERF F4 : manageCheckInParameter découplé du chemin critique
        // Appel fire-and-forget — ne bloque pas l'affichage du résultat
        setTimeout(() => this.manageCheckInParameter(), 0);
      },
      error: (error) => {
        this.isEffetScanning = false;
        console.error('❌ [addCheckIn] Erreur :', error.message);
        this.isValid = false;
        if (this.soundEnabled()) this.playErrorSound();
        this.errorCount.update(count => count + 1);
        this.scanResult.set({
          success: false,
          message: error.error?.error ?? 'Code QR invalide ou non reconnu.',
        });
        setTimeout(() => this.manageCheckInParameter(), 0);
      }
    });
  }

  getListScannedGuest() {
    const guestIds = this.datas.filter(g => g.guestId != null).map(g => g.guestId);
    this.qrcodeService.getListScannedGuests(guestIds).subscribe({
      next: (responses) => {
        const guests: Guest[] = [];
        const res = responses[0];
        if (!res?.event_date) { console.error('❌ event_date manquant'); return; }

        const eventDate = new Date(res.event_date);
        if (isNaN(eventDate.getTime())) { console.error('❌ Date invalide :', res.event_date); return; }

        this.event = {
          eventTitle: responses[0].title,
          eventDate: eventDate.toISOString().split('T')[0],
          eventTime: eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
          eventDateTime: responses[0].event_date,
          eventLocation: responses[0].event_location,
          guestRsvpStatus: responses[0].rsvp_status
        };

        for (const r of responses) {
          guests.push({
            eventId: r.eventId, name: r.guestName, email: r.email,
            phone: r.phone_number, notification_mode: r.notification_mode,
            eventDate: r.event_date, plusOne: r.has_plus_one, plusOneName: r.plus_one_name,
            dietaryRestrictions: r.dietary_restrictions || 'Aucune',
            plusOnedietaryRestrictions: r.plus_one_name_diet_restr || 'Aucune',
            status: r.rsvp_status,
          });
        }
        this.guests = guests;
        this.filterGuests();
      },
      error: (error) => console.error('❌ [getListScannedGuests] Erreur :', error.message)
    });
  }

  toggle() { this.isOpen = !this.isOpen; this.isMessage = false; this.noMessage = false; }

  manageCheckInParameter() {
    const data = {
      eventId: this.eventId,
      automaticCapture: this.autoCapture(),
      confirmationSound: this.soundEnabled(),
      scannedCodes: this.scannedCount(),
      scannedSuccess: this.successCount(),
      scannedErrors: this.errorCount(),
    };
    this.qrcodeService.createCheckInParam(data).subscribe({
      next: () => {},
      error: (error) => console.error('❌ [manageCheckInParameter] Erreur :', error.message)
    });
  }

  getCheckInParam() {
    this.qrcodeService.getCheckInParam(this.eventId).subscribe({
      next: (response) => {
        this.autoCapture.set(response.automatic_capture);
        this.soundEnabled.set(response.confirmation_sound);
        this.scannedCount.set(response.scanned_codes);
        this.successCount.set(response.scanned_success);
        this.errorCount.set(response.scanned_errors);
      },
      error: (error) => console.error('❌ [getCheckInParam] Erreur :', error.message)
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
    this.qrcodeService.updateCheckInParam(data).subscribe({
      next: () => {},
      error: (error) => console.error('❌ [updateCheckInParam] Erreur :', error.message)
    });
  }

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
    const target = event.target as HTMLInputElement;
    this.autoCapture.set(target.checked);
    this.updateCheckInParam();
  }

  toggleSound() {
    this.soundEnabled.set(!this.soundEnabled());
    this.updateCheckInParam();
  }

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
      console.error('❌ [playSuccessSound] Erreur audio :', e);
    }
  }

  playErrorSound() {
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
      console.error('❌ [playErrorSound] Erreur audio :', e);
    }
  }

  filterGuests() {
    this.filteredGuests = this.guests.filter((guest) => {
      const matchesSearch =
        guest.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        guest.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (guest.phone && guest.phone.includes(this.searchTerm));
      const matchesStatus = this.filterStatus() === 'present' || guest.status === this.filterStatus();
      return matchesSearch && matchesStatus;
    });
    this.currentPage = 1;
  }

  exportPDF() {
    const data = { event: this.event, filteredGuests: this.filteredGuests };
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
      error: (err) => { console.error('❌ [exportPDF] Erreur :', err); this.loading = false; }
    });
  }

  thankMessageForm() {
    const eventDateObj = new Date(this.event.eventDateTime);
    const now = new Date();
    if (eventDateObj > now) {
      this.isOpen = true; this.noMessage = true; this.isMessage = false;
    } else {
      this.isOpen = true; this.isMessage = true; this.noMessage = false;
    }
  }

  onMessageChange() {
    this.messageError = '';
    this.canSendThankMessage = false;
    if (!this.thankMessage?.trim()) { this.messageError = 'Le message est requis.'; return; }
    if (this.thankMessage.trim().length < 5) { this.messageError = 'Le message doit contenir au moins 5 caractères.'; return; }
    if (this.thankMessage.length > 1000) { this.messageError = 'Le message ne peut pas dépasser 1000 caractères.'; return; }
    this.canSendThankMessage = true;
  }

  sendThankMessage() {
    if (!this.canSendThankMessage) return;
    const guests = this.guests.map(g => ({
      full_name: g.name, phone_number: g.phone,
      email: g.email, notification_mode: g.notification_mode,
    }));
    const data = { eventId: this.guests[0]?.eventId, guests, message: this.thankMessage };
    this.loading = true;
    this.qrcodeService.sendThankMessage(data).subscribe({
      next: () => {
        this.thankMessage = '';
        this.canSendThankMessage = false;
        this.notificationService.clearNotificationsCache();
        this.notificationService.getNotifications();
        this.loading = false;
      },
      error: (error) => { this.loading = false; console.error('❌ [sendThankMessage] Erreur :', error.message); }
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  get totalPages() { return Math.ceil(this.filteredGuests.length / this.itemsPerPage); }
  totalPagesArray() { return Array(this.totalPages).fill(0).map((_, i) => i + 1); }
  paginatedGuests() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredGuests.slice(startIndex, startIndex + this.itemsPerPage);
  }

  getStatusIcon(status: string): string {
    const map: Record<string, string> = { confirmed: '✓', pending: '⏳', declined: '✕', present: '✓✓' };
    return map[status] ?? '';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { confirmed: 'Confirmé', pending: 'En attente', declined: 'Refusé', present: 'Présent' };
    return map[status] ?? status;
  }

  goToPage(page: number) { this.currentPage = page; }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  goToDashboard() { this.router.navigate(['/evenements']); }
  backToEvent() { window.history.back(); }

  ngOnDestroy() {
    this.stopCamera();
    this.audioCtx?.close();
  }
}
