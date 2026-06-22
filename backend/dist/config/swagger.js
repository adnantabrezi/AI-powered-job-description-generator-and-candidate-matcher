"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwagger = void 0;
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'AI-Powered Job Board API',
        version: '1.0.0',
        description: 'REST API for candidates, employers, and admins',
    },
    servers: [{ url: '/api', description: 'API base path' }],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
    },
    paths: {
        '/auth/register/candidate': {
            post: {
                tags: ['Auth'],
                summary: 'Register candidate',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'email', 'password'],
                                properties: {
                                    name: { type: 'string' },
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string', minLength: 8 },
                                },
                            },
                        },
                    },
                },
                responses: { '201': { description: 'Candidate registered' } },
            },
        },
        '/auth/register/employer': {
            post: {
                tags: ['Auth'],
                summary: 'Register employer',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['company_name', 'email', 'password'],
                                properties: {
                                    company_name: { type: 'string' },
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: { '201': { description: 'Employer registered' } },
            },
        },
        '/auth/login': {
            post: {
                tags: ['Auth'],
                summary: 'Login',
                responses: { '200': { description: 'Returns access and refresh tokens' } },
            },
        },
        '/jobs': {
            get: {
                tags: ['Jobs'],
                summary: 'List jobs with pagination and filters',
                security: [{ bearerAuth: [] }],
                responses: { '200': { description: 'Job list' } },
            },
            post: {
                tags: ['Jobs'],
                summary: 'Create job',
                security: [{ bearerAuth: [] }],
                responses: { '201': { description: 'Job created' } },
            },
        },
        '/jobs/search': {
            get: {
                tags: ['Search'],
                summary: 'Semantic job search',
                parameters: [
                    { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
                ],
                responses: { '200': { description: 'Search results' } },
            },
        },
        '/applications': {
            post: {
                tags: ['Applications'],
                summary: 'Apply to a job',
                security: [{ bearerAuth: [] }],
                responses: { '201': { description: 'Application created' } },
            },
        },
        '/dashboard/candidate': {
            get: {
                tags: ['Dashboard'],
                summary: 'Candidate dashboard',
                security: [{ bearerAuth: [] }],
                responses: { '200': { description: 'Dashboard data' } },
            },
        },
    },
};
const setupSwagger = (app) => {
    app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument));
    app.get('/api/docs.json', (_req, res) => res.json(swaggerDocument));
};
exports.setupSwagger = setupSwagger;
