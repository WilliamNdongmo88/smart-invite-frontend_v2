import { Component, Input, Output, EventEmitter, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

const ORANGE_MONEY_NUMBER = '+237655002318';
const MTN_MONEY_NUMBER = '+237682933424';

export interface PaymentProofData {
  eventId: number;
  quota: number;
  amount: number;
  proofFile: File;
  proofReference: string;
}

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: 'payment-modal.component.html',
  styleUrl: 'payment-modal.component.scss'
})
export class PaymentModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() eventId: number | null = null;
  @Input() quota: number = 0;
  @Input() amount: number = 0;

  @Output() closeEvent = new EventEmitter<void>();
  @Output() proofSubmitted = new EventEmitter<PaymentProofData>();

  currentStep = signal(1); // Étape 1 : infos paiement | Étape 2 : upload preuve
  proofFile: File | null = null;
  proofReference = '';
  uploadError = '';
  isDragOver = false;

  // Coordonnées de paiement (depuis l'ancienne modal)
  readonly paymentInfo = {
    orangeMoneyNumber: ORANGE_MONEY_NUMBER,
    mtnMoneyNumber: MTN_MONEY_NUMBER,
  };

  copiedOrange = false;
  copiedMtn = false;

  ngOnChanges() {
    if (this.isOpen) {
      this.currentStep.set(1);
      this.proofFile = null;
      this.proofReference = '';
      this.uploadError = '';
    }
  }

  nextStep() {
    if (this.currentStep() === 1) {
      this.currentStep.set(2);
    }
  }

  previousStep() {
    if (this.currentStep() > 1) this.currentStep.update(s => s - 1);
  }

  onSubmit() {
    if (!this.proofFile) {
      this.uploadError = 'Veuillez joindre une preuve de paiement.';
      return;
    }
    this.proofSubmitted.emit({
      eventId: this.eventId!,
      quota: this.quota,
      amount: this.amount,
      proofFile: this.proofFile,
      proofReference: this.proofReference,
    });
    this.closeEvent.emit();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.processFile(input.files[0]);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    if (event.dataTransfer?.files[0]) this.processFile(event.dataTransfer.files[0]);
  }

  onDragOver(event: DragEvent) { event.preventDefault(); this.isDragOver = true; }
  onDragLeave() { this.isDragOver = false; }

  processFile(file: File) {
    const maxSize = 5 * 1024 * 1024;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.uploadError = 'Format non accepté. JPG ou PNG uniquement.';
      return;
    }
    if (file.size > maxSize) {
      this.uploadError = 'Fichier trop volumineux (max 5 Mo).';
      return;
    }
    this.uploadError = '';
    this.proofFile = file;
  }

  removeFile() { this.proofFile = null; }

  copyToClipboard(text: string, type: 'orange' | 'mtn') {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'orange') {
        this.copiedOrange = true;
        setTimeout(() => this.copiedOrange = false, 2000);
      } else {
        this.copiedMtn = true;
        setTimeout(() => this.copiedMtn = false, 2000);
      }
    });
  }

  closeModal() { this.closeEvent.emit(); }
}