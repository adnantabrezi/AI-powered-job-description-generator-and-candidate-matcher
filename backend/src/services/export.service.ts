import { prisma } from '../config/database';

export type ExportPlatform = 'linkedin' | 'indeed' | 'glassdoor' | 'html' | 'json';

export class ExportService {
  private async getJobForExport(jobId: string) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        skills: { include: { skill: true } },
      },
    });
    if (!job) throw new Error('Job not found');
    return job;
  }

  async exportJob(jobId: string, platform: ExportPlatform) {
    const job = await this.getJobForExport(jobId);

    switch (platform) {
      case 'linkedin':
        return this.formatLinkedIn(job);
      case 'indeed':
        return this.formatIndeed(job);
      case 'glassdoor':
        return this.formatGlassdoor(job);
      case 'html':
        return this.formatHTML(job);
      case 'json':
        return this.formatJSON(job);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private formatLinkedIn(job: any) {
    // LinkedIn has specific character limits
    const title = job.title.slice(0, 200);
    const description = (job.generatedDescription || job.description).slice(0, 25000);
    const skills = job.skills.map((s: any) => s.skill.name).slice(0, 10);

    return {
      platform: 'linkedin',
      contentType: 'text/plain',
      data: {
        title,
        company: job.company.name,
        location: job.location,
        description,
        employmentType: this.mapToLinkedInEmploymentType(job.employmentType),
        seniorityLevel: this.estimateSeniority(job.requiredExperience),
        skills,
        remote: job.remoteStatus,
      },
      formatted: `${title}\n\n${job.company.name} | ${job.location}${job.remoteStatus ? ' (Remote)' : ''}\n\n${description}\n\nSkills: ${skills.join(', ')}`,
    };
  }

  private formatIndeed(job: any) {
    const description = job.generatedDescription || job.description;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher>${job.company.name}</publisher>
  <publisherurl>${job.company.website || ''}</publisherurl>
  <job>
    <title><![CDATA[${job.title}]]></title>
    <date>${job.createdAt.toISOString().split('T')[0]}</date>
    <referencenumber>${job.id}</referencenumber>
    <url></url>
    <company><![CDATA[${job.company.name}]]></company>
    <city>${job.location.split(',')[0]?.trim() || job.location}</city>
    <state>${job.location.split(',')[1]?.trim() || ''}</state>
    <country>US</country>
    <description><![CDATA[${description}]]></description>
    <salary>${job.salaryMin && job.salaryMax ? `$${Number(job.salaryMin).toLocaleString()} - $${Number(job.salaryMax).toLocaleString()}` : 'Competitive'}</salary>
    <jobtype>${job.employmentType}</jobtype>
    <remotetype>${job.remoteStatus ? 'Remote' : 'In-person'}</remotetype>
  </job>
</source>`;

    return {
      platform: 'indeed',
      contentType: 'application/xml',
      data: xml,
      formatted: xml,
    };
  }

  private formatGlassdoor(job: any) {
    const description = job.generatedDescription || job.description;

    return {
      platform: 'glassdoor',
      contentType: 'application/json',
      data: {
        jobTitle: job.title,
        jobDescription: description,
        employer: job.company.name,
        location: job.location,
        jobType: job.employmentType,
        isRemote: job.remoteStatus,
        salary: job.salaryMin && job.salaryMax
          ? { min: Number(job.salaryMin), max: Number(job.salaryMax), currency: 'USD', period: 'ANNUAL' }
          : null,
        requiredSkills: job.skills.map((s: any) => s.skill.name),
        experienceLevel: this.estimateSeniority(job.requiredExperience),
        benefits: job.benefits || [],
      },
      formatted: JSON.stringify({
        jobTitle: job.title,
        employer: job.company.name,
        location: job.location,
        description,
      }, null, 2),
    };
  }

  private formatHTML(job: any) {
    const description = job.generatedDescription || job.description;
    const skills = job.skills.map((s: any) => s.skill.name);
    const salary = job.salaryMin && job.salaryMax
      ? `$${Number(job.salaryMin).toLocaleString()} - $${Number(job.salaryMax).toLocaleString()}`
      : 'Competitive';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${job.title} - ${job.company.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1a1a2e; line-height: 1.6; }
    .header { border-bottom: 3px solid #10b981; padding-bottom: 1.5rem; margin-bottom: 2rem; }
    .header h1 { margin: 0 0 0.5rem 0; color: #0f172a; font-size: 2rem; }
    .meta { color: #64748b; font-size: 0.95rem; }
    .meta span { margin-right: 1rem; }
    .section { margin: 1.5rem 0; }
    .section h2 { color: #0f172a; font-size: 1.25rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
    .skills { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .skill-tag { background: #ecfdf5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.85rem; font-weight: 500; }
    .salary-badge { background: #10b981; color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; display: inline-block; font-weight: 600; }
    .benefits li { margin: 0.5rem 0; }
    .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${job.title}</h1>
    <div class="meta">
      <span><strong>${job.company.name}</strong></span>
      <span>📍 ${job.location}${job.remoteStatus ? ' (Remote)' : ''}</span>
      <span>💼 ${job.employmentType}</span>
    </div>
    <div style="margin-top: 1rem;">
      <span class="salary-badge">💰 ${salary}</span>
    </div>
  </div>

  <div class="section">
    ${description.replace(/\n/g, '<br>')}
  </div>

  ${skills.length > 0 ? `
  <div class="section">
    <h2>Required Skills</h2>
    <div class="skills">
      ${skills.map((s: string) => `<span class="skill-tag">${s}</span>`).join('\n      ')}
    </div>
  </div>` : ''}

  ${(job.benefits || []).length > 0 ? `
  <div class="section">
    <h2>Benefits & Perks</h2>
    <ul class="benefits">
      ${(job.benefits as string[]).map((b: string) => `<li>${b}</li>`).join('\n      ')}
    </ul>
  </div>` : ''}

  <div class="footer">
    <p>Posted by ${job.company.name} · ${new Date(job.createdAt).toLocaleDateString()}</p>
  </div>
</body>
</html>`;

    return {
      platform: 'html',
      contentType: 'text/html',
      data: html,
      formatted: html,
    };
  }

  private formatJSON(job: any) {
    const data = {
      id: job.id,
      title: job.title,
      company: {
        name: job.company.name,
        website: job.company.website,
        industry: job.company.industry,
        location: job.company.location,
      },
      description: job.generatedDescription || job.description,
      location: job.location,
      remote: job.remoteStatus,
      employmentType: job.employmentType,
      salary: job.salaryMin && job.salaryMax
        ? { min: Number(job.salaryMin), max: Number(job.salaryMax), currency: 'USD' }
        : null,
      requiredExperience: job.requiredExperience,
      skills: job.skills.map((s: any) => s.skill.name),
      technicalSkills: job.technicalSkills || [],
      softSkills: job.softSkills || [],
      benefits: job.benefits || [],
      responsibilities: job.responsibilities || [],
      postedAt: job.createdAt,
      status: job.status,
    };

    return {
      platform: 'json',
      contentType: 'application/json',
      data,
      formatted: JSON.stringify(data, null, 2),
    };
  }

  private mapToLinkedInEmploymentType(type: string): string {
    const map: Record<string, string> = {
      'Full-time': 'FULL_TIME',
      'Part-time': 'PART_TIME',
      'Contract': 'CONTRACT',
      'Internship': 'INTERNSHIP',
      'Temporary': 'TEMPORARY',
    };
    return map[type] || 'FULL_TIME';
  }

  private estimateSeniority(years?: number | null): string {
    if (!years) return 'MID_SENIOR_LEVEL';
    if (years <= 1) return 'ENTRY_LEVEL';
    if (years <= 3) return 'ASSOCIATE';
    if (years <= 7) return 'MID_SENIOR_LEVEL';
    return 'DIRECTOR';
  }
}

export const exportService = new ExportService();
