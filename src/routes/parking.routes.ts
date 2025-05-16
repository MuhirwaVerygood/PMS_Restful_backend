import { Router } from 'express';
import { validationMiddleware } from '../middlewares/validator.middleware';
import { BulkSlotDto, SlotDto, UpdateSlotDto } from '../dtos/parking.dto';
import { checkLoggedIn, checkAdmin } from '../middlewares/auth.middleware';
import { ParkingController } from 'controllers/parking.controllers';
import { asyncHandler } from 'middlewares/asyncHandler.middleware';
const router = Router();

router.post('/bulk', checkLoggedIn, checkAdmin, validationMiddleware(BulkSlotDto), asyncHandler(ParkingController.createBulkSlots));
router.post('/', checkLoggedIn, checkAdmin, validationMiddleware(SlotDto), asyncHandler(ParkingController.createSlot));
router.put('/:id', checkLoggedIn, checkAdmin, validationMiddleware(UpdateSlotDto), asyncHandler(ParkingController.updateSlot));
router.delete('/:id', checkLoggedIn, checkAdmin, asyncHandler( ParkingController.deleteSlot));
router.get('/', checkLoggedIn, asyncHandler(ParkingController.getSlots));

export default router;
