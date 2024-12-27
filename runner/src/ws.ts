import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { saveToS3 } from "./aws";
import path from "path";
import { fetchDir, fetchFileContent, saveFile } from "./fs";
import { TerminalManager } from "./pty";

const terminalManager = new TerminalManager();

export function initWs(httpServer: HttpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: "*", // Change this for more restrictive CORS policy later
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", async (socket) => {
        console.log(`New connection attempt from ${socket.id}`);

        try {
            // Log the host header for debugging the connection attempt
            const host = socket.handshake.headers.host;
            console.log(`Socket connection established with host: ${host}`);

            // Split the host by '.' and take the first part as replId
            const replId = host?.split('.')[0];
            console.log(`Parsed replId: ${replId}`);

            if (!replId) {
                console.error("No replId found in the host header, disconnecting socket...");
                socket.disconnect();
                terminalManager.clear(socket.id);
                return;
            }

            socket.emit("loaded", {
                rootContent: await fetchDir("/workspace", "")
            });
            console.log(`Loaded root content for replId ${replId}`);

            initHandlers(socket, replId); // Initialize event handlers

        } catch (error) {
            console.error("Error during connection setup:", error);
            socket.emit("error", { message: "Error during connection setup" });
            socket.disconnect();
        }
    });
}


function initHandlers(socket: Socket, replId: string) {
    socket.on("disconnect", () => {
        console.log(`User ${socket.id} disconnected`);
        terminalManager.clear(socket.id); // Clear the terminal on disconnect
    });

    socket.on("fetchDir", async (dir: string, callback) => {
        const dirPath = `/workspace/${dir}`;
        try {
            const contents = await fetchDir(dirPath, dir);
            console.log(`Fetched directory content for ${dirPath}`);
            callback(contents);
        } catch (error) {
            console.error(`Error fetching directory content for ${dirPath}:`, error);
            callback({ error: "Failed to fetch directory" });
        }
    });

    socket.on("fetchContent", async ({ path: filePath }: { path: string }, callback) => {
        const fullPath = `/workspace/${filePath}`;
        try {
            const data = await fetchFileContent(fullPath);
            console.log(`Fetched file content for ${fullPath}`);
            callback(data);
        } catch (error) {
            console.error(`Error fetching file content for ${fullPath}:`, error);
            callback({ error: "Failed to fetch file content" });
        }
    });

    // TODO: contents should be diff, not full file
    // Should be validated for size
    // Should be throttled before updating S3 (or use an S3 mount)
    socket.on("updateContent", async ({ path: filePath, content }: { path: string, content: string }) => {
        const fullPath =  `/workspace/${filePath}`;
        try {
            await saveFile(fullPath, content);
            console.log(`File saved to ${fullPath}`);

            await saveToS3(`code/${replId}`, filePath, content);
            console.log(`File content saved to S3 at code/${replId}/${filePath}`);
        } catch (error) {
            console.error(`Error saving content for ${filePath}:`, error);
            socket.emit("error", { message: "Failed to save file content" });
        }
    });

    socket.on("requestTerminal", async () => {
        try {
            terminalManager.createPty(socket.id, replId, (data, id) => {
                socket.emit('terminal', {
                    data: Buffer.from(data, "utf-8")
                });
            });
            console.log(`Terminal created for socket ${socket.id}`);
        } catch (error) {
            console.error(`Error creating terminal for socket ${socket.id}:`, error);
            socket.emit("error", { message: "Failed to create terminal" });
        }
    });

    socket.on("terminalData", async ({ data, terminalId }: { data: string, terminalId: number }) => {
        try {
            terminalManager.write(socket.id, data);
            console.log(`Written terminal data for terminalId ${terminalId}`);
        } catch (error) {
            console.error(`Error writing terminal data for terminalId ${terminalId}:`, error);
            socket.emit("error", { message: "Failed to write terminal data" });
        }
    });
}
