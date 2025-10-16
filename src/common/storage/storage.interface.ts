export interface StorageResult { url: string; key?: string; }

export interface StorageService {
  uploadFile(file: Express.Multer.File, options?: { folder?: string }): Promise<StorageResult>;
  delete?(keyOrUrl: string): Promise<void>;
}
