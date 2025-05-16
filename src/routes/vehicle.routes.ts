import { Router } from 'express';
import { VehicleController } from '../controllers/vehicle.controllers';
import { validationMiddleware } from '../middlewares/validator.middleware';
import { VehicleDto, UpdateVehicleDto } from '../dtos/vehicle.dto';
import { checkLoggedIn } from '../middlewares/auth.middleware';
import { asyncHandler } from 'middlewares/asyncHandler.middleware';
const vehicleRoute = Router();

vehicleRoute.post('/', checkLoggedIn, validationMiddleware(VehicleDto), asyncHandler(VehicleController.createVehicle));
vehicleRoute.put('/:id', checkLoggedIn, validationMiddleware(UpdateVehicleDto), asyncHandler(VehicleController.updateVehicle));
vehicleRoute.delete('/:id', checkLoggedIn, asyncHandler(VehicleController.deleteVehicle));
vehicleRoute.get('/', checkLoggedIn, asyncHandler(VehicleController.getVehicles));
vehicleRoute.get('/:id', checkLoggedIn, asyncHandler(VehicleController.getVehicleById));

export default vehicleRoute;