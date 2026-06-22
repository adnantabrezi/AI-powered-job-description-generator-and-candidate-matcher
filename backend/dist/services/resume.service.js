"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeService = exports.ResumeService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const pdf_parse_1 = require("pdf-parse");
const mammoth_1 = __importDefault(require("mammoth"));
const resume_repository_1 = require("../repositories/resume.repository");
const ai_provider_1 = require("../ai/ai.provider");
const database_1 = require("../config/database");
const storage_provider_1 = require("../storage/storage.provider");
const matching_service_1 = require("./matching.service");
const jobQueue_1 = require("../jobs/jobQueue");
const job_repository_1 = require("../repositories/job.repository");
class ResumeService {
    async processResume(userId, file) {
        const relativePath = await storage_provider_1.storageProvider.save(file, userId);
        const absolutePath = storage_provider_1.storageProvider.getAbsolutePath(relativePath);
        const rawText = await this.extractText(absolutePath);
        let skills = [];
        let embedding = null;
        try {
            skills = await ai_provider_1.aiProvider.extractSkills(rawText);
        }
        catch (error) {
            console.warn('AI skill extraction failed, saving resume without skills:', error);
        }
        try {
            embedding = await ai_provider_1.aiProvider.generateEmbedding(rawText);
        }
        catch (error) {
            console.warn('AI embedding generation failed, saving resume without embedding:', error);
        }
        const resume = await resume_repository_1.resumeRepository.saveResume(userId, relativePath, rawText, embedding);
        if (skills.length > 0) {
            await this.linkSkillsToCandidate(userId, skills);
        }
        const profile = await database_1.prisma.candidateProfile.findUnique({ where: { userId } });
        if (profile) {
            matching_service_1.matchingService.enqueueCandidateMatching(profile.id);
        }
        return resume;
    }
    async extractText(filePath) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        const buffer = await promises_1.default.readFile(filePath);
        if (ext === '.pdf') {
            const parser = new pdf_parse_1.PDFParse({ data: buffer });
            const result = await parser.getText();
            await parser.destroy();
            return result.text;
        }
        if (ext === '.docx') {
            const data = await mammoth_1.default.extractRawText({ buffer });
            return data.value;
        }
        throw new Error('Unsupported file format. Please upload PDF or DOCX.');
    }
    async linkSkillsToCandidate(userId, skills) {
        const profile = await database_1.prisma.candidateProfile.findUnique({ where: { userId } });
        if (!profile)
            return;
        for (const skillName of skills) {
            const normalized = skillName.trim();
            if (!normalized)
                continue;
            const skill = await database_1.prisma.skill.upsert({
                where: { name: normalized },
                update: {},
                create: { name: normalized },
            });
            await database_1.prisma.candidateSkill.upsert({
                where: {
                    candidateId_skillId: {
                        candidateId: profile.id,
                        skillId: skill.id,
                    },
                },
                update: {},
                create: {
                    candidateId: profile.id,
                    skillId: skill.id,
                    proficiency: 'Unknown',
                },
            });
        }
    }
    async generateJobEmbedding(jobId) {
        (0, jobQueue_1.enqueueJob)(`job-embedding:${jobId}`, async () => {
            const job = await job_repository_1.jobRepository.findById(jobId);
            if (!job)
                return;
            const text = `${job.title} ${job.description} ${job.skills.map((s) => s.skill.name).join(' ')}`;
            const embedding = await ai_provider_1.aiProvider.generateEmbedding(text);
            await database_1.prisma.job.update({
                where: { id: jobId },
                data: { embedding },
            });
        });
    }
}
exports.ResumeService = ResumeService;
exports.resumeService = new ResumeService();
