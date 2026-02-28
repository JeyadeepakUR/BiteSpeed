import { Router } from 'express';
import { identifyContact } from '../controllers/identity.controller';
import { validateIdentity } from '../middlewares/validation.middleware';

const router = Router();

router.post('/identify', validateIdentity, identifyContact);

export default router;
