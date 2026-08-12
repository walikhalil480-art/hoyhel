import { prisma } from '../../config/database';
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth.middleware';

export class FavoriteService {
  async toggleFavorite(userId: string, propertyId: string) {
    const existing = await prisma.favorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    await prisma.favorite.create({
      data: { userId, propertyId },
    });

    return { favorited: true };
  }

  async getUserFavorites(userId: string) {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        property: {
          include: {
            images: { take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((f) => f.property);
  }
}

const router = Router();
const favoriteService = new FavoriteService();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const properties = await favoriteService.getUserFavorites(req.user!.userId);
    return res.json({ success: true, data: properties });
  })
);

router.post(
  '/:propertyId/toggle',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const result = await favoriteService.toggleFavorite(req.user!.userId, req.params.propertyId);
    return res.json({ success: true, data: result });
  })
);

router.delete(
  '/:propertyId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.favorite.deleteMany({
      where: { userId: req.user!.userId, propertyId: req.params.propertyId },
    });
    return res.json({ success: true, message: 'Property removed from favorites' });
  })
);

export default router;
