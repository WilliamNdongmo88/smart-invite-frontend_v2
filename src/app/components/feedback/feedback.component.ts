import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FeedbackService } from '../../services/feedback.service';
import { AuthService, User } from '../../services/auth.service';

interface FeedbackSubmission {
  id?: string;
  rating: number;
  category: 'feature' | 'design' | 'performance' | 'support' | 'other';
  title: string;
  message: string;
  email: string;
  attachments?: string[];
  createdAt?: string;
  status?: 'pending' | 'reviewed' | 'resolved';
}

interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  ratingDistribution: {
    [key: number]: number;
  };
  categoryDistribution: {
    [key: string]: number;
  };
}

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.scss']
})
export class FeedbackComponent implements OnInit {
  currentStep = 1;
  hoverRating = 0;
  submissionSuccess = false;
  Math = Math;

  feedback = {
    rating: 0,
    category: 'feature',
    title: '',
    message: '',
    email: '',
  };
  currentUser: User | null = null;

  feedbackStats: FeedbackStats = {
    totalFeedback: 0,
    averageRating: 0,
    ratingDistribution: {},
    categoryDistribution: {},
};
  recentFeedback: any[] = [];
  loading = true;

  constructor(
    private feedbackService: FeedbackService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      console.log("[currentUser] :: ", this.currentUser);
      if (this.currentUser) {
        this.feedback.email = this.currentUser.email;
      }
    });
    this.loadStats();
    this.loadRecentFeedback();
  }

  setRating(rating: number) {
    this.feedback.rating = rating;
  }

  getRatingText(rating: number): string {
    const texts: { [key: number]: string } = {
      0: 'Cliquez sur une étoile pour noter',
      1: 'Mauvais - Nous pouvons faire mieux',
      2: 'Moyen - Il y a place à l\'amélioration',
      3: 'Acceptable - Pas mal',
      4: 'Bon - Très satisfait',
      5: 'Excellent - Absolument parfait !',
    };
    return texts[rating] || '';
  }

  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      feature: 'Demande de fonctionnalité',
      design: 'Design et interface',
      performance: 'Performance et vitesse',
      support: 'Support client',
      other: 'Autre',
    };
    return labels[category] || category;
  }

  getStatusLabel(status?: string): string {
    const labels: { [key: string]: string } = {
      pending: 'En attente',
      reviewed: 'Examiné',
      resolved: 'Résolu',
    };
    return labels[status || 'pending'] || 'En attente';
  }

  getCategoryList() {
    const distribution = this.feedbackStats?.categoryDistribution || {};
    return Object.entries(distribution).map(([key, value]) => ({
      name: this.getCategoryLabel(key),
      count: value,
    }));
  }

  formatDate(date?: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  nextStep() {
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  submitFeedback() {
    console.log('Retour soumis:', this.feedback);
    this.submissionSuccess = true;

    // Simuler l'envoi au backend
    this.feedbackService.createFeedback(this.feedback).subscribe({
        next: (response: any) => {
          console.log('[submitFeedback] response :: ', response);
          this.resetForm();
          this.loadStats();
          this.loadRecentFeedback();
        },
        error: (err) => {
          console.error('[submitFeedback] Erreur :', err);
        }
      });
  }

  loadStats() {
    this.feedbackService.getFeedbackStats().subscribe({
      next: stats => this.feedbackStats = stats,
      error: err => console.error(err)
    });
  }

  loadRecentFeedback() {
    this.feedbackService.getRecentFeedback().subscribe({
      next: data => {
        this.recentFeedback = data;
      },
      error: err => console.error(err)
    });
  }

  resetForm() {
    this.feedback = {
      rating: 0,
      category: 'feature',
      title: '',
      message: '',
      email: '',
    };
    this.currentStep = 1;
    this.submissionSuccess = false;
    this.hoverRating = 0;
  }
}
