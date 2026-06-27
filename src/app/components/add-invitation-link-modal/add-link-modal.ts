import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { EventService } from '../../services/event.service';

interface NewLink {
  mode?: string;
  type: string;
  used_limit_count: number | null;
  date_limit_link: string;
}

@Component({
  selector: 'app-link-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'add-link-modal.html',
  styleUrl: 'add-link-modal.scss'
})
export class AddLinkModalComponent implements OnInit{
  @Output() linkAdded = new EventEmitter<NewLink>();
  @Output() closed = new EventEmitter<void>();
  @Output() resetLinks = new EventEmitter<void>();
  @Input() mode: 'create' | 'edit' | 'partage' = 'create';
  @Input() link: any;
  @Input() event: any;

  newLink: NewLink = {
    type: '',
    used_limit_count: null,
    date_limit_link: '',
  };

  dateLimitLink : any;

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    //console.log("[AddLinkModalComponent] mode : ", this.mode);
    //console.log("[AddLinkModalComponent] link : ", this.link);
  }

  onSubmit(form?: NgForm) {
    // Validation simple
    if (!this.newLink.type || !this.newLink.used_limit_count) return;

    // Envoi de l’événemen
    this.linkAdded.emit({
      mode: this.mode,
      type: this.newLink.type,
      used_limit_count: this.newLink.used_limit_count,
      date_limit_link: this.newLink.date_limit_link,
    });

    // Reset du formulaire Angular si fourni
    if (form) {
      form.resetForm();
    } else {
      this.resetForm();
    }
  }

  openEditLinkModal(mode: 'create' | 'edit' | 'partage') {
    this.mode = mode;
    //console.log("[openEditLinkModal] this.mode :: ", this.mode);
    this.eventService.getLinkById(this.link.id).subscribe(
      (response) => {
        //console.log("[openEditLinkModal] Responses :: ", response);
        this.dateLimitLink = response.date_limit_link ? response.date_limit_link.split('T')[0] : '';
          //console.log("[openEditLinkModal] dateLimitLink :: ", this.dateLimitLink);
          if(response.id==this.link.id){
            this.newLink = {
              type: response.type,
              used_limit_count: response.limit_count,
              date_limit_link: this.dateLimitLink
            };
          }
        },
      (error) => {
        console.error('❌ Erreur :', error.message);
      }
    );
  }

  shareEventLinkHandle(){
    this.shareEventLink(this.event, this.link);
    this.closeModal();
  }
  shareEventLink(event: any, link: any) {
    // console.log("[link]:: ", link);
    console.log("event date:: ", event.date);

    this.eventService.getLinkById(this.link.id).subscribe(
      (response) => {
        this.dateLimitLink = response.date_limit_link ? response.date_limit_link.split('T')[0] : '';
        //console.log("[this.dateLimitLink]:: ", this.dateLimitLink);

        let text = '';
        switch (this.event.type) {
          case 'wedding':
            text = "Vous êtes invité au "
            break;
          case 'engagement':
            text = "Vous êtes invité aux "
            break
          case 'anniversary':
            text = "Vous êtes invité à l'"
            break
          case 'birthday':
            text = "Vous êtes invité à l'"
            break
          default :
            text = "Vous êtes invité à la "
        }
        let message = '';
        if(event.type == "wedding"){
          message =
          `${text}${event.title}\n` +
          `📅 Date : ${this.formatDate(event.date)}\n` +
          `⏰ Heure : ${event.time}\n` +
          `📍 Lieu de la Cérémonie Civile : ${event.civilLocation}\n` +
          `📍 Lieu du Banquet: ${event.location}\n\n` +
          `⏳ Merci de confirmer votre présence avant le ${this.formatDate(this.dateLimitLink)}.\n\n` +
          `Veuillez cliquer sur le lien ci-dessous pour confirmer votre présence :\n` +
          `${link.value}`;
        }else{
          message =
          `${text}${event.title}\n` +
          `📅 Date : ${this.formatDate(event.date)}\n` +
          `⏰ Heure : ${event.time}\n` +
          `📍 Lieu : ${event.location}\n\n` +
          `⏳ Merci de confirmer votre présence avant le ${this.formatDate(this.dateLimitLink)}.\n\n` +
          `Veuillez cliquer sur le lien ci-dessous pour confirmer votre présence :\n` +
          `${link.value}`;
        }

        if (navigator.share) {
          navigator.share({
            title: event.title,
            text: message,
          });
        }

      },
      (error) => {
        console.error('❌ Erreur :', error.message);
      }
    );
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  closeModal() {
    this.closed.emit();
  }

  resetForm() {
    this.newLink = {
      type: '',
      used_limit_count: null,
      date_limit_link: ''
    };
  }

  deleteLinkHandle(){
    this.eventService.deleteLink(this.link.id).subscribe(
      (responses) => {
        //console.log("[deleteLinkHandle] Responses :: ", responses);
        this.resetLinks.emit();
        this.closeModal();
      },
      (error) => {
        console.error('❌ Erreur :', error.message);
      }
    );
  }
}
