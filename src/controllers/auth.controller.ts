import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/prisma-client';
import ServerResponse from '../utils/ServerResponse';
import { RegisterDto, LoginDto } from '../dtos/auth.dto';
import { logAction } from '../prisma/prisma-client';
export class AuthController {
  static async register(req: Request, res: Response) {
    const { name, email, password } = req.body as RegisterDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword, role: 'USER' },
      });
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: '1d' });
      await logAction(user.id, 'User registered');
      return ServerResponse.created(res, { user: { id: user.id, name, email, role: user.role }, token });
    } catch (error) {
      return ServerResponse.badRequest(res, 'Email already exists');
    }
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body as LoginDto;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return ServerResponse.unauthorized(res, 'Invalid credentials');
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, { expiresIn: '1d' });
    await logAction(user.id, 'User logged in');
    return ServerResponse.success(res, { user: { id: user.id, name: user.name, email, role: user.role }, token });
  }

  static async getCurrentUser(req: Request, res: Response) {
    const user = await prisma.user.findUnique({ where: { id: (req as any).user.id } });
    if (!user) {
      return ServerResponse.notFound(res, 'User not found');
    }
    return ServerResponse.success(res, { id: user.id, name: user.name, email: user.email, role: user.role });
  }
}