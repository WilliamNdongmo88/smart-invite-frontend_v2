import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { VisitorService } from './services/visitor.service';
import { FloatingFeedbackBtnComponent } from "./components/floating-feedback-btn/floating-feedback-btn.component";
import { FooterDetailComponent } from "./components/footer/footer.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, FloatingFeedbackBtnComponent, FooterDetailComponent],
  template: `
    <app-header *ngIf="showHeader"></app-header>
    <main>
      <router-outlet></router-outlet>
      <app-floating-feedback-btn></app-floating-feedback-btn>
      
      <!-- Affichage conditionnel du footer -->
      <app-footer *ngIf="showFooter"></app-footer>
    </main>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'Smart Invite - Wedding Management Platform';
  showHeader = true;
  showFooter = true;

  private hiddenFooterRoutes = ['/'];

  constructor(private router: Router, private visitorService: VisitorService) {
    // Écouter les changements de navigation
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects;
        //console.log('[AuthGuard] URL changée :', url);
        if(url.startsWith("/manager")){
          this.showHeader = !this.hiddenFooterRoutes.includes(url);
          // console.log('Header visible:', this.showHeader);
        }
        if(url.startsWith("/")){
          this.showFooter = !this.hiddenFooterRoutes.includes(url);
          // console.log('Footer visible:', this.showFooter);
        }
      }
    });
  }

  ngOnInit(): void {
    this.visitorService.init();
  }
}