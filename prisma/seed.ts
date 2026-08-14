import { PrismaClient, UserRoleType, PropertyType, PropertyStatus, CancellationPolicy, BookingStatus, PaymentStatus, PaymentMethodType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding HoyHel database with production-grade luxury datasets...');

  // 1. Create Roles
  const roles = [
    { name: UserRoleType.ADMIN, description: 'System Administrator' },
    { name: UserRoleType.HOST, description: 'Property Owner/Host' },
    { name: UserRoleType.GUEST, description: 'Property Renter/Guest' },
    { name: UserRoleType.PROPERTY_MANAGER, description: 'Property Manager' },
    { name: UserRoleType.SUPPORT_AGENT, description: 'Customer Support Representative' },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
  }

  // 2. Create Password Hashes
  const defaultHash = await bcrypt.hash('Password123!', 10);
  const elenaHash = await bcrypt.hash('LuxeHavenGuest123!', 10);
  const adminHash = await bcrypt.hash('LuxeHavenAdmin123!', 10);
  const hostHash = await bcrypt.hash('LuxeHavenHost123!', 10);

  // 3. Seed Users
  const devUsers = [
    {
      email: 'guest.elena@luxehaven.com',
      passwordHash: elenaHash,
      firstName: 'Elena',
      lastName: 'Rostova',
      role: UserRoleType.GUEST,
      phone: '+1 (555) 123-4567',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    },
    {
      email: 'guest@example.com',
      passwordHash: defaultHash,
      firstName: 'Marcus',
      lastName: 'Vance',
      role: UserRoleType.GUEST,
      phone: '+1 (555) 000-0003',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    },
    {
      email: 'guest.sophia@luxehaven.com',
      passwordHash: defaultHash,
      firstName: 'Sophia',
      lastName: 'Chen',
      role: UserRoleType.GUEST,
      phone: '+1 (555) 321-7654',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    },
    {
      email: 'tcusub777@gmail.com',
      passwordHash: defaultHash,
      firstName: 'Tijabo',
      lastName: 'Cusub',
      role: UserRoleType.GUEST,
      phone: '+254 700 123456',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    {
      email: 'khalil.wali@luxehaven.com',
      passwordHash: hostHash,
      firstName: 'Khalil',
      lastName: 'Wali',
      role: UserRoleType.HOST,
      phone: '+254 711 987654',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    },
    {
      email: 'admin@luxehaven.com',
      passwordHash: adminHash,
      firstName: 'Alexander',
      lastName: 'Vanderbilt',
      role: UserRoleType.ADMIN,
      phone: '+1 (555) 000-0001',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    },
    {
      email: 'admin@example.com',
      passwordHash: adminHash,
      firstName: 'Alexander',
      lastName: 'Admin',
      role: UserRoleType.ADMIN,
      phone: '+1 (555) 000-0001',
    },
    {
      email: 'host.sarah@luxehaven.com',
      passwordHash: hostHash,
      firstName: 'Sarah',
      lastName: 'Jenkins',
      role: UserRoleType.HOST,
      phone: '+1 (555) 888-9999',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    {
      email: 'host@example.com',
      passwordHash: hostHash,
      firstName: 'David',
      lastName: 'Sterling',
      role: UserRoleType.HOST,
      phone: '+1 (555) 777-6666',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    },
  ];

  const userMap: Record<string, string> = {};

  for (const u of devUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: u.passwordHash,
        role: u.role,
        isEmailVerified: true,
        isActive: true,
        avatarUrl: u.avatarUrl,
      },
      create: {
        email: u.email,
        passwordHash: u.passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        phone: u.phone,
        role: u.role,
        isEmailVerified: true,
        isActive: true,
        avatarUrl: u.avatarUrl,
      },
    });

    userMap[u.email] = user.id;

    const roleRecord = await prisma.role.findUnique({ where: { name: u.role } });
    if (roleRecord) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: roleRecord.id } },
        update: {},
        create: { userId: user.id, roleId: roleRecord.id },
      });
    }
  }

  console.log('✅ Users seeded successfully.');

  // 4. Create Amenities
  const amenitiesList = [
    { name: 'High-Speed Wi-Fi', category: 'Connectivity', icon: 'wifi' },
    { name: 'Private Swimming Pool', category: 'Outdoors', icon: 'waves' },
    { name: 'Air Conditioning', category: 'Climate', icon: 'snowflake' },
    { name: 'Chef Kitchen', category: 'Food & Dining', icon: 'utensils' },
    { name: 'Ocean View', category: 'Views', icon: 'sun' },
    { name: 'Dedicated Workspace', category: 'Work', icon: 'laptop' },
    { name: 'Hot Tub / Jacuzzi', category: 'Wellness', icon: 'bath' },
    { name: 'EV Charger', category: 'Parking', icon: 'zap' },
    { name: '24/7 Armed Security', category: 'Security', icon: 'shield' },
    { name: 'Private Heliport', category: 'Luxury', icon: 'plane' },
  ];

  const amenityIds: Record<string, string> = {};
  for (const item of amenitiesList) {
    const a = await prisma.amenity.upsert({
      where: { name: item.name },
      update: {},
      create: item,
    });
    amenityIds[item.name] = a.id;
  }

  const sarahId = userMap['host.sarah@luxehaven.com'];
  const davidId = userMap['host@example.com'];
  const khalilId = userMap['khalil.wali@luxehaven.com'];
  const elenaId = userMap['guest.elena@luxehaven.com'];
  const marcusId = userMap['guest@example.com'];
  const tijaboId = userMap['tcusub777@gmail.com'];

  // 5. Seed 10 Luxury Published Properties
  const propertiesData = [
    {
      id: 'malibu-obsidian-villa',
      hostId: sarahId,
      title: 'The Obsidian Cliffside Villa & Infinity Pool',
      description: 'Perched on the dramatically scenic sea cliffs of Malibu, this architectural masterpiece features 360-degree ocean views, floor-to-ceiling glass walls, a heated infinity edge pool, and an expansive teak lounge with outdoor fire pit.',
      propertyType: PropertyType.VILLA,
      status: PropertyStatus.PUBLISHED,
      cancellationPolicy: CancellationPolicy.STRICT,
      basePrice: 1250,
      cleaningFee: 250,
      serviceFee: 125,
      securityDeposit: 1000,
      bedrooms: 5,
      bathrooms: 5.5,
      beds: 6,
      maxGuests: 10,
      address: '32100 Pacific Coast Highway',
      city: 'Malibu',
      state: 'California',
      country: 'United States',
      latitude: 34.0259,
      longitude: -118.7798,
      isFeatured: true,
      averageRating: 4.95,
      reviewCount: 24,
      images: [
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      ],
    },
    {
      id: 'karen-sanctuary-estate',
      hostId: davidId,
      title: 'Karen Sanctuary Luxury Estate & Lush Gardens',
      description: 'An ultra-exclusive 6-acre private estate located in the leafy suburb of Karen, Nairobi. Features bespoke mahogany finishes, heated indoor swimming pool, private tennis court, organic chef garden, and 24-hour guarded security.',
      propertyType: PropertyType.HOUSE,
      status: PropertyStatus.PUBLISHED,
      cancellationPolicy: CancellationPolicy.MODERATE,
      basePrice: 850,
      cleaningFee: 150,
      serviceFee: 85,
      securityDeposit: 500,
      bedrooms: 6,
      bathrooms: 6,
      beds: 8,
      maxGuests: 12,
      address: '45 Mbagathi Ridge, Karen',
      city: 'Nairobi',
      state: 'Nairobi County',
      country: 'Kenya',
      latitude: -1.3197,
      longitude: 36.7065,
      isFeatured: true,
      averageRating: 4.98,
      reviewCount: 18,
      images: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
      ],
    },
    {
      id: 'mombasa-ocean-view-villa',
      hostId: khalilId,
      title: 'Modern Ocean View Villa in Mombasa',
      description: 'Stunning modern luxury villa overlooking the ocean in Mombasa with private pool and gardens.',
      propertyType: PropertyType.VILLA,
      status: PropertyStatus.PUBLISHED,
      cancellationPolicy: CancellationPolicy.FLEXIBLE,
      basePrice: 300,
      cleaningFee: 80,
      serviceFee: 30,
      securityDeposit: 200,
      bedrooms: 3,
      bathrooms: 3,
      beds: 4,
      maxGuests: 6,
      address: '25 Beach Drive, Nyali',
      city: 'Mombasa',
      state: 'Coast',
      country: 'Kenya',
      latitude: -4.0435,
      longitude: 39.6983,
      isFeatured: true,
      averageRating: 4.95,
      reviewCount: 15,
      images: [
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
      ],
    },
    {
      id: 'nyali-coral-beach-villa',
      hostId: sarahId,
      title: 'Nyali Beachfront Coral Villa & Private Pier',
      description: 'Steps away from white coral sands of Nyali Beach in Mombasa. Offers panoramic Indian Ocean sunsets, private infinity pool, authentic coastal Swahili architecture, and dedicated full-time butler and private chef.',
      propertyType: PropertyType.VILLA,
      status: PropertyStatus.PUBLISHED,
      cancellationPolicy: CancellationPolicy.FLEXIBLE,
      basePrice: 650,
      cleaningFee: 120,
      serviceFee: 65,
      securityDeposit: 400,
      bedrooms: 4,
      bathrooms: 4.5,
      beds: 5,
      maxGuests: 8,
      address: '12 Beach Road, Nyali',
      city: 'Mombasa',
      state: 'Coast',
      country: 'Kenya',
      latitude: -4.0435,
      longitude: 39.6983,
      isFeatured: true,
      averageRating: 4.92,
      reviewCount: 31,
      images: [
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
      ],
    },
    {
      id: 'diani-palms-resort-suite',
      hostId: davidId,
      title: 'Diani Palms Oceanfront Luxury Villa',
      description: 'Nestled amidst lush coconut palms along world-renowned Diani Beach. Private plunge pool, direct turquoise water access, outdoor rain showers, and high-speed satellite Wi-Fi.',
      propertyType: PropertyType.VILLA,
      status: PropertyStatus.PUBLISHED,
      cancellationPolicy: CancellationPolicy.MODERATE,
      basePrice: 550,
      cleaningFee: 100,
      serviceFee: 55,
      securityDeposit: 300,
      bedrooms: 3,
      bathrooms: 3,
      beds: 4,
      maxGuests: 6,
      address: 'Ocean Drive, Diani Beach',
      city: 'Diani',
      state: 'Kwale County',
      country: 'Kenya',
      latitude: -4.2797,
      longitude: 39.5947,
      isFeatured: false,
      averageRating: 4.89,
      reviewCount: 14,
      images: [
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      ],
    },
    {
      id: 'manhattan-sky-penthouse',
      hostId: sarahId,
      title: 'Manhattan Sky Penthouse with Private Terrace',
      description: 'Float high above Midtown Manhattan with 360-degree skyline views of the Empire State Building and East River. Marble kitchen, wine cellar, private elevator, and 2,000 sq ft wrap-around terrace.',
      propertyType: PropertyType.APARTMENT,
      status: PropertyStatus.PUBLISHED,
      cancellationPolicy: CancellationPolicy.STRICT,
      basePrice: 950,
      cleaningFee: 200,
      serviceFee: 95,
      securityDeposit: 750,
      bedrooms: 3,
      bathrooms: 3,
      beds: 3,
      maxGuests: 6,
      address: '432 Park Avenue, Suite 72',
      city: 'New York',
      state: 'New York',
      country: 'United States',
      latitude: 40.7615,
      longitude: -73.9712,
      isFeatured: true,
      averageRating: 4.88,
      reviewCount: 19,
      images: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      ],
    },
    {
      id: 'palm-jumeirah-sky-villa',
      hostId: davidId,
      title: 'Palm Jumeirah Sky Villa & Private Beach Access',
      description: 'Exclusive beachfront residence on Dubai’s iconic Palm Jumeirah. Includes private infinity pool, custom Italian leather furnishings, private yacht berth, and 24-hour concierge service.',
      propertyType: PropertyType.VILLA,
      status: PropertyStatus.PUBLISHED,
      cancellationPolicy: CancellationPolicy.STRICT,
      basePrice: 1500,
      cleaningFee: 300,
      serviceFee: 150,
      securityDeposit: 1200,
      bedrooms: 5,
      bathrooms: 6,
      beds: 6,
      maxGuests: 10,
      address: 'Frond M, Palm Jumeirah',
      city: 'Dubai',
      state: 'Dubai',
      country: 'United Arab Emirates',
      latitude: 25.1124,
      longitude: 55.139,
      isFeatured: true,
      averageRating: 4.99,
      reviewCount: 42,
      images: [
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
      ],
    },
    {
      id: 'london-mayfair-townhouse',
      hostId: sarahId,
      title: 'Royal Mayfair Heritage Townhouse',
      description: 'Historic Georgian townhouse in central Mayfair, London. Meticulously restored with period fireplaces, private landscaped courtyard, underground wine cellar, and private butler service.',
      propertyType: PropertyType.HOUSE,
      status: PropertyStatus.PUBLISHED,
      cancellationPolicy: CancellationPolicy.MODERATE,
      basePrice: 1100,
      cleaningFee: 220,
      serviceFee: 110,
      securityDeposit: 800,
      bedrooms: 4,
      bathrooms: 4,
      beds: 5,
      maxGuests: 8,
      address: '14 Mount Street, Mayfair',
      city: 'London',
      state: 'Greater London',
      country: 'United Kingdom',
      latitude: 51.509,
      longitude: -0.1504,
      isFeatured: false,
      averageRating: 4.91,
      reviewCount: 16,
      images: [
        'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
      ],
    },
    {
      id: 'paris-marais-loft',
      hostId: davidId,
      title: 'Le Marais Architectural Designer Loft',
      description: 'Chic 17th-century Parisian loft in Le Marais. Exposed timber beams, herringbone parquet floors, custom art installations, designer kitchen, and private rooftop views of Notre-Dame.',
      propertyType: PropertyType.APARTMENT,
      status: PropertyStatus.PUBLISHED,
      cancellationPolicy: CancellationPolicy.FLEXIBLE,
      basePrice: 750,
      cleaningFee: 140,
      serviceFee: 75,
      securityDeposit: 500,
      bedrooms: 2,
      bathrooms: 2,
      beds: 2,
      maxGuests: 4,
      address: '28 Rue des Francs-Bourgeois',
      city: 'Paris',
      state: 'Île-de-France',
      country: 'France',
      latitude: 48.8575,
      longitude: 2.3596,
      isFeatured: false,
      averageRating: 4.87,
      reviewCount: 28,
      images: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      ],
    },
    {
      id: 'aspen-alpine-chalet',
      hostId: sarahId,
      title: 'Alpine Sanctuary Chalet & Heated Sauna',
      description: 'Ski-in/ski-out luxury timber chalet in Aspen, Colorado. Features floor-to-ceiling stone fireplace, outdoor hot tub overlooking snow-capped peaks, private heated driveway, and indoor cedar sauna.',
      propertyType: PropertyType.HOUSE,
      status: PropertyStatus.PUBLISHED,
      cancellationPolicy: CancellationPolicy.STRICT,
      basePrice: 1400,
      cleaningFee: 250,
      serviceFee: 140,
      securityDeposit: 1000,
      bedrooms: 5,
      bathrooms: 5,
      beds: 7,
      maxGuests: 10,
      address: '750 Red Mountain Road',
      city: 'Aspen',
      state: 'Colorado',
      country: 'United States',
      latitude: 39.1911,
      longitude: -106.8175,
      isFeatured: true,
      averageRating: 4.97,
      reviewCount: 35,
      images: [
        'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      ],
    },
    {
      id: 'kisumu-sunset-bay-lodge',
      hostId: davidId,
      title: 'Kisumu Lake Victoria Executive Lodge',
      description: 'Lakeside retreat offering mesmerizing sunsets over Lake Victoria. Features teak deck, private boat dock, infinity swimming pool, solar power system, and indigenous bird sanctuary gardens.',
      propertyType: PropertyType.HOUSE,
      status: PropertyStatus.PUBLISHED,
      cancellationPolicy: CancellationPolicy.MODERATE,
      basePrice: 420,
      cleaningFee: 80,
      serviceFee: 42,
      securityDeposit: 250,
      bedrooms: 4,
      bathrooms: 4,
      beds: 5,
      maxGuests: 8,
      address: '15 Riat Hills Boulevard',
      city: 'Kisumu',
      state: 'Kisumu County',
      country: 'Kenya',
      latitude: -0.0917,
      longitude: 34.768,
      isFeatured: false,
      averageRating: 4.85,
      reviewCount: 12,
      images: [
        'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      ],
    },
  ];

  for (const item of propertiesData) {
    const { images, ...fields } = item;
    const property = await prisma.property.upsert({
      where: { id: fields.id },
      update: {
        ...fields,
      },
      create: {
        ...fields,
      },
    });

    // Create Images
    await prisma.propertyImage.deleteMany({ where: { propertyId: property.id } });
    for (let i = 0; i < images.length; i++) {
      await prisma.propertyImage.create({
        data: {
          propertyId: property.id,
          url: images[i],
          isMain: i === 0,
          sortOrder: i,
        },
      });
    }

    // Attach Key Amenities
    await prisma.propertyAmenity.deleteMany({ where: { propertyId: property.id } });
    const keys = Object.keys(amenityIds);
    for (let idx = 0; idx < Math.min(6, keys.length); idx++) {
      await prisma.propertyAmenity.create({
        data: {
          propertyId: property.id,
          amenityId: amenityIds[keys[idx]],
        },
      });
    }
  }

  console.log(`✅ Seeded ${propertiesData.length} published luxury properties.`);

  // 6. Seed Favorites for Elena
  if (elenaId) {
    await prisma.favorite.deleteMany({ where: { userId: elenaId } });
    await prisma.favorite.createMany({
      data: [
        { userId: elenaId, propertyId: 'karen-sanctuary-estate' },
        { userId: elenaId, propertyId: 'malibu-obsidian-villa' },
        { userId: elenaId, propertyId: 'palm-jumeirah-sky-villa' },
      ],
    });
    console.log('✅ Elena favorites seeded.');
  }

  // 7. Seed Bookings & Payments for Elena, Marcus, and Sophia
  const sophiaId = userMap['guest.sophia@luxehaven.com'];

  await prisma.booking.deleteMany({});

  if (elenaId) {
    // Elena Booking 1: Future CONFIRMED stay in Karen, Nairobi
    const checkIn1 = new Date();
    checkIn1.setDate(checkIn1.getDate() + 14);
    const checkOut1 = new Date();
    checkOut1.setDate(checkOut1.getDate() + 19);

    await prisma.booking.create({
      data: {
        bookingNumber: 'LH-2026-99481',
        propertyId: 'karen-sanctuary-estate',
        guestId: elenaId,
        checkIn: checkIn1,
        checkOut: checkOut1,
        guestsCount: 4,
        nights: 5,
        nightlyPrice: 850,
        subtotal: 4250,
        cleaningFee: 150,
        serviceFee: 425,
        taxes: 340,
        discount: 0,
        totalPrice: 5165,
        status: BookingStatus.CONFIRMED,
        specialRequests: 'Late arrival requested around 8 PM. Airport transfer setup needed.',
        payment: {
          create: {
            userId: elenaId,
            amount: 5165,
            currency: 'USD',
            status: PaymentStatus.SUCCESS,
            paymentMethod: PaymentMethodType.CREDIT_CARD,
            transactionId: 'TXN-LH-2026-881',
          },
        },
      },
    });

    // Elena Booking 2: Future CONFIRMED stay in Diani Beach
    const checkIn2 = new Date();
    checkIn2.setDate(checkIn2.getDate() + 30);
    const checkOut2 = new Date();
    checkOut2.setDate(checkOut2.getDate() + 35);

    await prisma.booking.create({
      data: {
        bookingNumber: 'LH-2026-55214',
        propertyId: 'diani-palms-resort-suite',
        guestId: elenaId,
        checkIn: checkIn2,
        checkOut: checkOut2,
        guestsCount: 2,
        nights: 5,
        nightlyPrice: 550,
        subtotal: 2750,
        cleaningFee: 100,
        serviceFee: 275,
        taxes: 220,
        discount: 0,
        totalPrice: 3345,
        status: BookingStatus.CONFIRMED,
        specialRequests: 'Honeymoon arrangement with oceanfront dinner.',
        payment: {
          create: {
            userId: elenaId,
            amount: 3345,
            currency: 'USD',
            status: PaymentStatus.SUCCESS,
            paymentMethod: PaymentMethodType.CREDIT_CARD,
            transactionId: 'TXN-LH-2026-552',
          },
        },
      },
    });

    // Elena Booking 3: Past COMPLETED stay in Malibu
    const checkIn3 = new Date();
    checkIn3.setDate(checkIn3.getDate() - 30);
    const checkOut3 = new Date();
    checkOut3.setDate(checkOut3.getDate() - 25);

    await prisma.booking.create({
      data: {
        bookingNumber: 'LH-2026-77319',
        propertyId: 'malibu-obsidian-villa',
        guestId: elenaId,
        checkIn: checkIn3,
        checkOut: checkOut3,
        guestsCount: 2,
        nights: 5,
        nightlyPrice: 1250,
        subtotal: 6250,
        cleaningFee: 250,
        serviceFee: 625,
        taxes: 500,
        discount: 0,
        totalPrice: 7625,
        status: BookingStatus.COMPLETED,
        payment: {
          create: {
            userId: elenaId,
            amount: 7625,
            currency: 'USD',
            status: PaymentStatus.SUCCESS,
            paymentMethod: PaymentMethodType.CREDIT_CARD,
            transactionId: 'TXN-LH-2026-119',
          },
        },
      },
    });
  }

  // Booking 4: Marcus PENDING reservation
  if (marcusId) {
    const checkIn4 = new Date();
    checkIn4.setDate(checkIn4.getDate() + 10);
    const checkOut4 = new Date();
    checkOut4.setDate(checkOut4.getDate() + 13);

    await prisma.booking.create({
      data: {
        bookingNumber: 'LH-2026-10492',
        propertyId: 'manhattan-sky-penthouse',
        guestId: marcusId,
        checkIn: checkIn4,
        checkOut: checkOut4,
        guestsCount: 3,
        nights: 3,
        nightlyPrice: 950,
        subtotal: 2850,
        cleaningFee: 200,
        serviceFee: 285,
        taxes: 228,
        discount: 0,
        totalPrice: 3563,
        status: BookingStatus.PENDING,
        payment: {
          create: {
            userId: marcusId,
            amount: 3563,
            currency: 'USD',
            status: PaymentStatus.PENDING,
            paymentMethod: PaymentMethodType.CREDIT_CARD,
            transactionId: 'TXN-LH-2026-492',
          },
        },
      },
    });
  }

  // Booking 5: Sophia CANCELLED/REFUNDED reservation
  if (sophiaId) {
    const checkIn5 = new Date();
    checkIn5.setDate(checkIn5.getDate() + 45);
    const checkOut5 = new Date();
    checkOut5.setDate(checkOut5.getDate() + 50);

    const b5 = await prisma.booking.create({
      data: {
        bookingNumber: 'LH-2026-33910',
        propertyId: 'aspen-alpine-chalet',
        guestId: sophiaId,
        checkIn: checkIn5,
        checkOut: checkOut5,
        guestsCount: 5,
        nights: 5,
        nightlyPrice: 1400,
        subtotal: 7000,
        cleaningFee: 250,
        serviceFee: 700,
        taxes: 560,
        discount: 0,
        totalPrice: 8510,
        status: BookingStatus.CANCELLED,
        cancellationReason: 'Travel plans rescheduled by guest',
        cancelledAt: new Date(),
        refundedAmount: 8510,
        payment: {
          create: {
            userId: sophiaId,
            amount: 8510,
            currency: 'USD',
            status: PaymentStatus.REFUNDED,
            paymentMethod: PaymentMethodType.CREDIT_CARD,
            transactionId: 'TXN-LH-2026-910',
          },
        },
      },
    });

    const p5 = await prisma.payment.findUnique({ where: { bookingId: b5.id } });
    if (p5) {
      await prisma.refund.create({
        data: {
          bookingId: b5.id,
          paymentId: p5.id,
          amount: 8510,
          status: 'COMPLETED',
          reason: 'Full refund upon flexible cancellation',
        },
      });
    }
  }

  // Booking 6: Tijabo Cusub CONFIRMED reservation LH-2026-44021
  if (tijaboId) {
    await prisma.booking.create({
      data: {
        bookingNumber: 'LH-2026-44021',
        propertyId: 'mombasa-ocean-view-villa',
        guestId: tijaboId,
        checkIn: new Date('2026-08-12'),
        checkOut: new Date('2026-08-16'),
        guestsCount: 2,
        nights: 4,
        nightlyPrice: 300,
        subtotal: 1200,
        cleaningFee: 80,
        serviceFee: 120,
        taxes: 54.32,
        discount: 0,
        totalPrice: 1454.32,
        status: BookingStatus.CONFIRMED,
        specialRequests: 'Ocean view room requested.',
        payment: {
          create: {
            userId: tijaboId,
            amount: 1454.32,
            currency: 'USD',
            status: PaymentStatus.SUCCESS,
            paymentMethod: PaymentMethodType.CREDIT_CARD,
            transactionId: 'TXN-LH-2026-44021',
          },
        },
      },
    });
  }

  console.log('✅ Elena 3 bookings & multi-status dataset seeded.');

  // 8. Seed Audit Logs
  await prisma.auditLog.deleteMany({});
  await prisma.auditLog.createMany({
    data: [
      {
        userId: elenaId,
        action: 'USER_LOGIN',
        resource: 'Auth',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 Chrome/126.0.0.0',
      },
      {
        userId: elenaId,
        action: 'BOOKING_CREATE',
        resource: 'Booking',
        resourceId: 'LH-2026-99481',
        ipAddress: '127.0.0.1',
      },
      {
        userId: sarahId,
        action: 'PROPERTY_PUBLISH',
        resource: 'Property',
        resourceId: 'malibu-obsidian-villa',
        ipAddress: '127.0.0.1',
      },
    ],
  });

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
