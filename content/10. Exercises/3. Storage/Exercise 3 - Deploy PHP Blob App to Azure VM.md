+++
title = "3. Deploy PHP Blob Storage App to Azure Virtual Machine"
weight = 3
date = 2025-08-24
draft = false
+++

## Introduction

In this tutorial, we'll deploy the PHP web application from Exercise 2 to an Azure Virtual Machine.
This exercise builds on the previous one where we created a PHP app to display images from Azure
Blob Storage. Now we'll provision an Azure VM and deploy our application to make it accessible
over the internet.

## Prerequisites

- Completed Exercise 2 (PHP Blob Storage App)
- An Azure account with an active subscription
- Basic understanding of Linux and SSH
- Your PHP application code from Exercise 2

## Step 1: Prepare Your Application for Deployment

First, ensure your PHP application is ready for deployment with proper environment configuration.

### Configure environment variables

In your local `blob-storage-php` directory, update your `.env` file with your actual Azure Storage
connection string:

```bash
# Azure Blob Storage Configuration
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=yourstorageaccount;AccountKey=yourkey;EndpointSuffix=core.windows.net"
AZURE_STORAGE_CONTAINER_NAME="imagerepository"
```

**Important:** Replace the connection string with your actual values from Exercise 2.

### Create cloud-init configuration

Create a cloud-init file that will automatically configure the VM during provisioning:

> cloud-init.yaml

```yaml
#cloud-config
package_update: true
package_upgrade: true

packages:
  - php
  - php-cli
  - php-curl
  - php-json
  - php-mbstring
  - php-xml
  - php-fpm
  - nginx
  - curl

write_files:
  - path: /etc/nginx/sites-available/blobapp
    content: |
      server {
          listen 80;
          server_name _;
          root /var/www/blobapp;
          index index.php index.html;

          location / {
              try_files $uri $uri/ =404;
          }

          location ~ \.php$ {
              include snippets/fastcgi-php.conf;
              fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
          }

          location ~ /\.ht {
              deny all;
          }
      }

runcmd:
  # Install Composer
  - cd /tmp && curl -sS https://getcomposer.org/installer | php
  - mv /tmp/composer.phar /usr/local/bin/composer
  - chmod +x /usr/local/bin/composer
  
  # Create web directory
  - mkdir -p /var/www/blobapp
  - chown -R www-data:www-data /var/www/blobapp
  - chmod -R 755 /var/www/blobapp
  
  # Configure Nginx
  - rm /etc/nginx/sites-enabled/default
  - ln -s /etc/nginx/sites-available/blobapp /etc/nginx/sites-enabled/blobapp
  - systemctl restart nginx
  - systemctl enable nginx
  - systemctl restart php8.1-fpm
  - systemctl enable php8.1-fpm
```

## Step 2: Create Azure Virtual Machine via Portal

### Create a Virtual Machine

1. **Navigate to Virtual Machines**
   - Go to the [Azure Portal](https://portal.azure.com)
   - Search for "Virtual machines" and select it

2. **Create new VM**
   - Click **+ Create** → **Virtual machine**

3. **Configure Basic Settings**
   - **Subscription**: Select your subscription
   - **Resource group**: Create new → `blob-app-rg`
   - **Virtual machine name**: `blob-app-vm`
   - **Region**: Choose a region close to you
   - **Image**: `Ubuntu Server 22.04 LTS - x64 Gen2`
   - **Size**: `Standard_B1s` (1 vCPU, 1 GB RAM - sufficient for demo)

4. **Configure Administrator Account**
   - **Authentication type**: SSH public key
   - **Username**: `azureuser`
   - **SSH public key source**: Use existing public key stored in Azure
   - **SSH public key**: Paste your existing public key (from `~/.ssh/id_rsa.pub`)

5. **Configure Inbound Port Rules**
   - **Public inbound ports**: Allow selected ports
   - **Select inbound ports**: SSH (22), HTTP (80)

6. **Advanced Settings**
   - Click **Advanced** tab
   - **Custom data**: Copy and paste the contents of your `cloud-config.yaml` file

7. **Review and Create**
   - Click **Review + create**
   - Click **Create**

### Wait for Deployment

The VM creation process will take 3-5 minutes. Cloud-init will automatically install and configure
all required software. Once complete:

- Note the **Public IP address** from the VM overview page
- Wait an additional 2-3 minutes for cloud-init to complete the setup

## Alternative: Create VM with Azure CLI

If you prefer using the command line, you can create the VM using Azure CLI instead of the portal.

### Prerequisites for CLI deployment

Ensure you have:

- Azure CLI installed (`az --version` to check)
- Logged in to Azure (`az login`)
- SSH key pair generated (`ssh-keygen -t rsa` if needed)

### Create deployment script

Create a file called `deploy-blob-vm.sh`:

```bash
#!/bin/bash

# Configuration
RESOURCE_GROUP="blob-app-rg"
LOCATION="northeurope"
VM_NAME="blob-app-vm"
ADMIN_USER="azureuser"

echo "Creating resource group..."
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION

echo "Creating virtual machine..."
az vm create \
    --resource-group $RESOURCE_GROUP \
    --name $VM_NAME \
    --image Ubuntu2204 \
    --size Standard_B1s \
    --admin-username $ADMIN_USER \
    --generate-ssh-keys \
    --custom-data cloud-init.yaml

echo "Opening HTTP port 80..."
az vm open-port \
    --resource-group $RESOURCE_GROUP \
    --name $VM_NAME \
    --port 80

echo "Getting public IP address..."
PUBLIC_IP=$(az vm show \
    --resource-group $RESOURCE_GROUP \
    --name $VM_NAME \
    --show-details \
    --query 'publicIps' \
    --output tsv)

echo "Deployment completed!"
echo "Website: http://$PUBLIC_IP"
echo "SSH: ssh $ADMIN_USER@$PUBLIC_IP"
echo ""
echo "Note: Wait 2-3 minutes for cloud-init to complete setup"
echo "To cleanup: az group delete --name $RESOURCE_GROUP --yes"
```

### Run the deployment

Make the script executable and run it:

```bash
chmod +x deploy-blob-vm.sh
./deploy-blob-vm.sh
```

The script will:

1. Create a resource group
2. Create the VM with cloud-init configuration
3. Open HTTP port 80
4. Display the public IP address

## Step 3: Verify VM Configuration

### Check cloud-init status

Connect to your VM to verify the automatic setup completed successfully:

```bash
ssh azureuser@YOUR_VM_PUBLIC_IP
```

Check cloud-init status:

```bash
# Check if cloud-init finished
sudo cloud-init status

# View cloud-init logs if needed
sudo tail -f /var/log/cloud-init-output.log
```

## Step 4: Deploy Your PHP Application

### Create local deployment script

Create a local deployment script that will copy files and execute all commands remotely. On your local machine, create `deploy-app.sh`:

```bash
#!/bin/bash

# Configuration
VM_IP="YOUR_VM_PUBLIC_IP"
VM_USER="azureuser"

echo "Starting application deployment to $VM_IP..."

# Copy application files directly to VM /tmp directory
echo "Copying application files to VM..."
scp composer.json index.php .env $VM_USER@$VM_IP:/tmp/

# Execute deployment commands on VM via SSH
echo "Executing deployment commands on VM..."
ssh $VM_USER@$VM_IP << 'EOF'
echo "Verifying staged files in /tmp..."
ls -la /tmp/{composer.json,index.php,.env}

echo "Copying files to web directory..."
sudo cp /tmp/composer.json /tmp/index.php /tmp/.env /var/www/blobapp/

echo "Installing PHP dependencies..."
cd /var/www/blobapp
sudo COMPOSER_ALLOW_SUPERUSER=1 composer install --no-interaction --optimize-autoloader

echo "Setting file permissions..."
sudo chown -R www-data:www-data /var/www/blobapp
sudo chmod -R 755 /var/www/blobapp

echo "Cleaning up temporary files..."
rm -f /tmp/composer.json /tmp/index.php /tmp/.env

echo "Restarting web services..."
sudo systemctl restart nginx
sudo systemctl restart php8.1-fpm

echo "Application deployment completed!"
echo "Your app should now be available at: http://$(curl -s ifconfig.me)"
EOF

echo "Deployment script finished!"
```

### Execute the deployment

1. **Update the script with your VM IP**:

   ```bash
   # Edit the script and replace YOUR_VM_PUBLIC_IP with actual IP
   nano deploy-app.sh
   ```

2. **Make script executable and run it**:

   ```bash
   chmod +x deploy-app.sh
   ./deploy-app.sh
   ```

### Manual deployment alternative

If you prefer to run commands manually:

```bash
# Connect to VM
ssh azureuser@YOUR_VM_PUBLIC_IP

# Stage files in /tmp
cp ~/composer.json ~/index.php ~/.env /tmp/
ls -la /tmp/{composer.json,index.php,.env}

# Copy to final destination
sudo cp /tmp/composer.json /tmp/index.php /tmp/.env /var/www/blobapp/

# Install dependencies and set permissions
cd /var/www/blobapp
sudo COMPOSER_ALLOW_SUPERUSER=1 composer install --no-interaction --optimize-autoloader
sudo chown -R www-data:www-data /var/www/blobapp
sudo chmod -R 755 /var/www/blobapp

# Clean up and restart services
rm -f /tmp/composer.json /tmp/index.php /tmp/.env
sudo systemctl restart nginx
sudo systemctl restart php8.1-fpm

exit
```

**Note:** Your `.env` file already contains the correct Azure Storage connection string from Step 1.

## Step 5: Test Your Deployment

### Verify the application

1. **Test locally on the VM**:

   ```bash
   ssh azureuser@YOUR_VM_PUBLIC_IP "php -f /var/www/blobapp/index.php"
   ```

2. **Access via web browser**:
   - Open your browser
   - Navigate to `http://YOUR_VM_PUBLIC_IP`
   - You should see your image gallery displaying images from Azure Blob Storage

### Troubleshooting

If the application doesn't work:

1. **Check Nginx logs**:

   ```bash
   ssh azureuser@YOUR_VM_PUBLIC_IP "sudo tail -f /var/log/nginx/error.log"
   ```

2. **Check PHP-FPM logs**:

   ```bash
   ssh azureuser@YOUR_VM_PUBLIC_IP "sudo tail -f /var/log/php8.1-fpm.log"
   ```

3. **Test PHP processing**:

   ```bash
   ssh azureuser@YOUR_VM_PUBLIC_IP "echo '<?php phpinfo(); ?>' | sudo tee /var/www/blobapp/info.php"
   # Visit: http://YOUR_VM_PUBLIC_IP/info.php
   ```

4. **Verify file permissions**:

   ```bash
   ssh azureuser@YOUR_VM_PUBLIC_IP "ls -la /var/www/blobapp/"
   ```

## Step 6: Secure Your Application (Optional)

### Configure firewall

```bash
# Run firewall setup on VM
ssh azureuser@YOUR_VM_PUBLIC_IP "
sudo ufw enable &&
sudo ufw allow 22 &&
sudo ufw allow 80 &&
sudo ufw status
"
```

### SSL Certificate (Optional)

For production deployments, consider setting up SSL with Let's Encrypt:

```bash
# Install Certbot (requires domain name)
ssh azureuser@YOUR_VM_PUBLIC_IP "sudo apt install -y certbot python3-certbot-nginx"

# Note: You'll need a domain name for SSL certificates
```

## Step 7: Test and Verify

### Verify all components

1. **VM is running**: Check in Azure Portal
2. **Nginx is serving**: `curl http://YOUR_VM_PUBLIC_IP`
3. **PHP is processing**: Visit your app URL
4. **Images are loading**: Check that images from Azure Blob Storage display correctly

### Performance check

Test your application:

- Load time of the main page
- Image loading from Azure Blob Storage
- Responsive design on different devices

## Cleanup Resources

When you're done with the exercise:

1. **Stop the VM** (to save costs):
   - Go to Azure Portal → Virtual Machines
   - Select your VM → Stop

2. **Delete resources** (if no longer needed):
   - Delete the Resource Group `blob-app-rg`
   - This will remove the VM, disk, network interface, and public IP

## Conclusion

You've successfully deployed a PHP web application to an Azure Virtual Machine! This exercise
demonstrated:

- VM provisioning through Azure Portal
- Linux server configuration and software installation
- PHP application deployment with Nginx
- Integration with Azure Blob Storage from a cloud-hosted application

Your application is now running on Azure infrastructure and accessible via the internet, displaying
images stored in Azure Blob Storage.

## Next Steps

Consider these enhancements:

- Set up a custom domain name
- Implement SSL/TLS certificates
- Add monitoring and logging
- Set up automated deployment pipelines
- Implement backup strategies

## Don't Forget

Azure VMs incur costs while running. Stop or delete resources when not needed to avoid unexpected charges.

## Happy Deploying! 🚀
