+++
title = "1. PHP Web Application with Azure MySQL"
weight = 1
date = 2025-08-24
draft = false
+++

## 🎯 Goal

Build a complete PHP web application with MySQL database connectivity by manually provisioning Azure
resources through the Azure Portal, then configuring the VM using cloud-init.

## 📋 Prerequisites

Before beginning this exercise, you should:

- Have an active Azure subscription
- Be familiar with the Azure Portal interface
- Understand basic networking concepts (VNets, subnets, NSGs)
- Have SSH key pair generated (`ssh-keygen -t rsa -b 4096`)
- Be comfortable with basic Linux commands and file operations

## 📚 Learning Objectives

By the end of this exercise, you will:

- Implement **Azure Virtual Network** with proper subnet segmentation for application and database tiers
- Use **Azure Database for MySQL Flexible Server** with private networking for secure database connectivity
- Configure **Network Security Groups** to implement least-privilege network access
- Understand how **cloud-init** automates server configuration during VM provisioning
- Deploy a complete **LEMP stack** (Linux, Nginx, MySQL, PHP) application architecture

## 🔍 Why This Matters

In real-world applications, this architecture pattern is crucial because:

- It demonstrates proper network segmentation between application and database tiers
- It's an industry standard approach for secure database connectivity using private endpoints
- It will be foundational for enterprise-scale applications with multiple tiers and security requirements

## 📝 Step-by-Step Instructions

### Step 1: Create Resource Group

1. Navigate to the Azure Portal (portal.azure.com)
2. Click **"Create a resource"** → Search for **"Resource group"**
3. Configure the resource group:

   - **Subscription**: Select your subscription
   - **Resource group**: `rg-webapp-mysql-tutorial`
   - **Region**: `North Europe` (or your preferred region)

4. Click **"Review + create"** → **"Create"**

> 💡 **Information**
>
> - **Resource Groups**: Logical containers that hold related Azure resources for easier management
> - **Naming Convention**: Using descriptive names helps organize resources and understand their purpose
> - This approach ensures all related resources are grouped together for easy cleanup

### Step 2: Create Virtual Network and Subnets

1. In your resource group, click **"Create"** → Search for **"Virtual network"**
2. Configure the virtual network:

   **Basics tab:**
   - **Name**: `vnet-webapp-mysql`
   - **Region**: Same as resource group
   - **Resource group**: Select your created resource group

   **IP Addresses tab:**
   - **IPv4 address space**: `10.0.0.0/16`
   - **Add subnet**:
     - **Subnet name**: `app-subnet`
     - **Subnet address range**: `10.0.1.0/24`
   - **Add subnet** (click "Add subnet" again):
     - **Subnet name**: `db-subnet`
     - **Subnet address range**: `10.0.2.0/24`

3. Click **"Review + create"** → **"Create"**

> 💡 **Information**
>
> - **Subnet Segmentation**: Separating application and database into different subnets enables network-level security controls
> - **Address Planning**: Using /24 subnets provides 254 usable IP addresses per subnet, suitable for small to medium deployments
> - **Private Networking**: All resources will communicate using private IP addresses within the VNet

### Step 3: Configure Network Security Groups

1. Create Application NSG:
   - Search for **"Network security group"** → **"Create"**
   - **Name**: `nsg-app-subnet`
   - **Resource group**: Select your resource group
   - **Region**: Same as VNet
   - Click **"Create"**

2. Configure Application NSG rules:
   - Go to your `nsg-app-subnet` → **"Inbound security rules"**
   - **Add** the following rules:

   **HTTP Rule:**
   - **Source**: `Any`
   - **Source port ranges**: `*`
   - **Destination**: `Any`
   - **Service**: `HTTP`
   - **Action**: `Allow`
   - **Priority**: `1000`
   - **Name**: `AllowHTTP`

   **SSH Rule:**
   - **Source**: `Any`
   - **Source port ranges**: `*`
   - **Destination**: `Any`
   - **Service**: `SSH`
   - **Action**: `Allow`
   - **Priority**: `1010`
   - **Name**: `AllowSSH`

3. Create Database NSG:
   - Create another NSG named `nsg-db-subnet`
   - **Add** inbound rule:

   **MySQL Rule:**
   - **Source**: `IP Addresses`
   - **Source IP addresses/CIDR ranges**: `10.0.1.0/24`
   - **Source port ranges**: `*`
   - **Destination**: `Any`
   - **Service**: `Custom`
   - **Destination port ranges**: `3306`
   - **Protocol**: `TCP`
   - **Action**: `Allow`
   - **Priority**: `1000`
   - **Name**: `AllowMySQLFromApp`

4. Associate NSGs with subnets:
   - Go to `vnet-webapp-mysql` → **"Subnets"**
   - Click `app-subnet` → **"Network security group"** → Select `nsg-app-subnet` → **"Save"**
   - Click `db-subnet` → **"Network security group"** → Select `nsg-db-subnet` → **"Save"**

> 💡 **Information**
>
> - **Network Security Groups**: Act as virtual firewalls controlling traffic to/from subnets
> - **Least Privilege**: Database subnet only allows MySQL traffic from application subnet
> - **Defense in Depth**: Multiple security layers protect your database from unauthorized access
>
> ⚠️ **Common Mistakes**
>
> - Forgetting to associate NSGs with subnets will result in default "allow all" behavior
> - Be careful not to block your own SSH access by misconfiguring source IP ranges

### Step 4: Prepare Cloud-Init Configuration

1. Create a local file named `cloud-init-app.yaml` with the following content:

    > `cloud-init-app.yaml`

    ```yaml
    #cloud-config
    # Application server with LEMP stack for Azure MySQL connectivity

    package_update: true

    # Add external repositories
    apt:
    sources:
        ondrej-php:
        source: ppa:ondrej/php

    packages:
    - software-properties-common  # Required for adding PPAs
    - nginx          # Web server
    - php8.1-fpm     # PHP 8.1 FastCGI Process Manager (specific version)
    - php8.1-mysql   # PHP 8.1 MySQL extension
    - php8.1-cli     # PHP 8.1 command line interface
    - mysql-client   # MySQL client for testing
    - unzip          # For extracting files

    write_files:
    # Configure Nginx to serve PHP files
    - path: /etc/nginx/sites-available/default
        content: |
        server {
            listen 80;
            root /var/www/html;
            index index.php index.html index.nginx-debian.html;

            server_name _;

            location / {
                try_files $uri $uri/ =404;
            }

            location ~ \.php$ {
                include snippets/fastcgi-php.conf;
                fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
            }

            # Health check endpoint
            location /health {
                access_log off;
                return 200 "Application server healthy\n";
                add_header Content-Type text/plain;
            }
        }

    runcmd:
    # Set proper permissions for web directory
    - chown -R www-data:www-data /var/www/html
    - chmod -R 755 /var/www/html

    # Restart and enable services
    - systemctl restart nginx
    - systemctl enable nginx
    - systemctl restart php8.1-fpm
    - systemctl enable php8.1-fpm
    ```

> 💡 **Information**
>
> - **Cloud-Init**: Automates server configuration during first boot, eliminating manual setup tasks
> - **LEMP Stack**: Linux, Nginx (Engine-X), MySQL, PHP - a popular web application stack
> - **Declarative Configuration**: Describes the desired end state rather than step-by-step commands

### Step 5: Create Virtual Machine

1. In your resource group, click **"Create"** → Search for **"Virtual machine"**
2. Configure the VM:

   **Basics tab:**
   - **Virtual machine name**: `vm-webapp`
   - **Region**: Same as resource group
   - **Image**: `Ubuntu Server 22.04 LTS - x64 Gen2`
   - **Size**: `Standard_B1s` (cost-optimized for learning)
   - **Authentication type**: `SSH public key`
   - **Username**: `azureuser`
   - **SSH public key source**: `Use existing public key`
   - **SSH public key**: Paste your public key content

   **Networking tab:**
   - **Virtual network**: `vnet-webapp-mysql`
   - **Subnet**: `app-subnet`
   - **Public IP**: Create new → Name: `pip-webapp`
   - **NIC network security group**: `None` (NSG already applied to subnet)

   **Advanced tab:**
   - **Custom data**: Paste the content of your `cloud-init-app.yaml` file

3. Click **"Review + create"** → **"Create"**

> 💡 **Information**
>
> - **B1s VM Size**: Burstable performance VM suitable for development and testing workloads
> - **Custom Data**: Cloud-init configuration is passed to the VM and executed on first boot
> - **SSH Keys**: More secure than passwords and industry standard for Linux VM authentication

### Step 6: Create Azure Database for MySQL Flexible Server

1. In your resource group, click **"Create"** → Search for **"Azure Database for MySQL"**
2. Select **"Flexible Server"** → **"Create"**
3. Configure the database:

   **Basics tab:**
   - **Server name**: `mysql-webapp-[unique-suffix]` (must be globally unique)
   - **Region**: Same as other resources
   - **MySQL version**: `5.7`
   - **Workload type**: `Development`
   - **Compute + storage**: `Burstable, B1ms, 1 vCore, 2 GiB RAM, 20 GiB storage`
   - **Admin username**: `mysqladmin`
   - **Password**: `SecurePassword123!` (use a secure password)

   **Networking tab:**
   - **Connectivity method**: `Private access (VNet integration)`
   - **Virtual network**: `vnet-webapp-mysql`
   - **Subnet**: `db-subnet`
   - **Private DNS integration**: `Yes`
   - **Private DNS zone**: Create new → `mysql.database.azure.com`

   **Security tab:**
   - Leave defaults (SSL enforcement enabled)

4. Click **"Review + create"** → **"Create"**

> 💡 **Information**
>
> - **Flexible Server**: Latest MySQL offering with better price-performance and networking options
> - **Private Access**: Database is only accessible from within the VNet, improving security
> - **Private DNS**: Enables the application to connect using a private FQDN instead of IP addresses
>
> ⚠️ **Common Mistakes**
>
> - Choosing the wrong subnet delegation for database will cause deployment to fail
> - Not enabling private DNS integration makes database connectivity more complex

### Step 7: Create Database Schema

1. Once the MySQL server is created, go to the resource
2. Navigate to **"Databases"** → **"Add"**
3. Create database:
   - **Name**: `contactforms`
   - **Charset**: `utf8`
   - **Collation**: `utf8_general_ci`
4. Click **"Save"**

### Step 8: Prepare Application Files Locally

Before deploying, create the complete application files on your local machine.

1. Create a local directory for your application:

   ```bash
   mkdir -p ~/webapp-files
   cd ~/webapp-files
   ```

2. Create the database configuration file:

   > `~/webapp-files/database_setup.php`

   ```php
   <?php
   // Azure MySQL Database configuration
   // Replace with your actual Azure MySQL server details
   $host = getenv('MYSQL_HOST') ?: '[YOUR-MYSQL-SERVER-NAME].mysql.database.azure.com';
   $dbname = getenv('MYSQL_DATABASE') ?: 'contactforms';
   $username = getenv('MYSQL_USERNAME') ?: 'mysqladmin';
   $password = getenv('MYSQL_PASSWORD') ?: 'SecurePassword123!';

   try {
       // Connect to Azure MySQL with SSL
       $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password, [
           PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
           PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
           PDO::MYSQL_ATTR_SSL_CA => '/etc/ssl/certs/ca-certificates.crt'
       ]);
       
       // Create table if not exists (database-first approach for learning)
       $pdo->exec("CREATE TABLE IF NOT EXISTS contacts (
           id INT AUTO_INCREMENT PRIMARY KEY,
           name VARCHAR(100) NOT NULL,
           email VARCHAR(100) NOT NULL,
           message TEXT NOT NULL,
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
           INDEX idx_created_at (created_at)
       )");
       
       echo "<!-- Database connection successful -->\n";
       
   } catch(PDOException $e) {
       // Log error and show user-friendly message
       error_log("Database connection failed: " . $e->getMessage());
       die("Database connection failed. Please check configuration. Error: " . $e->getMessage());
   }
   ?>
   ```

3. Create the main landing page:

   > `~/webapp-files/index.html`

   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Level 2.3: Azure MySQL Contact App</title>
       <link rel="stylesheet" href="style.css">
   </head>
   <body>
       <div class="container">
           <header>
               <h1>📝 Azure MySQL Contact App</h1>
               <p>Level 2.3: LEMP Stack with Azure MySQL Flexible Server</p>
           </header>
           
           <nav>
               <a href="index.html" class="btn">Home</a>
               <a href="contact_form.html" class="btn">Contact Form</a>
               <a href="on_get_messages.php" class="btn">View Messages</a>
           </nav>
           
           <main>
               <h2>Welcome!</h2>
               <p>This is a PHP contact form application running on Azure with secure database connectivity.</p>
               
               <div class="features">
                   <h3>Architecture Features:</h3>
                   <ul>
                       <li>Contact form with Azure MySQL database storage</li>
                       <li>Secure private network connectivity</li>
                       <li>Azure Database for MySQL Flexible Server</li>
                       <li>SSL/TLS encrypted database connections</li>
                       <li>Network Security Group protection</li>
                       <li>Nginx web server with PHP-FPM</li>
                   </ul>
               </div>
           </main>
       </div>
   </body>
   </html>
   ```

4. Create the contact form:

   > `~/webapp-files/contact_form.html`

   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Contact Form - Azure MySQL Contact App</title>
       <link rel="stylesheet" href="style.css">
   </head>
   <body>
       <div class="container">
           <header>
               <h1>✉️ Contact Form</h1>
           </header>
           
           <nav>
               <a href="index.html" class="btn">Home</a>
               <a href="contact_form.html" class="btn active">Contact Form</a>
               <a href="on_get_messages.php" class="btn">View Messages</a>
           </nav>
           
           <main>
               <form action="on_post_contact.php" method="POST" class="contact-form">
                   <div class="form-group">
                       <label for="name">Name:</label>
                       <input type="text" id="name" name="name" required>
                   </div>
                   
                   <div class="form-group">
                       <label for="email">Email:</label>
                       <input type="email" id="email" name="email" required>
                   </div>
                   
                   <div class="form-group">
                       <label for="message">Message:</label>
                       <textarea id="message" name="message" rows="5" required></textarea>
                   </div>
                   
                   <button type="submit" class="btn submit-btn">Send Message</button>
               </form>
           </main>
       </div>
   </body>
   </html>
   ```

5. Create the form submission handler:

   > `~/webapp-files/on_post_contact.php`

   ```php
   <?php
   // Handle POST request for contact form submission
   require_once 'database_setup.php';

   if ($_SERVER['REQUEST_METHOD'] == 'POST') {
       $name = $_POST['name'] ?? '';
       $email = $_POST['email'] ?? '';
       $message = $_POST['message'] ?? '';
       
       if (!empty($name) && !empty($email) && !empty($message)) {
           try {
               $stmt = $pdo->prepare("INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)");
               $stmt->execute([$name, $email, $message]);
               $success = true;
           } catch(PDOException $e) {
               $error = "Error saving message: " . $e->getMessage();
           }
       } else {
           $error = "All fields are required.";
       }
   }
   ?>
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Message Sent - Azure MySQL Contact App</title>
       <link rel="stylesheet" href="style.css">
   </head>
   <body>
       <div class="container">
           <header>
               <h1>📨 Message Status</h1>
           </header>
           
           <nav>
               <a href="index.html" class="btn">Home</a>
               <a href="contact_form.html" class="btn">Contact Form</a>
               <a href="on_get_messages.php" class="btn">View Messages</a>
           </nav>
           
           <main>
               <?php if (isset($success)): ?>
                   <div class="success-message">
                       <h2>✅ Message Sent Successfully!</h2>
                       <p>Thank you for your message. It has been saved to the Azure MySQL database.</p>
                   </div>
               <?php elseif (isset($error)): ?>
                   <div class="error-message">
                       <h2>❌ Error</h2>
                       <p><?php echo htmlspecialchars($error); ?></p>
                   </div>
               <?php endif; ?>
               
               <div class="actions">
                   <a href="contact_form.html" class="btn">Send Another Message</a>
                   <a href="on_get_messages.php" class="btn">View All Messages</a>
               </div>
           </main>
       </div>
   </body>
   </html>
   ```

6. Create the message viewer:

   > `~/webapp-files/on_get_messages.php`

   ```php
   <?php
   // Handle GET request to display all contact messages
   require_once 'database_setup.php';

   try {
       $stmt = $pdo->prepare("SELECT id, name, email, message, created_at FROM contacts ORDER BY created_at DESC");
       $stmt->execute();
       $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
   } catch(PDOException $e) {
       $error = "Error retrieving messages: " . $e->getMessage();
       $messages = [];
   }
   ?>
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>All Messages - Azure MySQL Contact App</title>
       <link rel="stylesheet" href="style.css">
   </head>
   <body>
       <div class="container">
           <header>
               <h1>📋 All Messages</h1>
           </header>
           
           <nav>
               <a href="index.html" class="btn">Home</a>
               <a href="contact_form.html" class="btn">Contact Form</a>
               <a href="on_get_messages.php" class="btn active">View Messages</a>
           </nav>
           
           <main>
               <?php if (isset($error)): ?>
                   <div class="error-message">
                       <h2>❌ Error</h2>
                       <p><?php echo htmlspecialchars($error); ?></p>
                   </div>
               <?php elseif (empty($messages)): ?>
                   <div class="info-message">
                       <h2>📭 No Messages Yet</h2>
                       <p>No messages have been submitted yet.</p>
                       <a href="contact_form.html" class="btn">Send First Message</a>
                   </div>
               <?php else: ?>
                   <div class="messages-count">
                       <p>Total messages: <strong><?php echo count($messages); ?></strong></p>
                   </div>
                   
                   <div class="messages-list">
                       <?php foreach ($messages as $message): ?>
                           <div class="message-item">
                               <div class="message-header">
                                   <h3><?php echo htmlspecialchars($message['name']); ?></h3>
                                   <span class="message-date"><?php echo htmlspecialchars($message['created_at']); ?></span>
                               </div>
                               <p class="message-email">📧 <?php echo htmlspecialchars($message['email']); ?></p>
                               <div class="message-content">
                                   <p><?php echo nl2br(htmlspecialchars($message['message'])); ?></p>
                               </div>
                           </div>
                       <?php endforeach; ?>
                   </div>
               <?php endif; ?>
           </main>
       </div>
   </body>
   </html>
   ```

7. Create the CSS stylesheet:

   > `~/webapp-files/style.css`

   ```css
   /* Simple and clean styling for the contact app */

   * {
       margin: 0;
       padding: 0;
       box-sizing: border-box;
   }

   body {
       font-family: Arial, sans-serif;
       line-height: 1.6;
       color: #333;
       background-color: #f4f4f4;
   }

   .container {
       max-width: 800px;
       margin: 0 auto;
       padding: 20px;
       background-color: white;
       min-height: 100vh;
       box-shadow: 0 0 10px rgba(0,0,0,0.1);
   }

   header {
       text-align: center;
       margin-bottom: 30px;
       padding-bottom: 20px;
       border-bottom: 2px solid #eee;
   }

   header h1 {
       color: #2c3e50;
       margin-bottom: 10px;
   }

   header p {
       color: #7f8c8d;
       font-size: 1.1em;
   }

   nav {
       text-align: center;
       margin-bottom: 30px;
   }

   .btn {
       display: inline-block;
       padding: 10px 20px;
       margin: 0 5px;
       background-color: #3498db;
       color: white;
       text-decoration: none;
       border-radius: 5px;
       border: none;
       cursor: pointer;
       font-size: 16px;
       transition: background-color 0.3s;
   }

   .btn:hover {
       background-color: #2980b9;
   }

   .btn.active {
       background-color: #2c3e50;
   }

   .btn.submit-btn {
       background-color: #27ae60;
       width: 100%;
       margin-top: 10px;
   }

   .btn.submit-btn:hover {
       background-color: #229954;
   }

   main {
       margin-bottom: 30px;
   }

   .features {
       background-color: #ecf0f1;
       padding: 20px;
       border-radius: 5px;
       margin-top: 20px;
   }

   .features h3 {
       color: #2c3e50;
       margin-bottom: 10px;
   }

   .features ul {
       list-style-type: none;
       padding-left: 0;
   }

   .features li {
       padding: 5px 0;
       padding-left: 20px;
       position: relative;
   }

   .features li:before {
       content: "✓";
       position: absolute;
       left: 0;
       color: #27ae60;
       font-weight: bold;
   }

   /* Form Styling */
   .contact-form {
       background-color: #f8f9fa;
       padding: 30px;
       border-radius: 8px;
       border: 1px solid #e9ecef;
   }

   .form-group {
       margin-bottom: 20px;
   }

   .form-group label {
       display: block;
       margin-bottom: 5px;
       font-weight: bold;
       color: #2c3e50;
   }

   .form-group input,
   .form-group textarea {
       width: 100%;
       padding: 10px;
       border: 1px solid #ddd;
       border-radius: 4px;
       font-size: 16px;
   }

   .form-group input:focus,
   .form-group textarea:focus {
       outline: none;
       border-color: #3498db;
       box-shadow: 0 0 5px rgba(52, 152, 219, 0.3);
   }

   /* Message Styling */
   .success-message,
   .error-message,
   .info-message {
       padding: 20px;
       margin: 20px 0;
       border-radius: 5px;
       text-align: center;
   }

   .success-message {
       background-color: #d4edda;
       color: #155724;
       border: 1px solid #c3e6cb;
   }

   .error-message {
       background-color: #f8d7da;
       color: #721c24;
       border: 1px solid #f5c6cb;
   }

   .info-message {
       background-color: #d1ecf1;
       color: #0c5460;
       border: 1px solid #bee5eb;
   }

   .actions {
       text-align: center;
       margin-top: 20px;
   }

   /* Messages List Styling */
   .messages-count {
       background-color: #e8f4fd;
       padding: 10px;
       border-radius: 5px;
       margin-bottom: 20px;
       text-align: center;
   }

   .messages-list {
       space-y: 20px;
   }

   .message-item {
       background-color: #f8f9fa;
       border: 1px solid #e9ecef;
       border-radius: 8px;
       padding: 20px;
       margin-bottom: 20px;
   }

   .message-header {
       display: flex;
       justify-content: space-between;
       align-items: center;
       margin-bottom: 10px;
       border-bottom: 1px solid #eee;
       padding-bottom: 10px;
   }

   .message-header h3 {
       color: #2c3e50;
       margin: 0;
   }

   .message-date {
       color: #7f8c8d;
       font-size: 0.9em;
   }

   .message-email {
       color: #3498db;
       margin-bottom: 10px;
   }

   .message-content {
       color: #555;
   }

   .message-content p {
       margin: 0;
   }

   /* Responsive Design */
   @media (max-width: 600px) {
       .container {
           padding: 10px;
       }
       
       .message-header {
           flex-direction: column;
           align-items: flex-start;
       }
       
       .message-date {
           margin-top: 5px;
       }
       
       .btn {
           padding: 8px 15px;
           font-size: 14px;
           margin: 2px;
       }
   }
   ```

### Step 9: Deploy Application Using SCP

1. Wait for the VM to complete initialization (3-5 minutes after creation)

2. Test SSH connectivity to your VM:

   ```bash
   ssh azureuser@[VM-PUBLIC-IP-OR-FQDN]
   ```

3. From your local machine, copy the application files to the VM using SCP:

   ```bash
   # Copy all application files to /tmp directory on the VM
   scp -r ~/webapp-files/* azureuser@[VM-PUBLIC-IP-OR-FQDN]:/tmp/
   ```

4. SSH into the VM and deploy the files:

   ```bash
   ssh azureuser@[VM-PUBLIC-IP-OR-FQDN]
   
   # Move files from /tmp to web directory
   sudo cp -r /tmp/* /var/www/html/
   
   # Set proper permissions
   sudo chown -R www-data:www-data /var/www/html/
   sudo chmod -R 755 /var/www/html/
   
   # Clean up temporary files
   rm -rf /tmp/*.php /tmp/*.html /tmp/*.css
   
   # Verify files are in place
   ls -la /var/www/html/
   ```

5. Update the database connection in `database_setup.php` with your actual MySQL server name:

   ```bash
   # Edit the database configuration
   sudo nano /var/www/html/database_setup.php
   
   # Replace [YOUR-MYSQL-SERVER-NAME] with your actual MySQL server name
   # It should look like: mysql-webapp-abc123.mysql.database.azure.com
   ```

> 💡 **Information**
>
> - **SSL Connection**: Azure MySQL requires SSL connections for security
> - **Environment Variables**: In production, database credentials should be stored securely using
   environment variables or Key Vault
> - **File Permissions**: www-data user/group is the standard web server user on Ubuntu

## 🧪 Final Tests

### Run the Application and Validate Your Work

1. Open a browser and navigate to your VM's public IP:

   ```text
   http://[VM-PUBLIC-IP]
   ```

2. Test the complete application by:
   - Clicking "Contact Form" to access the form
   - Filling out and submitting a test message
   - Clicking "View Messages" to verify data was stored in Azure MySQL
   - Navigating back to "Home" to see the architecture overview

✅ **Expected Results**

- The main page should display the Azure MySQL Contact App with navigation
- The contact form should accept and submit messages successfully
- Submitted messages should appear in the "View Messages" page
- The application should demonstrate secure connectivity to Azure MySQL
- All pages should have consistent styling and navigation

## 🔧 Troubleshooting

If you encounter issues:

- Check that cloud-init completed successfully: `sudo cloud-init status`
- Verify services are running: `sudo systemctl status nginx php8.1-fpm`
- Check MySQL connectivity from VM: `mysql -h [MYSQL-SERVER-FQDN] -u mysqladmin -p`
- Review NSG rules if connectivity issues occur
- Ensure database server firewall allows VNet access

## 🚀 Optional Challenge

Want to take your learning further? Try:

- Adding SSL/TLS certificate to enable HTTPS
- Implementing connection pooling for better database performance
- Creating additional database tables and relationships
- Adding input validation and security features

## 📚 Further Reading

- [Azure Database for MySQL Flexible Server](https://docs.microsoft.com/azure/mysql/flexible-server/) -
  Detailed documentation on MySQL Flexible Server features
- [Azure Virtual Network](https://docs.microsoft.com/azure/virtual-network/) - Comprehensive guide to Azure networking

## Done! 🎉

Great job! You've successfully implemented a **PHP web application** with **Azure MySQL database** using
manual Azure Portal provisioning and **cloud-init** automation! This architecture demonstrates proper network
segmentation, secure database connectivity, and automated server configuration. 🚀
