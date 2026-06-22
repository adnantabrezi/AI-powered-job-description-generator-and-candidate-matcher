"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = exports.DashboardService = void 0;
const database_1 = require("../config/database");
const job_match_repository_1 = require("../repositories/job.match.repository");
class DashboardService {
    async getCandidateDashboard(userId) {
        const profile = await database_1.prisma.candidateProfile.findUnique({
            where: { userId },
            include: { user: { include: { resumeFile: true } } },
        });
        if (!profile)
            throw new Error('Candidate profile not found');
        const [recommendedJobs, recentApplications, notifications] = await Promise.all([
            job_match_repository_1.jobMatchRepository.findMatchesByCandidate(profile.id),
            database_1.prisma.application.findMany({
                where: { candidateId: profile.id },
                include: { job: { include: { company: true } } },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
            database_1.prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: 10,
            }),
        ]);
        return {
            recommendedJobs: recommendedJobs.slice(0, 10),
            recentApplications,
            resumeStatus: profile.user.resumeFile
                ? { uploaded: true, updatedAt: profile.user.resumeFile.updatedAt }
                : { uploaded: false },
            notifications,
        };
    }
    async getEmployerDashboard(userId) {
        const employer = await database_1.prisma.employerProfile.findUnique({ where: { userId } });
        if (!employer)
            throw new Error('Employer profile not found');
        const [activeJobs, applications, analytics] = await Promise.all([
            database_1.prisma.job.findMany({
                where: { companyId: employer.companyId },
                include: { _count: { select: { applications: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.application.findMany({
                where: { job: { companyId: employer.companyId } },
                include: {
                    candidate: {
                        include: {
                            user: {
                                include: {
                                    resumeFile: true,
                                },
                            },
                        },
                    },
                    job: true,
                },
                orderBy: { matchScore: 'desc' },
                take: 20,
            }),
            database_1.prisma.application.groupBy({
                by: ['status'],
                where: { job: { companyId: employer.companyId } },
                _count: { status: true },
            }),
        ]);
        return {
            activeJobs,
            applicants: applications,
            aiRankings: applications.slice(0, 10),
            hiringAnalytics: analytics,
        };
    }
    async getAdminDashboard() {
        const [userCounts, jobCounts, applicationCounts, emailStats] = await Promise.all([
            database_1.prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
            database_1.prisma.job.groupBy({ by: ['status'], _count: { status: true } }),
            database_1.prisma.application.groupBy({ by: ['status'], _count: { status: true } }),
            database_1.prisma.emailLog.groupBy({ by: ['status'], _count: { status: true } }),
        ]);
        return {
            userCounts,
            jobCounts,
            applicationCounts,
            emailStats,
            revenueMetrics: {
                note: 'Revenue tracking placeholder for future billing integration',
                mrr: 0,
                activeSubscriptions: 0,
            },
        };
    }
}
exports.DashboardService = DashboardService;
exports.dashboardService = new DashboardService();
