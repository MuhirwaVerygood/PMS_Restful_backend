import 'reflect-metadata'; // Add this at the top
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import vehicleRoutes from './routes/vehicle.routes';
import parkingRoutes from "./routes/parking.routes"
import slotRequestRoutes from "./routes/slotRequest.routes"
import { serve , setup } from 'swagger-ui-express';
import fs from "fs"
import path from 'path';
const app = express();

app.use(cors(
  {
    origin : [ "*" , "http://localhost:8090"],
    credentials: true
  }
));
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/parking-slots', parkingRoutes);
app.use('/api/v1/slot-requests', slotRequestRoutes);

const swaggerDocument = JSON.parse(
  fs.readFileSync(path.join(__dirname, './swagger/doc/swagger.json'), 'utf8')
);


app.use("/api-docs" , serve  , setup(swaggerDocument) )

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});