import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';
import { PropertyType, PropertyStatus, CancellationPolicy, NotificationType, NotificationPriority, Prisma } from '@prisma/client';
import { storageService } from '../../utils/storage';
import { NotificationService } from '../notifications/notifications.service';

export class PropertyService {
  async searchProperties(params: {
    city?: string;
    country?: string;
    search?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: PropertyType;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    amenities?: string[];
    page?: number;
    limit?: number;
    sortBy?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 12;
    const skip = (page - 1) * limit;

    const where: Prisma.PropertyWhereInput = {
      status: PropertyStatus.PUBLISHED,
    };

    if (params.city) {
      where.city = { contains: params.city, mode: 'insensitive' };
    }

    if (params.country) {
      where.country = { contains: params.country, mode: 'insensitive' };
    }

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { city: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.guests) {
      where.maxGuests = { gte: params.guests };
    }

    if (params.bedrooms) {
      where.bedrooms = { gte: params.bedrooms };
    }

    if (params.bathrooms) {
      where.bathrooms = { gte: params.bathrooms };
    }

    if (params.propertyType) {
      where.propertyType = params.propertyType;
    }

    if (params.minPrice || params.maxPrice) {
      where.basePrice = {};
      if (params.minPrice) where.basePrice.gte = params.minPrice;
      if (params.maxPrice) where.basePrice.lte = params.maxPrice;
    }

    if (params.minRating) {
      where.averageRating = { gte: params.minRating };
    }

    if (params.amenities && params.amenities.length > 0) {
      where.propertyAmenities = {
        some: {
          amenityId: { in: params.amenities },
        },
      };
    }

    // Date Availability Filter
    if (params.checkIn && params.checkOut) {
      const checkInDate = new Date(params.checkIn);
      const checkOutDate = new Date(params.checkOut);

      where.AND = [
        {
          // Exclude properties with blocked days or existing confirmed bookings in range
          availabilities: {
            none: {
              date: { gte: checkInDate, lt: checkOutDate },
              isBlocked: true,
            },
          },
        },
        {
          bookings: {
            none: {
              status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
              AND: [
                { checkIn: { lt: checkOutDate } },
                { checkOut: { gt: checkInDate } },
              ],
            },
          },
        },
      ];
    }

    // Sort order
    let orderBy: Prisma.PropertyOrderByWithRelationInput = { createdAt: 'desc' };
    if (params.sortBy === 'price_asc') orderBy = { basePrice: 'asc' };
    if (params.sortBy === 'price_desc') orderBy = { basePrice: 'desc' };
    if (params.sortBy === 'rating_desc') orderBy = { averageRating: 'desc' };

    const [total, properties] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          host: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          propertyAmenities: {
            include: { amenity: true },
          },
        },
      }),
    ]);

    return {
      properties,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPropertyById(id: string) {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        host: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, bio: true, createdAt: true },
        },
        propertyAmenities: {
          include: { amenity: true },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundError('Property');
    }

    return property;
  }

  async createProperty(
    hostId: string,
    data: {
      title: string;
      description: string;
      propertyType: PropertyType;
      cancellationPolicy?: CancellationPolicy;
      basePrice: number;
      cleaningFee?: number;
      serviceFee?: number;
      securityDeposit?: number;
      bedrooms?: number;
      bathrooms?: number;
      beds?: number;
      maxGuests?: number;
      squareMeters?: number;
      address: string;
      city: string;
      state?: string;
      country: string;
      zipCode?: string;
      latitude: number;
      longitude: number;
      amenityIds?: string[];
      houseRules?: any;
      checkInInstructions?: string;
      checkOutInstructions?: string;
    }
  ) {
    const host = await prisma.user.findUnique({ where: { id: hostId } });
    if (!host || host.role !== 'HOST') {
      throw new ForbiddenError('Only approved hosts can create property listings');
    }

    if (!host.isActive || host.isSuspended || host.isBlocked || host.isBanned) {
      const reason = host.suspensionReason || host.blockedReason || host.banReason || 'Your host account is currently restricted from creating property listings';
      throw new ForbiddenError(`Account Restricted: ${reason}`);
    }

    const { amenityIds, ...fields } = data;

    const property = await prisma.property.create({
      data: {
        ...fields,
        hostId,
        status: PropertyStatus.PENDING_APPROVAL,
        propertyAmenities: {
          create: (amenityIds || []).map((amenityId) => ({ amenityId })),
        },
      },
      include: {
        images: true,
        propertyAmenities: { include: { amenity: true } },
      },
    });

    return property;
  }

  async updateProperty(hostId: string, propertyId: string, data: any, userRoles: string[]) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { images: true },
    });
    if (!property) throw new NotFoundError('Property');

    const isAdmin = userRoles.includes('ADMIN');
    if (property.hostId !== hostId && !isAdmin) {
      throw new ForbiddenError('You can only modify properties you host');
    }

    // Publishing requirement check: Must have at least 1 image
    if (data.status === PropertyStatus.PUBLISHED) {
      const imageCount = await prisma.propertyImage.count({ where: { propertyId } });
      if (imageCount === 0) {
        throw new ValidationError('A property cannot be published without at least one property image');
      }
    }

    const { amenityIds, ...fields } = data;

    if (amenityIds) {
      await prisma.propertyAmenity.deleteMany({ where: { propertyId } });
      await prisma.propertyAmenity.createMany({
        data: amenityIds.map((amenityId: string) => ({ propertyId, amenityId })),
      });
    }

    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: fields,
      include: {
        images: true,
        propertyAmenities: { include: { amenity: true } },
      },
    });

    return updated;
  }

  async deleteProperty(hostId: string, propertyId: string, userRoles: string[]) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError('Property');

    const isAdmin = userRoles.includes('ADMIN');
    if (property.hostId !== hostId && !isAdmin) {
      throw new ForbiddenError('You can only delete properties you host');
    }

    const bookingCount = await prisma.booking.count({ where: { propertyId } });

    if (bookingCount > 0) {
      // Soft-archive to preserve historical guest booking integrity
      await prisma.$transaction(async (tx) => {
        await tx.property.update({
          where: { id: propertyId },
          data: { status: PropertyStatus.ARCHIVED },
        });

        await tx.propertyStatusHistory.create({
          data: {
            propertyId,
            previousStatus: property.status,
            newStatus: PropertyStatus.ARCHIVED,
            changedBy: hostId,
            reason: 'Soft-archived by host (historical bookings exist)',
          },
        });
      });
      return { success: true, message: 'Property archived cleanly to preserve historical booking records' };
    }

    await prisma.property.delete({ where: { id: propertyId } });
    return { success: true, message: 'Property deleted' };
  }

  async submitForApproval(hostId: string, propertyId: string) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { images: true },
    });

    if (!property) throw new NotFoundError('Property');
    if (property.hostId !== hostId) throw new ForbiddenError('Only the host owner can submit this property for approval');

    if (property.images.length === 0) {
      throw new ValidationError('Cannot submit property for approval without at least one uploaded image');
    }

    const prevStatus = property.status;
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.PENDING_APPROVAL },
      });

      await tx.propertyStatusHistory.create({
        data: {
          propertyId,
          previousStatus: prevStatus,
          newStatus: PropertyStatus.PENDING_APPROVAL,
          changedBy: hostId,
          reason: 'Submitted for Admin Approval',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: hostId,
          action: 'PROPERTY_SUBMITTED_FOR_APPROVAL',
          resource: 'Property',
          resourceId: propertyId,
          details: { previousStatus: prevStatus, newStatus: PropertyStatus.PENDING_APPROVAL },
        },
      });

      return p;
    });

    // Notify all admins in real time
    const notificationService = new NotificationService();
    const hostUser = await prisma.user.findUnique({ where: { id: hostId } });
    await notificationService.notifyAdmins({
      type: NotificationType.PROPERTY_SUBMITTED,
      title: '🔔 Property Submitted for Approval',
      message: `${hostUser?.firstName || 'Host'} submitted "${property.title}" for admin review.`,
      priority: NotificationPriority.HIGH,
      actionUrl: '/admin/properties?tab=pending',
      data: {
        entityType: 'Property',
        entityId: property.id,
        propertyId: property.id,
        actorId: hostId,
        route: '/admin/properties?tab=pending',
      },
    });

    return updated;
  }

  async unpublishProperty(hostId: string, propertyId: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError('Property');
    if (property.hostId !== hostId) throw new ForbiddenError('Only the host owner can unpublish this property');

    if (property.status !== PropertyStatus.PUBLISHED) {
      throw new ValidationError('Only published properties can be unpublished');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.UNPUBLISHED },
      });

      await tx.propertyStatusHistory.create({
        data: {
          propertyId,
          previousStatus: PropertyStatus.PUBLISHED,
          newStatus: PropertyStatus.UNPUBLISHED,
          changedBy: hostId,
          reason: 'Unpublished by Host',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: hostId,
          action: 'PROPERTY_UNPUBLISHED',
          resource: 'Property',
          resourceId: propertyId,
        },
      });

      return p;
    });

    return updated;
  }

  async republishProperty(hostId: string, propertyId: string) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { images: true },
    });
    if (!property) throw new NotFoundError('Property');
    if (property.hostId !== hostId) throw new ForbiddenError('Only the host owner can republish this property');

    if (property.images.length === 0) {
      throw new ValidationError('Cannot publish a property without at least one property image');
    }

    const prevStatus = property.status;
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.PUBLISHED },
      });

      await tx.propertyStatusHistory.create({
        data: {
          propertyId,
          previousStatus: prevStatus,
          newStatus: PropertyStatus.PUBLISHED,
          changedBy: hostId,
          reason: 'Republished by Host',
        },
      });

      return p;
    });

    return updated;
  }

  async requestPropertyRemoval(hostId: string, propertyId: string, reason: string) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        bookings: true,
        host: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!property) throw new NotFoundError('Property');
    if (property.hostId !== hostId) throw new ForbiddenError('You can only request removal for properties you own');

    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('A reason must be provided when requesting property removal');
    }

    const prevStatus = property.status;
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.property.update({
        where: { id: propertyId },
        data: {
          status: PropertyStatus.REMOVAL_REQUESTED,
          removalReason: reason.trim(),
          removalRequestedAt: new Date(),
          removalRequestedBy: hostId,
        },
      });

      await tx.propertyStatusHistory.create({
        data: {
          propertyId,
          previousStatus: prevStatus,
          newStatus: PropertyStatus.REMOVAL_REQUESTED,
          changedBy: hostId,
          reason: `Removal requested: ${reason.trim()}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: hostId,
          action: 'PROPERTY_REMOVAL_REQUESTED',
          resource: 'Property',
          resourceId: propertyId,
          details: { reason: reason.trim() },
        },
      });

      return p;
    });

    // Send real-time notification to all Administrators
    const notificationService = new NotificationService();
    const hostName = property.host ? `${property.host.firstName} ${property.host.lastName}` : 'Host';
    await notificationService.notifyAdmins({
      type: NotificationType.PROPERTY_REMOVAL_REQUESTED,
      title: '🔔 Property Removal Request',
      message: `${hostName} requested removal of "${property.title}". Reason: ${reason.trim()}`,
      priority: NotificationPriority.HIGH,
      actionUrl: '/admin/properties?tab=removal-requests',
      data: {
        entityType: 'Property',
        entityId: property.id,
        propertyId: property.id,
        actorId: hostId,
        route: '/admin/properties?tab=removal-requests',
        reason: reason.trim(),
      },
    });

    return updated;
  }

  async cancelRemovalRequest(hostId: string, propertyId: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError('Property');
    if (property.hostId !== hostId) throw new ForbiddenError('Only the property host can cancel a removal request');

    if (property.status !== PropertyStatus.REMOVAL_REQUESTED) {
      throw new ValidationError('Property is not currently in REMOVAL_REQUESTED state');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.property.update({
        where: { id: propertyId },
        data: {
          status: PropertyStatus.PUBLISHED,
          removalReason: null,
          removalRequestedAt: null,
          removalRequestedBy: null,
        },
      });

      await tx.propertyStatusHistory.create({
        data: {
          propertyId,
          previousStatus: PropertyStatus.REMOVAL_REQUESTED,
          newStatus: PropertyStatus.PUBLISHED,
          changedBy: hostId,
          reason: 'Removal request cancelled by Host',
        },
      });

      return p;
    });

    return updated;
  }

  async getPropertyStatusHistory(propertyId: string, userId: string, userRoles: string[]) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError('Property');

    const isAdmin = userRoles.includes('ADMIN');
    if (property.hostId !== userId && !isAdmin) {
      throw new ForbiddenError('You do not have permission to view this property status history');
    }

    return prisma.propertyStatusHistory.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' },
      include: {
        changedByUser: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      },
    });
  }

  async uploadPropertyImage(hostId: string, propertyId: string, file: Express.Multer.File, isMain = false) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError('Property');

    if (property.hostId !== hostId) {
      throw new ForbiddenError('Only the host can upload property images');
    }

    const imageCount = await prisma.propertyImage.count({ where: { propertyId } });
    if (imageCount >= 10) {
      throw new ValidationError('Maximum 10 images allowed per property');
    }

    const imageUrl = await storageService.uploadFile(file, 'properties');

    if (isMain) {
      await prisma.propertyImage.updateMany({
        where: { propertyId },
        data: { isMain: false },
      });
    }

    const newImage = await prisma.propertyImage.create({
      data: {
        propertyId,
        url: imageUrl,
        sortOrder: imageCount,
        isMain: isMain || imageCount === 0,
      },
    });

    return newImage;
  }

  async uploadPropertyImages(hostId: string, propertyId: string, files: Express.Multer.File[], mainIndex = 0) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new NotFoundError('Property');

    if (property.hostId !== hostId) {
      throw new ForbiddenError('Only the host can upload property images');
    }

    if (!files || files.length === 0) {
      throw new ValidationError('At least one image file is required');
    }

    const existingCount = await prisma.propertyImage.count({ where: { propertyId } });
    if (existingCount + files.length > 10) {
      throw new ValidationError('Maximum 10 images allowed per property');
    }

    const createdImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageUrl = await storageService.uploadFile(file, 'properties');
      const isMain = existingCount === 0 && i === mainIndex;

      const img = await prisma.propertyImage.create({
        data: {
          propertyId,
          url: imageUrl,
          sortOrder: existingCount + i,
          isMain,
        },
      });

      createdImages.push(img);
    }

    const hasMain = await prisma.propertyImage.findFirst({ where: { propertyId, isMain: true } });
    if (!hasMain && createdImages.length > 0) {
      await prisma.propertyImage.update({
        where: { id: createdImages[0].id },
        data: { isMain: true },
      });
      createdImages[0].isMain = true;
    }

    return createdImages;
  }

  async setCoverImage(hostId: string, propertyId: string, imageId: string) {
    const image = await prisma.propertyImage.findUnique({
      where: { id: imageId },
      include: { property: true },
    });

    if (!image) throw new NotFoundError('Image');
    if (image.propertyId !== propertyId) throw new ValidationError('Image does not belong to this property');
    if (image.property.hostId !== hostId) throw new ForbiddenError('Only the host can update property cover image');

    await prisma.$transaction([
      prisma.propertyImage.updateMany({
        where: { propertyId },
        data: { isMain: false },
      }),
      prisma.propertyImage.update({
        where: { id: imageId },
        data: { isMain: true },
      }),
    ]);

    return { success: true, message: 'Cover image updated' };
  }

  async deletePropertyImage(hostId: string, propertyId: string, imageId: string) {
    const image = await prisma.propertyImage.findUnique({
      where: { id: imageId },
      include: { property: true },
    });

    if (!image) throw new NotFoundError('Image');
    if (image.property.hostId !== hostId) {
      throw new ForbiddenError('Only host can delete images');
    }

    await storageService.deleteFile(image.url);
    await prisma.propertyImage.delete({ where: { id: imageId } });

    // If deleted image was cover, promote another image to cover
    if (image.isMain) {
      const nextImage = await prisma.propertyImage.findFirst({ where: { propertyId } });
      if (nextImage) {
        await prisma.propertyImage.update({
          where: { id: nextImage.id },
          data: { isMain: true },
        });
      }
    }

    return { success: true };
  }
}
