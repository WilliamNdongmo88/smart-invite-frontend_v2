import { Injectable } from '@angular/core';
import Shepherd from 'shepherd.js';

const TOTAL = 7;

function progress(step: number, total: number): string {
  const pct = Math.round((step / total) * 100);
  return `
    <div class="tour-progress">
      <span class="tour-step-badge">Étape ${step} / ${total}</span>
      <div class="tour-progress-bar">
        <div class="tour-progress-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
}

@Injectable({ providedIn: 'root' })
export class EventDetailTourService {

  private tour!: any;

  initTour(): void {

    this.tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        arrow: true,
        scrollTo: { behavior: 'smooth', block: 'center' },
        classes: 'smart-tour-step'
      }
    });

    // ── Étape 1 ──────────────────────────────────────────────
    this.tour.addStep({
      id: 'event-header',
      title: 'Votre événement',
      text: `${progress(1, TOTAL)}<p class="tour-description">Cette page vous permet de gérer entièrement votre événement, les invitations et le suivi des réponses.</p>`,
      attachTo: { element: '#event-header-guide', on: 'bottom' },
      buttons: [
        { text: 'Suivant', action: () => this.tour.next() }
      ]
    });

    // ── Étape 2 ──────────────────────────────────────────────
    this.tour.addStep({
      id: 'event-details',
      title: 'Détails de l\'événement',
      text: `${progress(2, TOTAL)}<p class="tour-description">Retrouvez ici toutes les informations importantes : date, lieux, horaires et message d'invitation.</p>`,
      attachTo: { element: '#event-details-card', on: 'right' },
      buttons: [
        { text: 'Précédent', secondary: true, action: () => this.tour.back() },
        { text: 'Suivant', action: () => this.tour.next() }
      ]
    });

    // ── Étape 3 ──────────────────────────────────────────────
    this.tour.addStep({
      id: 'manage-guests',
      title: 'Gestion des invités',
      text: `${progress(3, TOTAL)}<p class="tour-description">Cliquez ici pour accéder à la gestion complète des invités et envoyer les invitations.</p>`,
      attachTo: { element: '#manage-guests-btn', on: 'top' },
      buttons: [
        { text: 'Précédent', secondary: true, action: () => this.tour.back() },
        { text: 'Suivant', action: () => this.tour.next() }
      ]
    });

    // ── Étape 4 ──────────────────────────────────────────────
    this.tour.addStep({
      id: 'manage-links',
      title: 'Liens d\'invitation',
      text: `${progress(4, TOTAL)}<p class="tour-description">Générez des liens d'invitation personnalisés et partagez-les via WhatsApp, Email ou tout autre canal pour permettre à vos invités de confirmer leur présence.</p>`,
      attachTo: { element: '#manage-links-btn', on: 'top' },
      buttons: [
        { text: 'Précédent', secondary: true, action: () => this.tour.back() },
        { text: 'Suivant', action: () => this.tour.next() }
      ]
    });

    // ── Étape 5 ──────────────────────────────────────────────
    this.tour.addStep({
      id: 'quick-actions',
      title: 'Actions rapides',
      text: `${progress(5, TOTAL)}<p class="tour-description">Ajoutez rapidement des invités ou importez une liste complète depuis un fichier.</p>`,
      attachTo: { element: '#quick-actions-card', on: 'left' },
      buttons: [
        { text: 'Précédent', secondary: true, action: () => this.tour.back() },
        { text: 'Suivant', action: () => this.tour.next() }
      ]
    });

    // ── Étape 6 ──────────────────────────────────────────────
    this.tour.addStep({
      id: 'guest-list',
      title: 'Liste des invités',
      text: `${progress(6, TOTAL)}<p class="tour-description">Consultez les invités, recherchez un participant, filtrez les réponses et exportez vos données.</p>`,
      attachTo: { element: '#guests-list-card', on: 'top' },
      buttons: [
        { text: 'Précédent', secondary: true, action: () => this.tour.back() },
        { text: 'Suivant', action: () => this.tour.next() }
      ]
    });

    // ── Étape 7 ──────────────────────────────────────────────
    this.tour.addStep({
      id: 'stats',
      title: 'Statistiques',
      text: `${progress(7, TOTAL)}<p class="tour-description">Suivez en temps réel les confirmations, refus et le taux de réponse de vos invités.</p>`,
      attachTo: { element: '#stats-summary-card', on: 'left' },
      buttons: [
        { text: 'Précédent', secondary: true, action: () => this.tour.back() },
        { text: 'Terminer', action: () => this.tour.complete() }
      ]
    });
  }

  start(): void {
    this.tour.start();
  }
}
