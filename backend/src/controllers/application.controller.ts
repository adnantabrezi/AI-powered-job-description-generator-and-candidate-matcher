import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.middleware';
import { applicationService } from '../services/application.service';
import { getParam } from '../utils/params';

const applySchema = z.object({
  jobId: z.string().uuid(),
});

const statusSchema = z.object({
  status: z.enum([
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

export class ApplicationController {
  async apply(req: AuthRequest, res: Response) {
    const { jobId } = applySchema.parse(req.body);
    const userId = req.user!.id;
    const application = await applicationService.apply(userId, jobId);
    res.status(201).json(application);
  }

  async getMyApplications(req: AuthRequest, res: Response) {
    const applications = await applicationService.getMyApplications(req.user!.id);
    res.json(applications);
  }

  async getJobApplicants(req: AuthRequest, res: Response) {
    const applicants = await applicationService.getJobApplicants(
      req.user!.id,
      getParam(req.params.jobId),
    );
    res.json(applicants);
  }

  async updateStatus(req: AuthRequest, res: Response) {
    const { status } = statusSchema.parse(req.body);
    const application = await applicationService.updateStatus(
      req.user!.id,
      getParam(req.params.id),
      status,
    );
    res.json(application);
  }

  async withdraw(req: AuthRequest, res: Response) {
    await applicationService.withdraw(req.user!.id, getParam(req.params.id));
    res.status(204).send();
  }

  async getHistory(req: AuthRequest, res: Response) {
    const history = await applicationService.getHistory(
      req.user!.id,
      getParam(req.params.id),
      req.user!.role,
    );
    res.json(history);
  }
}

export const applicationController = new ApplicationController();
