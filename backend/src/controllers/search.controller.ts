import { Request, Response } from 'express';
import { z } from 'zod';
import { searchService } from '../services/search.service';

const searchSchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export class SearchController {
  async search(req: Request, res: Response) {
    const { q, page, limit } = searchSchema.parse(req.query);
    const result = await searchService.semanticSearch(q, page, limit);
    res.json(result);
  }
}

export const searchController = new SearchController();
