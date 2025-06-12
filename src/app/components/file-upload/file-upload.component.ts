import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpEventType, HttpEvent } from '@angular/common/http';
import { Subscription } from 'rxjs'; // Keep Subscription
import { v4 as uuidv4 } from 'uuid';
import {FileUpload, FileUploadService} from '../../services/file-upload.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
})
export class FileUploadComponent implements OnInit, OnDestroy {
  isHovering: boolean = false;
  files: FileUpload[] = [];
  uploadUrl: string = 'http://localhost:3000/api/upload'; // Replace with your actual upload endpoint

  // Configuration
  allowedMimeTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf'];
  maxFileSizeMB: number = 5; // 5 MB

  private uploadSubscriptions: { [key: string]: Subscription } = {};

  constructor(private fileUploadService: FileUploadService) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    // Cancel all ongoing uploads when the component is destroyed
    Object.values(this.uploadSubscriptions).forEach((sub) => sub.unsubscribe());
  }

  toggleHover(event: boolean) {
    this.isHovering = event;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(input.files);
    }
  }

  onFilesDropped(fileList: FileList) {
    this.handleFiles(fileList);
  }

  handleFiles(fileList: FileList) {
    Array.from(fileList).forEach((file) => {
      // 1. File Type Validation
      if (!this.allowedMimeTypes.includes(file.type)) {
        this.addFileToQueue(file, 'failed', 0, 'Invalid file type.');
        return;
      }

      // 2. File Size Limits
      if (file.size > this.maxFileSizeMB * 1024 * 1024) {
        this.addFileToQueue(
          file,
          'failed',
          0,
          `File size exceeds ${this.maxFileSizeMB} MB.`
        );
        return;
      }

      this.addFileToQueue(file, 'pending');
    });
  }

  addFileToQueue(
    file: File,
    status: FileUpload['status'],
    progress: number = 0,
    error?: string
  ) {
    const fileUpload: FileUpload = {
      file,
      status,
      progress,
      id: uuidv4(),
      error,
      // REMOVE THIS LINE: upload$: new Observable(),
    };
    this.files.push(fileUpload);

    if (status === 'pending') {
      this.uploadFile(fileUpload);
    }
  }

  // uploadFile(fileUpload: FileUpload) {
  //   fileUpload.status = 'uploading';
  //   fileUpload.progress = 0;
  //   fileUpload.error = undefined;
  //
  //   const uploadSubscription = this.fileUploadService
  //     .uploadFile(fileUpload.file, this.uploadUrl)
  //     .subscribe({
  //       next: (event: HttpEvent<any>) => {
  //         switch (event.type) {
  //           case HttpEventType.UploadProgress:
  //             fileUpload.progress = Math.round(
  //               (event.loaded / (event.total || 1)) * 100
  //             );
  //             break;
  //           case HttpEventType.Response:
  //             fileUpload.status = 'completed';
  //             console.log('File uploaded successfully!', event.body);
  //             break;
  //         }
  //       },
  //       error: (err) => {
  //         fileUpload.status = 'failed';
  //         fileUpload.error = `Upload failed: ${
  //           err.message || 'Unknown error'
  //         }`;
  //         console.error('Upload error:', err);
  //       },
  //       complete: () => {
  //         // No specific action needed here as status is set in next/error
  //         delete this.uploadSubscriptions[fileUpload.id];
  //       },
  //     });
  //
  //   // REMOVE THIS LINE: fileUpload.upload$ = uploadSubscription.asObservable(); // Expose the observable for potential cancellation
  //   fileUpload.cancel = () => this.cancelUpload(fileUpload.id); // Assign cancel function
  //   this.uploadSubscriptions[fileUpload.id] = uploadSubscription;
  // }

  cancelUpload(fileId: string) {
    const fileUpload = this.files.find((f) => f.id === fileId);
    if (fileUpload && this.uploadSubscriptions[fileId]) {
      this.uploadSubscriptions[fileId].unsubscribe();
      fileUpload.status = 'cancelled';
      fileUpload.error = 'Upload cancelled by user.';
      fileUpload.progress = 0; // Reset progress
      delete this.uploadSubscriptions[fileId];
    }
  }

  removeFile(fileId: string) {
    this.cancelUpload(fileId); // Cancel if ongoing
    this.files = this.files.filter((f) => f.id !== fileId);
  }

  retryUpload(fileId: string) {
    const fileUpload = this.files.find((f) => f.id === fileId);
    if (fileUpload) {
      this.uploadFile(fileUpload);
    }
  }

  uploadAllFiles() {
    this.files.forEach((file) => {
      // if (file.status === 'pending' || file.status === 'failed' || file.status === 'cancelled') {
      //   this.uploadFile(file);
      // }
      if (file.status === 'failed' || file.status === 'cancelled') {
        this.uploadFile(file);
      }
    });
  }

  uploadFile(fileUpload: FileUpload) {
    fileUpload.status = 'uploading';
    fileUpload.progress = 0;
    fileUpload.error = undefined;

    const uploadSubscription = this.fileUploadService
      .uploadFile(fileUpload.file, this.uploadUrl)
      .subscribe({
        next: (event: HttpEvent<any>) => {
          switch (event.type) {
            case HttpEventType.UploadProgress:
              fileUpload.progress = Math.round(
                (event.loaded / (event.total || 1)) * 100
              );
              break;
            case HttpEventType.Response:
              fileUpload.status = 'completed';
              console.log('File uploaded successfully!', event.body);
              const nextFile = this.files.find(f => f.status === 'pending');
              if (nextFile) {
                this.uploadFile(nextFile); // Upload the next file
              }
              break;
          }
        },
        error: (err) => {
          fileUpload.status = 'failed';
          fileUpload.error = `Upload failed: ${
            err.message || 'Unknown error'
          }`;
          console.error('Upload error:', err);
        },
        complete: () => {
          delete this.uploadSubscriptions[fileUpload.id];
        },
      });

    fileUpload.cancel = () => this.cancelUpload(fileUpload.id);
    this.uploadSubscriptions[fileUpload.id] = uploadSubscription;
  }
}
