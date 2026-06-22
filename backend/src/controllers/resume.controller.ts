import { Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { resumeService } from '../services/resume.service';
import { resumeRepository } from '../repositories/resume.repository';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { storageProvider } from '../storage/storage.provider';

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `resume-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOCX are allowed.'));
    }
  },
});

export class ResumeController {
  async upload(req: AuthRequest, res: Response) {
    if (!req.file) throw new Error('No file uploaded');

    const result = await resumeService.processResume(req.user!.id, req.file);
    res.status(201).json({
      message: 'Resume processed successfully',
      data: result,
    });
  }

  async getResume(req: AuthRequest, res: Response) {
    const resume = await resumeRepository.findByUserId(req.user!.id);
    if (!resume) throw new AppError(404, 'Resume not found');
    res.json(resume);
  }

  async deleteResume(req: AuthRequest, res: Response) {
    await resumeRepository.deleteByUserId(req.user!.id);
    res.status(204).send();
  }

  async downloadResume(req: AuthRequest, res: Response) {
    const userId = req.params.userId as string;

    if (req.user!.role !== 'EMPLOYER' && req.user!.id !== userId) {
      throw new AppError(403, 'Unauthorized to view this resume');
    }

    const resume = await resumeRepository.findByUserId(userId);
    if (!resume) throw new AppError(404, 'Resume not found');

    const absolutePath = storageProvider.getAbsolutePath(resume.filePath);
    res.sendFile(absolutePath);
  }
}

export const resumeController = new ResumeController();
