import fs from 'fs/promises';
import path from 'path';

export interface StorageProvider {
  save(file: Express.Multer.File, subfolder: string): Promise<string>;
  delete(filePath: string): Promise<void>;
  getAbsolutePath(relativePath: string): string;
}

export class LocalStorageProvider implements StorageProvider {
  constructor(private baseDir: string) {}

  async save(file: Express.Multer.File, subfolder: string): Promise<string> {
    const dir = path.join(this.baseDir, subfolder);
    await fs.mkdir(dir, { recursive: true });

    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    const relativePath = path.join(subfolder, filename);
    const absolutePath = path.join(this.baseDir, relativePath);

    await fs.rename(file.path, absolutePath);
    return relativePath.replace(/\\/g, '/');
  }

  async delete(filePath: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(filePath);
    try {
      await fs.unlink(absolutePath);
    } catch {
      // File may already be removed
    }
  }

  getAbsolutePath(relativePath: string): string {
    return path.join(this.baseDir, relativePath);
  }
}

export const storageProvider = new LocalStorageProvider(
  path.join(__dirname, '../../uploads'),
);
