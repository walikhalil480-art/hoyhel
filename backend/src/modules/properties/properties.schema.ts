import { z } from 'zod';
import { PropertyType, PropertyStatus, CancellationPolicy } from '@prisma/client';

export const createPropertySchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    propertyType: z.nativeEnum(PropertyType),
    cancellationPolicy: z.nativeEnum(CancellationPolicy).optional().default(CancellationPolicy.MODERATE),
    basePrice: z.number().positive('Base price must be greater than 0'),
    cleaningFee: z.number().min(0).optional().default(0),
    serviceFee: z.number().min(0).optional().default(0),
    securityDeposit: z.number().min(0).optional().default(0),
    bedrooms: z.number().int().min(1).default(1),
    bathrooms: z.number().min(0.5).default(1),
    beds: z.number().int().min(1).default(1),
    maxGuests: z.number().int().min(1).default(1),
    squareMeters: z.number().optional(),
    address: z.string().min(3, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().optional(),
    country: z.string().min(1, 'Country is required'),
    zipCode: z.string().optional(),
    latitude: z.number(),
    longitude: z.number(),
    amenityIds: z.array(z.string()).optional().default([]),
  }),
});

export const updatePropertySchema = z.object({
  body: createPropertySchema.shape.body.partial(),
});

export const searchPropertySchema = z.object({
  query: z.object({
    city: z.string().optional(),
    country: z.string().optional(),
    search: z.string().optional(),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    guests: z.string().transform(Number).optional(),
    bedrooms: z.string().transform(Number).optional(),
    bathrooms: z.string().transform(Number).optional(),
    propertyType: z.nativeEnum(PropertyType).optional(),
    minPrice: z.string().transform(Number).optional(),
    maxPrice: z.string().transform(Number).optional(),
    minRating: z.string().transform(Number).optional(),
    amenities: z.string().optional(), // Comma-separated amenity IDs
    page: z.string().transform(Number).optional().default('1'),
    limit: z.string().transform(Number).optional().default('12'),
    sortBy: z.enum(['price_asc', 'price_desc', 'rating_desc', 'created_desc']).optional().default('created_desc'),
  }),
});
