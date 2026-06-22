"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchController = exports.SearchController = void 0;
const zod_1 = require("zod");
const search_service_1 = require("../services/search.service");
const searchSchema = zod_1.z.object({
    q: zod_1.z.string().min(1),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(50).default(20),
});
class SearchController {
    async search(req, res) {
        const { q, page, limit } = searchSchema.parse(req.query);
        const result = await search_service_1.searchService.semanticSearch(q, page, limit);
        res.json(result);
    }
}
exports.SearchController = SearchController;
exports.searchController = new SearchController();
