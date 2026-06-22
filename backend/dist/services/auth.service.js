"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const auth_repository_1 = require("../repositories/auth.repository");
const company_repository_1 = require("../repositories/company.repository");
const env_1 = require("../config/env");
const email_service_1 = require("../notifications/email.service");
const password_1 = require("../utils/password");
const error_middleware_1 = require("../middleware/error.middleware");
class AuthService {
    async hashPassword(password) {
        return bcryptjs_1.default.hash(password, env_1.ENV.BCRYPT_SALT_ROUNDS);
    }
    async comparePassword(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
    async registerCandidate(data) {
        (0, password_1.validatePassword)(data.password);
        const existingUser = await auth_repository_1.authRepository.findUserByEmail(data.email);
        if (existingUser)
            throw new error_middleware_1.AppError(409, 'Email already registered');
        const passwordHash = await this.hashPassword(data.password);
        const user = await auth_repository_1.authRepository.createUser({
            email: data.email,
            passwordHash,
            role: client_1.UserRole.CANDIDATE,
        });
        await auth_repository_1.authRepository.createCandidateProfile({
            userId: user.id,
            fullName: data.name,
        });
        await email_service_1.emailService.sendEmail(data.email, 'REGISTRATION', { name: data.name });
        return { userId: user.id, email: user.email };
    }
    async registerEmployer(data) {
        (0, password_1.validatePassword)(data.password);
        const existingUser = await auth_repository_1.authRepository.findUserByEmail(data.email);
        if (existingUser)
            throw new error_middleware_1.AppError(409, 'Email already registered');
        const passwordHash = await this.hashPassword(data.password);
        const user = await auth_repository_1.authRepository.createUser({
            email: data.email,
            passwordHash,
            role: client_1.UserRole.EMPLOYER,
        });
        const company = await company_repository_1.companyRepository.create({ name: data.company_name });
        await auth_repository_1.authRepository.createEmployerProfile({
            userId: user.id,
            companyId: company.id,
        });
        await email_service_1.emailService.sendEmail(data.email, 'REGISTRATION', {
            name: data.company_name,
        });
        return { userId: user.id, email: user.email, companyId: company.id };
    }
    async login(email, pass) {
        const user = await auth_repository_1.authRepository.findUserByEmail(email);
        if (!user)
            throw new error_middleware_1.AppError(401, 'Invalid credentials');
        const isValid = await this.comparePassword(pass, user.passwordHash);
        if (!isValid)
            throw new error_middleware_1.AppError(401, 'Invalid credentials');
        const accessToken = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user.id);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await auth_repository_1.authRepository.saveRefreshToken(user.id, refreshToken, expiresAt);
        return { accessToken, refreshToken, role: user.role };
    }
    async refreshAccessToken(refreshToken) {
        const tokenData = await auth_repository_1.authRepository.findRefreshToken(refreshToken);
        if (!tokenData || tokenData.isRevoked || tokenData.expiresAt < new Date()) {
            throw new error_middleware_1.AppError(401, 'Invalid or expired refresh token');
        }
        const user = await auth_repository_1.authRepository.findUserById(tokenData.userId);
        if (!user)
            throw new error_middleware_1.AppError(404, 'User not found');
        await auth_repository_1.authRepository.deleteRefreshToken(refreshToken);
        const accessToken = this.generateAccessToken(user);
        const newRefreshToken = this.generateRefreshToken(user.id);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await auth_repository_1.authRepository.saveRefreshToken(user.id, newRefreshToken, expiresAt);
        return { accessToken, refreshToken: newRefreshToken, role: user.role };
    }
    generateAccessToken(user) {
        return jsonwebtoken_1.default.sign({ sub: user.id, role: user.role }, env_1.ENV.JWT_SECRET, { expiresIn: env_1.ENV.ACCESS_TOKEN_EXPIRES_IN });
    }
    generateRefreshToken(userId) {
        return jsonwebtoken_1.default.sign({ sub: userId, jti: crypto_1.default.randomUUID() }, env_1.ENV.JWT_REFRESH_SECRET, { expiresIn: env_1.ENV.REFRESH_TOKEN_EXPIRES_IN });
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
