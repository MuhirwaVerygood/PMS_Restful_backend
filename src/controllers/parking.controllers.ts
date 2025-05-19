// parking.controllers.ts

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import {  Prisma, Location, VehicleType } from '@prisma/client';
import { BulkSlotDto, UpdateSlotDto, GetSlotsQueryDto, CreateSlotDto } from '../dtos/parking.dto';
import ServerResponse from '../utils/ServerResponse';
import prisma from 'prisma/prisma-client';
// Define type for ParkingSlot with slotRequests relation
type SlotWithRequests = Prisma.ParkingSlotGetPayload<{
  include: {
    slotRequests: {
      where: { status: 'APPROVED' };
      select: {
        userId: true;
        vehicle: { select: { id: true; plateNumber: true } };
      };
    };
  };
}>;

// Define paginated response interface
interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

// Define response type matching frontend's ParkingSlot
interface ParkingSlotResponse {
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
}

export class ParkingSlotController {
  // Create a single parking slot
 
  // Create a single parking slot with auto-generated slot number
static async createSlot(req: Request, res: Response) {
    try {
        if (!(req as any).user || (req as any).user.role !== 'ADMIN') {
            console.log('Unauthorized access attempt');
            return ServerResponse.forbidden(res, 'Forbidden');
        }

        const data = plainToInstance(CreateSlotDto, req.body);

        const errors = await validate(data);
        if (errors.length > 0) {
            const message = errors.map((error) => Object.values(error.constraints || {})).join(', ');
            console.log('Validation errors:', message);
            return ServerResponse.badRequest(res, message);
        }

        try {
            // Generate a unique slot number
            let slotNumber: string;
            let attempts = 0;
            const maxAttempts = 10;
            
            do {
                attempts++;
                const randomNum = Math.floor(100 + Math.random() * 900); // 3-digit random number
                slotNumber = `SLOT-${randomNum}`;
                
                // Check if slot number exists
                const existingSlot = await prisma.parkingSlot.findUnique({
                    where: { slotNumber }
                });
                
                if (!existingSlot) break;
                
                if (attempts >= maxAttempts) {
                    return ServerResponse.error(res, 'Failed to generate unique slot number after multiple attempts');
                }
            } while (true);

          
            const slot: SlotWithRequests = await prisma.parkingSlot.create({
                data: {
                    slotNumber,
                    vehicleType: data.vehicleType,
                    size: data.size,
                    location: data.location,
                    status: data.status || 'AVAILABLE',
                },
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

            const response: ParkingSlotResponse = {
                ...slot,
                assignedTo: slot.slotRequests.length > 0
                    ? {
                        userId: slot.slotRequests[0].userId,
                        vehicleId: slot.slotRequests[0].vehicle.id,
                        vehiclePlate: slot.slotRequests[0].vehicle.plateNumber,
                    }
                    : undefined,
            };

            return ServerResponse.created(res, response);
        } catch (error: any) {
            console.error('Database error:', error);
            if (error.code === 'P2002') {
                return ServerResponse.badRequest(res, `Slot number already exists`);
            }
            throw error;
        }
    } catch (error: any) {
        console.error('Unexpected error:', error);
        return ServerResponse.error(res, error.message || 'Internal Server Error');
    }
}

// Create multiple parking slots in bulk with auto-generated slot numbers
static async createSlots(req: Request, res: Response) {
    try {
        if (!(req as any).user || (req as any).user.role !== 'ADMIN') {
            return ServerResponse.forbidden(res, 'Forbidden');
        }

        const data = plainToInstance(BulkSlotDto, req.body);
        const errors = await validate(data);
        if (errors.length > 0) {
            const message = errors.map((error) => Object.values(error.constraints || {})).join(', ');
            return ServerResponse.badRequest(res, message);
        }

        const { count, prefix, vehicleType, size, location } = data;

        // Fetch existing slot numbers with the given prefix
        const existingSlots = await prisma.parkingSlot.findMany({
            where: {
                slotNumber: {
                    startsWith: prefix,
                },
            },
            select: {
                slotNumber: true,
            },
        });
        const existingNumbers = new Set(existingSlots.map((s) => s.slotNumber));

        // Generate unique slot numbers until we have enough
        const slotNumbers: string[] = [];
        let sequence = 1;

        while (slotNumbers.length < count) {
            const slotNumber = `${prefix}-${sequence.toString().padStart(5, '0')}`; // e.g., SLOT-00001
            if (!existingNumbers.has(slotNumber)) {
                slotNumbers.push(slotNumber);
                existingNumbers.add(slotNumber); // Prevent duplicates in this batch
            }
            sequence++;
            // No maxSequence limit; we'll keep incrementing until we get enough unique numbers
        }

        // Create slots
        const slots: SlotWithRequests[] = [];
        const failedSlots: { slotNumber: string; reason: string }[] = [];

        for (const slotNumber of slotNumbers) {
            let created = false;
            let attempt = 0;

            // Retry creating this slot until it succeeds or a non-retryable error occurs
            while (!created) {
                try {
                    const slot = await prisma.parkingSlot.create({
                        data: {
                            slotNumber,
                            vehicleType,
                            size,
                            location,
                            status: 'AVAILABLE',
                        },
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
                    slots.push(slot);
                    created = true;
                } catch (error: any) {
                    attempt++;
                    if (error.code === 'P2002') {
                        // Slot number already exists (race condition or stale existingNumbers)
                        // Generate a new slot number
                        let newSlotNumber: string;
                        do {
                            sequence++;
                            newSlotNumber = `${prefix}-${sequence.toString().padStart(5, '0')}`;
                        } while (existingNumbers.has(newSlotNumber));
                        slotNumbers[slotNumbers.indexOf(slotNumber)] = newSlotNumber;
                        existingNumbers.add(newSlotNumber);
                    } else {
                        // Non-retryable error
                        failedSlots.push({
                            slotNumber,
                            reason: error.message || 'Failed to create slot',
                        });
                        break; // Stop retrying for this slot
                    }
                }
            }
        }

        // Check if all slots were created
        if (slots.length < count) {
            return ServerResponse.error(
                res,
                `Failed to create all slots. Created ${slots.length} out of ${count}. Failures: ${JSON.stringify(failedSlots)}`
            );
        }

        const response = {
            createdSlots: slots.map((slot) => ({
                ...slot,
                assignedTo: slot.slotRequests.length > 0
                    ? {
                          userId: slot.slotRequests[0].userId,
                          vehicleId: slot.slotRequests[0].vehicle.id,
                          vehiclePlate: slot.slotRequests[0].vehicle.plateNumber,
                      }
                    : undefined,
            })),
            totalCreated: slots.length,
            failedAttempts: failedSlots,
            requestedCount: count,
        };

        return ServerResponse.created(res, response);
    } catch (error: any) {
        return ServerResponse.error(res, error.message || 'Internal Server Error');
    }
}

  // Get paginated list of parking slots
  static async getSlots(req: Request, res: Response) {
    try {
      if (!(req as any).user) {
        return ServerResponse.unauthorized(res, 'Unauthorized');
      }

      const query = plainToInstance(GetSlotsQueryDto, req.query);
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
              vehicle: { select: { id: true, plateNumber: true } },
            },
          },
        },
      });

      const totalPromise = prisma.parkingSlot.count({ where });

      const [slots, total] = await Promise.all([slotsPromise, totalPromise]) as [SlotWithRequests[], number];

      const response: PaginatedResponse<ParkingSlotResponse> = {
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

  // Get a single parking slot by ID
  static async getSlotById(req: Request, res: Response) {
    try {
      if (!(req as any).user) {
        return ServerResponse.unauthorized(res, 'Unauthorized');
      }

      const { id } = req.params;
      const slot: SlotWithRequests | null = await prisma.parkingSlot.findUnique({
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

      const response: ParkingSlotResponse = {
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

  // Update a parking slot
  static async updateSlot(req: Request, res: Response) {
    try {
      if (!(req as any).user || (req as any).user.role !== 'ADMIN') {
        return ServerResponse.forbidden(res, 'Forbidden');
      }

      const { id } = req.params;
      const data = plainToInstance(UpdateSlotDto, req.body);
      const errors = await validate(data);
      if (errors.length > 0) {
        const message = errors.map((error) => Object.values(error.constraints || {})).join(', ');
        return ServerResponse.badRequest(res, message);
      }

      const slot = await prisma.parkingSlot.findUnique({ where: { id } });
      if (!slot) {
        return ServerResponse.badRequest(res, 'Parking slot not found');
      }

      const updatedSlot: SlotWithRequests = await prisma.parkingSlot.update({
        where: { id },
        data: {
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
              vehicle: { select: { id: true ,  plateNumber: true } },
            },
          },
        },
      });

      const response: ParkingSlotResponse = {
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
        return ServerResponse.badRequest(res, `Slot number ${req.body.slotNumber} already exists`);
      }
      return ServerResponse.error(res, error.message || 'Internal Server Error');
    }
  }

  // Delete a parking slot
  static async deleteSlot(req: Request, res: Response) {
    try {
      if (!(req as any).user || (req as any).user.role !== 'ADMIN') {
        return ServerResponse.forbidden(res, 'Forbidden');
      }

      const { id } = req.params;
      const slot: SlotWithRequests | null = await prisma.parkingSlot.findUnique({
        where: { id },
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