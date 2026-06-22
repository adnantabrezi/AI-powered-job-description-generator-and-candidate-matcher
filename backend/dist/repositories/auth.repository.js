"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRepository = exports.AuthRepository = void 0;
const database_1 = require("../config/database");
class AuthRepository {
    async findUserByEmail(email) {
        return database_1.prisma.user.findUnique({ where: { email } });
    }
    async findUserById(id) {
        return database_1.prisma.user.findUnique({ where: { id } });
    }
    async createUser(data) {
        return database_1.prisma.user.create({ data });
    }
    async createCandidateProfile(data) {
        return database_1.prisma.candidateProfile.create({ data });
    }
    async createEmployerProfile(data) {
        return database_1.prisma.employerProfile.create({ data });
    }
    async saveRefreshToken(userId, token, expiresAt) {
        return database_1.prisma.refreshToken.create({
            data: { userId, token, expiresAt },
        });
    }
    async findRefreshToken(token) {
        return database_1.prisma.refreshToken.findUnique({ where: { token } });
    }
    async deleteRefreshToken(token) {
        await database_1.prisma.refreshToken.delete({ where: { token } });
    }
    async revokeUserTokens(userId) {
        await database_1.prisma.refreshToken.updateMany({
            where: { userId },
            data: { isRevoked: true },
        });
    }
}
exports.AuthRepository = AuthRepository;
exports.authRepository = new AuthRepository();
