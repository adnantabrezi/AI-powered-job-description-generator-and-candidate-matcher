import { Response } from 'express';
import { z } from 'zod';
import { pipelineService } from '../services/pipeline.service';
import { AuthRequest } from '../middleware/auth.middleware';

const createPipelineSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  criteria: z.object({
    skills: z.array(z.string()).optional(),
    experienceMin: z.number().optional(),
    experienceMax: z.number().optional(),
  }).optional(),
  jobId: z.string().uuid().optional(),
});

const addCandidateSchema = z.object({
  candidateId: z.string().uuid(),
  notes: z.string().optional(),
});

export class PipelineController {
  async create(req: AuthRequest, res: Response) {
    try {
      const data = createPipelineSchema.parse(req.body);
      const userId = req.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const pipeline = await pipelineService.createPipeline(userId, data);
      res.status(201).json(pipeline);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async list(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const pipelines = await pipelineService.getPipelines(userId);
      res.json({ pipelines });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const pipeline = await pipelineService.getPipelineById(userId, req.params.id as string);
      res.json(pipeline);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async addCandidate(req: AuthRequest, res: Response) {
    try {
      const { candidateId, notes } = addCandidateSchema.parse(req.body);
      const userId = req.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const result = await pipelineService.addCandidate(
        userId, req.params.id as string, candidateId, notes,
      );
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async removeCandidate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new Error('User not authenticated');

      await pipelineService.removeCandidate(
        userId, req.params.id as string, req.params.candidateId as string,
      );
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async autoPopulate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const limit = Number(req.query.limit) || 10;
      const result = await pipelineService.autoPopulate(userId, req.params.id as string, limit);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new Error('User not authenticated');

      await pipelineService.deletePipeline(userId, req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const pipelineController = new PipelineController();
