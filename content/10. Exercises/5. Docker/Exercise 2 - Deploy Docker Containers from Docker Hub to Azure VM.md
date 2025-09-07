+++
title = "2. Deploy Docker Containers from Docker Hub to Azure VM"
weight = 2
date = 2025-09-07
draft = false
tags = ["docker", "azure", "vm", "containerization", "MOV"]
+++

## 🎯 Goal

Learn how to provision an Azure Virtual Machine with Docker pre-installed, then deploy containers from Docker Hub including both public images (nginx) and your own containerized applications from the previous exercise.

## 📋 Prerequisites

Before beginning this exercise, you should:

- Have an Azure subscription with credits available
- Have Azure CLI installed locally (version 2.0 or higher)
- Have completed the previous Docker exercise (PHP application pushed to Docker Hub with **multi-architecture support**)
- Have basic understanding of Linux command line
- Have SSH client available (built-in on Mac/Linux, use PowerShell on Windows)

> ⚠️ **Note**: If you haven't built your Docker image with multi-architecture support, refer to Step 3 in the previous tutorial for instructions using `docker buildx`

## 📚 Learning Objectives

By the end of this exercise, you will:

- Provision an **Azure VM** with Docker pre-installed using both Portal and CLI methods
- Configure **network security rules** to allow web traffic on multiple ports
- Deploy **public Docker images** from Docker Hub (nginx)
- Deploy **your own containerized application** from Docker Hub
- Understand how **cloud-init scripts** automate VM configuration

## 🔍 Why This Matters

In real-world scenarios, deploying containers to cloud VMs is crucial because:

- It provides a cost-effective way to run containerized applications in the cloud
- It enables rapid deployment and scaling of applications
- It's a stepping stone to understanding container orchestration (Kubernetes, ACI)
- It combines infrastructure management with modern containerization practices

## 📝 Step-by-Step Instructions

### Step 1: Provision an Azure VM with Docker

You can choose either the **Azure Portal** method (visual) or **Azure CLI** method (command line). Both achieve the same result.

#### Option A: Using Azure Portal

1. **Login to Azure Portal**
   - Navigate to [https://portal.azure.com](https://portal.azure.com)
   - Sign in with your Azure credentials

2. **Create a Resource Group**
   - Click "Resource groups" in the left menu
   - Click "+ Create"
   - Fill in:
     - **Subscription**: Select your subscription
     - **Resource group**: `DockerDemoRG`
     - **Region**: `North Europe`
   - Click "Review + create" then "Create"

3. **Create the Virtual Machine**
   - Click "Create a resource" → "Compute" → "Virtual machine"
   - **Basics tab**:
     - **Resource group**: Select `DockerDemoRG`
     - **Virtual machine name**: `DockerVM`
     - **Region**: `North Europe`
     - **Image**: `Ubuntu Server 22.04 LTS`
     - **Size**: `Standard_B1s` (1 vcpu, 1 GiB memory)
     - **Authentication type**: `SSH public key`
     - **Username**: `azureuser`
     - **SSH public key source**: Generate new key pair
     - **Key pair name**: `DockerVM_key`

4. **Configure Networking**
   - Click "Next: Disks" → "Next: Networking"
   - **Public inbound ports**: Select "Allow selected ports"
   - **Select inbound ports**: Check `SSH (22)`, `HTTP (80)`, `HTTPS (443)`
   - Add a new inbound port rule for port 8080:
     - After VM creation, go to "Networking" → "Add inbound port rule"
     - **Destination port ranges**: `8080`
     - **Name**: `Port_8080`

5. **Add Custom Data (Cloud-init)**
   - Click "Next: Management" → "Next: Monitoring" → "Next: Advanced"
   - In the **Custom data** field, paste:

   ```bash
   #!/bin/bash

   # Add Docker's official GPG key
   apt-get update
   apt-get install -y ca-certificates curl
   install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
   chmod a+r /etc/apt/keyrings/docker.asc

   # Add the repository to Apt sources
   echo \
     "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
     $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
     tee /etc/apt/sources.list.d/docker.list > /dev/null

   # Install Docker Engine
   apt-get update
   apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

   # Add azureuser to docker group
   usermod -aG docker azureuser
   ```

6. **Create the VM**
   - Click "Review + create"
   - Review the settings
   - Click "Create"
   - Download the private key when prompted

> 💡 **Information**
>
> - **Cloud-init**: Runs once when the VM first boots to configure the system
> - **Standard_B1s**: Most cost-effective size for testing (eligible for free tier)
> - **SSH Key**: More secure than password authentication
> - The VM creation takes 3-5 minutes to complete

#### Option B: Using Azure CLI

1. **Ensure you have the cloud-init script ready**:

   Create a file named `cloud-init_docker.sh` with the Docker installation commands:

   ```bash
   cat > cloud-init_docker.sh << 'EOF'
   #!/bin/bash

   # Add Docker's official GPG key
   apt-get update
   apt-get install -y ca-certificates curl
   install -m 0755 -d /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
   chmod a+r /etc/apt/keyrings/docker.asc

   # Add the repository to Apt sources
   echo \
     "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
     $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
     tee /etc/apt/sources.list.d/docker.list > /dev/null

   # Install Docker Engine
   apt-get update
   apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

   # Add azureuser to docker group
   usermod -aG docker azureuser
   EOF
   ```

2. **Run the provisioning script**:

   ```bash
   # Set variables
   RESOURCE_GROUP="DockerDemoRG"
   LOCATION="northeurope"
   VM_NAME="DockerVM"

   # Create resource group
   az group create --name $RESOURCE_GROUP --location $LOCATION

   # Create VM with Docker
   az vm create \
       --resource-group $RESOURCE_GROUP \
       --location $LOCATION \
       --name $VM_NAME \
       --image Ubuntu2204 \
       --size Standard_B1s \
       --admin-username azureuser \
       --generate-ssh-keys \
       --custom-data @cloud-init_docker.sh

   # Open required ports
   az vm open-port --port 80 --resource-group $RESOURCE_GROUP --name $VM_NAME
   az vm open-port --port 8080 --resource-group $RESOURCE_GROUP --name $VM_NAME --priority 1001
   ```

3. **Get the public IP address**:

   ```bash
   az vm show --resource-group $RESOURCE_GROUP --name $VM_NAME \
     --show-details --query [publicIps] --output tsv
   ```

> 💡 **Information**
>
> - **--generate-ssh-keys**: Creates SSH keys if they don't exist (~/.ssh/id_rsa)
> - **--custom-data**: Passes the cloud-init script to configure Docker
> - **--priority**: NSG rules need unique priorities (100-4096)
> - The script takes about 5 minutes to complete

### Step 2: Connect to the VM and Verify Docker Installation

1. **Get your VM's public IP address**:

   ```bash
   # If using CLI
   az vm list-ip-addresses --resource-group DockerDemoRG --name DockerVM --output table
   ```

   Or find it in the Azure Portal under your VM's Overview page.

2. **SSH into the VM**:

   ```bash
   ssh azureuser@<YOUR_VM_PUBLIC_IP>
   ```

   If you downloaded a private key from the Portal:

   ```bash
   ssh -i ~/Downloads/DockerVM_key.pem azureuser@<YOUR_VM_PUBLIC_IP>
   ```

3. **Wait for cloud-init to complete** (important!):

   ```bash
   ssh azureuser@<YOUR_VM_PUBLIC_IP> "cloud-init status --wait"
   ```

   This ensures Docker installation is complete before proceeding.

4. **Verify Docker is installed**:

   ```bash
   docker --version
   ```

   Expected output:

   ```text
   Docker version 27.x or higher, build xxxxxxx
   ```

5. **Test Docker without sudo**:

   ```bash
   docker run hello-world
   ```

   If you get a permission error, logout and login again for group changes to take effect:

   ```bash
   exit
   ssh azureuser@<YOUR_VM_PUBLIC_IP>
   ```

> 💡 **Information**
>
> - **First SSH connection**: May take 30-60 seconds as the VM finalizes setup
> - **Cloud-init**: Runs asynchronously - always wait for it to complete before testing Docker
> - **Group membership**: The azureuser needs to logout/login for docker group to be active
> - **Cloud-init logs**: Check `/var/log/cloud-init-output.log` if Docker isn't installed

### Step 3: Deploy nginx Container on Port 80

1. **Pull and run the official nginx container**:

   ```bash
   docker run -d \
     --name nginx-web \
     -p 80:80 \
     nginx:latest
   ```

2. **Verify the container is running**:

   ```bash
   docker ps
   ```

   Expected output:

   ```text
   CONTAINER ID   IMAGE         COMMAND                  PORTS                NAMES
   abc123def456   nginx:latest  "/docker-entrypoint..."  0.0.0.0:80->80/tcp   nginx-web
   ```

3. **Test nginx from the VM**:

   ```bash
   curl localhost
   ```

   You should see HTML output from nginx.

4. **Test from your browser**:

   Open: `http://<YOUR_VM_PUBLIC_IP>`

   You should see the nginx welcome page.

> 💡 **Information**
>
> - **-d**: Runs container in detached mode (background)
> - **-p 80:80**: Maps VM's port 80 to container's port 80
> - **--name**: Gives the container a friendly name for management
> - nginx serves a default welcome page on fresh installation
>
> ⚠️ **Common Issues**
>
> - If the page doesn't load, verify port 80 is open in the Network Security Group
> - Check if another service is using port 80: `sudo netstat -tulpn | grep :80`

### Step 4: Deploy Your PHP Application from Docker Hub

Now let's deploy the PHP application you containerized in the previous exercise.

1. **Run your PHP application container**:

   Replace `yourusername` with your Docker Hub username:

   ```bash
   docker run -d \
     --name php-app \
     --platform linux/amd64 \
     -p 8080:8000 \
     yourusername/php-contact-app:latest
   ```

   > 💡 **Important**: The `--platform linux/amd64` flag ensures compatibility with Azure VMs

   For example, if you followed the previous tutorial:

   ```bash
   docker run -d \
     --name php-app \
     --platform linux/amd64 \
     -p 8080:8000 \
     larsappel/php-contact-app:latest
   ```

2. **Verify both containers are running**:

   ```bash
   docker ps
   ```

   You should see both nginx and php-app containers:

   ```text
   CONTAINER ID   IMAGE                              PORTS                    NAMES
   def456ghi789   yourusername/php-contact-app      0.0.0.0:8080->8000/tcp   php-app
   abc123def456   nginx:latest                       0.0.0.0:80->80/tcp       nginx-web
   ```

3. **Test the PHP application**:

   From the VM:

   ```bash
   curl localhost:8080
   ```

   From your browser:
   - nginx: `http://<YOUR_VM_PUBLIC_IP>`
   - PHP app: `http://<YOUR_VM_PUBLIC_IP>:8080`

4. **Check container logs if needed**:

   ```bash
   docker logs php-app
   ```

> 💡 **Information**
>
> - **Port mapping**: VM port 8080 → Container port 8000
> - **Public images**: Docker automatically pulls from Docker Hub if not found locally
> - **Multiple containers**: Can run many containers on different ports
> - Each container is isolated but shares the VM's kernel

### Step 5: Container Management

Learn essential Docker commands for managing your deployed containers:

1. **View running containers**:

   ```bash
   docker ps
   ```

2. **View all containers (including stopped)**:

   ```bash
   docker ps -a
   ```

3. **Stop a container**:

   ```bash
   docker stop nginx-web
   docker stop php-app
   ```

4. **Start a stopped container**:

   ```bash
   docker start nginx-web
   docker start php-app
   ```

5. **View container resource usage**:

   ```bash
   docker stats
   ```

   Press `Ctrl+C` to exit.

6. **View container logs**:

   ```bash
   # View last 50 lines
   docker logs --tail 50 php-app
   
   # Follow logs in real-time
   docker logs -f nginx-web
   ```

> 💡 **Information**
>
> - **Container lifecycle**: Containers can be stopped/started without losing data
> - **Logs**: Essential for debugging - containers run in the background
> - **Stats**: Monitor CPU and memory usage of containers

## 🧪 Final Tests

### Validate Your Complete Deployment

1. **Check all services are accessible**:

   ```bash
   # From your local machine
   curl -I http://<YOUR_VM_PUBLIC_IP>        # Should return HTTP/1.1 200 OK
   curl -I http://<YOUR_VM_PUBLIC_IP>:8080   # Should return HTTP/1.1 200 OK
   ```

2. **Test the PHP application functionality**:

   ```bash
   # Test form submission
   curl -X POST \
     -d "name=Azure Test&email=test@azure.com&message=Hello from Azure VM!" \
     http://<YOUR_VM_PUBLIC_IP>:8080/process_contact_form.php
   ```

3. **Verify containers restart after VM reboot**:

   ```bash
   # Add restart policy to containers
   docker update --restart unless-stopped nginx-web
   docker update --restart unless-stopped php-app
   
   # Reboot VM (from Azure Portal or CLI)
   az vm restart --resource-group DockerDemoRG --name DockerVM
   ```

✅ **Expected Results**

- nginx welcome page loads on port 80
- PHP application loads on port 8080
- Contact form submissions work correctly
- Both containers are running simultaneously
- Containers automatically restart after VM reboot

## 🔧 Troubleshooting

Common issues and solutions:

### Port Access Issues

- **Cannot access website from browser**
  - Verify Network Security Group rules in Azure Portal
  - Check if containers are running: `docker ps`
  - Test locally first: `curl localhost:80`

### Docker Permission Denied

- **Error**: "permission denied while trying to connect to Docker daemon"
- **Solution**:

  ```bash
  # Logout and login again
  exit
  ssh azureuser@<YOUR_VM_PUBLIC_IP>
  ```

### Container Won't Start

- **Check logs**: `docker logs <container-name>`
- **Check port conflicts**: `docker ps` and `sudo netstat -tulpn`
- **Remove and recreate**:

  ```bash
  docker rm -f <container-name>
  docker run -d ...
  ```

### VM Performance Issues

- **Standard_B1s is limited**: Consider upgrading to Standard_B2s for production
- **Check resource usage**: `docker stats` and `top`

## 🧹 Clean Up

After completing the exercise, clean up to avoid charges:

### Option A: Clean Up via Portal

1. Navigate to Resource Groups
2. Select `DockerDemoRG`
3. Click "Delete resource group"
4. Type the resource group name to confirm
5. Click "Delete"

### Option B: Clean Up via CLI

```bash
# Delete the entire resource group
az group delete --name DockerDemoRG --yes --no-wait
```

### Keep Containers, Delete VM Only

If you want to practice locally with Docker:

```bash
# Save container images locally first
docker save yourusername/php-contact-app:latest -o php-app.tar
docker save nginx:latest -o nginx.tar

# Then delete Azure resources
az group delete --name DockerDemoRG --yes
```

## 🚀 Optional Challenge

Want to extend your learning? Try these challenges:

1. **Add SSL/HTTPS with Let's Encrypt**:
   - Run nginx-proxy with automatic SSL
   - Configure your containers to work with HTTPS

2. **Deploy a Database Container**:
   - Add MySQL or PostgreSQL container
   - Connect your PHP app to the database
   - Use Docker networks for container communication

3. **Implement Docker Compose**:
   - Create a `docker-compose.yml` for both services
   - Deploy the entire stack with one command

4. **Set Up Monitoring**:
   - Deploy Prometheus and Grafana containers
   - Monitor your containers' performance

5. **Automate with Azure DevOps**:
   - Create a pipeline to deploy containers automatically
   - Implement continuous deployment from Docker Hub

## 📚 Further Reading

- [Azure Virtual Machines Documentation](https://docs.microsoft.com/en-us/azure/virtual-machines/)
- [Docker on Azure Documentation](https://docs.docker.com/cloud/aci-integration/)
- [Azure Container Instances](https://azure.microsoft.com/en-us/services/container-instances/) - Serverless containers
- [Azure Kubernetes Service](https://azure.microsoft.com/en-us/services/kubernetes-service/) - Next step in container orchestration

## Done! 🎉

Excellent work! You've successfully deployed Docker containers from Docker Hub to an Azure VM. You now understand how to:

- ✅ Provision cloud infrastructure with automated configuration
- ✅ Deploy multiple containers on different ports
- ✅ Manage containers in a cloud environment
- ✅ Combine IaaS (VMs) with containerization

This foundation prepares you for more advanced topics like container orchestration with Kubernetes and serverless containers with Azure Container Instances! 🚀

Your deployed application demonstrates the power of combining cloud infrastructure with containerization - a critical skill for modern cloud engineering!
