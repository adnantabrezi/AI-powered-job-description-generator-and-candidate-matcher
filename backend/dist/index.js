"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./config/env");
const swagger_1 = require("./config/swagger");
const auth_controller_1 = require("./controllers/auth.controller");
const job_controller_1 = require("./controllers/job.controller");
const resume_controller_1 = require("./controllers/resume.controller");
const application_controller_1 = require("./controllers/application.controller");
const search_controller_1 = require("./controllers/search.controller");
const dashboard_controller_1 = require("./controllers/dashboard.controller");
const auth_middleware_1 = require("./middleware/auth.middleware");
const rateLimit_middleware_1 = require("./middleware/rateLimit.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const asyncHandler_1 = require("./utils/asyncHandler");
const client_1 = require("@prisma/client");
const database_1 = require("./config/database");
(0, env_1.validateEnv)();
const app = (0, express_1.default)();
const uploadDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (env_1.ENV.NODE_ENV === 'development' || !origin) {
            callback(null, true);
        }
        else if (origin === env_1.ENV.CORS_ORIGIN) {
            callback(null, true);
        }
        else {
            const url = new URL(origin);
            const hostname = url.hostname;
            const isLocal = hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname.startsWith('172.') ||
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.');
            if (isLocal) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
}));
app.use(express_1.default.json({ limit: '1mb' }));
(0, swagger_1.setupSwagger)(app);
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Auth
app.post('/api/auth/register/candidate', rateLimit_middleware_1.authRateLimiter, (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.registerCandidate.bind(auth_controller_1.authController)));
app.post('/api/auth/register/employer', rateLimit_middleware_1.authRateLimiter, (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.registerEmployer.bind(auth_controller_1.authController)));
app.post('/api/auth/login', rateLimit_middleware_1.authRateLimiter, (0, asyncHandler_1.asyncHandler)(auth_controller_1.authController.login.bind(auth_controller_1.authController)));
// Users
app.get('/api/users/me', auth_middleware_1.authenticate, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await database_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            email: true,
            role: true,
            candidateProfile: true,
            employerProfile: { include: { company: true } },
        },
    });
    res.json({ user });
}));
// Jobs
app.get('/api/jobs/search', (0, asyncHandler_1.asyncHandler)(search_controller_1.searchController.search.bind(search_controller_1.searchController)));
app.get('/api/jobs', auth_middleware_1.optionalAuth, (0, asyncHandler_1.asyncHandler)(job_controller_1.jobController.list.bind(job_controller_1.jobController)));
app.post('/api/jobs', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.EMPLOYER), (0, asyncHandler_1.asyncHandler)(job_controller_1.jobController.create.bind(job_controller_1.jobController)));
app.patch('/api/jobs/:id/status', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.EMPLOYER), (0, asyncHandler_1.asyncHandler)(job_controller_1.jobController.updateStatus.bind(job_controller_1.jobController)));
// Applications
app.post('/api/applications', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.CANDIDATE), (0, asyncHandler_1.asyncHandler)(application_controller_1.applicationController.apply.bind(application_controller_1.applicationController)));
app.get('/api/applications/me', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.CANDIDATE), (0, asyncHandler_1.asyncHandler)(application_controller_1.applicationController.getMyApplications.bind(application_controller_1.applicationController)));
app.patch('/api/applications/:id/status', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.EMPLOYER), (0, asyncHandler_1.asyncHandler)(application_controller_1.applicationController.updateStatus.bind(application_controller_1.applicationController)));
app.delete('/api/applications/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.CANDIDATE), (0, asyncHandler_1.asyncHandler)(application_controller_1.applicationController.withdraw.bind(application_controller_1.applicationController)));
// Resumes
app.post('/api/resumes/upload', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.CANDIDATE), resume_controller_1.upload.single('resume'), (0, asyncHandler_1.asyncHandler)(resume_controller_1.resumeController.upload.bind(resume_controller_1.resumeController)));
app.get('/api/resumes/me', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.CANDIDATE), (0, asyncHandler_1.asyncHandler)(resume_controller_1.resumeController.getResume.bind(resume_controller_1.resumeController)));
app.delete('/api/resumes/me', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.CANDIDATE), (0, asyncHandler_1.asyncHandler)(resume_controller_1.resumeController.deleteResume.bind(resume_controller_1.resumeController)));
app.get('/api/resumes/:userId/download', auth_middleware_1.authenticate, (0, asyncHandler_1.asyncHandler)(resume_controller_1.resumeController.downloadResume.bind(resume_controller_1.resumeController)));
// Dashboards
app.get('/api/dashboard/candidate', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.CANDIDATE), (0, asyncHandler_1.asyncHandler)(dashboard_controller_1.dashboardController.candidate.bind(dashboard_controller_1.dashboardController)));
app.get('/api/dashboard/employer', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(client_1.UserRole.EMPLOYER), (0, asyncHandler_1.asyncHandler)(dashboard_controller_1.dashboardController.employer.bind(dashboard_controller_1.dashboardController)));
app.use(error_middleware_1.errorHandler);
const PORT = Number(env_1.ENV.PORT);
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Swagger docs at http://localhost:${PORT}/api/docs`);
    });
}
exports.default = app;
