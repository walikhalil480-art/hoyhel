import { Request, Response } from 'express';
import { PropertyService } from './properties.service';
import { asyncHandler } from '../../utils/asyncHandler';

const propertyService = new PropertyService();

export const searchPropertiesController = asyncHandler(async (req: Request, res: Response) => {
  const { amenities, guests, bedrooms, bathrooms, minPrice, maxPrice, minRating, page, limit, ...rest } = req.query as any;
  const parsedAmenities = amenities ? (amenities as string).split(',') : undefined;

  const result = await propertyService.searchProperties({
    ...rest,
    guests: guests ? Number(guests) : undefined,
    bedrooms: bedrooms ? Number(bedrooms) : undefined,
    bathrooms: bathrooms ? Number(bathrooms) : undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minRating: minRating ? Number(minRating) : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    amenities: parsedAmenities,
  });

  return res.json({
    success: true,
    data: result.properties,
    meta: result.meta,
  });
});

export const getPropertyByIdController = asyncHandler(async (req: Request, res: Response) => {
  const property = await propertyService.getPropertyById(req.params.id);
  return res.json({
    success: true,
    data: property,
  });
});

export const createPropertyController = asyncHandler(async (req: Request, res: Response) => {
  const property = await propertyService.createProperty(req.user!.userId, req.body);
  return res.status(201).json({
    success: true,
    message: 'Property created and submitted for review',
    data: property,
  });
});

export const updatePropertyController = asyncHandler(async (req: Request, res: Response) => {
  const updated = await propertyService.updateProperty(
    req.user!.userId,
    req.params.id,
    req.body,
    req.user!.roles
  );
  return res.json({
    success: true,
    message: 'Property updated successfully',
    data: updated,
  });
});

export const uploadPropertyImageController = asyncHandler(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const singleFile = req.file;

  if ((!files || files.length === 0) && !singleFile) {
    return res.status(400).json({ success: false, message: 'At least one image file (JPG, PNG, WEBP) is required' });
  }

  if (files && files.length > 0) {
    const mainIndex = Number(req.body.mainIndex) || 0;
    const images = await propertyService.uploadPropertyImages(
      req.user!.userId,
      req.params.id,
      files,
      mainIndex
    );
    return res.status(201).json({
      success: true,
      message: `${images.length} images uploaded successfully`,
      data: images,
    });
  }

  const isMain = req.body.isMain === 'true' || req.body.isMain === true;
  const image = await propertyService.uploadPropertyImage(
    req.user!.userId,
    req.params.id,
    singleFile!,
    isMain
  );

  return res.status(201).json({
    success: true,
    message: 'Image uploaded successfully',
    data: image,
  });
});

export const setCoverImageController = asyncHandler(async (req: Request, res: Response) => {
  const result = await propertyService.setCoverImage(
    req.user!.userId,
    req.params.id,
    req.params.imageId
  );
  return res.json(result);
});

export const deletePropertyImageController = asyncHandler(async (req: Request, res: Response) => {
  await propertyService.deletePropertyImage(req.user!.userId, req.params.id, req.params.imageId);
  return res.json({
    success: true,
    message: 'Image deleted successfully',
  });
});

export const submitApprovalController = asyncHandler(async (req: Request, res: Response) => {
  const property = await propertyService.submitForApproval(req.user!.userId, req.params.id);
  return res.json({
    success: true,
    message: 'Property submitted for Admin approval',
    data: property,
  });
});

export const unpublishPropertyController = asyncHandler(async (req: Request, res: Response) => {
  const property = await propertyService.unpublishProperty(req.user!.userId, req.params.id);
  return res.json({
    success: true,
    message: 'Property unpublished successfully',
    data: property,
  });
});

export const republishPropertyController = asyncHandler(async (req: Request, res: Response) => {
  const property = await propertyService.republishProperty(req.user!.userId, req.params.id);
  return res.json({
    success: true,
    message: 'Property republished successfully',
    data: property,
  });
});

export const requestRemovalController = asyncHandler(async (req: Request, res: Response) => {
  const property = await propertyService.requestPropertyRemoval(req.user!.userId, req.params.id, req.body.reason);
  return res.json({
    success: true,
    message: 'Property removal request submitted to Admin',
    data: property,
  });
});

export const cancelRemovalController = asyncHandler(async (req: Request, res: Response) => {
  const property = await propertyService.cancelRemovalRequest(req.user!.userId, req.params.id);
  return res.json({
    success: true,
    message: 'Removal request cancelled',
    data: property,
  });
});

export const getStatusHistoryController = asyncHandler(async (req: Request, res: Response) => {
  const history = await propertyService.getPropertyStatusHistory(req.params.id, req.user!.userId, req.user!.roles);
  return res.json({
    success: true,
    data: history,
  });
});
