import { Request, Response, NextFunction } from "express";
export interface AuthRequest extends Request {
    user?: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
}
export declare const authenticateToken: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (allowedRoles: string[]) => (req: AuthRequest, _res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: AuthRequest, _res: Response, next: NextFunction) => void;
export declare const requireManager: (req: AuthRequest, _res: Response, next: NextFunction) => void;
export declare const requireStaff: (req: AuthRequest, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map