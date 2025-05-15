const whitelist = [
    "http://localhost:8090",
    // "https://nenodejs-services.vercel.app",
    // "https://nenodejs-backend.onrender.com",
    // "https://nenodejsservices.eu",
];
const options = {
    origin: (origin: string, callback: Function) => {
        if (whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    methods: ["GET", "PUT", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
    credentials: true,
    exposedHeaders: ["*", "Authorization"]
};

export default options;