import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FeedbackService } from '../../services/feedback.service';
import { AuthService } from '../../services/auth.service';
import { Maintenance, MaintenanceService } from '../../services/maintenance.service';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map, Observable } from 'rxjs';
import { PaymentService, FinancialStats, MonthStat } from '../../services/payment.service';
import { VisitorService, VisitorRow, VisitorDetail, VisitorStats } from '../../services/visitor.service';

// Interfaces
interface User {
  id: number;
  name: string;
  email: string;
  eventsCreated: number;
  lastLogin: string;
  createdAt: string;
  isBlocked: boolean;
  totalGuests: number;
  userPaymentPlanName?: string
  userPaymentProof?: string
  expirationDate?: string
}

interface Event {
  id: number;
  organizerId: number;
  title: string;
  type: string;
  guestCount: number;
  stage: string;
  date: string;
  time: string;
  confirmedGuests: number;
  pendingGuests: number;
  declinedGuests: number;
}

interface Guest {
  id: number;
  eventId: number;
  name: string;
  email: string;
  status: 'confirmed' | 'pending' | 'declined';
  qrCodeGenerated: boolean;
  qrCodeUrl?: string;
  dietaryRestrictions?: string;
  plusOne?: boolean;
  selected?: boolean;
}

interface Feedback {
  id: string;
  userId: string;
  email: string;
  rating: number;
  category: string;
  title: string;
  message: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
  adminNotes?: string;
  isSubscriber: 'subscribed' | 'unsbscribed';
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  activeTab = 'visitors';

  // Pagination
  currentPage = 1;
  pageSize = 6;

  // Data
  feedbacks: Feedback[] = [];
  pendingPayments: any[] = [];

  // Maintenance Data
  maintenance: Maintenance = {
    maintenance_progress: 0,
    subscribed: false,
    estimated_time: '',
    email: '',
    status: 'disabled'
  };

  // Modèle pour le formulaire de notification
  notification = {
    title: '',
    message: ''
  };

  // Modèle pour le type d'export
  exportType: 'users' | 'events' | 'logs' = 'users';

  visitors: VisitorRow[] = [];
  visitorsLoading = false;
  visitorStats: VisitorStats | null = null;
  selectedVisitor: VisitorRow | null = null;
  selectedVisitorDetail: VisitorDetail | null = null;
  visitorDetailLoading = false;
  visitorCityFilter = '';
  visitorDeviceFilter = '';
  visitorBrowserFilter = '';

  users: User[] = [];

  events: Event[] = [];

  guests: Guest[] = [];

  // Filters
  feedbackSearch = '';
  feedbackStatusFilter = '';
  visitorSearch = '';
  visitorCountryFilter = '';
  visitorDateFrom = '';
  visitorDateTo = '';

  userSearch = '';
  userStatusFilter = '';
  guestStatusFilter = '';
  isSubscriber = false;
  loading = false;
  showDetail = false;
  isMobile!: Observable<boolean>;
  userId: number = 0;

  allPayments: any[] = [];
  paymentHistoryFilter: 'all' | 'pending' | 'under_review' | 'validated' | 'rejected' = 'all';
  paymentHistorySearch = '';
  selectedPaymentProof: string | null = null;
  loadingPaymentId: number | null = null;

  financialStats: FinancialStats | null = null;
  financialStatsLoading = false;
  MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  // Selected items
  selectedFeedback: Feedback | null = null;
  selectedUser: User | null = null;
  selectedUserEvents: Event[] = [];
  selectedEvent: Event | null = null;
  selectedEventGuests: Guest[] = [];
  selectedGuest: Guest | null = null;

  tabs = [
    { id: 'visitors', label: '👥 Visiteurs' },
    { id: 'users', label: '👤 Utilisateurs' },
    { id: 'payments', label: '💳 Paiements' },
    { id: 'finances', label: '📊 Finances' },
    { id: 'guests', label: '🎫 Invités' },
    { id: 'feedback', label: '💬 Retours' },
    { id: 'maintenance', label: '🛠️ Maintenance' },
  ];

  constructor(
    private feedbackService: FeedbackService,
    private authService: AuthService,
    private paymentService: PaymentService,
    private visitorService: VisitorService,
    private breakpointObserver: BreakpointObserver,
    private maintenanceService: MaintenanceService
  ) {}

  ngOnInit() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.isMobile = this.breakpointObserver.observe(['(max-width: 768px)']).pipe(map(res => res.matches));
    this.loadRecentFeedback();
    this.loadMaintenanceData();
    this.loadPendingPayments();
    this.loadAllPayments();
    this.loadVisitors();
    this.loadVisitorStats();
    this.loadFinancialStats();
  }

  // FEEDBACK METHODS
  getFilteredFeedback(): Feedback[] {
    return this.feedbacks.filter(f =>
      (f.title.toLowerCase().includes(this.feedbackSearch.toLowerCase()) ||
       f.email.toLowerCase().includes(this.feedbackSearch.toLowerCase())) &&
      (!this.feedbackStatusFilter || f.status === this.feedbackStatusFilter)
    );
  }

  loadAllPayments() {
    this.paymentService.getAllPayments().subscribe({
      next: (res) => { this.allPayments = res.payments; },
      error: err => console.error(err)
    });
  }

  loadPendingPayments() {
    this.paymentService.getPendingPayments().subscribe({
      next: (res) => { this.pendingPayments = res.payments; },
      error: err => console.error(err)
    });
  }

  getFilteredPayments(): any[] {
    return this.allPayments.filter(p => {
      const matchStatus = this.paymentHistoryFilter === 'all' || p.status === this.paymentHistoryFilter;
      const matchSearch =
        p.organizer_name.toLowerCase().includes(this.paymentHistorySearch.toLowerCase()) ||
        p.organizer_email.toLowerCase().includes(this.paymentHistorySearch.toLowerCase()) ||
        p.event_title.toLowerCase().includes(this.paymentHistorySearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }

  openProofModal(proofUrl: string) {
    this.selectedPaymentProof = proofUrl;
  }

  closeProofModal() {
    this.selectedPaymentProof = null;
  }

  markUnderReview(payment: any) {
    this.loadingPaymentId = payment.id;
    this.paymentService.markUnderReview(payment.id).subscribe({
      next: () => {
        this.loadAllPayments();
        this.loadFinancialStats(); // FIX: synchroniser la section finances
        this.loadingPaymentId = null;
      },
      error: err => { console.error(err); this.loadingPaymentId = null; }
    });
  }

  validatePayment(payment: any) {
    if (!payment.proof_url) {
      alert('Impossible de valider : aucune preuve de paiement n\'a été soumise.');
      return;
    }
    if (!confirm(`Valider le paiement de ${payment.organizer_name} pour "${payment.event_title}" ?`)) return;
    this.loadingPaymentId = payment.id;
    this.paymentService.validatePayment(payment.id).subscribe({
      next: () => {
        this.loadAllPayments();
        this.loadFinancialStats(); // FIX: synchroniser la section finances apres validation
        this.loadingPaymentId = null;
      },
      error: (err) => {
        const msg = err.error?.message || 'Erreur lors de la validation.';
        alert(msg);
        console.error(err);
        this.loadingPaymentId = null;
      }
    });
  }

  rejectPayment(payment: any) {
    const reason = prompt(`Motif du rejet pour ${payment.organizer_name} :`);
    if (reason === null) return;
    this.loadingPaymentId = payment.id;
    this.paymentService.rejectPayment(payment.id, reason).subscribe({
      next: () => {
        this.loadAllPayments();
        this.loadFinancialStats(); // FIX: synchroniser la section finances apres rejet
        this.loadingPaymentId = null;
      },
      error: err => { console.error(err); this.loadingPaymentId = null; }
    });
  }

  loadRecentFeedback() {
    this.feedbackService.getRecentFeedback().subscribe({
      next: datas => {
        // //console.log('Feedbacks récents chargés:', datas);
        const feedbacks: Feedback[] = [];
        const userEmails: { email: string }[] = [];
        for (const data of datas) {
          const userData: Feedback = {
            id: data.id,
            userId: data.userId,
            email: data.email,
            rating: data.rating,
            category: data.category,
            title: data.title,
            message: data.message,
            status: data.status,
            createdAt: data.created_at.split('T')[0],
            isSubscriber: 'unsbscribed'
          };
          feedbacks.push(userData);
          userEmails.push({ email: data.email });
        }
        this.feedbacks = feedbacks;
        // //console.log('Feedbacks récents formatés:', this.feedbacks);
        this.getAllUsers(userEmails);
      },
      error: err => console.error(err)
    });
  }

  viewFeedbackDetails(feedback: Feedback) {
    //console.log('Détails du feedback:', feedback);
    this.selectedFeedback = feedback;
  }

  updateFeedbackStatus(feedback: Feedback) {
    //console.log('Statut mis à jour:', feedback);
    const data = {
        status: feedback.status
    }
    this.feedbackService.putRecentFeedback(feedback.id, data).subscribe({
      next: data => {
        //console.log('Feedbacks récents rechargés après mise à jour du statut:', data);
        this.loadRecentFeedback();
      },
      error: err => console.error(err)
    });
  }

  getAllUsers(dataEmails: any) {
    this.feedbackService.getAllUsers(dataEmails).subscribe({
      next: (datas: any) => {
        //console.log('[allUsers 1]:', datas);

        // 1️⃣ Extraire les emails abonnés
        const subscriberEmails = new Set(datas);

        // 2️⃣ Marquer chaque feedback
        this.feedbacks = this.feedbacks.map(feedback => ({
          ...feedback,
          isSubscriber: subscriberEmails.has(feedback.email)
              ? 'subscribed'
              : 'unsbscribed'
      }));

        //console.log('[feedbacks enriched]:', this.feedbacks);
      },
      error: err => console.error(err)
    });
    this.getUsers();
  }

  getUsers() {
    this.authService.getAllUsers().subscribe({
      next: (response: any) => {
        this.users = response.users.map((data: any) => ({
          id: data.id,
          name: data.name,
          email: data.email,
          eventsCreated: data.eventsCreated,
          lastLogin: data.last_login_at,
          createdAt: data.created_at,
          isBlocked: data.isBlocked,
          totalGuests: data.totalGuests,
          userPaymentPlanName: data.userPaymentPlanName,
          userPaymentProof: data.userPaymentProof,
        }));
        this.getAllEvent(response.events);
        this.getAllGuests(response.guests);
        console.log("## this.users : ", this.users);
      },
      error: err => console.error('error getUsers :: ', err)
    });
  }

  getAllEvent(events: any) {
    this.events = events.map((elt: any) => {
      const h = elt.banquet_time.split(':')[0];
      const m = elt.banquet_time.split(':')[1].split(':')[0];
      return {
        id: elt.event_id,
        organizerId: elt.organizerId,
        title: elt.title,
        type: elt.type,
        guestCount: elt.max_guests,
        stage: elt.status == 'active' ? 'published' : 'draft',
        date: elt.event_date.split('T')[0],
        time: h + ':' + m,
        confirmedGuests: elt.confirmed_count,
        pendingGuests: elt.pending_count,
        declinedGuests: elt.declined_count,
      };
    });
  }

  getAllGuests(guests: any) {
    this.guests = guests.map((elt: any) => ({
      id: elt.id,
      eventId: elt.event_id,
      name: elt.full_name,
      email: elt.email,
      status: elt.rsvp_status,
      qrCodeGenerated: elt.qr_code_url ? true : false,
      qrCodeUrl: elt.qr_code_url,
      dietaryRestrictions: elt.dietary_restrictions,
      plusOne: elt.has_plus_one,
      selected: false,
    }));
  }

  // MAINTENANCE METHODS
  loadMaintenanceData() {
    this.maintenanceService.getMaintenance().subscribe({
      next: (data) => {
        //console.log('Données de maintenance chargées:', data);
          this.maintenance = data; // On récupère la première configuration
      },
      error: (err) => console.error('Erreur chargement maintenance:', err)
    });
  }

  saveMaintenance() {
    if (this.maintenance.id) {
      // //console.log('Sauvegarde de la maintenance:', this.maintenance);
      const data = {
        maintenanceProgress: this.maintenance.maintenance_progress,
        subscribed: this.maintenance.subscribed,
        estimatedTime: this.maintenance.estimated_time,
        email: this.maintenance.email,
        status: this.maintenance.status
      };
      this.loading = true;
      this.maintenanceService.updateMaintenance(this.maintenance.id, data).subscribe({
        next: () => {
          alert('Configuration de maintenance mise à jour !'),
          this.loading = false;
        },
        error: (err) => {
          console.error('Erreur mise à jour maintenance:', err)
          this.loading = false;
        }
      });
    }
  }

  restartScheduler(): void {
    //console.log('Relance du schedule des événements...');
    const confirmation = confirm('La planification des événements va être relancé. Continuer ? ');
    if(!confirmation) return;
    this.loading = true;
    this.maintenanceService.restart().subscribe({
      next: (response) => {
        //console.log('🔄 Scheduler redémarré avec succès', response);
        // éventuellement un toast / message UI ici
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors du redémarrage du scheduler', error);
        // message d’erreur utilisateur si besoin
        this.loading = false;
      },
      complete: () => {
        //console.log('✅ Action restart terminée');
      }
    });
  }

  clearCache(): void {
    //console.log("Vidage du cache de l'application...");
    alert("Le cache de l'application a été vidé.");
    // Logique pour appeler votre service de gestion du cache
    // this.cacheService.clear().subscribe(...);
  }

  sendNotification(): void {
    if (!this.notification.title || !this.notification.message) {
      alert('Veuillez remplir le titre et le message de la notification.');
      return;
    }
    //console.log('Envoi de la notification :', this.notification);
    alert('Notification envoyée aux utilisateurs.');
    // Logique pour appeler votre service de notification
    this.loading = true;
    this.maintenanceService.send(this.notification).subscribe({
      next: (response) => {
        //console.log('✅ Notification envoyée :', response);
        this.loading = false;

        // Réinitialiser le formulaire
        this.notification = { title: '', message: '' };
      },
      error: (error) => {
        console.error('❌ Erreur lors de l’envoi de la notification :', error);
        this.loading = false;
        //this.errorMessage = error?.message || 'Erreur lors de l’envoi de la notification';
      }
    });
  }

  exportData(): void {
    //console.log(`Export des données de type : ${this.exportType}`);
    alert(`Le téléchargement des données "${this.exportType}" va commencer.`);
    // Logique pour appeler votre service d'export
    // this.dataExportService.export(this.exportType).subscribe(blob => {
    //   // Logique pour déclencher le téléchargement du fichier (blob)
    // });
  }

  saveFeedbackNotes() {
    //console.log('Notes enregistrées');
    alert('Notes enregistrées avec succès');
  }

  loadVisitors() {
    this.visitorsLoading = true;
    this.visitorService.getAllVisitors({
      search:   this.visitorSearch,
      country:  this.visitorCountryFilter,
      city:     this.visitorCityFilter,
      device:   this.visitorDeviceFilter,
      browser:  this.visitorBrowserFilter,
      dateFrom: this.visitorDateFrom,
      dateTo:   this.visitorDateTo
    }).subscribe({
      next: (res) => { this.visitors = res.visitors; this.visitorsLoading = false; },
      error: (err) => { console.error('GET VISITORS ERROR:', err); this.visitorsLoading = false; }
    });
  }

  openVisitorDetail(visitor: VisitorRow) {
    this.selectedVisitor = visitor;
    this.selectedVisitorDetail = null;
    this.visitorDetailLoading = true;
    this.visitorService.getVisitorDetail(visitor.visitor_id).subscribe({
      next: (detail) => { this.selectedVisitorDetail = detail; this.visitorDetailLoading = false; },
      error: () => { this.visitorDetailLoading = false; }
    });
  }

  closeVisitorDetail() {
    this.selectedVisitor = null;
    this.selectedVisitorDetail = null;
  }

  loadVisitorStats() {
    this.visitorService.getStats().subscribe({
      next: (stats) => { this.visitorStats = stats; },
      error: (err) => console.error('GET STATS ERROR:', err)
    });
  }

  applyVisitorFilters() {
    this.currentPage = 1;
    this.loadVisitors();
  }

  resetVisitorFilters() {
    this.visitorSearch = '';
    this.visitorCountryFilter = '';
    this.visitorCityFilter = '';
    this.visitorDeviceFilter = '';
    this.visitorBrowserFilter = '';
    this.visitorDateFrom = '';
    this.visitorDateTo = '';
    this.currentPage = 1;
    this.loadVisitors();
  }

  getUniqueCountries(): string[] {
    return [...new Set(this.visitors.map(v => v.country))].filter(c => c && c !== 'unknown');
  }

  getUniqueCities(): string[] {
    return [...new Set(this.visitors.map(v => v.city))].filter(c => c && c !== 'unknown');
  }

  getUniqueDevices(): string[] {
    return [...new Set(this.visitors.map(v => v.device))].filter(Boolean);
  }

  getUniqueBrowsers(): string[] {
    return [...new Set(this.visitors.map(v => v.browser))].filter(Boolean);
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }

  // USER METHODS
  getFilteredUsers(): User[] {
    return this.users.filter(u => {
      const matchSearch =
        u.name.toLowerCase().includes(this.userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(this.userSearch.toLowerCase());
      const matchStatus =
        !this.userStatusFilter ||
        (this.userStatusFilter === 'active' && !u.isBlocked) ||
        (this.userStatusFilter === 'blocked' && u.isBlocked);
      return matchSearch && matchStatus;
    });
  }

  getActiveUsersCount(): number {
    return this.users.filter(u => !u.isBlocked).length;
  }

  getBlockedUsersCount(): number {
    return this.users.filter(u => u.isBlocked).length;
  }

  getTotalEventsCount(): number {
    return this.users.reduce((sum, u) => sum + (u.eventsCreated || 0), 0);
  }

  viewUserEvents(user: User) {
    this.showDetail = false;
    //console.log("events: ", this.events);
    this.selectedUser = user;
    this.selectedUserEvents = this.events.filter(e => e.organizerId === user.id);
    //console.log("selectedUserEvents: ", this.selectedUserEvents);
    this.activeTab = 'events';
  }

  viewUserDetails(user: User) {
    this.selectedUser = user;
    this.showDetail = true;
    //console.log("User: ", this.selectedUser);
  }

  toggleBlockUser(user: User) {
    const action = user.isBlocked ? 'Débloquer' : 'Bloquer';
    if (!confirm(`${action} l'utilisateur ${user.name} ?`)) return;
    const newStatus = !user.isBlocked;
    this.authService.updateUserStatus(user.email, newStatus).subscribe({
      next: () => { user.isBlocked = newStatus; },
      error: err => console.error('TOGGLE BLOCK ERROR:', err)
    });
  }

  deleteUser(user: User) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${user.name} ?`)) return;
    this.authService.deleteAccount(user.id).subscribe({
      next: () => { this.users = this.users.filter(u => u.id !== user.id); },
      error: err => console.error('DELETE USER ERROR:', err)
    });
  }

  // EVENT METHODS
  viewEventGuests(event: Event) {
    this.selectedEvent = event;
    this.selectedEventGuests = this.guests.filter(g => g.eventId === event.id);
    this.activeTab = 'guests';
  }

  deleteEvent(event: Event) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${event.title} ?`)) {
      this.events = this.events.filter(e => e.id !== event.id);
      //console.log('Événement supprimé');
    }
  }

  // GUEST METHODS
  getFilteredEventGuests(): Guest[] {
    return this.selectedEventGuests.filter(g =>
      !this.guestStatusFilter || g.status === this.guestStatusFilter
    );
  }

  viewQRCode(guest: Guest) {
    this.selectedGuest = guest;
  }

  deleteGuest(guest: Guest) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${guest.name} ?`)) {
      this.selectedEventGuests = this.selectedEventGuests.filter(g => g.id !== guest.id);
      //console.log('Invité supprimé');
    }
  }

  deleteQRCode(guest: Guest) {
    guest.qrCodeGenerated = false;
    guest.qrCodeUrl = undefined;
    this.selectedGuest = null;
    //console.log('QR Code supprimé');
  }

  toggleSelectAllGuests(event: any) {
    const isChecked = event.target.checked;
    this.selectedEventGuests.forEach(g => g.selected = isChecked);
  }

  deleteSelectedGuests() {
    const selectedGuests = this.selectedEventGuests.filter(g => g.selected);
    if (selectedGuests.length > 0 && confirm(`Supprimer ${selectedGuests.length} invité(s) ?`)) {
      this.selectedEventGuests = this.selectedEventGuests.filter(g => !g.selected);
      //console.log('Invités supprimés');
    }
  }

  deleteSelectedQRCodes() {
    const selectedGuests = this.selectedEventGuests.filter(g => g.selected && g.qrCodeGenerated);
    if (selectedGuests.length > 0 && confirm(`Supprimer ${selectedGuests.length} QR Code(s) ?`)) {
      selectedGuests.forEach(g => {
        g.qrCodeGenerated = false;
        g.qrCodeUrl = undefined;
      });
      //console.log('QR Codes supprimés');
    }
  }

  loadFinancialStats() {
    this.financialStatsLoading = true;
    this.paymentService.getFinancialStats().subscribe({
      next: (stats) => { this.financialStats = stats; this.financialStatsLoading = false; },
      error: (err) => { console.error('FINANCIAL STATS ERROR:', err); this.financialStatsLoading = false; }
    });
  }

  getMonthLabel(month: number): string {
    return this.MONTH_NAMES[month - 1] || '';
  }

  // Retourne les 12 derniers mois pour le graphique barres
  getChartMonths(): { label: string; revenue: number; payments: number }[] {
    if (!this.financialStats) return [];
    const result: { label: string; revenue: number; payments: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const found = this.financialStats.by_month.find(b => b.year === y && b.month === m);
      result.push({
        label: `${this.MONTH_NAMES[m - 1]} ${y}`,
        revenue:  found ? found.revenue  : 0,
        payments: found ? found.payment_count : 0
      });
    }
    return result;
  }

  getMaxChartRevenue(): number {
    const months = this.getChartMonths();
    return Math.max(...months.map(m => m.revenue), 1);
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' XAF';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // PAGINATION LOGIC
  getPaginatedData(data: any[]): any[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return data.slice(startIndex, startIndex + this.pageSize);
  }

  getTotalPages(data: any[]): number {
    return Math.ceil(data.length / this.pageSize);
  }

  changePage(page: number) {
    this.currentPage = page;
  }
}
