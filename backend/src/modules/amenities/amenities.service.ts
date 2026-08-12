import { prisma } from '../../config/database';

export class AmenityService {
  async getAllAmenities() {
    return prisma.amenity.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async createAmenity(name: string, category?: string, icon?: string) {
    return prisma.amenity.create({
      data: { name, category: category || 'General', icon: icon || null },
    });
  }
}
