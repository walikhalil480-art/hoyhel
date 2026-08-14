import { prisma } from '../../config/database';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { ReportStatus } from '@prisma/client';

export class UserReportService {
  async createReport(
    reporterId: string,
    data: {
      reportedUserId: string;
      reason: string;
      details?: string;
    }
  ) {
    if (reporterId === data.reportedUserId) {
      throw new ValidationError('You cannot submit a report against yourself');
    }

    if (!data.reason || data.reason.trim().length === 0) {
      throw new ValidationError('A reason must be provided for filing a report');
    }

    const reportedUser = await prisma.user.findUnique({ where: { id: data.reportedUserId } });
    if (!reportedUser) {
      throw new NotFoundError('Reported user does not exist');
    }

    const report = await prisma.$transaction(async (tx) => {
      const r = await tx.userReport.create({
        data: {
          reporterId,
          reportedUserId: data.reportedUserId,
          reason: data.reason.trim(),
          details: data.details ? data.details.trim() : null,
          status: ReportStatus.PENDING,
        },
        include: {
          reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
          reportedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: reporterId,
          action: 'REPORT_SUBMITTED',
          resource: 'UserReport',
          resourceId: r.id,
          details: { reportedUserId: data.reportedUserId, reason: data.reason.trim() },
        },
      });

      return r;
    });

    return report;
  }

  async getUserSubmittedReports(userId: string) {
    return prisma.userReport.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        reportedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }
}
