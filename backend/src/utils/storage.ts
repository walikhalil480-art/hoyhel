import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class StorageService {
  private uploadBaseDir: string;

  constructor() {
    this.uploadBaseDir = path.join(process.cwd(), 'uploads');
  }

  async uploadFile(file: Express.Multer.File, folder = 'properties'): Promise<string> {
    const fileExt = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `property-${uuidv4()}${fileExt}`;
    const targetDir = path.join(this.uploadBaseDir, folder);

    // Auto-create target upload directory if missing
    await fs.promises.mkdir(targetDir, { recursive: true });

    const filePath = path.join(targetDir, filename);

    // Write buffer from multer memory storage
    if (file.buffer) {
      await fs.promises.writeFile(filePath, file.buffer);
    } else if (file.path) {
      await fs.promises.copyFile(file.path, filePath);
    } else {
      throw new Error('No file content buffer or path provided for storage');
    }

    // Return relative static file URL path
    return `/uploads/${folder}/${filename}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      if (!fileUrl || !fileUrl.startsWith('/uploads/')) return;
      
      const relativePath = fileUrl.replace('/uploads/', '');
      const fullPath = path.join(this.uploadBaseDir, relativePath);

      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
    } catch (err: any) {
      console.warn('⚠️ Local file deletion warning:', err.message);
    }
  }
}

export const storageService = new StorageService();
