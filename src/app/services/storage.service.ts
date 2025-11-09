import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';

export interface UploadResult {
  downloadURL: string;
  fileName: string;
  filePath: string;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storage = inject(Storage);

  /**
   * Upload a file to Firebase Storage
   * @param file The file to upload
   * @param path The storage path (e.g., 'applications/userId/pitchDeck.pdf')
   * @returns Promise containing download URL, filename, and storage path
   */
  async uploadFile(file: File, path: string): Promise<UploadResult> {
    try {
      const storageRef = ref(this.storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return {
        downloadURL,
        fileName: file.name,
        filePath: path
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file. Please try again.');
    }
  }

  /**
   * Upload pitch deck for an application
   * @param file The PDF file to upload
   * @param applicantId The applicant's user ID
   * @returns Promise containing upload result
   */
  async uploadPitchDeck(file: File, applicantId: string): Promise<UploadResult> {
    // Validate file type
    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are allowed for pitch decks.');
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size must be less than 10MB.');
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedFileName}`;
    const path = `applications/${applicantId}/pitch-decks/${fileName}`;

    return this.uploadFile(file, path);
  }

  /**
   * Delete a file from Firebase Storage
   * @param filePath The full storage path of the file
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const storageRef = ref(this.storage, filePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file.');
    }
  }

  /**
   * Delete an applicant's pitch deck
   * @param filePath The storage path of the pitch deck
   */
  async deletePitchDeck(filePath: string): Promise<void> {
    return this.deleteFile(filePath);
  }

  /**
   * Generate a storage path for applicant documents
   * @param applicantId The applicant's user ID
   * @param documentType The type of document (pitch-deck, resume, etc.)
   * @param fileName The original filename
   * @returns Formatted storage path
   */
  generatePath(applicantId: string, documentType: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `applications/${applicantId}/${documentType}/${timestamp}_${sanitizedFileName}`;
  }
}