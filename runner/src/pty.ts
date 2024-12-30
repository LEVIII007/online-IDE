//@ts-ignore => someone fix this
import { fork, IPty } from 'node-pty';
import path from "path";;

const SHELL = "cmd.exe";

export class TerminalManager {
    private sessions: { [id: string]: { terminal: IPty; replId: string } } = {};

    constructor() {
        this.sessions = {};
        console.log("[DEBUG] TerminalManager initialized with an empty session store.");
    }

    createPty(id: string, replId: string, onData: (data: string, id: number) => void) {
        console.log(`[DEBUG] Creating PTY for id: ${id}, replId: ${replId}`);
        
        const term = fork(SHELL, [], {
            cols: 100,
            name: "xterm",
            cwd: `/workspace`,
            
        });

        console.log(`[DEBUG] PTY created for id: ${id}, replId: ${replId}, pid: ${term.pid}`);

        term.on("data", (data : any) => {
            console.log(`[DEBUG] Data received from PTY (pid: ${term.pid}): ${data}`);
            onData(data, term.pid);
        });

        this.sessions[id] = {
            terminal: term,
            replId,
        };

        console.log(`[DEBUG] Session stored for id: ${id}, replId: ${replId}`);

        term.on("exit", (exitCode : any) => {
            console.log(`[DEBUG] PTY exited for id: ${id}, pid: ${term.pid}, exitCode: ${exitCode}`);
            delete this.sessions[id];
        });

        return term;
    }

    write(terminalId: any, data: any) {
        console.log(`[DEBUG] Writing data to terminalId: ${terminalId}, data: ${data}`);
        const session = this.sessions[terminalId];
        if (session) {
            session.terminal.write(data);
            console.log(`[DEBUG] Data written successfully to terminalId: ${terminalId}`);
        } else {
            console.warn(`[WARN] No active session found for terminalId: ${terminalId}`);
        }
    }

    clear(terminalId: any) {
        console.log(`[DEBUG] Clearing terminalId: ${terminalId}`);
        const session = this.sessions[terminalId];
        if (session) {
            session.terminal.kill();
            delete this.sessions[terminalId];
            console.log(`[DEBUG] TerminalId: ${terminalId} cleared and session deleted.`);
        } else {
            console.warn(`[WARN] No active session found to clear for terminalId: ${terminalId}`);
        }
    }
}
