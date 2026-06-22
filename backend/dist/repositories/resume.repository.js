"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeRepository = exports.ResumeRepository = void 0;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
class ResumeRepository {
    async saveResume(userId, filePath, rawText, embedding) {
        const jsonEmbedding = embedding === null ? client_1.Prisma.DbNull : embedding;
        return database_1.prisma.resumeFile.upsert({
            where: { userId },
            update: { filePath, rawText, embedding: jsonEmbedding },
            create: { userId, filePath, rawText, embedding: jsonEmbedding },
        });
    }
    async findByUserId(userId) {
        return database_1.prisma.resumeFile.findUnique({ where: { userId } });
    }
    async deleteByUserId(userId) {
        await database_1.prisma.resumeFile.delete({ where: { userId } });
    }
}
exports.ResumeRepository = ResumeRepository;
exports.resumeRepository = new ResumeRepository();
