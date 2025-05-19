import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma/prisma-client';
import ServerResponse from '../utils/ServerResponse';
import { UpdateProfileDto, UpdatePasswordDto } from '../dtos/auth.dto';
import { Prisma } from '@prisma/client';
import { logAction } from '../prisma/prisma-client';
import { notEqual } from 'assert';
export class UserController {
  static async updateProfile(req: Request, res: Response) {
    const { name, email } = req.body as UpdateProfileDto;
    const userId = (req as any).user.id;
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { name, email },
      });
      await logAction(userId, 'Profile updated');
      return ServerResponse.success(res, { id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (error) {
      return ServerResponse.badRequest(res, 'Email already exists');
    }
  }

  static async updatePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body as UpdatePasswordDto;
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return ServerResponse.unauthorized(res, 'Invalid current password');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    await logAction(userId, 'Password updated');
    return ServerResponse.success(res, null, 'Password updated successfully');
  }

  static async getUsers(req: Request, res: Response) {
    const { page = '1', limit = '10', search } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const userId = (req as any).user.id;

    const where: Prisma.UserWhereInput = {
        NOT: { id: userId }, // Exclude the authenticated user
    };
    if (search) {
        const searchStr = search as string;
        where.AND = [
            {
                OR: [
                    { name: { contains: searchStr, mode: 'insensitive' } },
                    { email: { contains: searchStr, mode: 'insensitive' } },
                ],
            },
        ];
    }

    try {
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip: (pageNum - 1) * limitNum,
                take: limitNum,
                select: { id: true, name: true, email: true, role: true },
            }),
            prisma.user.count({ where }),
        ]);
        await logAction(userId, 'Users listed');
        return ServerResponse.success(res, {
            items: users,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (error) {
        return ServerResponse.error(res, 'Failed to fetch users');
    }
}


  
  static async deleteUser(req: Request, res: Response) {
    const adminId = (req as any).user.id;
    const adminRole = (req as any).user.role;
    const { id } = req.params;

    // Check if the requester is an admin
    if (adminRole !== 'ADMIN') {
      return ServerResponse.forbidden(res, 'Only admins can delete users');
    }

    // Prevent self-deletion
    if (adminId === id) {
      return ServerResponse.badRequest(res, 'Cannot delete your own account');
    }

    try {
      // Check if the user exists
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true },
      });

      if (!user) {
        return ServerResponse.badRequest(res, 'User not found');
      }

      // Delete the user
      await prisma.user.delete({
        where: { id },
      });

      // Log the deletion action
      await logAction(adminId, `User deleted: ${user.email}`);

      return ServerResponse.success(res, null, 'User deleted successfully');
    } catch (error: any) {
      if (error.code === 'P2025') {
        return ServerResponse.badRequest(res, 'User not found');
      }
      console.error('Error deleting user:', error);
      return ServerResponse.error(res, 'Failed to delete user');
    }
  }
  
}