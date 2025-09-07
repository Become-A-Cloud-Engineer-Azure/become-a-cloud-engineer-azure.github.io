+++
title = "3. Production Multi-Container Setup with Docker Compose"
weight = 3
date = 2025-09-07
draft = false
tags = ["docker", "azure", "vm", "containerization", "MOV"]
+++

## 📚 Learning Objectives

After completing this exercise, you will be able to:
- Design and implement a production-grade multi-container architecture
- Configure nginx as a reverse proxy for PHP-FPM
- Use Docker Compose to orchestrate multiple containers
- Implement container networking and service dependencies
- Apply security best practices for production deployments

## 🔧 Prerequisites

- Docker Desktop installed and running
- Basic understanding of web servers and PHP
- Completed Exercise 1 (Dockerizing a PHP Web Application)
- Source files from Exercise 1 (`src/` directory with PHP application)

## 📋 Architecture Overview

In this exercise, we'll create a production-ready setup with:
- **nginx**: Web server and reverse proxy (port 80)
- **PHP-FPM**: FastCGI Process Manager for PHP execution
- **Docker Compose**: Orchestration of multi-container application
- **Bridge Network**: Secure inter-container communication

```
┌─────────────┐      ┌──────────────┐
│   Browser   │─────▶│     nginx    │
│  (port 80)  │      │  (webserver) │
└─────────────┘      └──────┬───────┘
                            │
                     FastCGI (port 9000)
                            │
                     ┌──────▼───────┐
                     │   PHP-FPM    │
                     │ (app server) │
                     └──────────────┘
```

## 🎯 Step 1: Create Production Directory Structure

First, let's organize our project for production deployment:

```bash
# Create production directories
mkdir -p production/nginx
mkdir -p production/php
```

Your project structure should look like:
```
Docker/
├── src/                     # Application source files
│   ├── index.html
│   ├── contact_form.html
│   ├── process_contact_form.php
│   └── style.css
├── production/
│   ├── nginx/              # nginx configuration
│   └── php/                # PHP-FPM configuration
├── Dockerfile.dev          # Development Dockerfile
└── docker-compose.yml      # Orchestration file
```

## 🎯 Step 2: Create nginx Configuration

### 2.1 Create nginx Dockerfile

Create `production/nginx/Dockerfile`:

```dockerfile
# Use official nginx Alpine image for smaller size
FROM nginx:alpine

# Copy custom nginx configuration
COPY default.conf /etc/nginx/conf.d/default.conf

# Create directory for PHP application files
RUN mkdir -p /var/www/html

# Set proper permissions
RUN chown -R nginx:nginx /var/www/html

# Expose port 80
EXPOSE 80

# nginx runs in foreground by default
CMD ["nginx", "-g", "daemon off;"]
```

### 2.2 Create nginx Configuration File

Create `production/nginx/default.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    root /var/www/html;
    index index.php index.html;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Handle static files (HTML, CSS, JS, images)
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Pass PHP scripts to PHP-FPM
    location ~ \.php$ {
        try_files $uri =404;
        
        # FastCGI parameters
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        
        # Connect to PHP-FPM container via Docker network
        # 'php' is the service name in docker-compose.yml
        fastcgi_pass php:9000;
        
        fastcgi_index index.php;
        include fastcgi_params;
        
        # PHP-FPM specific parameters
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
        
        # Increase timeouts for longer scripts
        fastcgi_read_timeout 300;
        fastcgi_send_timeout 300;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Deny access to hidden files (starting with .)
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🎯 Step 3: Create PHP-FPM Configuration

Create `production/php/Dockerfile`:

```dockerfile
# Use official PHP-FPM Alpine image
FROM php:8.2-fpm-alpine

# Install additional PHP extensions if needed
# RUN docker-php-ext-install pdo pdo_mysql mysqli

# Create directory for application files
RUN mkdir -p /var/www/html

# Set working directory
WORKDIR /var/www/html

# Copy PHP-FPM configuration for production
RUN cp /usr/local/etc/php/php.ini-production /usr/local/etc/php/php.ini

# Configure PHP-FPM to listen on port 9000 (default)
RUN sed -i 's/;cgi.fix_pathinfo=1/cgi.fix_pathinfo=0/' /usr/local/etc/php/php.ini

# Set proper permissions
RUN chown -R www-data:www-data /var/www/html

# Expose port 9000 for FastCGI
EXPOSE 9000

# Start PHP-FPM
CMD ["php-fpm"]
```

## 🎯 Step 4: Create Docker Compose Configuration

Create `docker-compose.yml` in the root directory:

```yaml
version: '3.8'

services:
  # nginx service - Web server
  nginx:
    build: 
      context: ./production/nginx
      dockerfile: Dockerfile
    container_name: nginx-server
    ports:
      - "80:80"
    volumes:
      # Mount source files for serving
      - ./src:/var/www/html:ro
    depends_on:
      - php
    networks:
      - app-network
    restart: unless-stopped

  # PHP-FPM service - Application server
  php:
    build:
      context: ./production/php
      dockerfile: Dockerfile
    container_name: php-fpm
    volumes:
      # Mount source files for PHP processing
      - ./src:/var/www/html
    networks:
      - app-network
    restart: unless-stopped
    environment:
      - PHP_MEMORY_LIMIT=256M
      - PHP_MAX_EXECUTION_TIME=300

# Docker Networks
networks:
  app-network:
    driver: bridge
    name: php-app-network
```

## 🎯 Step 5: Build and Run the Multi-Container Application

### 5.1 Build the containers

```bash
# Build all services defined in docker-compose.yml
docker-compose build
```

Expected output:
```
[+] Building 2.5s (10/10) FINISHED
 => [nginx 1/4] FROM docker.io/library/nginx:alpine
 => [php 1/5] FROM docker.io/library/php:8.2-fpm-alpine
 ...
```

### 5.2 Start the application

```bash
# Start all services in detached mode
docker-compose up -d
```

Expected output:
```
[+] Running 3/3
 ✔ Network php-app-network  Created
 ✔ Container php-fpm        Started
 ✔ Container nginx-server   Started
```

### 5.3 Verify containers are running

```bash
# Check running containers
docker-compose ps
```

Expected output:
```
NAME           SERVICE   STATUS    PORTS
nginx-server   nginx     Up        0.0.0.0:80->80/tcp
php-fpm        php       Up        9000/tcp
```

## 🎯 Step 6: Test the Application

### 6.1 Test the landing page

Open your browser and navigate to:
```
http://localhost
```

You should see the welcome page with the "Go to Contact Form" button.

### 6.2 Test PHP processing

Click on "Go to Contact Form" and submit a test message. The form should be processed by PHP-FPM through nginx.

### 6.3 Check container logs

```bash
# View nginx logs
docker-compose logs nginx

# View PHP-FPM logs
docker-compose logs php

# Follow logs in real-time
docker-compose logs -f
```

### 6.4 Test inter-container communication

```bash
# Execute a command in the nginx container to test PHP connectivity
docker exec nginx-server sh -c "nc -zv php 9000"
```

Expected output:
```
php (172.18.0.2:9000) open
```

## 🎯 Step 7: Production Deployment to Docker Hub

### 7.1 Build for production with multi-architecture support

```bash
# Create and use a new builder instance
docker buildx create --use

# Build and push nginx image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t yourusername/php-app-nginx:latest \
  --push \
  ./production/nginx

# Build and push PHP-FPM image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t yourusername/php-app-php:latest \
  --push \
  ./production/php
```

### 7.2 Create production docker-compose.yml

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  nginx:
    image: yourusername/php-app-nginx:latest
    container_name: nginx-server
    ports:
      - "80:80"
    volumes:
      - ./src:/var/www/html:ro
    depends_on:
      - php
    networks:
      - app-network
    restart: unless-stopped

  php:
    image: yourusername/php-app-php:latest
    container_name: php-fpm
    volumes:
      - ./src:/var/www/html
    networks:
      - app-network
    restart: unless-stopped
    environment:
      - PHP_MEMORY_LIMIT=256M
      - PHP_MAX_EXECUTION_TIME=300

networks:
  app-network:
    driver: bridge
```

## 🎯 Step 8: Deploy to Azure VM

### 8.1 Prepare the Azure VM

SSH into your Azure VM and install Docker and Docker Compose:

```bash
# Install Docker (if not already installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 8.2 Deploy the application

```bash
# Create application directory
mkdir -p ~/php-app
cd ~/php-app

# Create source directory and files
mkdir src
# Copy your source files to the VM

# Create docker-compose.yml with production images
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  nginx:
    image: yourusername/php-app-nginx:latest
    container_name: nginx-server
    ports:
      - "80:80"
    volumes:
      - ./src:/var/www/html:ro
    depends_on:
      - php
    networks:
      - app-network
    restart: unless-stopped

  php:
    image: yourusername/php-app-php:latest
    container_name: php-fpm
    volumes:
      - ./src:/var/www/html
    networks:
      - app-network
    restart: unless-stopped

networks:
  app-network:
    driver: bridge
EOF

# Start the application
docker-compose up -d
```

## 🔍 Understanding the Architecture

### Container Communication

1. **nginx** receives HTTP requests on port 80
2. Static files are served directly by nginx
3. PHP files are forwarded to PHP-FPM via FastCGI protocol
4. PHP-FPM processes the PHP code and returns the response
5. nginx sends the final response to the client

### Key Configuration Points

- **fastcgi_pass php:9000**: nginx connects to PHP container using service name
- **volumes**: Source files are mounted in both containers
- **networks**: Containers communicate on isolated bridge network
- **depends_on**: Ensures PHP starts before nginx

### Security Best Practices

1. **Read-only volumes**: nginx mounts files as read-only (`:ro`)
2. **Security headers**: X-Frame-Options, X-Content-Type-Options
3. **Hidden file protection**: Denies access to dot files
4. **Production PHP settings**: Uses php.ini-production
5. **Container isolation**: Separate containers for each service

## 🧹 Cleanup

To stop and remove the containers:

```bash
# Stop all containers
docker-compose down

# Remove containers, networks, and volumes
docker-compose down -v

# Remove images
docker rmi nginx-server php-fpm
```

## 📝 Troubleshooting

### Common Issues and Solutions

1. **Port 80 already in use**
   ```bash
   # Change the port mapping in docker-compose.yml
   ports:
     - "8080:80"  # Use port 8080 instead
   ```

2. **PHP files download instead of execute**
   - Check nginx configuration for fastcgi_pass
   - Verify PHP-FPM container is running
   - Check network connectivity between containers

3. **Permission denied errors**
   ```bash
   # Fix file permissions
   sudo chown -R $(id -u):$(id -g) src/
   chmod 755 src/
   chmod 644 src/*
   ```

4. **Container fails to start**
   ```bash
   # Check logs for specific service
   docker-compose logs nginx
   docker-compose logs php
   ```

## 🎉 Summary

Congratulations! You've successfully:
- ✅ Created a production-grade multi-container architecture
- ✅ Configured nginx as a reverse proxy for PHP-FPM
- ✅ Used Docker Compose for container orchestration
- ✅ Implemented secure container networking
- ✅ Applied production best practices

This setup provides:
- **Scalability**: Services can be scaled independently
- **Security**: Proper isolation between web server and application
- **Performance**: nginx efficiently handles static files
- **Maintainability**: Clear separation of concerns

## 🚀 Next Steps

- Add database service (MySQL/PostgreSQL) to docker-compose.yml
- Implement SSL/TLS with Let's Encrypt
- Set up monitoring with Prometheus and Grafana
- Configure log aggregation with ELK stack
- Implement CI/CD pipeline for automated deployments

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [nginx FastCGI Documentation](https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html)
- [PHP-FPM Configuration](https://www.php.net/manual/en/install.fpm.configuration.php)
- [Docker Networking](https://docs.docker.com/network/)