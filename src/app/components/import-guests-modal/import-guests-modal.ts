import { Component, EventEmitter, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImportedGuest, ImportGuestService } from '../../services/import-guest.service';
import { GuestService } from '../../services/guest.service';
import { SpinnerComponent } from "../spinner/spinner";
import { ErrorModalComponent } from "../error-modal/error-modal";
import { CommunicationService } from '../../services/share.service';

type ImportStep = 'upload' | 'preview' | 'success';

@Component({
  selector: 'app-import-guests-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SpinnerComponent, ErrorModalComponent],
  templateUrl: `import-guests-modal.html`,
  styleUrl: `import-guests-modal.scss`,
})
export class ImportGuestsModalComponent implements OnChanges {
  @Output() guestsImported = new EventEmitter<ImportedGuest[]>();
  @Output() closed = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();
  @Input() eventId: number | undefined;

  currentStep = signal<ImportStep>('upload');
  selectedFile = signal<File | null>(null);
  isDragOver = signal(false);
  showAddGuestModal = signal(false);
  isLoading: boolean = false;
  isModalLoading: boolean = false;
  importedGuests: any = [];
  importErrors: string[] = [];
  showErrorModal = false;
  errorMessage = '';
  showGuestLimitAlert = false;

  itemsPerPage = 10;
  currentPage = 1;

  constructor(
    private importService: ImportGuestService,
    private guestService: GuestService,
    private communicationService: CommunicationService

  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    console.log("---On changes ---")
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (this.isValidFileType(file)) {
        this.selectedFile.set(file);
      } else {
        alert('Format de fichier non supporté. Veuillez utiliser CSV ou XLSX.');
      }
    }
  }

  async uploadFile() {
    console.log("--- uploadFile ---")
    const file = this.selectedFile();
    if (!file) return;

    this.isLoading = true;

    try {
      let guests: ImportedGuest[] = [];

      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        console.log("[text]:", text);
        guests = this.importService.parseCSV(text);
        console.log("[guests]:", guests)
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        guests = await this.importService.parseExcel(file);
      }

      const { valid, errors } = this.importService.validateGuests(guests);
      this.importedGuests = valid;
      console.log("this.importedGuests :: ", this.importedGuests)
      this.importErrors = errors;

      this.currentStep.set('preview');
    } catch (error) {
      alert('Erreur lors du traitement du fichier: ' + (error as Error).message);
    } finally {
      this.isLoading = false;
    }
  }

  confirmImport() {
    this.isModalLoading = true;
    const datas = [];
    for (const key in this.importedGuests) {
      console.log("key :: ", key);
      const elt = this.importedGuests[key];
      console.log("eventId :: ", this.eventId);
      const data = {
        eventId: this.eventId,
        fullName: elt.nom,
        email: elt.email,
        phoneNumber: elt.phone,
        rsvpStatus: elt.rsvpstatus,
        guesthasPlusOneAutoriseByAdmin: elt.plusone == 1 ? true : false,
        notificationMode: elt.notificationmode,
      }
      datas.push(data);
    }
    console.log("datas to import :: ", datas);
    this.guestService.addGuest(datas).subscribe(
      (response) => {
        console.log("Response :: ", response.guests);
        this.isModalLoading = false;
        this.currentStep.set("success");
        this.refresh.emit();
        // this.closeModal();
      },
      (error) => {
        this.isModalLoading = false;
        console.error('❌ Erreur :', error.error.error);
        if (error.error.error === "PAYMENT_REQUIRED") {
          // Afficher l'alerte
          console.log("### Afficher l'alerte ###");
        }else if(error.status === 409){
          this.triggerError();
          this.errorMessage = "Vous essayez d'enregistrer un ou plusieurs invités déjà présents.";
          console.log("Message :: ", this.errorMessage);
        }else {
          this.triggerError();
          this.errorMessage = error.error.message || error.error.error || "Erreur serveur lors de l'importation des invités.";
          console.log("Message :: ", this.errorMessage);
        }
      }
    );
  }

  goBack() {
    this.currentStep.set('upload');
    this.selectedFile.set(null);
    this.importedGuests = [];
    this.importErrors = [];
  }

  downloadTemplate() {
    this.importService.downloadCSVTemplate();
  }

  closeModal() {
    this.closed.emit();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private isValidFileType(file: File): boolean {
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    return validTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  }

  // Logique pagination
  get totalPages() {
    return Math.ceil(this.importedGuests.length / this.itemsPerPage);
  }

  totalPagesArray() {
    return Array(this.totalPages)
      .fill(0)
      .map((_, i) => i + 1);
  }

  paginatedGuests() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.importedGuests.slice(startIndex, startIndex + this.itemsPerPage);
  }

  goToPage(page: number) {
    this.currentPage = page;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  // Logique error-modal
  triggerError() {
    this.errorMessage = "Impossible de charger les invités. Veuillez réessayer.";
    this.showErrorModal = true;
  }

  closeErrorModal() {
    this.showErrorModal = false;
  }

  onManageClicked(): void {
    console.log('Redirection vers la gestion des invités');
  }
}

