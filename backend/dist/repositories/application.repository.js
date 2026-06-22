"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationRepository = exports.ApplicationRepository = void 0;
const client_1 = require("@prisma/client");
const database_1 = require("../config/database");
class ApplicationRepository {
    async create(data) {
        return database_1.prisma.$transaction(async (tx) => {
            const application = await tx.application.create({
                data: {
                    jobId: data.jobId,
                    candidateId: data.candidateId,
                    matchScore: data.matchScore,
                    matchedSkills: data.matchedSkills ?? [],
                    missingSkills: data.missingSkills ?? [],
                },
                include: {
                    job: { include: { company: true } },
                    candidate: { include: { user: true } },
                },
            });
            await tx.applicationStatusHistory.create({
                data: {
                    applicationId: application.id,
                    status: client_1.ApplicationStatus.APPLIED,
                },
            });
            return application;
        });
    }
    async findById(id) {
        return database_1.prisma.application.findUnique({
            where: { id },
            include: {
                job: { include: { company: true } },
                candidate: { include: { user: true } },
                statusHistory: { orderBy: { changedAt: 'asc' } },
            },
        });
    }
    async findByCandidate(candidateId) {
        return database_1.prisma.application.findMany({
            where: { candidateId },
            include: {
                job: { include: { company: true } },
                statusHistory: { orderBy: { changedAt: 'desc' }, take: 1 },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByJob(jobId) {
        return database_1.prisma.application.findMany({
            where: { jobId },
            include: {
                candidate: { include: { user: true, skills: { include: { skill: true } } } },
                statusHistory: { orderBy: { changedAt: 'desc' }, take: 1 },
            },
            orderBy: { matchScore: 'desc' },
        });
    }
    async findExisting(jobId, candidateId) {
        return database_1.prisma.application.findUnique({
            where: { jobId_candidateId: { jobId, candidateId } },
        });
    }
    async updateStatus(id, status) {
        return database_1.prisma.$transaction(async (tx) => {
            const application = await tx.application.update({
                where: { id },
                data: { status },
                include: {
                    job: { include: { company: true } },
                    candidate: { include: { user: true } },
                },
            });
            await tx.applicationStatusHistory.create({
                data: { applicationId: id, status },
            });
            return application;
        });
    }
    async delete(id) {
        return database_1.prisma.application.delete({ where: { id } });
    }
}
exports.ApplicationRepository = ApplicationRepository;
exports.applicationRepository = new ApplicationRepository();
