import { Router } from 'express';
import { UserController } from 'controllers/user.controllers';
import { validationMiddleware } from '../middlewares/validator.middleware';
import { UpdateProfileDto, UpdatePasswordDto } from '../dtos/auth.dto';
import { checkLoggedIn, checkAdmin } from '../middlewares/auth.middleware';
import { asyncHandler } from 'middlewares/asyncHandler.middleware';
const router = Router();

router.put('/profile', checkLoggedIn, validationMiddleware(UpdateProfileDto), asyncHandler(UserController.updateProfile));
router.put('/password', checkLoggedIn, validationMiddleware(UpdatePasswordDto), asyncHandler(UserController.updatePassword));
router.get('/', checkLoggedIn, checkAdmin, asyncHandler(UserController.getUsers));

export default router;
