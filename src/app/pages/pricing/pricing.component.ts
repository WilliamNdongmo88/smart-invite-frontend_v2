import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { CommunicationService } from '../../services/share.service';
import { NavigationService } from '../../services/navigationService ';
import { PaymentService } from '../../services/payment.service';
import { FormsModule } from '@angular/forms';
import { PaymentModalComponent, PaymentProofData } from '../../components/payment-modal/payment-modal.component';


type BillingCycle = 'monthly' | 'yearly';
export const PRICE_PER_GUEST = 52;

interface PricingPlan {
  name: string;
  price: number;
  monthlyPrice: number; 
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
}

interface PaymentProof {
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedAt: string;
  base64: string;
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'pricing.component.html',
  styleUrl: 'pricing.component.scss'
})
export class PricingComponent implements OnInit{

  billingCycle: BillingCycle = 'monthly';
  isPaymentModalOpen = false;
  selectedPlan: PricingPlan | null = null;
  currentUser: User | null = null;
  isAuthenticated = false;
  private authSub!: Subscription;

  PRICE_PER_GUEST = PRICE_PER_GUEST;
  simulatedQuota = 100;
  simulatedAmount = 100 * this.PRICE_PER_GUEST;

  paymentStatus: 'pending' | 'under_review' | 'validated' | 'rejected' | null = null;
  eventPayment: any = null;
  showPaymentModal = false;
  isSubmittingProof = false;

  examples = [
    { quota: 50, amount: 50 * this.PRICE_PER_GUEST },
    { quota: 100, amount: 100 * this.PRICE_PER_GUEST },
    { quota: 200, amount: 200 * this.PRICE_PER_GUEST },
    { quota: 500, amount: 500 * this.PRICE_PER_GUEST },
  ];

  pricingPlans: PricingPlan[] = [
    {
      name: 'Gratuit',
      price: 0,
      monthlyPrice: 0,
      period: 'Pour toujours',
      description: 'Parfait pour commencer',
      features: [
        '1 événement',
        '50 invités',
        'Codes QR',
        'Gestion basique des invités',
        'Support par email',
      ],
    },
    {
      name: 'Professionnel',
      price: 10000,
      monthlyPrice: 10.000,
      period: '/mois',
      description: 'Pour les événements réguliers',
      popular: true,
      features: [
        '2 Événements',
        'Jusqu\'à 500 invités',
        'Intégrations personnalisées',
        'Support dédié 24/7',
        'Formation personnalisée',
        'Sauvegardes quotidiennes',
      ],
    },
    {
      name: 'Entreprise',
      price: 30000,
      monthlyPrice: 30.000,
      period: '/mois',
      description: 'Pour les grandes organisations',
      features: [
        'Événements illimités',
        'Invités illimités',
        'API personnalisée',
        'Intégrations personnalisées',
        'Support dédié 24/7',
        'Formation personnalisée',
        'Sauvegardes quotidiennes',
        'Rapports personnalisés',
      ],
    },
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private paymentService: PaymentService,
    private navigationService: NavigationService,
    private communicationService: CommunicationService
  ){}

  ngOnInit(): void {
    this.authSub = this.authService.isAuthenticated$.subscribe(status => {
      this.isAuthenticated = status;
      console.log('[PricingComponent] isAuthenticated ? ', this.isAuthenticated);
    });
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      console.log("---this.currentUser :: ", this.currentUser)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    //this.loadPaymentStatus();
  }

  onSimulatorChange() {
    this.simulatedAmount = this.simulatedQuota * this.PRICE_PER_GUEST;
  }

  goToCreateEvent() {
    this.router.navigate([this.isAuthenticated ? '/add-event' : '/signup']);
  }

  // loadPaymentStatus() {
  //   if (!this.eventId) return;
  //   this.paymentService.getEventPayment(this.eventId).subscribe({
  //     next: (res) => {
  //       this.eventPayment = res.payment;
  //       this.paymentStatus = res.payment?.status ?? null;
  //     },
  //     error: () => { this.paymentStatus = null; }
  //   });
  // }
  
  openPaymentModal() {
    this.showPaymentModal = true;
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
            //this.loadPaymentStatus();
          },
          error: (err) => {
            this.isSubmittingProof = false;
            //this.triggerError();
            //this.errorMessage = err.error?.error || 'Erreur lors de la soumission.';
          }
        });
      },
      error: (err) => {
        this.isSubmittingProof = false;
        //this.triggerError();
        //this.errorMessage = err.error?.error || 'Erreur lors de l\'initialisation.';
      }
    });
  }
  
  closePaymentModal() {
    this.showPaymentModal = false;
  }

  retour(){
    console.log('isAuthenticated:', this.isAuthenticated);

    if (!this.isAuthenticated) {
      this.router.navigateByUrl(this.navigationService.back());
      return;
    }

    // Si déjà connecté
    // this.router.navigate(['/evenements']);
    this.router.navigateByUrl(this.navigationService.back());
  }

  initStep(){
    console.log("")
  }

  private base64ToBlob(base64: string): Blob {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);

    for (let i = 0; i < bstr.length; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }

    return new Blob([u8arr], { type: mime });
  }

}