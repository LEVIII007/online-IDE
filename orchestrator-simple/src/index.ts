import express from "express";
import fs from "fs";
import yaml from "yaml";
import path from "path";
import cors from "cors";
import { KubeConfig, AppsV1Api, CoreV1Api, NetworkingV1Api } from "@kubernetes/client-node";
import { fileURLToPath } from "url";
import { dirname } from "path";

const app = express();
app.use(express.json());
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Kubernetes Config and API clients
const kubeconfig = new KubeConfig();
console.log("[DEBUG] Loading kubeconfig...");
kubeconfig.loadFromDefault();
const coreV1Api = kubeconfig.makeApiClient(CoreV1Api);
const appsV1Api = kubeconfig.makeApiClient(AppsV1Api);
const networkingV1Api = kubeconfig.makeApiClient(NetworkingV1Api);

// Utility function to read and parse multi-document YAML files
const readAndParseKubeYaml = (filePath: string, replId: string): Array<any> => {
    console.log(`[DEBUG] Reading and parsing YAML file from path: ${filePath}`);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const docs = yaml.parseAllDocuments(fileContent).map((doc) => {
        let docString = doc.toString();
        console.log(`[DEBUG] Replacing 'service_name' with '${replId}' in YAML content`);
        const regex = new RegExp(`service_name`, 'g');
        docString = docString.replace(regex, replId);
        console.log(`[DEBUG] Updated YAML Document:\n${docString}`);
        return yaml.parse(docString);
    });
    return docs;
};

app.post("/start", async (req, res) => {
    const { replId } = req.body; // Assume a unique identifier for each user
    const namespace = "default"; // Assuming a default namespace, adjust as needed

    try {
        // Check if the Deployment already exists
        console.log(`[DEBUG] Checking if Deployment ${replId} exists in namespace ${namespace}`);

        try {
            await appsV1Api.readNamespacedDeployment(replId, namespace);
            console.log(`[DEBUG] Deployment ${replId} already exists in namespace ${namespace}`);
            return res.status(200).send({ message: `Resources for replId ${replId} already exist.` });
        } catch (err) {
            if (err.response && err.response.statusCode === 404) {
                console.log(`[DEBUG] Deployment ${replId} does not exist. Proceeding to create resources.`);
            } else {
                console.error("[ERROR] Error checking Deployment existence", err);
                return res.status(500).send({ message: "Failed to check existing resources." });
            }
        }

        // Read and parse Kubernetes manifests
        const kubeManifests = readAndParseKubeYaml(path.join(__dirname, "../service.yaml"), replId);
        console.log(`[DEBUG] Successfully parsed ${kubeManifests.length} manifest(s)`);

        for (const manifest of kubeManifests) {
            console.log(`[DEBUG] Processing manifest kind: ${manifest.kind}`);
            switch (manifest.kind) {
                case "Deployment":
                    console.log(`[DEBUG] Creating Deployment for ${replId} in namespace ${namespace}`);
                    await appsV1Api.createNamespacedDeployment(namespace, manifest);
                    console.log(`[DEBUG] Successfully created Deployment for ${replId}`);
                    break;
                case "Service":
                    console.log(`[DEBUG] Creating Service for ${replId} in namespace ${namespace}`);
                    await coreV1Api.createNamespacedService(namespace, manifest);
                    console.log(`[DEBUG] Successfully created Service for ${replId}`);
                    break;
                case "Ingress":
                    console.log(`[DEBUG] Creating Ingress for ${replId} in namespace ${namespace}`);
                    await networkingV1Api.createNamespacedIngress(namespace, manifest);
                    console.log(`[DEBUG] Successfully created Ingress for ${replId}`);
                    break;
                default:
                    console.warn(`[WARN] Unsupported manifest kind: ${manifest.kind}`);
            }
        }

        res.status(200).send({ message: "Resources created successfully" });
        console.log(`[DEBUG] Resources created successfully for replId: ${replId}`);
    } catch (error) {
        console.error("[ERROR] Failed to create resources", error);
        res.status(500).send({ message: "Failed to create resources" });
    }
});

// Set the server port and start the Express server
const port = process.env.PORT || 3002;
app.listen(port, () => {
    console.log(`[DEBUG] Server is listening on port: ${port}`);
});
