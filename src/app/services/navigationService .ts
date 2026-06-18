import { Injectable } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private previousUrl: string | null = null;
  private currentUrl: string | null = null;

  constructor(private router: Router) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.previousUrl = this.currentUrl;
        this.currentUrl = event.urlAfterRedirects;
      }
    });
  }

  back(): string {
    return this.previousUrl ?? '/';
  }
}
