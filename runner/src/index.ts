import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { createServer } from "http";
import { initWs } from "./ws";
import cors from "cors";

const app = express();
app.use(cors());
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
