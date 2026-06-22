"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchingController = exports.MatchingController = void 0;
const matching_service_1 = require("../services/matching.service");
const job_match_repository_1 = require("../repositories/job.match.repository");
const database_1 = require("../config/database");
const params_1 = require("../utils/params");
class MatchingController {
    async rankApplicants(req, res) {
        const ranking = await matching_service_1.matchingService.rankApplicantsForJob((0, params_1.getParam)(req.params.id));
        res.json(ranking);
    }
    async getMyMatches(req, res) {
        const profile = await database_1.prisma.candidateProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!profile)
            throw new Error('Candidate profile not found');
        const matches = await job_match_repository_1.jobMatchRepository.findMatchesByCandidate(profile.id);
        res.json(matches);
    }
}
exports.MatchingController = MatchingController;
exports.matchingController = new MatchingController();
