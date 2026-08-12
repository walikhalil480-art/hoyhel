import { prisma } from '../config/database';
import { PropertyService } from '../modules/properties/properties.service';
import { AdminService } from '../modules/admin/admin.service';
import { UserRoleType, PropertyType, PropertyStatus } from '@prisma/client';

describe('LuxeHaven Property Lifecycle & Removal Request Suite', () => {
  const propertyService = new PropertyService();
  const adminService = new AdminService();

  let hostUser: any;
  let hostUserB: any;
  let adminUser: any;
  let property: any;

  beforeAll(async () => {
    // 1. Create test Host, Host B, and Admin
    hostUser = await prisma.user.create({
      data: {
        email: `lifecycle.host.${Date.now()}@luxehaven.com`,
        passwordHash: 'hashedpwd123',
        firstName: 'Lifecycle',
        lastName: 'Host',
        role: UserRoleType.HOST,
      },
    });

    hostUserB = await prisma.user.create({
      data: {
        email: `lifecycle.hostB.${Date.now()}@luxehaven.com`,
        passwordHash: 'hashedpwd123',
        firstName: 'Lifecycle',
        lastName: 'HostB',
        role: UserRoleType.HOST,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `lifecycle.admin.${Date.now()}@luxehaven.com`,
        passwordHash: 'hashedpwd123',
        firstName: 'Lifecycle',
        lastName: 'Admin',
        role: UserRoleType.ADMIN,
      },
    });
  });

  afterAll(async () => {
    // Clean up created resources
    if (property) {
      await prisma.propertyStatusHistory.deleteMany({ where: { propertyId: property.id } });
      await prisma.propertyImage.deleteMany({ where: { propertyId: property.id } });
      await prisma.booking.deleteMany({ where: { propertyId: property.id } });
      await prisma.property.deleteMany({ where: { id: property.id } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [hostUser.id, hostUserB.id, adminUser.id] } },
    });
  });

  it('1. Host creates draft property and fails submission without images', async () => {
    property = await prisma.property.create({
      data: {
        hostId: hostUser.id,
        title: 'Penthouse Lifecycle Suite',
        description: 'Luxury penthouse for testing lifecycle status transitions',
        propertyType: PropertyType.APARTMENT,
        basePrice: 500,
        address: '100 Ocean Blvd',
        city: 'Miami',
        country: 'USA',
        latitude: 25.7617,
        longitude: -80.1918,
        status: PropertyStatus.DRAFT,
      },
    });

    expect(property.status).toBe(PropertyStatus.DRAFT);

    await expect(propertyService.submitForApproval(hostUser.id, property.id)).rejects.toThrow(
      'Cannot submit property for approval without at least one uploaded image'
    );
  });

  it('2. Upload image, submit for approval, verify status transition and history log', async () => {
    // Add image
    await prisma.propertyImage.create({
      data: {
        propertyId: property.id,
        url: 'https://images.unsplash.com/photo-penthouse.jpg',
        isMain: true,
      },
    });

    const submitted = await propertyService.submitForApproval(hostUser.id, property.id);
    expect(submitted.status).toBe(PropertyStatus.PENDING_APPROVAL);

    const history = await propertyService.getPropertyStatusHistory(property.id, hostUser.id, ['HOST']);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].newStatus).toBe(PropertyStatus.PENDING_APPROVAL);
  });

  it('3. Admin approves property and publishes listing', async () => {
    const approved = await adminService.approveProperty(adminUser.id, property.id);
    expect(approved.status).toBe(PropertyStatus.PUBLISHED);

    const history = await propertyService.getPropertyStatusHistory(property.id, adminUser.id, ['ADMIN']);
    expect(history[0].newStatus).toBe(PropertyStatus.PUBLISHED);
  });

  it('4. Host unpublishes and republishes property', async () => {
    const unpublished = await propertyService.unpublishProperty(hostUser.id, property.id);
    expect(unpublished.status).toBe(PropertyStatus.UNPUBLISHED);

    const republished = await propertyService.republishProperty(hostUser.id, property.id);
    expect(republished.status).toBe(PropertyStatus.PUBLISHED);
  });

  it('5. Unauthorized host B cannot request removal of Host A property', async () => {
    await expect(
      propertyService.requestPropertyRemoval(hostUserB.id, property.id, 'Trying to delete competitor property')
    ).rejects.toThrow('You can only request removal for properties you own');
  });

  it('6. Host A submits removal request and Admin approves (Archives property)', async () => {
    const removalReq = await propertyService.requestPropertyRemoval(
      hostUser.id,
      property.id,
      'Relocating to another country'
    );
    expect(removalReq.status).toBe(PropertyStatus.REMOVAL_REQUESTED);
    expect(removalReq.removalReason).toBe('Relocating to another country');

    // Admin checks removal requests queue
    const requests = await adminService.getRemovalRequests();
    expect(requests.properties.some((p: any) => p.id === property.id)).toBe(true);

    // Admin approves removal request -> Property becomes ARCHIVED
    const archived = await adminService.approveRemovalRequest(adminUser.id, property.id);
    expect(archived.status).toBe(PropertyStatus.ARCHIVED);
  });

  it('7. Hard delete safeguard blocks hard deletion when historical bookings exist', async () => {
    // Create a mock historical booking for the property
    const booking = await prisma.booking.create({
      data: {
        bookingNumber: `BK-LC-${Date.now()}`,
        propertyId: property.id,
        guestId: hostUserB.id,
        checkIn: new Date('2026-05-01'),
        checkOut: new Date('2026-05-05'),
        guestsCount: 2,
        nights: 4,
        nightlyPrice: 500,
        subtotal: 2000,
        cleaningFee: 50,
        serviceFee: 30,
        totalPrice: 2080,
        status: 'COMPLETED',
      },
    });

    // Attempting hard delete should throw ValidationError
    await expect(adminService.hardDeleteProperty(adminUser.id, property.id)).rejects.toThrow(
      'Cannot hard delete property'
    );

    // Cleanup booking for final teardown
    await prisma.booking.delete({ where: { id: booking.id } });
  });
});
