"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobController = exports.JobController = void 0;
const zod_1 = require("zod");
const job_service_1 = require("../services/job.service");
const params_1 = require("../utils/params");
const createJobSchema = zod_1.z.object({
    title: zod_1.z.string().min(3),
    description: zod_1.z.string().min(10),
    location: zod_1.z.string().min(2),
    employmentType: zod_1.z.string(),
    salaryMin: zod_1.z.number().nonnegative().optional(),
    salaryMax: zod_1.z.number().nonnegative().optional(),
    remoteStatus: zod_1.z.boolean().default(false),
    requiredExperience: zod_1.z.number().int().nonnegative().optional(),
    skillIds: zod_1.z.array(zod_1.z.string().uuid()).default([]),
});
const updateJobSchema = createJobSchema.partial();
const statusSchema = zod_1.z.object({
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
});
class JobController {
    async create(req, res) {
        try {
            const data = createJobSchema.parse(req.body);
            const userId = req.user?.id;
            if (!userId)
                throw new Error('User not authenticated');
            const job = await job_service_1.jobService.createJob(userId, data);
            res.status(201).json(job);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    async list(req, res) {
        try {
            const params = req.query;
            const userId = req.user?.id;
            const role = req.user?.role;
            const result = await job_service_1.jobService.listJobs(params, userId, role);
            res.json(result);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    async getById(req, res) {
        try {
            const userId = req.user?.id;
            const role = req.user?.role;
            const job = await job_service_1.jobService.getJobById((0, params_1.getParam)(req.params.id), userId, role);
            res.json(job);
        }
        catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
    async update(req, res) {
        try {
            const data = updateJobSchema.parse(req.body);
            const userId = req.user?.id;
            if (!userId)
                throw new Error('User not authenticated');
            const job = await job_service_1.jobService.updateJob(userId, (0, params_1.getParam)(req.params.id), data);
            res.json(job);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
    async delete(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId)
                throw new Error('User not authenticated');
            await job_service_1.jobService.deleteJob(userId, (0, params_1.getParam)(req.params.id));
            res.status(204).send();
        }
        catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
    async updateStatus(req, res) {
        try {
            const { status } = statusSchema.parse(req.body);
            const userId = req.user?.id;
            if (!userId)
                throw new Error('User not authenticated');
            const job = await job_service_1.jobService.changeJobStatus(userId, (0, params_1.getParam)(req.params.id), status);
            res.json(job);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}
exports.JobController = JobController;
exports.jobController = new JobController();
