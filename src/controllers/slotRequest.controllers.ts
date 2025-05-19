import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import { PrismaClient, SlotRequest, RequestStatus } from '@prisma/client';
import { toFrontendSlotRequest, FrontendSlotRequest } from '../mappers/slotRequest.mappers';
import { GetSlotRequestsQueryDto } from '../dtos/parking.dto';
import ServerResponse from '../utils/ServerResponse';
import { sendSlotApprovalEmail } from 'utils/mail';

const prisma = new PrismaClient();

interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export class SlotRequestController {
  static async getSlotRequests(req: Request, res: Response) {
    try {
      if (!(req as any).user) {
        return ServerResponse.unauthorized(res, 'Unauthorized');
      }

      const query = plainToInstance(GetSlotRequestsQueryDto, (req as any).query);
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

      const where: any = {};
      if (search) {
        where.OR = [
          { preferredLocation: { contains: search, mode: 'insensitive' } },
          { vehicle: { plateNumber: { contains: search, mode: 'insensitive' } } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }
      if (status) {
        where.status = status.toUpperCase();
      }
      if ((req as any).user.role !== 'ADMIN') {
        where.userId = (req as any).user.id;
      }

      const [slotRequests, total] = await Promise.all([
        prisma.slotRequest.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            vehicle: { select: { id: true, plateNumber: true, vehicleType: true, size: true } },
            slot: { select: { id: true, slotNumber: true } },
            user: { select: { name: true } },
          },
        }),
        prisma.slotRequest.count({ where }),
      ]);

      const response: PaginatedResponse<FrontendSlotRequest> = {
        items: slotRequests.map(toFrontendSlotRequest),
        total,
      };

      return ServerResponse.success(res, response);
    } catch (error: any) {
      return ServerResponse.error(res, error.message || 'Internal Server Error');
    }
  }

  static async createSlotRequest(req: Request, res: Response) {
    try {
      if (!(req as any).user) {
        return ServerResponse.unauthorized(res, 'Unauthorized');
      }

      const userId = (req as any).user.id;
      const data = (req as any).body; // Validated by middleware

      const slotRequest = await prisma.slotRequest.create({
        data: {
          userId,
          vehicleId: data.vehicleId,
          preferredLocation: data.preferredLocation,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          notes: data.notes,
          status: RequestStatus.PENDING,
        },
        include: {
          vehicle: { select: { id: true, plateNumber: true, vehicleType: true, size: true } },
          slot: { select: { id: true, slotNumber: true } },
          user: { select: { name: true } },
        },
      });

      return ServerResponse.created(res, toFrontendSlotRequest(slotRequest));
    } catch (error: any) {
      return ServerResponse.error(res, error.message || 'Internal Server Error');
    }
  }

  static async updateSlotRequest(req: Request, res: Response) {
    try {
      if (!(req as any).user) {
        return ServerResponse.unauthorized(res, 'Unauthorized');
      }

      const slotRequestId = (req as any).params.id;
      const data = (req as any).body; // Validated by middleware

      const slotRequest = await prisma.slotRequest.findUnique({
        where: { id: slotRequestId },
      });

      if (!slotRequest) {
        return ServerResponse.badRequest(res, 'Slot request not found');
      }

      if ((req as any).user.role !== 'ADMIN' && slotRequest.userId !== (req as any).user.id) {
        return ServerResponse.forbidden(res, 'Forbidden');
      }

      if (slotRequest.status !== RequestStatus.PENDING) {
        return ServerResponse.badRequest(res, 'Only pending requests can be updated');
      }

      const updatedSlotRequest = await prisma.slotRequest.update({
        where: { id: slotRequestId },
        data: {
          vehicleId: data.vehicleId,
          preferredLocation: data.preferredLocation,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
          notes: data.notes,
        },
        include: {
          vehicle: { select: { id: true, plateNumber: true, vehicleType: true, size: true } },
          slot: { select: { id: true, slotNumber: true } },
          user: { select: { name: true } },
        },
      });

      return ServerResponse.success(res, toFrontendSlotRequest(updatedSlotRequest));
    } catch (error: any) {
      return ServerResponse.error(res, error.message || 'Internal Server Error');
    }
  }

  static async deleteSlotRequest(req: Request, res: Response) {
    try {
      if (!(req as any).user) {
        return ServerResponse.unauthorized(res, 'Unauthorized');
      }

      const slotRequestId = (req as any).params.id;

      const slotRequest = await prisma.slotRequest.findUnique({
        where: { id: slotRequestId },
      });

      if (!slotRequest) {
        return ServerResponse.badRequest(res, 'Slot request not found');
      }

      if ((req as any).user.role !== 'ADMIN' && slotRequest.userId !== (req as any).user.id) {
        return ServerResponse.forbidden(res, 'Forbidden');
      }

      if (slotRequest.status !== RequestStatus.PENDING) {
        return ServerResponse.badRequest(res, 'Only pending requests can be deleted');
      }

      await prisma.slotRequest.delete({
        where: { id: slotRequestId },
      });

      return ServerResponse.success(res, { message: 'Slot request deleted' });
    } catch (error: any) {
      return ServerResponse.error(res, error.message || 'Internal Server Error');
    }
  }

  static async approveSlotRequest(req: Request, res: Response) {
    try {
      if (!(req as any).user || (req as any).user.role !== 'ADMIN') {
        return ServerResponse.forbidden(res, 'Forbidden');
      }

      const { slotId } = (req as any).body; // Validated by middleware
      const slotRequestId = (req as any).params.id;

      const slot = await prisma.parkingSlot.findUnique({
        where: { id: slotId },
      });

      if (!slot || slot.status !== 'AVAILABLE') {
        return ServerResponse.badRequest(res, 'Invalid or unavailable slot');
      }

      const slotRequest = await prisma.slotRequest.findUnique({
        where: { id: slotRequestId },
      });

      if (!slotRequest || slotRequest.status !== 'PENDING') {
        console.log(slotRequest?.status);
        
        return ServerResponse.badRequest(res, 'Invalid or non-pending slot request');
      }

      const updatedSlotRequest = await prisma.slotRequest.update({
        where: { id: slotRequestId },
        data: {
          status: RequestStatus.APPROVED,
          slotId,
          slotNumber: slot.slotNumber,
        },
        include: {
          vehicle: { select: { id: true, plateNumber: true, vehicleType: true, size: true } },
          slot: { select: { id: true, slotNumber: true } },
          user: { select: { name: true ,  email : true} },
        },
      });

      await prisma.parkingSlot.update({
        where: { id: slotId },
        data: { status: 'OCCUPIED' },
      });

      await sendSlotApprovalEmail( updatedSlotRequest.user.email , slot.slotNumber, updatedSlotRequest.vehicle.plateNumber ,  updatedSlotRequest.updatedAt )
console.log("Email sent successfully");

      return ServerResponse.success(res, toFrontendSlotRequest(updatedSlotRequest));
    } catch (error: any) {
      return ServerResponse.error(res, error.message || 'Internal Server Error');
    }
  }

  static async rejectSlotRequest(req: Request, res: Response) {
    try {
      if (!(req as any).user || (req as any).user.role !== 'ADMIN') {
        return ServerResponse.forbidden(res, 'Forbidden');
      }

      const { reason } = (req as any).body; // Validated by middleware
      const slotRequestId = (req as any).params.id;

      const slotRequest = await prisma.slotRequest.findUnique({
        where: { id: slotRequestId },
      });

      if (!slotRequest || slotRequest.status !== 'PENDING') {
        return ServerResponse.badRequest(res, 'Invalid or non-pending slot request');
      }

      const updatedSlotRequest = await prisma.slotRequest.update({
        where: { id: slotRequestId },
        data: {
          status: RequestStatus.REJECTED,
          rejectionReason: reason,
        },
        include: {
          vehicle: { select: { id: true, plateNumber: true, vehicleType: true, size: true } },
          slot: { select: { id: true, slotNumber: true } },
          user: { select: { name: true } },
        },
      });

      return ServerResponse.success(res, toFrontendSlotRequest(updatedSlotRequest));
    } catch (error: any) {
      return ServerResponse.error(res, error.message || 'Internal Server Error');
    }
  }

  // New method to get rejection reason by slotId
  static async getRejectionReasonBySlotId(req: Request, res: Response) {
    // Purpose: Retrieve the rejection reason for a slot request associated with a given slotId.
    // Why this implementation:
    // - **Admin-only access**: Matches the security model of approve/reject methods, ensuring only admins can access rejection reasons.
    // - **Simple query**: Uses Prisma to find the first matching slot request by slotId, which is efficient for this use case.
    // - **Clear responses**: Returns the rejection reason if found, or appropriate error messages for invalid cases, consistent with other methods.
    // - **Handles edge cases**: Checks for slot request existence, rejected status, and null rejection reasons.
    // - **Reuses ServerResponse**: Maintains consistent response formatting across the controller.

    try {
   

      // Get slotId from request parameters
      const slotId = (req as any).params.slotId;

      // Validate slotId
      if (!slotId) {
        return ServerResponse.badRequest(res, 'Slot ID is required');
      }

      // Find the slot request by slotId
      const slotRequest = await prisma.slotRequest.findFirst({
        where: { slotId },
        select: {
          status: true,
          rejectionReason: true,
        },
      });

      // Check if slot request exists
      if (!slotRequest) {
        return ServerResponse.badRequest(res, 'No slot request found for the provided slot ID');
      }

      // Check if the request is rejected
      if (slotRequest.status !== RequestStatus.REJECTED) {
        return ServerResponse.badRequest(res, 'Slot request is not rejected');
      }

      // Return the rejection reason (may be null)
      return ServerResponse.success(res, {
        rejectionReason: slotRequest.rejectionReason || null,
      });
    } catch (error: any) {
      // Handle unexpected errors
      return ServerResponse.error(res, error.message || 'Internal Server Error');
    }
  }
}