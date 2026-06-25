import { Response } from 'express';
import { exportService, ExportPlatform } from '../services/export.service';
import { AuthRequest } from '../middleware/auth.middleware';

const VALID_PLATFORMS = ['linkedin', 'indeed', 'glassdoor', 'html', 'json'] as const;

export class ExportController {
  async exportJob(req: AuthRequest, res: Response) {
    try {
      const jobId = req.params.id as string;
      const platform = req.params.platform as string;

      if (!VALID_PLATFORMS.includes(platform as any)) {
        return res.status(400).json({
          error: `Invalid platform. Supported: ${VALID_PLATFORMS.join(', ')}`,
        });
      }

      const result = await exportService.exportJob(jobId, platform as ExportPlatform);

      // Set appropriate content type for direct downloads
      if (req.query.download === 'true') {
        const extensions: Record<string, string> = {
          linkedin: 'txt',
          indeed: 'xml',
          glassdoor: 'json',
          html: 'html',
          json: 'json',
        };
        const ext = extensions[platform] || 'txt';
        res.setHeader('Content-Disposition', `attachment; filename="job-${jobId}-${platform}.${ext}"`);
        res.setHeader('Content-Type', result.contentType);
        return res.send(typeof result.formatted === 'string' ? result.formatted : JSON.stringify(result.formatted, null, 2));
      }

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const exportController = new ExportController();
