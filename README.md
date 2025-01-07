# Online IDE
Online IDE is a cloud-based version of VS Code built using Kubernetes, Docker, and AWS S3. It allows users to select a programming language (e.g., Node.js, Python), sets up a coding environment, and provides an online code editor with a terminal.

# Features

- Supports multiple programming languages (Node.js, Python, etc.).
- Uses Kubernetes clusters and Docker containers for isolated environments.
- Automatically copies initial code templates from AWS S3.
- Provides terminal access for real-time coding and testing.
# Folder Structure
- frontend: Contains the frontend code.
- init-service: Handles code copying to and from AWS S3 buckets.
- ingresscontroller: Manages ingress.yaml files for the Kubernetes cluster.
- orchestrator-simple: Pulls Docker images, reads service.yaml, and creates services/deployments.
- runner: Contains the code of Docker image that runs the code and terminal.
# Prerequisites
- A running Kubernetes cluster.
- A valid domain name to configure in service.yaml.
- AWS S3 Bucket for storing and retrieving initial code templates.
- Docker installed and configured on your system.
# Environment Variables
Set the following environment variables in your project:

- AWS_ACCESS_KEY_ID: Your AWS access key.
- AWS_SECRET_ACCESS_KEY: Your AWS secret access key.
- AWS_REGION: Region of your AWS S3 bucket.
- S3_BUCKET_NAME: Name of the AWS S3 bucket.
- DOMAIN_NAME: Your domain for accessing the IDE.
- KUBECONFIG: Path to your Kubernetes configuration file.
## Setup and Running the Project
1. Clone the Repository
```bash
git clone https://github.com/your-username/online-ide.git
cd online-ide
```
2. Configure Environment Variables
Create a .env file in the root directory and add the required environment variables:

.env
```bash
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=your-aws-region
S3_BUCKET_NAME=your-s3-bucket-name
DOMAIN_NAME=your-domain.com
KUBECONFIG=/path/to/kubeconfig
```
3. Build and Push Docker Images
Navigate to the runner folder and build the Docker image:

```bash
cd runner
docker build -t your-dockerhub-username/runner:latest .
docker push your-dockerhub-username/runner:latest
```
4. Update service.yaml
In the orchestrator-simple folder, update the service.yaml file with your domain name and other configurations.

5. Deploy the Kubernetes Services
Deploy the Kubernetes services:

```bash
kubectl apply -f ingresscontroller/ingress.yaml
kubectl apply -f orchestrator-simple/service.yaml
```
6. Start the Application
Start the init-service:
```bash
cd init-service
npm install
npm start
```
Start the frontend:
```bash
cd frontend
npm install
npm run dev
```
Start the orchestrator-simple:
```bash
cd orchestrator-simple
npm install
npm run dev
```

### Contributing
Feel free to open issues or submit pull requests for enhancements or bug fixes.

### License
This project is licensed under the MIT License.
