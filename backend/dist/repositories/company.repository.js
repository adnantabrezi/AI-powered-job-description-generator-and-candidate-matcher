"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyRepository = exports.CompanyRepository = void 0;
const database_1 = require("../config/database");
class CompanyRepository {
    async create(data) {
        return database_1.prisma.company.create({ data });
    }
    async findById(id) {
        return database_1.prisma.company.findUnique({ where: { id } });
    }
    async update(id, data) {
        return database_1.prisma.company.update({ where: { id }, data });
    }
    async delete(id) {
        return database_1.prisma.company.delete({ where: { id } });
    }
    async findByEmployerId(userId) {
        const profile = await database_1.prisma.employerProfile.findUnique({
            where: { userId },
            select: { companyId: true },
        });
        if (!profile)
            return null;
        return database_1.prisma.company.findUnique({ where: { id: profile.companyId } });
    }
}
exports.CompanyRepository = CompanyRepository;
exports.companyRepository = new CompanyRepository();
