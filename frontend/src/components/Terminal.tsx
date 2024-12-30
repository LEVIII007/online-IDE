import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

const OPTIONS_TERM = {
    cursorBlink: true,
    cols: 100,
    theme: {
        background: "#1d1f21",
        foreground: "#c5c8c6",
        cursor: "#c5c8c6",
    },
};

const term = new Terminal(OPTIONS_TERM);

export const TerminalComponent = ({ socket }: { socket: Socket }) => {
    const terminalRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!terminalRef.current || !socket) return;

        // Initialize terminal
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);

        // Ensure terminal resizes properly initially
        fitAddon.fit();

        // Request terminal session from server
        socket.emit("requestTerminal");

        // Listen for terminal data from the server
        socket.on("terminal", (payload: { data: ArrayBuffer | string }) => {
            if (payload.data instanceof ArrayBuffer) {
                const strData = new TextDecoder().decode(payload.data);
                console.log("[DEBUG] Terminal data:", strData);
                term.write(strData);
            } else if (typeof payload.data === "string") {
                term.write(payload.data);
            }
        });

        // Handle terminal input and send it to the server
        term.onData((data) => {
            console.log("[DEBUG] Terminal input+++:", data);
            socket.emit("terminalData", { data });
        });

        // Listen for resize events and adjust terminal size
        window.addEventListener("resize", () => {
            fitAddon.fit();
        });

        // Cleanup on component unmount
        return () => {
            term.dispose();
            socket.off("terminal");
            window.removeEventListener("resize", () => fitAddon.fit());
        };
    }, [socket]);

    return <div style={{ width: "100%", height: "100vh" }} ref={terminalRef}></div>;
};
