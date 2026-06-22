"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeController = exports.ResumeController = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const resume_service_1 = require("../services/resume.service");
const resume_repository_1 = require("../repositories/resume.repository");
const error_middleware_1 = require("../middleware/error.middleware");
const storage_provider_1 = require("../storage/storage.provider");
const uploadDir = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `resume-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    },
});
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only PDF and DOCX are allowed.'));
        }
    },
});
class ResumeController {
    async upload(req, res) {
        if (!req.file)
            throw new Error('No file uploaded');
        const result = await resume_service_1.resumeService.processResume(req.user.id, req.file);
        res.status(201).json({
            message: 'Resume processed successfully',
            data: result,
        });
    }
    async getResume(req, res) {
        const resume = await resume_repository_1.resumeRepository.findByUserId(req.user.id);
        if (!resume)
            throw new error_middleware_1.AppError(404, 'Resume not found');
        res.json(resume);
    }
    async deleteResume(req, res) {
        await resume_repository_1.resumeRepository.deleteByUserId(req.user.id);
        res.status(204).send();
    }
    async downloadResume(req, res) {
        const userId = req.params.userId;
        if (req.user.role !== 'EMPLOYER' && req.user.id !== userId) {
            throw new error_middleware_1.AppError(403, 'Unauthorized to view this resume');
        }
        const resume = await resume_repository_1.resumeRepository.findByUserId(userId);
        if (!resume)
            throw new error_middleware_1.AppError(404, 'Resume not found');
        const absolutePath = storage_provider_1.storageProvider.getAbsolutePath(resume.filePath);
        res.sendFile(absolutePath);
    }
}
exports.ResumeController = ResumeController;
exports.resumeController = new ResumeController();
