import { PropertyStatus } from '@prisma/client';

export class PropertyRuleEngine {
  static canEditProperty(status: PropertyStatus, userRole: string): boolean {
    if (userRole === 'ADMIN') return true;
    return status === PropertyStatus.DRAFT || status === PropertyStatus.REJECTED || status === PropertyStatus.PUBLISHED || status === PropertyStatus.UNPUBLISHED;
  }

  static canSubmitForApproval(status: PropertyStatus): boolean {
    return status === PropertyStatus.DRAFT || status === PropertyStatus.REJECTED;
  }

  static canUnpublishProperty(status: PropertyStatus): boolean {
    return status === PropertyStatus.PUBLISHED;
  }

  static canRepublishProperty(status: PropertyStatus): boolean {
    return status === PropertyStatus.UNPUBLISHED;
  }

  static canRequestRemoval(status: PropertyStatus): boolean {
    return status === PropertyStatus.PUBLISHED || status === PropertyStatus.UNPUBLISHED || status === PropertyStatus.DRAFT || status === PropertyStatus.REJECTED;
  }

  static canArchiveProperty(status: PropertyStatus, userRole: string): boolean {
    if (userRole !== 'ADMIN') return false;
    return status !== PropertyStatus.ARCHIVED;
  }

  static canRestoreProperty(status: PropertyStatus, userRole: string): boolean {
    if (userRole !== 'ADMIN') return false;
    return status === PropertyStatus.ARCHIVED || status === PropertyStatus.REJECTED || status === PropertyStatus.SUSPENDED;
  }

  static canHardDeleteProperty(bookingCount: number, paymentCount: number, reviewCount: number): boolean {
    return bookingCount === 0 && paymentCount === 0 && reviewCount === 0;
  }

  static canReceiveBookings(status: PropertyStatus): boolean {
    return status === PropertyStatus.PUBLISHED;
  }
}
