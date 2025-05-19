import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import { PrismaClient, ParkingSlot as PrismaParkingSlot, Prisma, Location, VehicleType } from '@prisma/client';
import { BulkSlotDto, UpdateSlotDto, GetSlotsQueryDto, CreateSlotDto } from '../dtos/parking.dto';
import ServerResponse from '../utils/ServerResponse';

const prisma = new PrismaClient();

// Type for ParkingSlot with included slotRequests
type SlotWithRequests = Prisma.ParkingSlotGetPayload<{
  include: {
    slotRequests: {
      select: {
        userId: true;
        vehicle: { select: { id: true; plateNumber: true } };
      };
    };
  };
}>;

interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export class ParkingSlotController {

static async createSlot(req: Request, res: Response) {
  try {
    if (!(req as any).user || (req as any).user.role !== 'ADMIN') {
      return ServerResponse.forbidden(res, 'Forbidden');
    }

    const data = plainToInstance(CreateSlotDto, (req as any).body);
    const errors = await validate(data);
    if (errors.length > 0) {
      const message = errors.map((error) => Object.values(error.constraints || {})).join(', ');
      return ServerResponse.badRequest(res, message);
    }

    try {
      const slot = await prisma.parkingSlot.create({
        data: {
          slotNumber: data.slotNumber,
          vehicleType: data.vehicleType,
          size: data.size,
          location: data.location,
          status: data.status || 'AVAILABLE',
        },
      });
      return ServerResponse.created(res, slot);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return ServerResponse.badRequest(res, `Slot number ${data.slotNumber} already exists`);
      }
      throw error;
    }
  } catch (error: any) {
    return ServerResponse.error(res, error.message || 'Internal Server Error');
  }
}


// The existing createSlots method already handles bulk creation, so no changes needed there


  static async getSlots(req: Request, res: Response) {
    try {
      if (!(req as any).user) {
        return ServerResponse.unauthorized(res, 'Unauthorized');
      }

      const query = plainToInstance(GetSlotsQueryDto, (req as any).query);
      const errors = await validate(query);
      if (errors.length > 0) {
        const message = errors.map((error) => Object.values(error.constraints || {})).join(', ');
        return ServerResponse.badRequest(res, message);
      }

      const page = parseInt(query.page || '1', 10);
      const limit = parseInt(query.limit || '10', 10);
      const { search, status } = query;

      if (page < 1 || limit < 1 || limit > 100) {
        return ServerResponse.badRequest(res, 'Invalid page or limit');
      }

      const where: Prisma.ParkingSlotWhereInput = {};
      if (search) {
        const searchUpper = search.toUpperCase();
        const validLocations = ['NORTH', 'EAST', 'SOUTH', 'WEST'] as Location[];
        const validVehicleTypes = ['CAR', 'MOTORCYCLE', 'TRUCK'] as VehicleType[];
        const isValidLocation = validLocations.includes(searchUpper as Location);
        const isValidVehicleType = validVehicleTypes.includes(searchUpper as VehicleType);

        where.OR = [{ slotNumber: { contains: search, mode: 'insensitive' } }];

        if (isValidLocation) {
          where.OR.push({ location: { equals: searchUpper as Location } });
        }
        if (isValidVehicleType) {
          where.OR.push({ vehicleType: { equals: searchUpper as VehicleType } });
        }
      }
      if (status) {
        where.status = status;
      }

      const slotsPromise = prisma.parkingSlot.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          slotRequests: {
            where: { status: 'APPROVED' },
            select: {
              userId: true,
              vehicle: { select: { id: true,  plateNumber: true } },
            },
          },
        },
      });

      const totalPromise = prisma.parkingSlot.count({ where });

      const [slots, total] = await Promise.all([slotsPromise, totalPromise]) as [SlotWithRequests[], number];

      const response: PaginatedResponse<{
        id: string;
        slotNumber: string;
        vehicleType: string;
        size: string;
        location: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        assignedTo?: {
          userId: string;
          vehicleId: string;
          vehiclePlate: string;
        };
      }> = {
        items: slots.map((slot) => ({
          ...slot,
          assignedTo: slot.slotRequests.length > 0
            ? {
                userId: slot.slotRequests[0].userId,
                vehicleId: slot.slotRequests[0].vehicle.id,
                vehiclePlate: slot.slotRequests[0].vehicle.plateNumber,
              }
            : undefined,
        })),
        total,
      };

      return ServerResponse.success(res, response);
    } catch (error: any) {
      return ServerResponse.error(res, error.message || 'Internal Server Error');
    }
  }

  static async getSlotById(req: Request, res: Response) {
    try {
      if (!(req as any).user) {
        return ServerResponse.unauthorized(res, 'Unauthorized');
      }

      const { id } = (req as any).params;
      const slot = await prisma.parkingSlot.findUnique({
        where: { id },
        include: {
          slotRequests: {
            where: { status: 'APPROVED' },
            select: {
              userId: true,
              vehicle: { select: { id: true, plateNumber: true } },
            },
          },
        },
      });

      if (!slot) {
        return ServerResponse.badRequest(res, 'Parking slot not found');
      }

      const response = {
        ...slot,
        assignedTo: slot.slotRequests.length > 0
          ? {
              userId: slot.slotRequests[0].userId,
              vehicleId: slot.slotRequests[0].vehicle.id,
              vehiclePlate: slot.slotRequests[0].vehicle.plateNumber,
            }
          : undefined,
      };

      return ServerResponse.success(res, response);
    } catch (error: any) {
      return ServerResponse.error(res, error.message || 'Internal Server Error');
    }
  }

  static async createSlots(req: Request, res: Response) {
    try {
      if (!(req as any).user || (req as any).user.role !== 'ADMIN') {
        return ServerResponse.forbidden(res, 'Forbidden');
      }

      const data = plainToInstance(BulkSlotDto, (req as any).body);
      const errors = await validate(data);
      if (errors.length > 0) {
        const message = errors.map((error) => Object.values(error.constraints || {})).join(', ');
        return ServerResponse.badRequest(res, message);
      }

      const { count, prefix, vehicleType, size, location } = data;
      const slots: PrismaParkingSlot[] = [];

      for (let i = 1; i <= count; i++) {
        const slotNumber = `${prefix}-${i.toString().padStart(2, '0')}`;
        try {
          const slot = await prisma.parkingSlot.create({
            data: {
              slotNumber,
              vehicleType,
              size,
              location,
              status: 'AVAILABLE',
            },
          });
          slots.push(slot);
        } catch (error: any) {
          if (error.code === 'P2002') {
            return ServerResponse.badRequest(res, `Slot number ${slotNumber} already exists`);
          }
          throw error;
        }
      }

      return ServerResponse.created(res, slots);
    } catch (error: any) {
      return ServerResponse.error(res, error.message || 'Internal Server Error');
    }
  }

  static async updateSlot(req: Request, res: Response) {
    try {
      if (!(req as any).user || (req as any).user.role !== 'ADMIN') {
        return ServerResponse.forbidden(res, 'Forbidden');
      }

      const { id } = (req as any).params;
      const data = plainToInstance(UpdateSlotDto, (req as any).body);
      const errors = await validate(data);
      if (errors.length > 0) {
        const message = errors.map((error) => Object.values(error.constraints || {})).join(', ');
        return ServerResponse.badRequest(res, message);
      }

      const slot = await prisma.parkingSlot.findUnique({ where: { id } });
      if (!slot) {
        return ServerResponse.badRequest(res, 'Parking slot not found');
      }

      const updatedSlot = await prisma.parkingSlot.update({
        where: { id },
        data: {
          slotNumber: data.slotNumber,
          vehicleType: data.vehicleType,
          size: data.size,
          location: data.location,
          status: data.status,
        },
        include: {
          slotRequests: {
            where: { status: 'APPROVED' },
            select: {
              userId: true,
              vehicle: { select: { id: true , plateNumber: true } },
            },
          },
        },
      });

      const response = {
        ...updatedSlot,
        assignedTo: updatedSlot.slotRequests.length > 0
          ? {
              userId: updatedSlot.slotRequests[0].userId,
              vehicleId: updatedSlot.slotRequests[0].vehicle.id,
              vehiclePlate: updatedSlot.slotRequests[0].vehicle.plateNumber,
            }
          : undefined,
      };

      return ServerResponse.success(res, response);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return ServerResponse.badRequest(res, `Slot number ${(req as any).body.slotNumber} already exists`);
      }
      return ServerResponse.error(res, error.message || 'Internal Server Error');
    }
  }

  static async deleteSlot(req: Request, res: Response) {
    try {
      if (!(req as any).user || (req as any).user.role !== 'ADMIN') {
        return ServerResponse.forbidden(res, 'Forbidden');
      }

      const { id } = (req as any).params;
      const slot = await prisma.parkingSlot.findUnique({
        where: { id },
        include: { slotRequests: { where: { status: 'APPROVED' } } },
      });

      if (!slot) {
        return ServerResponse.badRequest(res, 'Parking slot not found');
      }

      if (slot.slotRequests.length > 0) {
        return ServerResponse.badRequest(res, 'Cannot delete a slot with approved requests');
      }

      await prisma.parkingSlot.delete({ where: { id } });
      return ServerResponse.success(res, { message: 'Parking slot deleted' });
    } catch (error: any) {
      return ServerResponse.error(res, error.message || 'Internal Server Error');
    }
  }
}