import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpRequest,
  HttpEventType,
  HttpEvent,
} from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface FileUpload {
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'cancelled' | 'failed';
  progress: number;
  id: string; // Unique ID for tracking
  error?: string;
  // REMOVE THIS LINE: upload$: Observable<HttpEvent<any>>;
  cancel?: () => void;
}

@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  constructor(private http: HttpClient) {}

  uploadFile(file: File, uploadUrl: string): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append('file', file);

    const req = new HttpRequest('POST', uploadUrl, formData, {
      reportProgress: true,
    });

    return this.http.request(req);
  }
}
