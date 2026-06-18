import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-confirm-delete-modal',
  imports: [CommonModule],
  templateUrl: './confirm-delete-modal.html',
  styleUrls: ['./confirm-delete-modal.scss']
})
export class ConfirmDeleteModalComponent implements OnChanges {

  @Input() visible: boolean = false;
  @Input() message: string = "Voulez-vous vraiment supprimer cet élément ?";
  @Input() messageAlert: string = "Vous n'aurez que 50 personnes à inviter. Pour augmenter l'effectif, veuillez passer au forfait premium.";
  @Input() action: any;

  @Output() confirmSend = new EventEmitter<void>();
  @Output() confirmReSend = new EventEmitter<void>();
  @Output() confirmDelete = new EventEmitter<void>();
  @Output() confirmAlert = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  isSender: boolean = false;
  isReSender: boolean = false;
  isDelete: boolean = false;
  isConfirmAlert: boolean = false;
  styleAction: string = "";

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['action']) {
      this.updateActionState();
    }
  }

  private updateActionState(): void {
    this.isSender = this.action === 'send';
    this.isReSender = this.action === 'resend';
    this.isDelete = this.action === 'delete' || this.action === 'one';
    this.isConfirmAlert = this.action === 'confirm-alert';
    if(this.isSender){
      this.styleAction = 'send';
    }
    if(this.isReSender){
      this.styleAction = 'send';
    }
    if (this.isDelete) {
      this.styleAction = 'delete';
    }
    if (this.isConfirmAlert) {
      this.styleAction = 'confirm-alert';
    }
    //console.log("🎯 Type d'action reçue :", this.action);
  }

  onConfirm() {
    if (this.isSender) {
      this.confirmSend.emit();
    } else if (this.isReSender) {
      this.confirmReSend.emit();
    } else if (this.isDelete) {
      this.confirmDelete.emit();
    }else if (this.isConfirmAlert) {
      this.confirmAlert.emit();
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}

