import { Request, Response } from 'express';
import prisma from '../prisma/prisma-client';
import ServerResponse from '../utils/ServerResponse';
import { VehicleDto, UpdateVehicleDto } from '../dtos/vehicle.dto';
import { logAction } from '../prisma/prisma-client';
import { Prisma, VehicleType } from '@prisma/client';

export class VehicleController {
  static async createVehicle(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { plateNumber, vehicleType, size, attributes } = req.body as VehicleDto;
    
    try {
      const vehicle = await prisma.vehicle.create({
        data: { userId, plateNumber, vehicleType, size, attributes },
      });
      await logAction(userId, 'Vehicle created');
      return ServerResponse.created(res, vehicle);
    } catch (error) {
      return ServerResponse.badRequest(res, 'Plate number already exists');
    }
  }

  static async updateVehicle(req: Request, res: Response) {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { plateNumber, vehicleType, size, attributes } = req.body as UpdateVehicleDto;
    const vehicle = await prisma.vehicle.findFirst({ where: { id, userId } });
    if (!vehicle) {
      return ServerResponse.notFound(res, 'Vehicle not found');
    }
    try {
      const updatedVehicle = await prisma.vehicle.update({
        where: { id },
        data: { plateNumber, vehicleType, size, attributes },
      });
      await logAction(userId, 'Vehicle updated');
      return ServerResponse.success(res, updatedVehicle);
    } catch (error) {
      return ServerResponse.badRequest(res, 'Plate number already exists');
    }
  }

  static async deleteVehicle(req: Request, res: Response) {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const vehicle = await prisma.vehicle.findFirst({ where: { id, userId } });
    if (!vehicle) {
      return ServerResponse.notFound(res, 'Vehicle not found');
    }
    await prisma.vehicle.delete({ where: { id } });
    await logAction(userId, 'Vehicle deleted');
    return ServerResponse.success(res, null, 'Vehicle deleted');
  }

 
 static async getVehicles(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const isAdmin = (req as any).user.role === 'ADMIN';
    console.log((req as any).user.role);
    
    const { page = '1', limit = '10', search } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const where: Prisma.VehicleWhereInput = {};
    
    if (!isAdmin) {
      where.userId = userId;
    }

    if (search) {
      const searchStr = search as string;
      const isVehicleType = Object.values(VehicleType).includes(searchStr.toUpperCase() as VehicleType);
      where.OR = [
        { plateNumber: { contains: searchStr, mode: 'insensitive' } },
        ...(isVehicleType ? [{ vehicleType: searchStr.toUpperCase() as VehicleType }] : []),
      ];
    }

    try {
      const [vehicles, total] = await Promise.all([
        prisma.vehicle.findMany({
          where,
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          include: {
            User: {  // Changed from 'user' to 'User' to match Prisma schema
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }),
        prisma.vehicle.count({ where }),
      ]);
      
      await logAction(userId, 'Vehicles listed');
      
      return ServerResponse.success(res, {
        items: vehicles,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      return ServerResponse.error(res, 'Failed to fetch vehicles');
    }
}


 static async getVehicleById(req: Request, res: Response) {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const isAdmin = (req as any).user.role === 'ADMIN';
    
    const where: Prisma.VehicleWhereInput = { id };
    if (!isAdmin) {
      where.userId = userId;
    }

    const vehicle = await prisma.vehicle.findFirst({
      where,
      include: {
        User: {  // Changed from 'user' to 'User'
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!vehicle) {
      return ServerResponse.notFound(res, 'Vehicle not found');
    }
    
    await logAction(userId, 'Vehicle viewed');
    return ServerResponse.success(res, vehicle);
}
}