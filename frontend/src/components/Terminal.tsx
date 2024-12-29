import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
const fitAddon = new FitAddon();

function ab2str(buf: ArrayBuffer): string {
    // Convert ArrayBuffer to Uint8Array, then spread it into String.fromCharCode
    return String.fromCharCode(...new Uint8Array(buf));
}

const OPTIONS_TERM = {
    useStyle: true,
    screenKeys: true,
    cursorBlink: true,
    cols: 200,
    theme: {
        background: "black",
    },
};

export const TerminalComponent = ({ socket }: { socket: Socket }) => {
    const terminalRef = useRef<HTMLDivElement | null>(null); // Define the correct type

    useEffect(() => {
        if (!terminalRef.current || !socket) {
            return;
        }

        // Request terminal session
        socket.emit("requestTerminal");
        socket.on("terminal", terminalHandler);

        // Initialize terminal
        const term = new Terminal(OPTIONS_TERM);
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        function terminalHandler({ data }: { data: ArrayBuffer | string }) {
            if (data instanceof ArrayBuffer) {
                console.error("[DEBUG] Received ArrayBuffer data:", data);
                const strData = ab2str(data); // Convert ArrayBuffer to string
                console.log("[DEBUG] Converted data:", strData);
                term.write(strData);
            } else if (typeof data === "string") {
                console.log("[DEBUG] Received string data:", data);
                term.write(data);
            }
        }

        // Send terminal input back to server
        term.onData((data) => {
            socket.emit("terminalData", { data });
        });

        // Emit initial newline
        socket.emit("terminalData", { data: "\n" });

        // Cleanup
        return () => {
            socket.off("terminal");
        };
    }, [terminalRef, socket]);

    return <div style={{ width: "40vw", height: "400px", textAlign: "left" }} ref={terminalRef}></div>;
};
