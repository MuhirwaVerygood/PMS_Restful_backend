import { Request, Response } from 'express';
import prisma from '../prisma/prisma-client';
import ServerResponse from '../utils/ServerResponse';
import { BulkSlotDto, SlotDto, UpdateSlotDto } from '../dtos/parking.dto';
import { logAction } from '../prisma/prisma-client';
import { Prisma, VehicleType, Size } from '@prisma/client';

export class ParkingController {
  static async createBulkSlots(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { count, prefix, vehicleType, size, location } = req.body as BulkSlotDto;
    const slots = Array.from({ length: count }, (_, i) => ({
      slotNumber: `${prefix}-${i + 1}`,
      vehicleType,
      size,
      location,
      status: 'AVAILABLE' as const,
    }));
    try {
      const createdSlots = await prisma.parkingSlot.createMany({ data: slots });
      await logAction(userId, `Created ${count} parking slots`);
      return ServerResponse.created(res, createdSlots);
    } catch (error) {
      return ServerResponse.badRequest(res, 'Failed to create slots, possible duplicate slot numbers');
    }
  }

  static async createSlot(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { slotNumber, vehicleType, size, location } = req.body as SlotDto;
    try {
      const slot = await prisma.parkingSlot.create({
        data: { slotNumber, vehicleType, size, location, status: 'AVAILABLE' },
      });
      await logAction(userId, 'Parking slot created');
      return ServerResponse.created(res, slot);
    } catch (error) {
      return ServerResponse.badRequest(res, 'Slot number already exists');
    }
  }

  static async updateSlot(req: Request, res: Response) {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { slotNumber, vehicleType, size, location } = req.body as UpdateSlotDto;
    const slot = await prisma.parkingSlot.findUnique({ where: { id } });
    if (!slot) {
      return ServerResponse.notFound(res, 'Slot not found');
    }
    try {
      const updatedSlot = await prisma.parkingSlot.update({
        where: { id },
        data: { slotNumber, vehicleType, size, location },
      });
      await logAction(userId, 'Parking slot updated');
      return ServerResponse.success(res, updatedSlot);
    } catch (error) {
      return ServerResponse.badRequest(res, 'Slot number already exists');
    }
  }

  static async deleteSlot(req: Request, res: Response) {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const slot = await prisma.parkingSlot.findUnique({ where: { id } });
    if (!slot) {
      return ServerResponse.notFound(res, 'Slot not found');
    }
    await prisma.parkingSlot.delete({ where: { id } });
    await logAction(userId, 'Parking slot deleted');
    return ServerResponse.success(res, null, 'Parking slot deleted');
  }

  static async getSlots(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { page = '1', limit = '10', search, onlyAvailable = 'false' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const isAdmin = (await prisma.user.findUnique({ where: { id: userId } }))?.role === 'ADMIN';

    const where: Prisma.ParkingSlotWhereInput = {};
    if (onlyAvailable === 'true' && !isAdmin) {
      where.status = 'AVAILABLE';
    }
    if (search) {
      const searchStr = search as string;
      const isVehicleType = Object.values(VehicleType).includes(searchStr.toUpperCase() as VehicleType);
      const isSize = Object.values(Size).includes(searchStr.toUpperCase() as Size);
      where.OR = [
        { slotNumber: { contains: searchStr, mode: 'insensitive' } },
        ...(isVehicleType ? [{ vehicleType: searchStr.toUpperCase() as VehicleType }] : []),
        ...(isSize ? [{ size: searchStr.toUpperCase() as Size }] : []),
      ];
    }

    try {
      const [slots, total] = await Promise.all([
        prisma.parkingSlot.findMany({
          where,
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
        prisma.parkingSlot.count({ where }),
      ]);
      await logAction(userId, 'Parking slots listed');
      return ServerResponse.success(res, {
        items: slots,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      return ServerResponse.error(res, 'Failed to fetch slots');
    }
  }

  static async getSlotById(req: Request, res: Response) {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const slot = await prisma.parkingSlot.findUnique({ where: { id } });
    if (!slot) {
      return ServerResponse.notFound(res, 'Slot not found');
    }
    const isAdmin = (await prisma.user.findUnique({ where: { id: userId } }))?.role === 'ADMIN';
    if (!isAdmin && slot.status !== 'AVAILABLE') {
      return ServerResponse.forbidden(res, 'You can only view available slots');
    }
    await logAction(userId, 'Parking slot viewed');
    return ServerResponse.success(res, slot);
  }
}