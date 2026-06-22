"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const jobQueue_1 = require("../jobs/jobQueue");
const templates = {
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
        }
        else if (data.status === 'REJECTED') {
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
class EmailService {
    async sendEmail(recipient, event, data) {
        (0, jobQueue_1.enqueueJob)(`email:${event}:${recipient}`, async () => {
            const template = templates[event](data);
            let status = 'SENT';
            try {
                if (env_1.ENV.SENDGRID_API_KEY) {
                    await this.sendViaSendGrid(recipient, template.subject, template.content);
                }
                else {
                    console.log(`[Email Dev] To: ${recipient} | Subject: ${template.subject}`);
                }
            }
            catch (error) {
                status = 'FAILED';
                console.error('Email send failed:', error);
            }
            await database_1.prisma.emailLog.create({
                data: {
                    recipient,
                    subject: template.subject,
                    content: template.content,
                    status,
                },
            });
        });
    }
    async sendViaSendGrid(recipient, subject, content) {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env_1.ENV.SENDGRID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: recipient }] }],
                from: { email: env_1.ENV.SENDGRID_FROM_EMAIL },
                subject,
                content: [{ type: 'text/plain', value: content }],
            }),
        });
        if (!response.ok) {
            throw new Error(`SendGrid error: ${response.status}`);
        }
    }
    async createNotification(userId, message) {
        await database_1.prisma.notification.create({
            data: { userId, message },
        });
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
