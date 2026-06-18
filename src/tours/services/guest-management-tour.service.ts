import { Injectable } from '@angular/core';
import Shepherd from 'shepherd.js';

const TOTAL = 8;

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
export class GuestManagementTourService {

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
      id: 'guest-management',
      title: 'Gestion des invités',
      text: `${progress(1, TOTAL)}<p class="tour-description">Cette page vous permet d'ajouter, modifier, supprimer et suivre les réponses de tous vos invités.</p>`,
      attachTo: { element: '#guest-management-header', on: 'bottom' },
      buttons: [
        { text: 'Suivant', action: () => this.tour.next() }
      ]
    });

    // ── Étape 2 ──────────────────────────────────────────────
    this.tour.addStep({
      id: 'add-guest',
      title: 'Ajouter un invité',
      text: `${progress(2, TOTAL)}<p class="tour-description">Ajoutez manuellement un nouvel invité à votre événement.</p>`,
      attachTo: { element: '#add-guest-btn', on: 'bottom' },
      buttons: [
        { text: 'Précédent', secondary: true, action: () => this.tour.back() },
        { text: 'Suivant', action: () => this.tour.next() }
      ]
    });

    // ── Étape 3 ──────────────────────────────────────────────
    this.tour.addStep({
      id: 'import-guests',
      title: 'Importation',
      text: `${progress(3, TOTAL)}<p class="tour-description">Importez rapidement une liste complète d'invités depuis un fichier Excel ou CSV.</p>`,
      attachTo: { element: '#import-guests-btn', on: 'bottom' },
      buttons: [
        { text: 'Précédent', secondary: true, action: () => this.tour.back() },
        { text: 'Suivant', action: () => this.tour.next() }
      ]
    });

    // ── Étape 4 ──────────────────────────────────────────────
    this.tour.addStep({
      id: 'reminder',
      title: 'Relancer les invités',
      text: `${progress(4, TOTAL)}<p class="tour-description">Envoyez un rappel automatique aux invités qui n'ont pas encore répondu à votre invitation.</p>`,
      attachTo: { element: '#send-reminder-btn', on: 'bottom' },
      buttons: [
        { text: 'Précédent', secondary: true, action: () => this.tour.back() },
        { text: 'Suivant', action: () => this.tour.next() }
      ]
    });

    // ── Étape 5 ──────────────────────────────────────────────
    this.tour.addStep({
      id: 'search-filter',
      showOn: () => !!document.querySelector('#search-filter-section'),
      title: 'Recherche et filtres',
      text: `${progress(5, TOTAL)}<p class="tour-description">Retrouvez rapidement un invité grâce à la recherche, aux filtres et aux différents modes d'affichage.</p>`,
      attachTo: { element: '#search-filter-section', on: 'bottom' },
      buttons: [
        { text: 'Précédent', secondary: true, action: () => this.tour.back() },
        { text: 'Suivant', action: () => this.tour.next() }
      ]
    });

    // ── Étape 6 ──────────────────────────────────────────────
    this.tour.addStep({
      id: 'guest-list',
      showOn: () => !!document.querySelector('#guests-container'),
      title: 'Personnalisez votre affichage',
      text: `${progress(6, TOTAL)}<p class="tour-description">Choisissez le mode d'affichage qui vous convient : la vue <strong>Grille</strong> pour une consultation visuelle rapide ou la vue <strong>Tableau</strong> pour gérer et sélectionner plusieurs invités plus facilement.</p>`,
      attachTo: { element: '#guests-container', on: 'top' },
      buttons: [
        { text: 'Précédent', secondary: true, action: () => this.tour.back() },
        { text: 'Suivant', action: () => this.tour.next() }
      ]
    });

    // ── Étape 7 ──────────────────────────────────────────────
    this.tour.addStep({
      id: 'bulk-send',
      showOn: () => !!document.querySelector('#bulk-send-btn'),
      title: 'Envoi d\'invitations',
      text: `${progress(7, TOTAL)}<p class="tour-description">Après avoir sélectionné plusieurs invités, vous pouvez envoyer leurs invitations en une seule opération.</p>`,
      attachTo: { element: '#bulk-send-btn', on: 'bottom' },
      buttons: [
        { text: 'Précédent', secondary: true, action: () => this.tour.back() },
        { text: 'Suivant', action: () => this.tour.next() }
      ]
    });

    // ── Étape 8 ──────────────────────────────────────────────
    this.tour.addStep({
      id: 'statistics',
      title: 'Résumé des réponses',
      text: `${progress(8, TOTAL)}<p class="tour-description">Suivez l'évolution des confirmations, refus et réponses en attente grâce à ce résumé.</p>`,
      attachTo: { element: '#guest-stats-footer', on: 'top' },
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
