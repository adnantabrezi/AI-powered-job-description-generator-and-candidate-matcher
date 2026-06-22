"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminService = exports.AdminService = void 0;
const database_1 = require("../config/database");
class AdminService {
    async listUsers(page = 1, limit = 20) {
        const [users, total] = await Promise.all([
            database_1.prisma.user.findMany({
                select: {
                    id: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    candidateProfile: { select: { fullName: true } },
                    employerProfile: { select: { company: { select: { name: true } } } },
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
            }),
            database_1.prisma.user.count(),
        ]);
        return { data: users, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
    async updateUser(id, data) {
        return database_1.prisma.user.update({
            where: { id },
            data,
            select: { id: true, email: true, role: true },
        });
    }
    async listJobs(page = 1, limit = 20) {
        const [jobs, total] = await Promise.all([
            database_1.prisma.job.findMany({
                include: { company: true },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
            }),
            database_1.prisma.job.count(),
        ]);
        return { data: jobs, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
    async moderateJob(id, status) {
        return database_1.prisma.job.update({
            where: { id },
            data: { status },
        });
    }
    async listCompanies(page = 1, limit = 20) {
        const [companies, total] = await Promise.all([
            database_1.prisma.company.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: (page - 1) * limit,
            }),
            database_1.prisma.company.count(),
        ]);
        return { data: companies, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
}
exports.AdminService = AdminService;
exports.adminService = new AdminService();
