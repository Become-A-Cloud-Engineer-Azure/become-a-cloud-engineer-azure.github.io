+++
title = "2. CI/CD Pipeline with GitHub Actions"
weight = 2
date = 2025-08-31
draft = false
+++

## 🎯 Goal

Implement automated deployment of your static website to an Azure VM running nginx using GitHub Actions and a self-hosted runner.

## 📋 Prerequisites

Before beginning this exercise, you should:

- Have completed Exercise 1 (Git repository with HTML website)
- Have an active Azure subscription
- Have Azure CLI installed and configured locally
- Understand basic Linux commands and SSH

## 📚 Learning Objectives

By the end of this exercise, you will:

- Provision an **Azure VM** with nginx using infrastructure as code
- Configure a **self-hosted GitHub Actions runner** on the VM
- Create a **GitHub Actions workflow** for automated deployment
- Implement **continuous deployment** triggered by git push
- Understand **systemd services** for runner management
- Add **health checks and rollback** capabilities

## 🔍 Why This Matters

In real-world applications, CI/CD pipelines are crucial because:

- They eliminate manual deployment errors and inconsistencies
- They enable rapid, reliable releases to production
- They're industry standard for modern DevOps practices

## 📝 Step-by-Step Instructions

### Step 1: Create Provisioning Scripts

1. In VS Code, create folder `deployment-scripts` in project root
2. Create VM provisioning script:

    > `deployment-scripts/provision_vm.sh`

    ```bash
    #!/bin/bash

    # Azure resource variables
    resource_group=MyWebAppRG
    vm_name=MyWebAppVM
    location=northeurope

    echo "Creating resource group..."
    az group create --location $location --name $resource_group

    echo "Creating VM with nginx..."
    az vm create --name $vm_name \
                 --resource-group $resource_group \
                 --image Ubuntu2204 \
                 --size Standard_B1s \
                 --admin-username azureuser \
                 --generate-ssh-keys \
                 --custom-data @cloud-init-nginx.yaml

    echo "Opening HTTP port..."
    az vm open-port --port 80 \
                    --resource-group $resource_group \
                    --name $vm_name \
                    --priority 100

    echo "VM Public IP:"
    az vm show --resource-group $resource_group \
               --name $vm_name \
               --show-details \
               --query publicIps \
               --output tsv
    ```

3. Create cloud-init configuration:

    > `deployment-scripts/cloud-init-nginx.yaml`

    ```yaml
    #cloud-config

    # Update and install packages
    package_update: true
    package_upgrade: true

    packages:
      - nginx
      - curl
      - wget
      - unzip

    # Configure nginx site
    write_files:
      - path: /etc/nginx/sites-available/default
        content: |
          server {
              listen 80 default_server;
              listen [::]:80 default_server;

              root /var/www/myapp;
              index index.html;

              server_name _;

              location / {
                  try_files $uri $uri/ =404;
              }

              # Health check endpoint
              location /health {
                  access_log off;
                  return 200 "healthy\n";
                  add_header Content-Type text/plain;
              }
          }
        owner: root:root
        permissions: '0644'

    # Setup deployment directory
    runcmd:
      - mkdir -p /var/www/myapp
      - chown -R www-data:www-data /var/www/myapp
      - systemctl restart nginx
      - systemctl enable nginx
      # Create placeholder page
      - echo "<h1>Awaiting deployment...</h1>" > /var/www/myapp/index.html
    ```

> 💡 **Information**
>
> - **Cloud-init**: Runs once on VM creation to configure the system
> - **Infrastructure as Code**: Reproducible VM provisioning
> - **Health Endpoint**: Enables automated deployment verification
>
> ⚠️ **Common Mistakes**
>
> - Wrong YAML indentation breaks cloud-init
> - Forgetting to make script executable with chmod +x

### Step 2: Provision the Azure VM

1. Open terminal in VS Code and navigate to scripts:

    ```bash
    cd deployment-scripts
    chmod +x provision_vm.sh
    ```

2. Run provisioning script:

    ```bash
    ./provision_vm.sh
    ```

3. Save the displayed public IP address for later use
4. Verify nginx is running:

    ```bash
    curl http://<PUBLIC_IP>
    ```

> 💡 **Information**
>
> - **Standard_B1s**: Low-cost VM size suitable for learning
> - **SSH Keys**: Automatically generated and stored in ~/.ssh
> - **Resource Group**: Logical container for related Azure resources

### Step 3: Create GitHub Actions Workflow

1. Create workflow directory structure:
   - Create folders: `.github/workflows`

2. Create deployment workflow:

    > `.github/workflows/deploy.yml`

    ```yaml
    name: Deploy to Azure VM

    # Triggers
    on:
      push:
        branches:
          - main
      workflow_dispatch:  # Manual trigger option

    jobs:
      # Build job runs on GitHub-hosted runner
      build:
        runs-on: ubuntu-latest

        steps:
        - name: Checkout code
          uses: actions/checkout@v4

        - name: Create deployment package
          run: |
            cd html
            tar -czf ../website.tar.gz .
            cd ..
            echo "Package created: $(ls -lh website.tar.gz)"

        - name: Upload deployment package
          uses: actions/upload-artifact@v4
          with:
            name: website-package
            path: website.tar.gz
            retention-days: 1

      # Deploy job runs on self-hosted runner (our VM)
      deploy:
        runs-on: self-hosted
        needs: build  # Requires build job to complete first

        steps:
        - name: Download deployment package
          uses: actions/download-artifact@v4
          with:
            name: website-package

        - name: Deploy to nginx
          run: |
            echo "Starting deployment..."

            # Create backup of current deployment
            if [ -d "/var/www/myapp" ]; then
              sudo rm -rf /var/www/myapp.backup
              sudo cp -r /var/www/myapp /var/www/myapp.backup
              echo "Backup created"
            fi

            # Deploy new version
            sudo mkdir -p /var/www/myapp.new
            sudo tar -xzf website.tar.gz -C /var/www/myapp.new

            # Atomic switch
            sudo rm -rf /var/www/myapp.old
            if [ -d "/var/www/myapp" ]; then
              sudo mv /var/www/myapp /var/www/myapp.old
            fi
            sudo mv /var/www/myapp.new /var/www/myapp

            # Set permissions
            sudo chown -R www-data:www-data /var/www/myapp

            # Reload nginx
            sudo nginx -t && sudo systemctl reload nginx
            echo "Deployment completed"

        - name: Verify deployment
          run: |
            # Wait for nginx to reload
            sleep 2

            # Check health endpoint
            if curl -f http://localhost/health; then
              echo "✅ Health check passed"
            else
              echo "❌ Health check failed"
              exit 1
            fi

            # Verify index page
            if curl -f http://localhost | grep -q "Azure Web Application"; then
              echo "✅ Content verification passed"
            else
              echo "❌ Content verification failed"
              exit 1
            fi

        - name: Rollback on failure
          if: failure()
          run: |
            echo "⚠️ Deployment failed, initiating rollback..."

            if [ -d "/var/www/myapp.backup" ]; then
              sudo rm -rf /var/www/myapp
              sudo mv /var/www/myapp.backup /var/www/myapp
              sudo chown -R www-data:www-data /var/www/myapp
              sudo systemctl reload nginx
              echo "✅ Rollback completed"
            else
              echo "❌ No backup available for rollback"
            fi
    ```

> 💡 **Information**
>
> - **GitHub-hosted runner**: Free runner for build tasks
> - **Self-hosted runner**: Your VM that executes deployment
> - **Artifacts**: Files passed between jobs
> - **Atomic deployment**: Minimizes downtime during switch
>
> ⚠️ **Common Mistakes**
>
> - YAML indentation errors break workflows
> - Missing sudo for privileged operations
> - Not waiting for services to reload before verification

### Step 4: Install Self-Hosted Runner

1. Navigate to GitHub repository → Settings → Actions → Runners
2. Click "New self-hosted runner"
3. Select "Linux" architecture "x64"
4. Keep this GitHub page open - you'll need the commands
5. SSH into your VM:

    ```bash
    ssh azureuser@<PUBLIC_IP>
    ```

6. Create runner directory and download:

    ```bash
    mkdir actions-runner && cd actions-runner

    # Copy download URL from GitHub (version may differ)
    curl -o actions-runner-linux-x64-2.321.0.tar.gz \
         -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz

    # Extract files
    tar xzf ./actions-runner-linux-x64-2.321.0.tar.gz
    ```

7. Configure runner (copy token from GitHub):

    ```bash
    # Copy configuration command from GitHub
    ./config.sh --url https://github.com/USERNAME/my-azure-webapp \
                --token YOUR_TOKEN_HERE
    ```

   Press Enter to accept all defaults for:
   - Runner group: Default
   - Runner name: (keep suggested name)
   - Work folder: _work

> 💡 **Information**
>
> - **Runner Token**: Temporary token for registration (expires in 1 hour)
> - **Runner Labels**: Can be used to target specific runners
> - **Work Directory**: Where workflow files are downloaded

### Step 5: Test Runner in Interactive Mode

1. Start the runner interactively to see it in action:

    ```bash
    ./run.sh
    ```

   You should see:

   ```text
   √ Connected to GitHub

   Current runner version: '2.321.0'
   2025-01-XX XX:XX:XX: Listening for Jobs
   ```

2. **Keep this SSH session open** - the runner is now waiting for jobs

3. Open a **new terminal** in VS Code and deploy the workflow:

    ```bash
    git add .
    git commit -m "Add GitHub Actions deployment workflow"
    git push
    ```

4. **Watch the runner terminal** - you'll see it pick up the job:

   ```text
   2025-01-XX XX:XX:XX: Running job: deploy
   2025-01-XX XX:XX:XX: Job deploy completed with result: Succeeded
   ```

5. In GitHub Actions tab, verify the workflow completed successfully

6. Test your deployment:
   - Open browser to `http://<PUBLIC_IP>`
   - Should see your website

7. **Stop the interactive runner** with `Ctrl+C` in the SSH session

> 💡 **Information**
>
> - **Interactive Mode**: Perfect for debugging and seeing exactly what happens
> - **Real-time Feedback**: You can see each step as it executes
> - **Learning Tool**: Helps understand the runner-to-GitHub connection
>
> ⚠️ **Common Mistakes**
>
> - Closing SSH session stops the interactive runner
> - Runner must be running when workflow triggers

### Step 6: Install Runner as Service

Now that you've seen how it works, let's make it permanent:

1. Still in the runner directory, install as service:

    ```bash
    # Install service (will ask for sudo password)
    sudo ./svc.sh install azureuser

    # Start the service
    sudo ./svc.sh start

    # Check service status
    sudo ./svc.sh status
    ```

   You should see: `Active: active (running)`

2. Verify runner appears as "Idle" in GitHub:
   - Go to Settings → Actions → Runners
   - Runner should show with green dot

> 💡 **Information**
>
> - **systemd service**: Runs in background, survives reboots
> - **Service User**: Runs as azureuser for proper permissions
> - **Automatic Start**: Will start when VM boots

### Step 7: Monitor Service with journalctl

1. Make a visible change to test the service:
   - In VS Code, edit `html/index.html`
   - Change the h1 to: `<h1>Deployed via GitHub Actions Service! 🎉</h1>`
   - Update version to: `3.0.0`

2. In your SSH session, start monitoring logs:

    ```bash
    # Follow service logs in real-time
    sudo journalctl -u actions.runner.* -f
    ```

3. In VS Code terminal, push the change:

    ```bash
    git add html/index.html
    git commit -m "Test deployment with service runner"
    git push
    ```

4. **Watch the journalctl output** - you'll see:
   - Runner receiving the job
   - Each step executing
   - Deployment completing

   Example output:

   ```text
   Jan 01 12:00:00 MyWebAppVM runsvc.sh[1234]: 2025-01-01 12:00:00Z: Running job: deploy
   Jan 01 12:00:05 MyWebAppVM runsvc.sh[1234]: Job request 123 for job deploy has started
   Jan 01 12:00:10 MyWebAppVM runsvc.sh[1234]: Download deployment package
   Jan 01 12:00:15 MyWebAppVM runsvc.sh[1234]: Deploy to nginx
   Jan 01 12:00:20 MyWebAppVM runsvc.sh[1234]: Verify deployment
   Jan 01 12:00:25 MyWebAppVM runsvc.sh[1234]: Job deploy completed with result: Succeeded
   ```

5. Press `Ctrl+C` to stop following logs

6. Verify deployment succeeded:

   ```bash
   curl http://localhost
   ```

7. Exit SSH session:

   ```bash
   exit
   ```

> 💡 **Information**
>
> - **journalctl -f**: Follows logs in real-time (like tail -f)
> - **Service Logs**: Include all runner output and errors
> - **Debugging**: Use journalctl to troubleshoot failed deployments
>
> **Useful journalctl commands**:
>
> ```bash
> # Show last 50 lines
> sudo journalctl -u actions.runner.* -n 50
>
> # Show logs from last hour
> sudo journalctl -u actions.runner.* --since "1 hour ago"
>
> # Show only errors
> sudo journalctl -u actions.runner.* -p err
> ```

### Step 8: Test Final Continuous Deployment

1. Make one more update to verify everything works:

    > `html/index.html` (modification)

    ```html
    <div class="deployment-info">
        <h3>Deployment Status</h3>
        <p>✅ Automated CI/CD Pipeline Active</p>
        <p>Version: 4.0.0</p>
        <p>Last deployed via GitHub Actions service runner</p>
    </div>
    ```

2. Push and monitor via GitHub UI:

    ```bash
    git add html/index.html
    git commit -m "Final deployment test with status info"
    git push
    ```

3. Watch deployment in GitHub Actions tab
4. Verify website updated at `http://<PUBLIC_IP>`

> 💡 **Information**
>
> - **Complete Pipeline**: You now have a fully automated deployment
> - **Service Runner**: Continues working even after you log out
> - **Production Ready**: This pattern scales to real applications

## ✅ Verification

Run these checks to ensure exercise completion:

```bash
# Check VM is running
az vm show --resource-group MyWebAppRG --name MyWebAppVM --query powerState

# Verify runner is online (in GitHub UI)
# Settings → Actions → Runners → Should show "Idle"

# Test website
curl http://<PUBLIC_IP>  # Should show your HTML

# Check workflow history
# GitHub → Actions → Should show successful runs

# Test health endpoint
curl http://<PUBLIC_IP>/health  # Should return "healthy"
```

## 🎉 Summary

You've successfully:

- Provisioned an Azure VM with nginx using cloud-init
- Configured a self-hosted GitHub Actions runner
- Created a complete CI/CD pipeline with build and deploy stages
- Implemented health checks and rollback capabilities
- Achieved automatic deployment on every push to main

## 📌 Troubleshooting

| Problem | Solution |
|---------|----------|
| Runner offline | SSH to VM, run `sudo ./svc.sh status` and restart if needed |
| nginx 403 error | Check permissions: `sudo chown -R www-data:www-data /var/www/myapp` |
| Deployment fails | Check logs in GitHub Actions, verify runner has sudo permissions |
| Health check fails | Ensure nginx config includes /health location |
| SSH connection refused | Check VM is running and NSG allows port 22 |

## 🧹 Cleanup

To avoid Azure charges when done:

```bash
# Delete all resources
az group delete --name MyWebAppRG --yes --no-wait

# Remove runner from GitHub
# Settings → Actions → Runners → ... → Remove
```

## 🚀 Next Exercise

In Exercise 3, you will enhance the deployment with:

- Multiple environments (dev/staging/prod)
- Infrastructure as Code with Terraform
- Monitoring and alerting
- Custom domains and SSL certificates
