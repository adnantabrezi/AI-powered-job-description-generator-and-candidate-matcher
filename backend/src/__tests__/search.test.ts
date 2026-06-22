import { SearchService } from '../services/search.service';
import { jobRepository } from '../repositories/job.repository';
import { aiProvider } from '../ai/ai.provider';
import { prisma } from '../config/database';

jest.mock('../repositories/job.repository');
jest.mock('../ai/ai.provider');
jest.mock('../config/database', () => ({
  prisma: {
    job: {
      findMany: jest.fn(),
    },
  },
}));

describe('SearchService', () => {
  const searchService = new SearchService();

  it('falls back to full text search when semantic search fails', async () => {
    (prisma.job.findMany as jest.Mock).mockResolvedValue([
      { id: '1', title: 'React Developer', description: 'Build apps', location: 'Remote', skills: [] },
    ]);
    (aiProvider.semanticSearch as jest.Mock) = jest.fn().mockRejectedValue(new Error('AI down'));
    (jobRepository.findMany as jest.Mock) = jest.fn().mockResolvedValue({
      jobs: [{ id: '1', title: 'React Developer', company: { name: 'Acme' } }],
      total: 1,
    });

    const result = await searchService.semanticSearch('react developer');

    expect((result.meta as any).searchType).toBe('fulltext');
    expect(result.data).toHaveLength(1);
  });
});
