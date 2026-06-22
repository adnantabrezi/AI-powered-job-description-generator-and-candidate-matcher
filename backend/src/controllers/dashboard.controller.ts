import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { dashboardService } from '../services/dashboard.service';

export class DashboardController {
  async candidate(req: AuthRequest, res: Response) {
    const data = await dashboardService.getCandidateDashboard(req.user!.id);
    res.json(data);
  }

  async employer(req: AuthRequest, res: Response) {
    const data = await dashboardService.getEmployerDashboard(req.user!.id);
    res.json(data);
  }

  async admin(_req: AuthRequest, res: Response) {
    const data = await dashboardService.getAdminDashboard();
    res.json(data);
  }
}

export const dashboardController = new DashboardController();
