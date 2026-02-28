import { Request, Response, NextFunction } from 'express';
import { reconcileIdentity } from '../services/identity.service';

export const identifyContact = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, phoneNumber } = req.body;

        // Ensure phoneNumber is treated as a string given input variations
        const parsedPhone = phoneNumber ? String(phoneNumber) : undefined;

        const result = await reconcileIdentity(email, parsedPhone);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
