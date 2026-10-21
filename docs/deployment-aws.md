# Cloud Deployment Guide — AWS EC2 & Multi-Node Architecture

This guide describes how to deploy the **Cloud-Based Distributed Image Processing System** in **Cloud Mode** across AWS EC2 instances, leveraging Amazon S3 for shared object storage, MongoDB Atlas, and private VPC networking.

---

## 1. Cloud Architecture Overview

In Cloud Mode:
- **Web & API Host (EC2 Node 1)**: Runs the React SPA (via Nginx on port 80/443), the FastAPI Gateway, and a private Redis broker.
- **Worker Host (EC2 Node 2 / Multiple Instances)**: Runs independent Celery worker containers dedicated exclusively to CPU-bound Pillow processing.
- **Shared Object Storage (Amazon S3)**: Replaces local shared Docker volumes, providing a unified, durable, and globally accessible image repository for all worker nodes.
- **Managed Database (MongoDB Atlas)**: Stores task metadata, batch states, and benchmark statistics.

```
                      Internet
                         |
                         v (Ports 80 / 443)
              +-----------------------+
              |   EC2 Instance #1     |
              |   (Web & API Server)  |
              |  - React SPA (Nginx)  |
              |  - FastAPI Gateway    |
              |  - Redis Broker (Prv) |
              +-----------+-----------+
                          |
              +-----------+-----------+ Private Subnet (VPC)
              |                       | (Port 6379)
              v                       v
    +-------------------+   +-------------------+
    |  EC2 Instance #2  |   |  EC2 Instance #3  |
    |  (Worker Node A)  |   |  (Worker Node B)  |
    |  - Celery Worker  |   |  - Celery Worker  |
    |    (4 Threads)    |   |    (4 Threads)    |
    +---------+---------+   +---------+---------+
              |                       |
              +-----------+-----------+
                          | Read / Write Images
                          v
               +---------------------+
               |   Amazon S3 Bucket  |
               | (cdc-image-storage) |
               +---------------------+
```

---

## 2. Prerequisites & AWS Resources

1. **AWS Account** with permissions to create EC2, S3, IAM, and VPC resources.
2. **EC2 Instance Types**:
   - Web/API Node: `t3.small` or `t3.medium` (2 vCPU, 4GB RAM)
   - Worker Nodes: `c6i.large` or `c7g.large` (2-4 vCPU compute-optimized for Pillow image processing)
3. **OS Image**: Ubuntu 22.04 LTS (x86_64 or ARM64)
4. **Amazon S3 Bucket**: e.g., `cdc-image-storage-<student-id>`

---

## 3. Step-by-Step Deployment Procedure

### Step 3.1: Security Group Configuration

Create two security groups within your VPC:

1. **`cdc-web-sg` (Web & API Server)**:
   - Inbound: `HTTP (80)` from `0.0.0.0/0`
   - Inbound: `HTTPS (443)` from `0.0.0.0/0`
   - Inbound: `SSH (22)` from your administrator IP
   - Inbound: `Custom TCP (6379)` from `cdc-worker-sg` (Private Redis connection)

2. **`cdc-worker-sg` (Distributed Worker Nodes)**:
   - Inbound: `SSH (22)` from your administrator IP
   - Outbound: All traffic (`0.0.0.0/0` for S3 and MongoDB Atlas access)

> **Security Rule**: Keep port 6379 (Redis) strictly off public interfaces. Only nodes inside the VPC with `cdc-worker-sg` can communicate with Redis.

---

### Step 3.2: Create Amazon S3 Bucket & IAM Policy

1. Create an S3 bucket named `cdc-image-processor-storage` in `us-east-1`. Enable default encryption (SSE-S3) and block all public access.
2. Attach an IAM role or credentials with the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::cdc-image-processor-storage",
        "arn:aws:s3:::cdc-image-processor-storage/*"
      ]
    }
  ]
}
```

---

### Step 3.3: Install Docker & Docker Compose on EC2

SSH into your EC2 instances and run:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

---

### Step 3.4: Deploy Web & API Server (EC2 Node 1)

1. Clone project repository on Node 1:
   ```bash
   git clone <repo-url> /opt/cdc-project
   cd /opt/cdc-project
   ```

2. Configure production `.env`:
   ```ini
   DEPLOYMENT_MODE=cloud
   DEBUG=false
   CORS_ORIGINS=http://<EC2-PUBLIC-IP>,https://yourdomain.com
   MONGO_URL=mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
   MONGO_DB_NAME=cdc_image_processor
   REDIS_URL=redis://172.31.x.x:6379/0  # Private IP of Node 1
   STORAGE_BACKEND=s3
   AWS_ACCESS_KEY_ID=<YOUR_KEY_ID>
   AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_KEY>
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=cdc-image-processor-storage
   API_KEY=prod-secret-key-cdc-2026
   ```

3. Launch Web & Broker services:
   ```bash
   docker compose -f docker-compose.cloud.yml up -d --build api frontend
   ```

---

### Step 3.5: Deploy Independent Worker Nodes (EC2 Node 2 & 3)

1. SSH into the worker EC2 instance.
2. Clone repository:
   ```bash
   git clone <repo-url> /opt/cdc-project
   cd /opt/cdc-project
   ```
3. Copy the same `.env` file pointing to Node 1's private Redis IP:
   ```ini
   REDIS_URL=redis://172.31.x.x:6379/0  # Node 1 Private IP
   CELERY_BROKER_URL=redis://172.31.x.x:6379/0
   CELERY_RESULT_BACKEND=redis://172.31.x.x:6379/1
   STORAGE_BACKEND=s3
   S3_BUCKET_NAME=cdc-image-processor-storage
   ```
4. Start workers:
   ```bash
   docker compose -f docker-compose.cloud.yml up -d --build worker-1 worker-2
   ```

---

### Step 3.6: Horizontal Worker Scaling on AWS

To instantly scale processing throughput during heavy load:
```bash
docker compose -f docker-compose.cloud.yml up --scale worker-1=8 -d
```
All new worker threads immediately register with Redis and start pulling tasks from the queue with zero downtime.
