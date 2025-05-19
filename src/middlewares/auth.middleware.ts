// auth.middleware.ts

import { NextFunction, Request, Response, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma/prisma-client";
import ServerResponse from "../utils/ServerResponse";

// Middleware to check if user is logged in
export const checkLoggedIn: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Missing or invalid Authorization header");
      ServerResponse.unauthorized(res, "You are not logged in: Missing or invalid Authorization header");
      return;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      console.log("No token provided");
      ServerResponse.unauthorized(res, "You are not logged in: No token provided");
      return;
    }

    if (!process.env.JWT_SECRET) {
      console.log("JWT_SECRET not configured");
      ServerResponse.error(res, "Server configuration error");
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string; role: string };

    (req as any).user = {
      id: decoded.id,
      role: decoded.role,
    };

    
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    ServerResponse.unauthorized(res, "Invalid or expired token");
  }
};



// Middleware to check if user is an admin
export const checkAdmin: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => { 
  try {
    if (!(req as any).user) {
      console.log("No user in request");
      ServerResponse.unauthorized(res, "Authentication required");
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: (req as any).user.id },
    });

    if (!user) {
      console.log("User not found:", (req as any).user.id);
      ServerResponse.unauthorized(res, "User not found");
      return;
    }

    if (user.role !== "ADMIN") {
      console.log("User is not admin:", user.role);
      ServerResponse.forbidden(res, "Admin access required");
      return;
    }

    (req as any).user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    ServerResponse.error(res, "Internal server error");
  }
};