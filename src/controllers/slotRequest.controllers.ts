import { Request, Response } from 'express';
import prisma from '../prisma/prisma-client';
import ServerResponse from '../utils/ServerResponse';
import { SlotRequestDto, UpdateSlotRequestDto, ApproveSlotRequestDto, RejectSlotRequestDto } from '../dtos/parking.dto';
import { sendSlotApprovalEmail } from '../utils/mail';
import { Prisma, RequestStatus } from '@prisma/client';
import { logAction } from '../prisma/prisma-client';
export class SlotRequestController {
  static async createSlotRequest(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { vehicleId } = req.body as SlotRequestDto;

    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
    if (!vehicle) {
      return ServerResponse.notFound(res, 'Vehicle not found or does not belong to user');
    }

    try {
      const slotRequest = await prisma.slotRequest.create({
        data: { userId, vehicleId, status: 'PENDING' },
      });
      await logAction(userId, `Created slot request for vehicle ${vehicleId}`);
      return ServerResponse.created(res, slotRequest);
    } catch (error) {
      return ServerResponse.error(res, 'Failed to create slot request');
    }
  }

  static async updateSlotRequest(req: Request, res: Response) {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { vehicleId } = req.body as UpdateSlotRequestDto;

    const slotRequest = await prisma.slotRequest.findFirst({
      where: { id, userId, status: 'PENDING' },
    });
    if (!slotRequest) {
      return ServerResponse.notFound(res, 'Slot request not found, not pending, or not owned by user');
    }

    if (vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
      if (!vehicle) {
        return ServerResponse.notFound(res, 'Vehicle not found or does not belong to user');
      }
    }

    try {
      const updatedSlotRequest = await prisma.slotRequest.update({
        where: { id },
        data: { vehicleId },
      });
      await logAction(userId, `Updated slot request ${id}`);
      return ServerResponse.success(res, updatedSlotRequest);
    } catch (error) {
      return ServerResponse.error(res, 'Failed to update slot request');
    }
  }

  static async deleteSlotRequest(req: Request, res: Response) {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const slotRequest = await prisma.slotRequest.findFirst({
      where: { id, userId, status: 'PENDING' },
    });
    if (!slotRequest) {
      return ServerResponse.notFound(res, 'Slot request not found, not pending, or not owned by user');
    }

    try {
      await prisma.slotRequest.delete({ where: { id } });
      await logAction(userId, `Deleted slot request ${id}`);
      return ServerResponse.success(res, null, 'Slot request deleted');
    } catch (error) {
      return ServerResponse.error(res, 'Failed to delete slot request');
    }
  }

  static async approveSlotRequest(req: Request, res: Response) {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { slotId } = req.body as ApproveSlotRequestDto;

    const isAdmin = (await prisma.user.findUnique({ where: { id: userId } }))?.role === 'ADMIN';
    if (!isAdmin) {
      return ServerResponse.forbidden(res, 'Only admins can approve slot requests');
    }

    const slotRequest = await prisma.slotRequest.findUnique({
      where: { id },
      include: { vehicle: true },
    });
    if (!slotRequest || slotRequest.status !== 'PENDING') {
      return ServerResponse.notFound(res, 'Slot request not found or not pending');
    }

    let slot = slotId
      ? await prisma.parkingSlot.findUnique({ where: { id: slotId } })
      : await prisma.parkingSlot.findFirst({
          where: {
            status: 'AVAILABLE',
            vehicleType: slotRequest.vehicle.vehicleType,
            size: slotRequest.vehicle.size,
          },
        });

    if (!slot) {
      return ServerResponse.badRequest(res, 'No compatible slot available');
    }

    try {
      const updatedSlotRequest = await prisma.slotRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          slotId: slot.id,
          slotNumber: slot.slotNumber,
        },
      });

      await prisma.parkingSlot.update({
        where: { id: slot.id },
        data: { status: 'UNAVAILABLE' },
      });

      const user = await prisma.user.findUnique({ where: { id: slotRequest.userId } });
      if (user) {
        await sendSlotApprovalEmail(
          user.email,
          slot.slotNumber,
          slotRequest.vehicle.plateNumber,
          new Date()
        );
      }

      await logAction(userId, `Approved slot request ${id} for slot ${slot.id}`);
      return ServerResponse.success(res, updatedSlotRequest);
    } catch (error) {
      return ServerResponse.error(res, 'Failed to approve slot request');
    }
  }

  static async rejectSlotRequest(req: Request, res: Response) {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { reason } = req.body as RejectSlotRequestDto;

    const isAdmin = (await prisma.user.findUnique({ where: { id: userId } }))?.role === 'ADMIN';
    if (!isAdmin) {
      return ServerResponse.forbidden(res, 'Only admins can reject slot requests');
    }

    const slotRequest = await prisma.slotRequest.findUnique({ where: { id } });
    if (!slotRequest || slotRequest.status !== 'PENDING') {
      return ServerResponse.notFound(res, 'Slot request not found or not pending');
    }

    try {
      const updatedSlotRequest = await prisma.slotRequest.update({
        where: { id },
        data: { status: 'REJECTED', rejectionReason: reason },
      });
      await logAction(userId, `Rejected slot request ${id}`);
      return ServerResponse.success(res, updatedSlotRequest);
    } catch (error) {
      return ServerResponse.error(res, 'Failed to reject slot request');
    }
  }

  static async getSlotRequests(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { page = '1', limit = '10', search, status } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const isAdmin = (await prisma.user.findUnique({ where: { id: userId } }))?.role === 'ADMIN';

    const where: Prisma.SlotRequestWhereInput = {};
    if (!isAdmin) {
      where.userId = userId;
    }
    if (status && Object.values(RequestStatus).includes(status as RequestStatus)) {
      where.status = status as RequestStatus;
    }
    if (search) {
      const searchStr = search as string;
      where.OR = [
        { vehicle: { plateNumber: { contains: searchStr, mode: 'insensitive' } } },
        { slotNumber: { contains: searchStr, mode: 'insensitive' } },
      ].filter((condition) => condition !== null) as Prisma.SlotRequestWhereInput[];
    }

    try {
      const [slotRequests, total] = await Promise.all([
        prisma.slotRequest.findMany({
          where,
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          include: { vehicle: { select: { id: true, plateNumber: true, vehicleType: true, size: true } }, slot: true },
        }),
        prisma.slotRequest.count({ where }),
      ]);

      await logAction(userId, 'Listed slot requests');
      return ServerResponse.success(res, {
        items: slotRequests,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      return ServerResponse.error(res, 'Failed to fetch slot requests');
    }
  }
}