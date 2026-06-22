"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardController = exports.DashboardController = void 0;
const dashboard_service_1 = require("../services/dashboard.service");
class DashboardController {
    async candidate(req, res) {
        const data = await dashboard_service_1.dashboardService.getCandidateDashboard(req.user.id);
        res.json(data);
    }
    async employer(req, res) {
        const data = await dashboard_service_1.dashboardService.getEmployerDashboard(req.user.id);
        res.json(data);
    }
    async admin(_req, res) {
        const data = await dashboard_service_1.dashboardService.getAdminDashboard();
        res.json(data);
    }
}
exports.DashboardController = DashboardController;
exports.dashboardController = new DashboardController();
