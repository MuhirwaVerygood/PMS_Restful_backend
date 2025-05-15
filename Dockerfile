FROM node:25-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

COPY ./src/prisma ./src/prisma

RUN npx prisma generate && npx prisma migrate deploy

RUN npm run build

EXPOSE 8090

CMD ["npm", "run", "dev"]