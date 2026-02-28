import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const identitySchema = z.object({
    email: z.string().email().optional(),
    phoneNumber: z.string().optional(),
}).refine(data => data.email || data.phoneNumber, {
    message: "Either email or phoneNumber must be provided",
});

export const validateIdentity = (req: Request, res: Response, next: NextFunction) => {
    try {
        identitySchema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: (error as any).issues });
            return;
        }
        next(error);
    }
};
