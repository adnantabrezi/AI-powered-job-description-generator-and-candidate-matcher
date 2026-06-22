"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyService = exports.CompanyService = void 0;
const company_repository_1 = require("../repositories/company.repository");
const auth_repository_1 = require("../repositories/auth.repository");
const database_1 = require("../config/database");
const error_middleware_1 = require("../middleware/error.middleware");
class CompanyService {
    async createCompany(userId, data) {
        const existing = await company_repository_1.companyRepository.findByEmployerId(userId);
        if (existing)
            throw new error_middleware_1.AppError(409, 'Employer already has a company profile');
        const company = await company_repository_1.companyRepository.create(data);
        const employerProfile = await database_1.prisma.employerProfile.findUnique({
            where: { userId },
        });
        if (employerProfile) {
            await database_1.prisma.employerProfile.update({
                where: { userId },
                data: { companyId: company.id },
            });
        }
        else {
            await auth_repository_1.authRepository.createEmployerProfile({ userId, companyId: company.id });
        }
        return company;
    }
    async getCompanyById(id) {
        const company = await company_repository_1.companyRepository.findById(id);
        if (!company)
            throw new error_middleware_1.AppError(404, 'Company not found');
        return company;
    }
    async updateCompany(userId, id, data) {
        await this.assertOwnership(userId, id);
        return company_repository_1.companyRepository.update(id, data);
    }
    async deleteCompany(userId, id) {
        await this.assertOwnership(userId, id);
        return company_repository_1.companyRepository.delete(id);
    }
    async getCompanyForEmployer(userId) {
        const company = await company_repository_1.companyRepository.findByEmployerId(userId);
        if (!company)
            throw new error_middleware_1.AppError(404, 'No company associated with this employer profile');
        return company;
    }
    async assertOwnership(userId, companyId) {
        const company = await company_repository_1.companyRepository.findByEmployerId(userId);
        if (!company || company.id !== companyId) {
            throw new error_middleware_1.AppError(403, 'Permission denied');
        }
    }
}
exports.CompanyService = CompanyService;
exports.companyService = new CompanyService();
