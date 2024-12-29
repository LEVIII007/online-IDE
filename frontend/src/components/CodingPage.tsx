import { useEffect, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import { Editor } from './Editor';
import { File, RemoteFile, Type } from './external/editor/utils/file-manager';
import { useSearchParams } from 'react-router-dom';
import styled from '@emotion/styled';
import { Output } from './Output';
import { TerminalComponent as Terminal } from './Terminal';
import axios from 'axios';

function useSocket(replId: string) {
    const [socket, setSocket] = useState<Socket | undefined>(undefined);

    useEffect(() => {
        console.log(`[DEBUG] Initializing socket connection for replId: ${replId}`);
        const newSocket = io(`ws://${replId}.socket.shashankkk.site`);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log(`[DEBUG] Socket connected with ID: ${newSocket.id}`);
        });

        newSocket.on('disconnect', () => {
            console.log(`[DEBUG] Socket disconnected for replId: ${replId}`);
        });

        return () => {
            console.log(`[DEBUG] Disconnecting socket for replId: ${replId}`);
            newSocket.disconnect();
        };
    }, [replId]);

    return socket;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end; /* Aligns children (button) to the right */
  padding: 10px; /* Adds some space around the button */
`;

const Workspace = styled.div`
  display: flex;
  margin: 0;
  font-size: 16px;
  width: 100%;
`;

const LeftPanel = styled.div`
  flex: 1;
  width: 60%;
`;

const RightPanel = styled.div`
  flex: 1;
  width: 40%;
`;

export const CodingPage = () => {
    const [podCreated, setPodCreated] = useState(false);
    const [searchParams] = useSearchParams();
    const replId = searchParams.get('replId') ?? '';
    
    useEffect(() => {
        if (replId) {
            console.log(`[DEBUG] Sending request to start pod for replId: ${replId}`);
            axios.post(`http://localhost:3002/start`, { replId }) // Calls the orchestrator to start the pod
                .then(() => {
                    console.log(`[DEBUG] Pod created successfully for replId: ${replId}`);
                    setPodCreated(true);
                })
                .catch((err) => {
                    console.error(`[ERROR] Failed to create pod for replId: ${replId}`, err);
                });
        } else {
            console.warn("[WARN] No replId found in search parameters.");
        }
    }, []);

    if (!podCreated) {
        console.log("[DEBUG] Pod is not created yet. Showing booting message.");
        return <>Booting...</>;
    }

    return <CodingPagePostPodCreation />;
}

export const CodingPagePostPodCreation = () => {
    const [searchParams] = useSearchParams();
    const replId = searchParams.get('replId') ?? '';
    const [loaded, setLoaded] = useState(false);
    const socket = useSocket(replId);
    const [fileStructure, setFileStructure] = useState<RemoteFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
    const [showOutput, setShowOutput] = useState(false);

    useEffect(() => {
        if (socket) {
            console.log(`[DEBUG] Setting up socket event listeners for replId: ${replId}`);
            socket.on('loaded', ({ rootContent }: { rootContent: RemoteFile[] }) => {
                console.log("[DEBUG] Received 'loaded' event with root content:", rootContent);
                setLoaded(true);
                setFileStructure(rootContent);
            });

            return () => {
                console.log(`[DEBUG] Cleaning up socket listeners for replId: ${replId}`);
                socket.off('loaded');
            };
        }
    }, [socket]);

    const onSelect = (file: File) => {
        console.log(`[DEBUG] File selected: ${file.path}, Type: ${file.type}`);
        if (!socket) {
            console.warn("[WARN] Socket is not initialized.");
            return;
        }
        if (file.type === Type.DIRECTORY) {
            console.log(`[DEBUG] Fetching directory content for path: ${file.path}`);
            socket.emit("fetchDir", file.path, (data: RemoteFile[]) => {
                console.log("[DEBUG] Directory content fetched:", data);
                setFileStructure(prev => {
                    const allFiles = [...prev, ...data];
                    return allFiles.filter((file, index, self) =>
                        index === self.findIndex(f => f.path === file.path)
                    );
                });
            });
        } else {
            console.log(`[DEBUG] Fetching file content for path: ${file.path}`);
            socket.emit("fetchContent", { path: file.path }, (data: string) => {
                console.log(`[DEBUG] Content fetched for file: ${file.path}`);
                file.content = data;
                setSelectedFile(file);
            });
        }
    };

    if (!loaded) {
        console.log("[DEBUG] Workspace is not loaded yet. Showing loading message.");
        return "Loading...";
    }

    return (
        <Container>
            <ButtonContainer>
                <button onClick={() => setShowOutput(!showOutput)}>
                    {showOutput ? "Hide Output" : "See Output"}
                </button>
            </ButtonContainer>
            <Workspace>
                <LeftPanel>
                    {socket && (
                        <Editor
                            socket={socket}
                            selectedFile={selectedFile}
                            onSelect={onSelect}
                            files={fileStructure}
                        />
                    )}
                </LeftPanel>
                <RightPanel>
                    {showOutput && <Output />}
                    {socket && <Terminal socket={socket} />}
                </RightPanel>
            </Workspace>
        </Container>
    );
    
}
