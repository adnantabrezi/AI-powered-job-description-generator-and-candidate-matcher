"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminController = exports.AdminController = void 0;
const zod_1 = require("zod");
const admin_service_1 = require("../services/admin.service");
const params_1 = require("../utils/params");
const paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
});
const updateUserSchema = zod_1.z.object({
    role: zod_1.z.enum(['CANDIDATE', 'EMPLOYER', 'ADMIN']).optional(),
});
const moderateJobSchema = zod_1.z.object({
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
});
class AdminController {
    async listUsers(req, res) {
        const { page, limit } = paginationSchema.parse(req.query);
        const result = await admin_service_1.adminService.listUsers(page, limit);
        res.json(result);
    }
    async updateUser(req, res) {
        const data = updateUserSchema.parse(req.body);
        const user = await admin_service_1.adminService.updateUser((0, params_1.getParam)(req.params.id), data);
        res.json(user);
    }
    async listJobs(req, res) {
        const { page, limit } = paginationSchema.parse(req.query);
        const result = await admin_service_1.adminService.listJobs(page, limit);
        res.json(result);
    }
    async moderateJob(req, res) {
        const { status } = moderateJobSchema.parse(req.body);
        const job = await admin_service_1.adminService.moderateJob((0, params_1.getParam)(req.params.id), status);
        res.json(job);
    }
    async listCompanies(req, res) {
        const { page, limit } = paginationSchema.parse(req.query);
        const result = await admin_service_1.adminService.listCompanies(page, limit);
        res.json(result);
    }
}
exports.AdminController = AdminController;
exports.adminController = new AdminController();
