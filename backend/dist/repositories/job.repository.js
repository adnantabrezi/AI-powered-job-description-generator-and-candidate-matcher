"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobRepository = exports.JobRepository = void 0;
const database_1 = require("../config/database");
class JobRepository {
    async create(data) {
        const { skillIds, ...jobData } = data;
        return database_1.prisma.job.create({
            data: {
                ...jobData,
                skills: {
                    create: skillIds?.map((id) => ({ skillId: id })) ?? [],
                },
            },
            include: {
                company: true,
                skills: { include: { skill: true } },
            },
        });
    }
    async findById(id) {
        return database_1.prisma.job.findUnique({
            where: { id },
            include: {
                company: true,
                skills: { include: { skill: true } },
            },
        });
    }
    async findMany(params) {
        const [jobs, total] = await Promise.all([
            database_1.prisma.job.findMany({
                where: params.where,
                orderBy: params.orderBy,
                take: params.take,
                skip: params.skip,
                include: {
                    company: true,
                    skills: { include: { skill: true } },
                },
            }),
            database_1.prisma.job.count({ where: params.where }),
        ]);
        return { jobs, total };
    }
    async update(id, data) {
        const { skillIds, ...jobData } = data;
        return database_1.prisma.$transaction(async (tx) => {
            if (skillIds) {
                await tx.jobSkill.deleteMany({ where: { jobId: id } });
            }
            return tx.job.update({
                where: { id },
                data: {
                    ...jobData,
                    ...(skillIds
                        ? { skills: { create: skillIds.map((skillId) => ({ skillId })) } }
                        : {}),
                },
                include: {
                    company: true,
                    skills: { include: { skill: true } },
                },
            });
        });
    }
    async delete(id) {
        return database_1.prisma.job.delete({ where: { id } });
    }
    async updateStatus(id, status) {
        return database_1.prisma.job.update({
            where: { id },
            data: { status: status },
            include: {
                company: true,
                skills: { include: { skill: true } },
            },
        });
    }
}
exports.JobRepository = JobRepository;
exports.jobRepository = new JobRepository();
