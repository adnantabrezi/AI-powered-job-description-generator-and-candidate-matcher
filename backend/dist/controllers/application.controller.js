"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationController = exports.ApplicationController = void 0;
const zod_1 = require("zod");
const application_service_1 = require("../services/application.service");
const params_1 = require("../utils/params");
const applySchema = zod_1.z.object({
    jobId: zod_1.z.string().uuid(),
});
const statusSchema = zod_1.z.object({
    status: zod_1.z.enum([
        'APPLIED',
        'UNDER_REVIEW',
        'SHORTLISTED',
        'INTERVIEW_SCHEDULED',
        'INTERVIEW_COMPLETED',
        'OFFER_SENT',
        'REJECTED',
        'HIRED',
    ]),
});
class ApplicationController {
    async apply(req, res) {
        const { jobId } = applySchema.parse(req.body);
        const userId = req.user.id;
        const application = await application_service_1.applicationService.apply(userId, jobId);
        res.status(201).json(application);
    }
    async getMyApplications(req, res) {
        const applications = await application_service_1.applicationService.getMyApplications(req.user.id);
        res.json(applications);
    }
    async getJobApplicants(req, res) {
        const applicants = await application_service_1.applicationService.getJobApplicants(req.user.id, (0, params_1.getParam)(req.params.jobId));
        res.json(applicants);
    }
    async updateStatus(req, res) {
        const { status } = statusSchema.parse(req.body);
        const application = await application_service_1.applicationService.updateStatus(req.user.id, (0, params_1.getParam)(req.params.id), status);
        res.json(application);
    }
    async withdraw(req, res) {
        await application_service_1.applicationService.withdraw(req.user.id, (0, params_1.getParam)(req.params.id));
        res.status(204).send();
    }
    async getHistory(req, res) {
        const history = await application_service_1.applicationService.getHistory(req.user.id, (0, params_1.getParam)(req.params.id), req.user.role);
        res.json(history);
    }
}
exports.ApplicationController = ApplicationController;
exports.applicationController = new ApplicationController();
