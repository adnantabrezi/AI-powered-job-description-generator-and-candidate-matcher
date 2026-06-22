import { Request, Response } from 'express';
import { z } from 'zod';
import { jobService } from '../services/job.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { getParam } from '../utils/params';

const createJobSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  location: z.string().min(2),
  employmentType: z.string(),
  salaryMin: z.number().nonnegative().optional(),
  salaryMax: z.number().nonnegative().optional(),
  remoteStatus: z.boolean().default(false),
  requiredExperience: z.number().int().nonnegative().optional(),
  skillIds: z.array(z.string().uuid()).default([]),
});

const updateJobSchema = createJobSchema.partial();

const statusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
});

export class JobController {
  async create(req: AuthRequest, res: Response) {
    try {
      const data = createJobSchema.parse(req.body);
      const userId = req.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const job = await jobService.createJob(userId, data);
      res.status(201).json(job);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const params = req.query;
      const userId = (req as any).user?.id;
      const role = (req as any).user?.role;

      const result = await jobService.listJobs(params, userId, role);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const role = (req as any).user?.role;
      const job = await jobService.getJobById(getParam(req.params.id), userId, role);
      res.json(job);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const data = updateJobSchema.parse(req.body);
      const userId = req.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const job = await jobService.updateJob(userId, getParam(req.params.id), data);
      res.json(job);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new Error('User not authenticated');

      await jobService.deleteJob(userId, getParam(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { status } = statusSchema.parse(req.body);
      const userId = req.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const job = await jobService.changeJobStatus(userId, getParam(req.params.id), status);
      res.json(job);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const jobController = new JobController();
