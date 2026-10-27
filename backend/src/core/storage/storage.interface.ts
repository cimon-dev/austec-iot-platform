export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export interface IStorageService {
  uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    folderPrefix?: string
  ): Promise<UploadResult>;
  deleteFile(key: string): Promise<boolean>;
}
