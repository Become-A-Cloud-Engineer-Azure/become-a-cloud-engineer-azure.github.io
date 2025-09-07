+++
title = "4. Deploy Containers to Azure Container Apps"
weight = 4
date = 2025-09-07
draft = false
tags = ["docker", "azure", "container-apps", "paas", "MOV"]
+++

## 📚 Learning Objectives

After completing this exercise, you will be able to:
- Deploy containers to Azure Container Apps
- Use both Azure Portal and Azure CLI for deployment
- Update running containers with new images
- Understand the benefits of serverless container hosting
- Manage container applications without infrastructure complexity

## 🔧 Prerequisites

- Azure subscription with credits
- Azure CLI installed (version 2.37.0 or later)
- Docker Hub account with your PHP application from Exercise 1
- Basic understanding of containers

## 📋 What is Azure Container Apps?

Azure Container Apps is a **serverless container hosting service** that allows you to:
- Run containers without managing servers
- Automatically scale based on traffic
- Pay only for what you use
- Deploy from any container registry
- Support microservices and web apps

Think of it as: **"Just give Azure your container, and it handles everything else"**

## 🎯 Part A: Deploy via Azure Portal

### Step 1: Create Container Apps Environment

1. Navigate to [Azure Portal](https://portal.azure.com)

2. Click **"Create a resource"** → Search for **"Container App"**

3. Click **"Create"** on the Container App page

4. **Basics tab:**
   - Subscription: Select your subscription
   - Resource group: Create new → `container-apps-demo-rg`
   - Container app name: `php-demo-app`
   - Region: `North Europe` (or your preferred region)
   - Container Apps Environment: Create new

5. **Container Apps Environment:**
   - Environment name: `container-apps-env`
   - Zone redundancy: Disabled (for demo)
   - Click **OK**

### Step 2: Configure Container

1. **Container tab:**
   - Image source: `Docker Hub or other registries`
   - Image type: `Public`
   - Registry login server: `docker.io`
   - Image and tag: `nginx:alpine` (we'll start with nginx)
   - CPU and Memory: `0.25 CPU cores, 0.5 Gi memory`

### Step 3: Configure Ingress

1. **Ingress tab:**
   - Ingress: `Enabled`
   - Ingress traffic: `Accepting traffic from anywhere`
   - Ingress type: `HTTP`
   - Target port: `80`

2. Click **"Review + create"** → **"Create"**

3. Wait for deployment (typically 2-3 minutes)

### Step 4: Test the Deployment

1. Go to your Container App resource
2. Click on **"Application Url"** in the Overview
3. You should see the nginx welcome page

### Step 5: Update to Your PHP Application

1. In your Container App, go to **"Containers"** → **"Edit and deploy"**

2. Update the image:
   - Image and tag: `yourusername/php-simple-app:latest`
   - Target port: Keep as `80` (or `8000` if using PHP built-in server)

3. Click **"Save"** → **"Create"**

4. Wait for the new revision to deploy

5. Refresh your application URL - you should see your PHP app!

## 🎯 Part B: Deploy via Azure CLI

### Step 1: Run the Provisioning Script

Create a script that automates the entire process:

> provision-container-app.sh

```bash
#!/bin/bash

# Azure Container Apps Provisioning Script
# This script deploys a container to Azure Container Apps
# First with nginx, then updates to a custom PHP application

# Configuration variables
RESOURCE_GROUP="container-apps-demo-rg"
LOCATION="northeurope"
ENVIRONMENT="container-apps-env"
APP_NAME="php-demo-app"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first."
    echo "Visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

print_status "Starting Azure Container Apps deployment..."

# Step 1: Create Resource Group
print_status "Creating Resource Group: $RESOURCE_GROUP"
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION \
    --output none

if [ $? -eq 0 ]; then
    print_status "Resource Group created successfully"
else
    print_error "Failed to create Resource Group"
    exit 1
fi

# Step 2: Create Container Apps Environment
print_status "Creating Container Apps Environment: $ENVIRONMENT"
az containerapp env create \
    --name $ENVIRONMENT \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --output none

if [ $? -eq 0 ]; then
    print_status "Container Apps Environment created successfully"
else
    print_error "Failed to create Container Apps Environment"
    exit 1
fi

# Step 3: Deploy nginx container first
print_status "Deploying nginx container to test the setup..."
NGINX_URL=$(az containerapp create \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment $ENVIRONMENT \
    --image nginx:alpine \
    --target-port 80 \
    --ingress external \
    --query properties.configuration.ingress.fqdn \
    --output tsv)

if [ $? -eq 0 ]; then
    print_status "nginx container deployed successfully"
    print_status "Application URL: https://$NGINX_URL"
    echo ""
    print_warning "Please test the nginx deployment at: https://$NGINX_URL"
    echo ""
else
    print_error "Failed to deploy nginx container"
    exit 1
fi

# Step 4: Ask user if they want to update to PHP app
read -p "Do you want to update to your PHP application? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Get Docker Hub username
    read -p "Enter your Docker Hub username: " DOCKER_USERNAME
    
    # Update to PHP application
    print_status "Updating to PHP application..."
    PHP_URL=$(az containerapp update \
        --name $APP_NAME \
        --resource-group $RESOURCE_GROUP \
        --image $DOCKER_USERNAME/php-simple-app:latest \
        --query properties.configuration.ingress.fqdn \
        --output tsv)
    
    if [ $? -eq 0 ]; then
        print_status "PHP application deployed successfully"
        print_status "Application URL: https://$PHP_URL"
    else
        print_error "Failed to update to PHP application"
        print_warning "Container might not exist on Docker Hub. Please push it first:"
        echo "  docker push $DOCKER_USERNAME/php-simple-app:latest"
    fi
fi

# Step 5: Display summary
echo ""
echo "========================================="
echo "Deployment Summary"
echo "========================================="
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo "Environment: $ENVIRONMENT"
echo "App Name: $APP_NAME"
echo "App URL: https://$NGINX_URL"
echo "========================================="

# Step 6: Cleanup option
echo ""
read -p "Do you want to delete all resources? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deleting all resources..."
    az group delete \
        --name $RESOURCE_GROUP \
        --yes \
        --no-wait
    print_status "Resource deletion initiated (running in background)"
else
    print_status "Resources kept. To delete later, run:"
    echo "  az group delete --name $RESOURCE_GROUP --yes"
fi

print_status "Script completed!"
```

```bash
# Make it executable
chmod +x provision-container-app.sh

# Run the script
./provision-container-app.sh
```

### Step 2: Manual CLI Commands

If you prefer to run commands individually:

```bash
# Set variables
RESOURCE_GROUP="container-apps-demo-rg"
LOCATION="northeurope"
ENVIRONMENT="container-apps-env"
APP_NAME="php-demo-app"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create environment
az containerapp env create \
    --name $ENVIRONMENT \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION

# Deploy nginx first
az containerapp create \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment $ENVIRONMENT \
    --image nginx:alpine \
    --target-port 80 \
    --ingress external

# Get the URL
az containerapp show \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query properties.configuration.ingress.fqdn \
    --output tsv

# Update to your PHP app
az containerapp update \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --image yourusername/php-simple-app:latest
```

## 🔍 Viewing Logs and Monitoring

### Via Portal:
1. Go to your Container App
2. Click **"Log stream"** to see real-time logs
3. Click **"Metrics"** to view performance data

### Via CLI:
```bash
# View logs
az containerapp logs show \
    --name php-demo-app \
    --resource-group container-apps-demo-rg \
    --follow

# View recent logs
az containerapp logs show \
    --name php-demo-app \
    --resource-group container-apps-demo-rg \
    --tail 100
```

## 🎯 Testing Your Application

1. **Get the application URL:**
```bash
az containerapp show \
    --name php-demo-app \
    --resource-group container-apps-demo-rg \
    --query properties.configuration.ingress.fqdn \
    --output tsv
```

2. **Test with curl:**
```bash
APP_URL=$(az containerapp show -n php-demo-app -g container-apps-demo-rg --query properties.configuration.ingress.fqdn -o tsv)
curl https://$APP_URL
```

3. **Open in browser:**
   - Navigate to the URL provided
   - Test your PHP contact form

## 💰 Cost Considerations

Azure Container Apps pricing:
- **Free tier**: 180,000 vCPU-seconds per month
- **Free tier**: 360,000 GiB-seconds per month
- **After free tier**: ~$0.000024 per vCPU-second

For our demo app (0.25 vCPU):
- Running 24/7 for a month: ~648,000 vCPU-seconds
- Cost after free tier: ~$11/month
- With minimal traffic: Likely stays within free tier

## 🧹 Cleanup

To avoid charges, delete all resources:

### Via Portal:
1. Go to Resource Groups
2. Select `container-apps-demo-rg`
3. Click **"Delete resource group"**
4. Type the resource group name to confirm
5. Click **"Delete"**

### Via CLI:
```bash
# Delete everything
az group delete --name container-apps-demo-rg --yes --no-wait
```

## 📝 Troubleshooting

### Container fails to start
- Check image name and tag are correct
- Verify image exists on Docker Hub
- Check target port matches your application

### Application not accessible
- Ensure ingress is enabled
- Check target port configuration
- View logs for error messages

### Image pull errors
```bash
# For private registries, configure credentials
az containerapp registry set \
    --name php-demo-app \
    --resource-group container-apps-demo-rg \
    --server docker.io \
    --username your-docker-username \
    --password your-docker-password
```

## 🎉 Summary

You've successfully:
- ✅ Deployed containers to Azure Container Apps
- ✅ Used both Portal and CLI methods
- ✅ Updated containers with new images
- ✅ Accessed logs and monitoring
- ✅ Learned serverless container hosting

### Key Benefits of Container Apps:
- **No infrastructure management** - Azure handles everything
- **Automatic scaling** - Scales to zero when not in use
- **Simple deployment** - Just provide the container image
- **Cost-effective** - Pay only for actual usage
- **Built-in ingress** - Automatic HTTPS with certificates

## 🚀 Next Steps

- Deploy the multi-container setup from Exercise 3
- Configure custom domains
- Set up continuous deployment from GitHub
- Explore scaling rules and Dapr integration
- Try Azure Container Apps jobs for batch processing

## 📚 Additional Resources

- [Azure Container Apps Documentation](https://docs.microsoft.com/azure/container-apps/)
- [Container Apps Pricing](https://azure.microsoft.com/pricing/details/container-apps/)
- [Container Apps CLI Reference](https://docs.microsoft.com/cli/azure/containerapp)
- [Container Apps vs Other Services](https://docs.microsoft.com/azure/container-apps/compare-options)