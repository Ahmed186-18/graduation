import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthPayload {
  id: string;
  role: "admin" | "institution" | "family";
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthPayload;
  }
}

export function requireAuth(allowed: Array<AuthPayload["role"]>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : undefined;
    
    if (!token) {
      console.log("[Auth] No token provided");
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || "secret") as AuthPayload;
      console.log("[Auth] Token verified for user:", payload);
      
      if (!allowed.includes(payload.role)) {
        console.log("[Auth] User role not allowed:", payload.role, "Allowed roles:", allowed);
        return res.status(403).json({ message: "Forbidden - Invalid role" });
      }

      req.user = payload;
      next();
    } catch (error) {
      console.error("[Auth] Token verification failed:", error);
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }
  };
}


