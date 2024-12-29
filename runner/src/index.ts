import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { createServer } from "http";
import { initWs } from "./ws";
import cors from "cors";

const app = express();

const allowedOrigins = ["http://localhost:5173"]; // Add specific origins as needed

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Preflight request handler
app.options('*', (req, res) => {
  console.log('Preflight request received:', req.headers);
  res.sendStatus(200);
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Allow specific origins or requests with no Origin (like curl)
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"], // Restrict methods as needed
  credentials: true, // Enable credentials (cookies, headers, etc.)
}));

const httpServer = createServer(app);

// Initialize WebSocket
try {
  initWs(httpServer);
  console.log("WebSocket initialized successfully");
} catch (error) {
  console.error("Error initializing WebSocket:", error);
}

const port = process.env.PORT || 3001;

// Start the server with error handling
httpServer.listen(port, () => {
  console.log(`Listening on *:${port}`);
}).on("error", (error) => {
  console.error(`Error starting server on port ${port}:`, error);
});
