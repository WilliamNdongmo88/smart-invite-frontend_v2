import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { VisitorService } from '../../services/visitor.service';
import { map, Observable } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { HOME_CAROUSEL_SLIDES } from '../../shared/auth-carousel-slides';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatIconModule, DecimalPipe],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  carouselSlides = HOME_CAROUSEL_SLIDES;
  activeSlide = signal(0);
  private carouselInterval?: ReturnType<typeof setInterval>;
  isAuthenticated = false;
  isMobile!: Observable<boolean>;
  totalVisitors: number = 0;
  recurringVisitors = 0;
  totalUsers: number = 0;

  constructor(
    private router: Router,
    private authService: AuthService,
    private breakpointObserver: BreakpointObserver,
    private visitorService: VisitorService
  ) {}

  ngOnInit() {
    if (this.authService.getUser()) {
      this.authService.isAuthenticated().subscribe(isAuth => {
        this.isAuthenticated = isAuth;
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.isMobile = this.breakpointObserver.observe(['(max-width: 768px)']).pipe(map(res => res.matches));
    this.visitorService.getPublicStats().subscribe({
      next: (res) => {
        this.totalVisitors = res.total_visitors;
        this.totalUsers = res.total_users;
      },
      error: () => {}
    });
    this.startCarousel();
  }

  ngOnDestroy(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  setActiveSlide(index: number): void {
    this.activeSlide.set(index);
    this.startCarousel();
  }

  private startCarousel(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
    this.carouselInterval = setInterval(() => {
      this.activeSlide.update(i => (i + 1) % this.carouselSlides.length);
    }, 5000);
  }

  get recurringVisitorsRate(): number {
    if (this.totalVisitors === 0) {
      return 0;
    }
    this.recurringVisitors = this.totalVisitors - 35;
    return (this.recurringVisitors / this.totalVisitors) * 100;
  }

  navigateToLogin() {
    if (this.isAuthenticated) {
      this.router.navigate(['/evenements']);
      return;
    }
    this.router.navigate(['/login']);
  }

  navigateToSignup() {
    this.router.navigate(['/signup']);
  }

  scrollTo(sectionId: string) {
    const element = document.getElementById(sectionId);

    if (element) {
      const headerOffset = 30;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  navigateToHome(){
    this.router.navigate(['/']);
    this.scrollTo('features');
  }

  navigateToPricing(){
    this.router.navigate(['/payment']);
  }

  navigateToContact(){
    this.router.navigate(['/contact']);
  }
}

