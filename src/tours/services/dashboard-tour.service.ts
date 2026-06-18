import { Injectable } from '@angular/core';
import Shepherd from 'shepherd.js';
import { flip, shift, offset } from '@floating-ui/dom';

const TOTAL = 3;

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

/** Options Floating UI : flip + shift (évite la sortie d'écran) + offset flèche */
const floatingUIOptions = {
  middleware: [
    offset(14),
    flip({ fallbackPlacements: ['top', 'right', 'left'] }),
    shift({ padding: 12 })
  ]
};

/** Scroll vers la cible puis résout la promesse pour que Shepherd recalcule. */
function scrollToTarget(selector: string): Promise<void> {
  return new Promise(resolve => {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) { resolve(); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(resolve, 400);
  });
}

@Injectable({ providedIn: 'root' })
export class DashboardTourService {

  private tour!: any;

  initTour(): void {

    this.tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon:       { enabled: true },
        arrow:            true,
        floatingUIOptions,
        scrollTo:         false,
        classes:          'smart-tour-step'
      }
    });

    // ── Étape 1 : Créer un événement ─────────────────────────
    this.tour.addStep({
      id: 'create-event',
      title: 'Créer un événement',
      text: `${progress(1, TOTAL)}<p class="tour-description">Cliquez ici pour créer votre premier événement.</p>`,
      attachTo: { element: '#btn-create', on: 'bottom' },
      beforeShowPromise: () => scrollToTarget('#btn-create'),
      buttons: [
        { text: 'Suivant', action: () => this.tour.next() }
      ]
    });

    // ── Étape 2 : Statistiques ────────────────────────────────
    this.tour.addStep({
      id: 'stats',
      title: 'Statistiques',
      text: `${progress(2, TOTAL)}<p class="tour-description">Cette section affiche les statistiques globales de vos événements.</p>`,
      attachTo: { element: '#stats-section', on: 'bottom' },
      beforeShowPromise: () => scrollToTarget('#stats-section'),
      buttons: [
        { text: 'Précédent', secondary: true, action: () => this.tour.back() },
        { text: 'Suivant', action: () => this.tour.next() }
      ]
    });

    // ── Étape 3 : Liste des événements ───────────────────────
    this.tour.addStep({
      id: 'events',
      title: 'Liste des événements',
      text: `${progress(3, TOTAL)}<p class="tour-description">Retrouvez ici tous vos événements et cliquez sur l'un d'eux pour en consulter les détails.</p>`,
      attachTo: { element: '#events-list', on: 'top' },
      beforeShowPromise: () => scrollToTarget('#events-list'),
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
