"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const zod_1 = require("zod");
const auth_service_1 = require("../services/auth.service");
const auth_repository_1 = require("../repositories/auth.repository");
const password_1 = require("../utils/password");
const registerCandidateSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: password_1.passwordSchema,
});
const registerEmployerSchema = zod_1.z.object({
    company_name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: password_1.passwordSchema,
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string(),
});
class AuthController {
    async registerCandidate(req, res) {
        const data = registerCandidateSchema.parse(req.body);
        const result = await auth_service_1.authService.registerCandidate(data);
        res.status(201).json(result);
    }
    async registerEmployer(req, res) {
        const data = registerEmployerSchema.parse(req.body);
        const result = await auth_service_1.authService.registerEmployer(data);
        res.status(201).json(result);
    }
    async login(req, res) {
        const { email, password } = loginSchema.parse(req.body);
        const tokens = await auth_service_1.authService.login(email, password);
        res.json(tokens);
    }
    async refresh(req, res) {
        const { refreshToken } = refreshSchema.parse(req.body);
        const tokens = await auth_service_1.authService.refreshAccessToken(refreshToken);
        res.json(tokens);
    }
    async logout(req, res) {
        const { refreshToken } = refreshSchema.parse(req.body);
        await auth_repository_1.authRepository.deleteRefreshToken(refreshToken);
        res.status(204).send();
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
