import bodyParser from 'body-parser';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import http from 'http';
import swaggerUi from 'swagger-ui-express';
config()

const app = express()
const server = http.createServer(app)

app.use(express.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors({ origin: "*" }))
app.disable('x-powered-by');

const PORT = process.env.PORT || 5000

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
