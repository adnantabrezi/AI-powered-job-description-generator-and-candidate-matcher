import { aiProvider } from '../ai/ai.provider';
import { prisma } from '../config/database';

export class LinkedInService {
  /**
   * Parse LinkedIn profile text and merge with candidate profile.
   */
  async parseAndMerge(userId: string, profileText: string) {
    const extracted = await aiProvider.extractLinkedInProfile(profileText);

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new Error('Candidate profile not found');

    // Update profile with LinkedIn data
    await prisma.candidateProfile.update({
      where: { userId },
      data: {
        fullName: extracted.fullName || profile.fullName,
        headline: extracted.headline,
        resumeSummary: extracted.summary,
        workHistory: extracted.experience as any,
        education: extracted.education as any,
        certifications: extracted.certifications,
      },
    });

    // Link extracted skills
    if (extracted.skills.length > 0) {
      for (const skillName of extracted.skills) {
        const normalized = skillName.trim();
        if (!normalized) continue;

        const skill = await prisma.skill.upsert({
          where: { name: normalized },
          update: {},
          create: { name: normalized },
        });

        await prisma.candidateSkill.upsert({
          where: {
            candidateId_skillId: {
              candidateId: profile.id,
              skillId: skill.id,
            },
          },
          update: {},
          create: {
            candidateId: profile.id,
            skillId: skill.id,
            proficiency: 'Unknown',
          },
        });
      }
    }

    return {
      extracted,
      message: 'LinkedIn profile data merged successfully',
    };
  }

  /**
   * Save LinkedIn URL to profile.
   */
  async saveLinkedInUrl(userId: string, url: string) {
    await prisma.candidateProfile.update({
      where: { userId },
      data: { linkedInUrl: url },
    });
  }
}

export const linkedInService = new LinkedInService();
