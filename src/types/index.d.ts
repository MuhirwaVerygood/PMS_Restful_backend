import { Request, RequestHandler } from "express";

export interface AuthRequest extends Request {
    user: {
        id: string;
    }
}


type AuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => void