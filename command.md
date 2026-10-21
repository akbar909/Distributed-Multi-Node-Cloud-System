# Cloud Deployment & Daily Startup Guide

This guide contains the exact, copy-paste commands to restart the **CDC Image Processor** cloud cluster on AWS EC2 anytime.

---

## 📌 Step 1: Check your IPs in AWS EC2 Console

> **Important**: Whenever you **Stop** and **Start** your EC2 instances in the AWS Management Console, AWS automatically assigns new **Public IPs** (unless Elastic IPs are attached). The Private IP usually stays the same.

Before connecting, check the AWS Console and note:
- **Master Public IP** (e.g. `54.242.75.198`)
- **Master Private IP** (e.g. `172.31.17.112`)
- **Worker Public IP** (e.g. `18.212.98.196`)

---

## 🚀 Step 2: Start Master Node (Terminal 1)

Open a terminal on your computer (in your project directory with your key `cdc-project-key.pem`):

```bash
# 1. SSH into the Master Node
ssh -i cdc-project-key.pem ubuntu@<MASTER-PUBLIC-IP>

# 2. Navigate to project folder
cd ~/project

# 3. Start all master services in background
docker compose up -d
```

> **Services running on Master:**  
> `cdc-redis` (Message Broker)  
> `cdc-mongodb` (Database)  
> `cdc-api` (FastAPI Backend)  
> `cdc-frontend` (React Web UI)

---

## ⚙️ Step 3: Start Worker Node (Terminal 2)

Open a **second terminal** on your computer:

```bash
# 1. SSH into the Worker Node
ssh -i cdc-project-key.pem ubuntu@<WORKER-PUBLIC-IP>

# 2. Navigate to project folder
cd ~/project

# 3. Start the worker containers
docker compose up -d worker-1 worker-2
```

---

### ⚠️ If Master Private IP Changed:
If the Master's **Private IP** changed after starting EC2, run this single command on the **Worker Node** to update `.env`, then restart the workers:

```bash
sed -i 's|redis://[0-9.]*:6379|redis://<NEW-MASTER-PRIVATE-IP>:6379|g' .env
docker compose up -d --force-recreate worker-1 worker-2
```

---

## 🌐 Step 4: Open the Web Application

In any web browser, navigate to:

```text
http://<MASTER-PUBLIC-IP>/
```

### Useful Direct Links:
- **Dashboard**: `http://<MASTER-PUBLIC-IP>/`
- **Worker Monitor**: `http://<MASTER-PUBLIC-IP>/workers`
- **Upload Images**: `http://<MASTER-PUBLIC-IP>/upload`
- **Task Monitor**: `http://<MASTER-PUBLIC-IP>/tasks`
- **Live Benchmarks**: `http://<MASTER-PUBLIC-IP>/benchmarks`

---

## 🔍 How to Verify Everything is Running

### On Master Node:
```bash
docker compose ps
```
*(All containers: `cdc-redis`, `cdc-mongodb`, `cdc-api`, `cdc-frontend` should show `Up`)*

### On Worker Node:
```bash
# View worker container status
docker compose ps

# View live Celery connection logs
docker logs cdc-worker-1 --tail 25
```
*(You should see `broker: redis://<MASTER-PRIVATE-IP>:6379/0` and `worker-1@... ready`)*

---

## 🛑 How to Stop Everything Cleanly

When you are done with testing or presenting:

- **On Master Node**:
  ```bash
  docker compose down
  ```

- **On Worker Node**:
  ```bash
  docker compose down
  ```

- **In AWS Console**: Stop (not terminate) both EC2 instances to avoid using up AWS free tier hours.
