"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const search_service_1 = require("../services/search.service");
const job_repository_1 = require("../repositories/job.repository");
const ai_provider_1 = require("../ai/ai.provider");
const database_1 = require("../config/database");
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
    const searchService = new search_service_1.SearchService();
    it('falls back to full text search when semantic search fails', async () => {
        database_1.prisma.job.findMany.mockResolvedValue([
            { id: '1', title: 'React Developer', description: 'Build apps', location: 'Remote', skills: [] },
        ]);
        ai_provider_1.aiProvider.semanticSearch = jest.fn().mockRejectedValue(new Error('AI down'));
        job_repository_1.jobRepository.findMany = jest.fn().mockResolvedValue({
            jobs: [{ id: '1', title: 'React Developer', company: { name: 'Acme' } }],
            total: 1,
        });
        const result = await searchService.semanticSearch('react developer');
        expect(result.meta.searchType).toBe('fulltext');
        expect(result.data).toHaveLength(1);
    });
});
