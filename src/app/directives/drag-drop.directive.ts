import {
  Directive,
  HostListener,
  EventEmitter,
  Output,
  Input,
} from '@angular/core';

@Directive({
  selector: '[appDragDrop]',
})
export class DragDropDirective {
  @Output() filesDropped = new EventEmitter<FileList>();
  @Output() filesHovered = new EventEmitter<boolean>();

  constructor() {}

  @HostListener('dragover', ['$event']) onDragOver(evt: Event) {
    evt.preventDefault();
    evt.stopPropagation();
    this.filesHovered.emit(true);
  }

  @HostListener('dragleave', ['$event']) onDragLeave(evt: Event) {
    evt.preventDefault();
    evt.stopPropagation();
    this.filesHovered.emit(false);
  }

  @HostListener('drop', ['$event']) onDrop(evt: DragEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.filesHovered.emit(false);
    let files = evt.dataTransfer ? evt.dataTransfer.files : null;
    if (files) {
      this.filesDropped.emit(files);
    }
  }
}
