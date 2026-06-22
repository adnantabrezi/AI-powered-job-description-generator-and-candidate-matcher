import { prisma } from '../config/database';
import { ENV } from '../config/env';
import { enqueueJob } from '../jobs/jobQueue';

export type EmailEvent =
  | 'REGISTRATION'
  | 'PASSWORD_RESET'
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_STATUS_CHANGED'
  | 'INTERVIEW_SCHEDULED'
  | 'RECOMMENDATION_FOUND'
  | 'OFFER_SENT';

const templates: Record<EmailEvent, (data: Record<string, string>) => { subject: string; content: string }> = {
  REGISTRATION: (data) => ({
    subject: 'Welcome to AI Job Board',
    content: `Hi ${data.name},\n\nYour account has been created successfully.\n\nWelcome aboard!`,
  }),
  PASSWORD_RESET: (data) => ({
    subject: 'Password Reset Request',
    content: `Reset your password using this link: ${data.resetLink}`,
  }),
  APPLICATION_SUBMITTED: (data) => ({
    subject: `Application submitted for ${data.jobTitle}`,
    content: `Your application for "${data.jobTitle}" at ${data.companyName} has been submitted.`,
  }),
  APPLICATION_STATUS_CHANGED: (data) => {
    let subject = `Update on your application for ${data.jobTitle}`;
    let content = `Your application for "${data.jobTitle}" is now: ${data.status}.`;

    if (data.status === 'SHORTLISTED') {
      subject = `Great news! You've been shortlisted for ${data.jobTitle}`;
      content = `Hi there,\n\nWe have reviewed your application for "${data.jobTitle}" and are pleased to inform you that you have been shortlisted!\n\nOur hiring team will be in touch with you shortly to discuss the next steps.\n\nBest regards,\nThe Hiring Team`;
    } else if (data.status === 'REJECTED') {
      subject = `Status update regarding your application for ${data.jobTitle}`;
      content = `Hi there,\n\nThank you for taking the time to apply for the "${data.jobTitle}" position.\n\nUnfortunately, after careful review, we have decided to proceed with other candidates whose qualifications more closely match our current needs.\n\nWe appreciate your interest in our company and wish you the best of luck with your job search.\n\nBest regards,\nThe Hiring Team`;
    }

    return { subject, content };
  },
  INTERVIEW_SCHEDULED: (data) => ({
    subject: `Interview scheduled for ${data.jobTitle}`,
    content: `Your interview for "${data.jobTitle}" is scheduled on ${data.interviewDate}.`,
  }),
  RECOMMENDATION_FOUND: (data) => ({
    subject: `New Job Recommendation: ${data.jobTitle} (${data.matchScore}% Match)`,
    content: `Hi there,\n\nWe found a job recommendation that is a strong match for your profile!\n\nPosition: ${data.jobTitle}\nMatch Score: ${data.matchScore}%\nReason: ${data.reason}\n\nCheck it out and apply today!\n\nBest regards,\nThe Job Board Team`,
  }),
  OFFER_SENT: (data) => ({
    subject: `Offer received for ${data.jobTitle}`,
    content: `Congratulations! You received an offer for "${data.jobTitle}" at ${data.companyName}.`,
  }),
};

export class EmailService {
  async sendEmail(
    recipient: string,
    event: EmailEvent,
    data: Record<string, string>,
  ): Promise<void> {
    enqueueJob(`email:${event}:${recipient}`, async () => {
      const template = templates[event](data);
      let status = 'SENT';

      try {
        if (ENV.SENDGRID_API_KEY) {
          await this.sendViaSendGrid(recipient, template.subject, template.content);
        } else {
          console.log(`[Email Dev] To: ${recipient} | Subject: ${template.subject}`);
        }
      } catch (error) {
        status = 'FAILED';
        console.error('Email send failed:', error);
      }

      await prisma.emailLog.create({
        data: {
          recipient,
          subject: template.subject,
          content: template.content,
          status,
        },
      });
    });
  }

  private async sendViaSendGrid(
    recipient: string,
    subject: string,
    content: string,
  ): Promise<void> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ENV.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: recipient }] }],
        from: { email: ENV.SENDGRID_FROM_EMAIL },
        subject,
        content: [{ type: 'text/plain', value: content }],
      }),
    });

    if (!response.ok) {
      throw new Error(`SendGrid error: ${response.status}`);
    }
  }

  async createNotification(userId: string, message: string): Promise<void> {
    await prisma.notification.create({
      data: { userId, message },
    });
  }
}

export const emailService = new EmailService();
