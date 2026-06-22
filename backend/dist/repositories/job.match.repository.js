"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobMatchRepository = exports.JobMatchRepository = void 0;
const database_1 = require("../config/database");
class JobMatchRepository {
    async createMatch(data) {
        return database_1.prisma.candidateJobMatch.upsert({
            where: {
                jobId_candidateId: {
                    jobId: data.jobId,
                    candidateId: data.candidateId,
                },
            },
            update: data,
            create: data,
        });
    }
    async findMatchesByJob(jobId, limit = 10, offset = 0) {
        return database_1.prisma.candidateJobMatch.findMany({
            where: { jobId },
            orderBy: { matchScore: 'desc' },
            take: limit,
            skip: offset,
            include: {
                candidate: { include: { user: true } },
            },
        });
    }
    async findMatchesByCandidate(candidateId) {
        return database_1.prisma.candidateJobMatch.findMany({
            where: { candidateId },
            orderBy: { matchScore: 'desc' },
            include: {
                job: { include: { company: true } },
            },
        });
    }
}
exports.JobMatchRepository = JobMatchRepository;
exports.jobMatchRepository = new JobMatchRepository();
