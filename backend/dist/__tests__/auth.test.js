"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../index"));
describe('Auth API', () => {
    it('returns health check', async () => {
        const response = await (0, supertest_1.default)(index_1.default).get('/api/health');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
    });
    it('rejects invalid candidate registration payload', async () => {
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/register/candidate')
            .send({ name: 'A', email: 'invalid', password: 'weak' });
        expect(response.status).toBe(400);
    });
    it('rejects login with missing credentials', async () => {
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/login')
            .send({ email: 'notfound@example.com', password: 'WrongPass1!' });
        expect([400, 401]).toContain(response.status);
    });
});
