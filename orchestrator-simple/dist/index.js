import express from "express";
import fs from "fs";
import yaml from "yaml";
import path from "path";
import cors from "cors";
import * as k8s from "@kubernetes/client-node";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
app.use(express.json());
app.use(cors());
const kubeconfig = new k8s.KubeConfig();
kubeconfig.loadFromDefault();
const coreV1Api = kubeconfig.makeApiClient(k8s.CoreV1Api);
const appsV1Api = kubeconfig.makeApiClient(k8s.AppsV1Api);
const networkingV1Api = kubeconfig.makeApiClient(k8s.NetworkingV1Api);
const readAndParseKubeYaml = (filePath, replId) => {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const docs = yaml.parseAllDocuments(fileContent).map((doc) => {
        let docString = doc.toString();
        const regex = new RegExp(`service_name`, 'g');
        docString = docString.replace(regex, replId);
        console.log(docString);
        return yaml.parse(docString);
    });
    return docs;
};
app.post("/start", async (req, res) => {
    const { userId, replId } = req.body;
    const namespace = "default";
    try {
        const kubeManifests = readAndParseKubeYaml(path.join(__dirname, "../service.yaml"), replId);
        for (const manifest of kubeManifests) {
            switch (manifest.kind) {
                case "Deployment":
                    await appsV1Api.createNamespacedDeployment(namespace, manifest);
                    break;
                // Handle other kinds of manifests as needed
            }
        }
        res.status(200).send("Kubernetes resources created successfully");
    }
    catch (error) {
        console.error("Error creating Kubernetes resources:", error);
        res.status(500).send("Error creating Kubernetes resources");
    }
});
app.listen(3002, () => {
    console.log("Server is running on port 3001");
});
