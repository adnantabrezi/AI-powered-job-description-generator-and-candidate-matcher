"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyController = exports.CompanyController = void 0;
const zod_1 = require("zod");
const company_service_1 = require("../services/company.service");
const params_1 = require("../utils/params");
const createCompanySchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    logoUrl: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    website: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    description: zod_1.z.string().optional(),
    industry: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    employeeCount: zod_1.z.number().int().positive().optional(),
});
const updateCompanySchema = createCompanySchema.partial();
class CompanyController {
    async create(req, res) {
        const data = createCompanySchema.parse(req.body);
        const company = await company_service_1.companyService.createCompany(req.user.id, data);
        res.status(201).json(company);
    }
    async getById(req, res) {
        const company = await company_service_1.companyService.getCompanyById((0, params_1.getParam)(req.params.id));
        res.json(company);
    }
    async update(req, res) {
        const data = updateCompanySchema.parse(req.body);
        const company = await company_service_1.companyService.updateCompany(req.user.id, (0, params_1.getParam)(req.params.id), data);
        res.json(company);
    }
    async delete(req, res) {
        await company_service_1.companyService.deleteCompany(req.user.id, (0, params_1.getParam)(req.params.id));
        res.status(204).send();
    }
    async getMyCompany(req, res) {
        const company = await company_service_1.companyService.getCompanyForEmployer(req.user.id);
        res.json(company);
    }
}
exports.CompanyController = CompanyController;
exports.companyController = new CompanyController();
