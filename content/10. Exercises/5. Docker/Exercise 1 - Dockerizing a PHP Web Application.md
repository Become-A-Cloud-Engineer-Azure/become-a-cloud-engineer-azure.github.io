+++
title = "1. Dockerizing a PHP Web Application"
weight = 1
date = 2025-09-07
draft = false
tags = ["docker", "containerization", "php", "MOV"]
+++

## 🎯 Goal

Learn how to containerize a PHP web application using Docker, deploy it to Docker Hub, and share it with others for seamless deployment across different environments.

## 📋 Prerequisites

Before beginning this exercise, you should:

- Have PHP installed on your local machine (version 7.4 or higher)
- Have Docker Desktop installed and **currently running**
- Have a Docker Hub account (free at <https://hub.docker.com>)
- Have basic understanding of command line operations
- Have the PHP application source files ready (either copy from the Appendix at the end of this tutorial or use your own PHP files)

## 📚 Learning Objectives

By the end of this exercise, you will:

- Run a **PHP application locally** without Docker to understand baseline functionality
- Create a **Dockerfile** to containerize your PHP application
- Build and run **Docker containers** with port mapping
- Push images to **Docker Hub** for distribution
- Understand how **containerization** enables application portability

## 🔍 Why This Matters

In real-world applications, Docker containerization is crucial because:

- It ensures consistent behavior across development, testing, and production environments
- It eliminates "works on my machine" problems
- It simplifies deployment and scaling of applications
- It's an industry standard for modern application deployment

## 📝 Step-by-Step Instructions

### Step 1: Run the PHP Application Locally

First, let's verify our PHP application works without Docker.

1. Open a terminal and navigate to the project directory:

   ```bash
   cd /path/to/your/Docker/directory
   ```

2. Start PHP's built-in web server from the `src` directory:

   ```bash
   cd src
   php -S localhost:8080
   ```

3. Open your browser and visit:

   ```text
   http://localhost:8080
   ```

4. Test the application:
   - Navigate to `http://localhost:8080/index.html` to see the home page
   - Navigate to `http://localhost:8080/contact_form.html` to test the contact form
   - Submit a test message to verify PHP processing works

5. Stop the server by pressing `Ctrl+C` in the terminal.

> 💡 **Information**
>
> - **PHP Built-in Server**: This lightweight server is perfect for development but not suitable for production
> - **Port 8080**: We're using 8080 to avoid conflicts with other services that might be using port 80
> - The server serves both static files (HTML, CSS) and processes PHP scripts
>
> ⚠️ **Common Mistakes**
>
> - Forgetting to `cd` into the `src` directory will result in a 404 error
> - If port 8080 is already in use, you'll get an error - try a different port like 8081

### Step 2: Create the Dockerfile

Now let's containerize our application.

1. Navigate back to the main project directory:

   ```bash
   cd ..
   ```

2. Create a new file named `Dockerfile` (no extension) with the following content:

   > `Dockerfile`

   ```dockerfile
   # Use official PHP image with CLI and Alpine for smaller size
   FROM php:8.2-cli-alpine

   # Set working directory
   WORKDIR /var/www/html

   # Copy application files
   COPY src/ .

   # Expose port 8000
   EXPOSE 8000

   # Start PHP's built-in web server
   CMD ["php", "-S", "0.0.0.0:8000"]
   ```

> 💡 **Information**
>
> - **FROM**: Specifies the base image - we use Alpine Linux for minimal size (~15MB vs ~400MB)
> - **WORKDIR**: Sets the working directory inside the container
> - **COPY**: Copies our source files into the container
> - **EXPOSE**: Documents which port the container will listen on (informational)
> - **CMD**: The command that runs when the container starts
> - **0.0.0.0**: Binds to all network interfaces (required for Docker port mapping)

### Step 3: Build the Docker Image

1. Build your Docker image with a descriptive name and tag:

   ```bash
   docker build -t php-contact-app:v1.0 .
   ```

2. Verify the image was created:

   ```bash
   docker images | grep php-contact-app
   ```

   You should see output similar to:

   ```text
   php-contact-app   v1.0   0981dc485d9f   2 minutes ago   92.2MB
   ```

> 💡 **Information**
>
> - **-t**: Tags the image with a name and version
> - **The dot (.)**: Tells Docker to look for the Dockerfile in the current directory
> - **Image naming**: Use lowercase, descriptive names with version tags

#### Alternative: Multi-Architecture Build (For Apple Silicon Macs)

If you're using an Apple Silicon Mac (M1/M2/M3) and want to ensure your image works on both ARM and Intel platforms, use Docker's buildx for multi-architecture builds:

1. Create and use a new builder:

   ```bash
   docker buildx create --name mybuilder --use
   ```

2. Build for multiple platforms:

   ```bash
   docker buildx build --platform linux/amd64,linux/arm64 \
     -t php-contact-app:v1.0 \
     --load .
   ```

   Or if you want to push directly to Docker Hub (replace `yourusername`):

   ```bash
   docker buildx build --platform linux/amd64,linux/arm64 \
     -t yourusername/php-contact-app:v1.0 \
     --push .
   ```

> 💡 **Information**
>
> - **Why multi-architecture?**: Apple Silicon Macs use ARM64 architecture, while most servers use AMD64
> - **--platform**: Specifies which architectures to build for
> - **--load**: Loads the image into local Docker (only works for single platform)
> - **--push**: Pushes directly to registry (required for multi-platform local storage)
> - This ensures your image will work on any Linux server, regardless of architecture

### Step 4: Run the Container Locally

1. Run your container, mapping the container's port 8000 to your local port 9090:

   ```bash
   docker run -d -p 9090:8000 --name my-php-app php-contact-app:v1.0
   ```

2. Verify the container is running:

   ```bash
   docker ps
   ```

3. Test the application at:

   ```text
   http://localhost:9090
   ```

4. View container logs:

   ```bash
   docker logs my-php-app
   ```

5. Verify the container is accessible:

   ```bash
   curl -I http://localhost:9090/index.html
   ```

   You should see `HTTP/1.1 200 OK` in the response.

> 💡 **Information**
>
> - **-d**: Runs the container in detached mode (background)
> - **-p 9090:8000**: Maps local port 9090 to container port 8000
> - **--name**: Gives the container a friendly name for easy reference
> - Port mapping allows us to run multiple containers on different local ports
>
> ⚠️ **Common Mistakes**
>
> - Using a port that's already in use will cause an error
> - Forgetting the port mapping (-p) will make the app inaccessible

### Step 5: Prepare for Docker Hub

1. First, ensure you're logged into Docker Hub via Docker Desktop:
   - Open Docker Desktop
   - Click on your account icon
   - Verify you're signed in

2. Also login via command line:

   ```bash
   docker login
   ```

   Enter your Docker Hub username and password when prompted.

> 💡 **Information**
>
> - **Docker Hub Account**: Create one free at <https://hub.docker.com>
> - **Login**: Required to push images to your repository
> - Your username will be part of your image name on Docker Hub

### Step 6: Tag and Push to Docker Hub

1. Tag your image with your Docker Hub username (replace `yourusername`):

   ```bash
   docker tag php-contact-app:v1.0 yourusername/php-contact-app:v1.0
   docker tag php-contact-app:v1.0 yourusername/php-contact-app:latest
   ```

2. Push the image to Docker Hub:

   ```bash
   docker push yourusername/php-contact-app:v1.0
   docker push yourusername/php-contact-app:latest
   ```

3. Verify on Docker Hub:
   - Visit <https://hub.docker.com>
   - Navigate to your repositories
   - You should see `php-contact-app` listed
   - The repository page will show both tags: `v1.0` and `latest`

> 💡 **Information**
>
> - **Repository naming**: Must be `username/imagename:tag`
> - **latest tag**: Convention for the most recent stable version
> - Images are public by default on free Docker Hub accounts

### Step 7: Run a Container from Docker Hub

1. Stop and remove the local container:

   ```bash
   docker stop my-php-app
   docker rm my-php-app
   ```

2. Run a new container from Docker Hub on port 7070:

   ```bash
   docker run -d -p 7070:8000 --name hub-php-app yourusername/php-contact-app:latest
   ```

3. Test the application at:

   ```text
   http://localhost:7070
   ```

> 💡 **Information**
>
> - Docker automatically pulls the image from Docker Hub if not found locally
> - This demonstrates how your image can be deployed anywhere
> - Using different ports (9090, 7070) shows flexibility in deployment

### Step 8: Share with Others

Now others can run your application with a single command!

1. Share these instructions with a classmate:

   ```bash
   # They only need Docker installed - no PHP required!
   docker run -d -p 8080:8000 yourusername/php-contact-app:latest
   ```

2. They can then access your app at `http://localhost:8080`

> 💡 **Information**
>
> - **No setup required**: They don't need PHP, just Docker
> - **Consistent behavior**: The app runs exactly the same on their machine
> - **Version control**: They can specify `:v1.0` for a specific version

## 🧪 Final Tests

### Validate Your Complete Setup

1. List all running containers:

   ```bash
   docker ps
   ```

   You should see containers running on different ports.

2. Test each deployment:
   - Local build: `http://localhost:9090`
   - Docker Hub version: `http://localhost:7070`

3. Check Docker Hub:
   - Visit your repository page
   - Verify pull count increases when others use your image

✅ **Expected Results**

- The application runs identically on all ports
- Contact form submissions work correctly
- No PHP installation required after containerization
- Image is publicly accessible on Docker Hub

### Advanced Testing with curl

Test the form submission programmatically:

```bash
# Test form submission
curl -X POST \
  -d "name=Test User&email=test@example.com&message=Hello Docker!" \
  http://localhost:7070/process_contact_form.php
```

You should see the HTML response with "Thank You!" and your submitted data.

## 🔧 Troubleshooting

Common issues and solutions:

### Port Conflicts

- **Error**: "bind: address already in use"
- **Solution**: Choose a different port (e.g., use 9091 instead of 9090):

  ```bash
  docker run -d -p 9091:8000 --name my-php-app php-contact-app:v1.0
  ```

### Docker Hub Push Issues

- **Error**: "denied: requested access to the resource is denied"
- **Solution**: Ensure you're logged in via Docker Desktop or run:

  ```bash
  docker login
  ```

  Then enter your Docker Hub username and password

### Container Issues

- **Container exits immediately**: Check logs with `docker logs container-name`
- **Cannot connect to container**: Verify it's running with `docker ps`
- **File not found errors**: Ensure all files were copied correctly to `src/` directory

### Login Problems

- If you can't push to Docker Hub, verify login status in Docker Desktop
- Make sure your username is correct in the image tag
- Use your Docker Hub username, not your email address

## 🧹 Clean Up

After completing the tutorial, clean up your environment:

1. Stop and remove all tutorial containers:

   ```bash
   docker stop hub-php-app my-php-app 2>/dev/null
   docker rm hub-php-app my-php-app 2>/dev/null
   ```

2. List and optionally remove the images:

   ```bash
   # List images
   docker images | grep php-contact-app
   
   # Remove local images if desired (keep them if you plan to experiment more)
   docker rmi php-contact-app:v1.0
   docker rmi yourusername/php-contact-app:v1.0
   docker rmi yourusername/php-contact-app:latest
   ```

3. Stop any local PHP server still running:

   ```bash
   # Find PHP processes
   ps aux | grep "php -S"
   
   # Stop them if needed
   pkill -f "php -S localhost"
   ```

## 🚀 Optional Challenge

Want to take your learning further? Try:

- Adding environment variables for configuration
- Creating a `docker-compose.yml` file for easier management
- Setting up automated builds on Docker Hub
- Adding a MySQL database container and connecting them

## 📚 Further Reading

- [Docker Official Documentation](https://docs.docker.com/) - Comprehensive Docker guide
- [PHP Docker Official Images](https://hub.docker.com/_/php) - Different PHP image variants
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/) - Production-ready patterns

## Done! 🎉

Congratulations! You've successfully containerized a PHP application, published it to Docker Hub, and learned how to share it with others. You now understand the fundamentals of Docker containerization and can apply these concepts to any web application! 🚀

Your application is now:

- ✅ Portable across any system with Docker
- ✅ Consistently deployable
- ✅ Easily shareable with others
- ✅ Ready for cloud deployment

## 📎 Appendix: Source Files

Copy and paste the following files into your `src/` directory:

### File: `src/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP Docker Demo</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to PHP Docker Demo</h1>
        <p>This is a simple PHP application running in a Docker container.</p>
        <nav>
            <a href="contact_form.html" class="button">Contact Us</a>
        </nav>
        <div class="info">
            <h2>About This Demo</h2>
            <p>This application demonstrates how to containerize a PHP web application using Docker.</p>
        </div>
    </div>
</body>
</html>
```

### File: `src/contact_form.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Form</title>
    <link rel="stylesheet" href="style.css">
</head>
<body class="form-body">
    <div class="form-container">
        <h1>Contact Us</h1>
        <form action="process_contact_form.php" method="POST">
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
            
            <button type="submit" class="submit-button">Send Message</button>
        </form>
        <p><a href="index.html">← Back to Home</a></p>
    </div>
</body>
</html>
```

### File: `src/process_contact_form.php`

```php
<?php
// Check if form was submitted using POST method
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  // Get form data and sanitize it to prevent XSS attacks
  $name = htmlspecialchars($_POST['name'] ?? '');
  $email = htmlspecialchars($_POST['email'] ?? '');
  $message = htmlspecialchars($_POST['message'] ?? '');
} else {
  // If accessed directly (not via form), redirect back to form
  header('Location: contact_form.html');
  exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You</title>
  <link rel="stylesheet" href="style.css">
</head>
<body class="form-body">
  <div class="form-container">
    <h1 class="success-title">✅ Thank You!</h1>
    <!-- Success message to confirm form submission -->
    <div class="success">
      Your message has been received successfully!
    </div>
    <!-- Display the submitted form data back to user -->
    <div class="form-data">
      <h3>Your submission:</h3>
      <!-- PHP echo outputs the sanitized form data -->
      <p><strong>Name:</strong> <?php echo $name; ?></p>
      <p><strong>Email:</strong> <?php echo $email; ?></p>
      <!-- nl2br converts line breaks to HTML <br> tags -->
      <p><strong>Message:</strong><br><?php echo nl2br($message); ?></p>
    </div>
    <!-- Navigation links for user to continue -->
    <p>
      <a href="index.html">← Back to Home</a> | 
      <a href="contact_form.html">Send Another Message</a>
    </p>
  </div>
</body>
</html>
```

### File: `src/style.css`

```css
/* General styles */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}

.container {
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    width: 90%;
}

h1 {
    color: #333;
    text-align: center;
}

.button {
    display: inline-block;
    background: #667eea;
    color: white;
    padding: 10px 20px;
    text-decoration: none;
    border-radius: 5px;
    transition: background 0.3s;
}

.button:hover {
    background: #764ba2;
}

/* Form styles */
.form-body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.form-container {
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 90%;
}

.form-group {
    margin-bottom: 1.5rem;
}

label {
    display: block;
    margin-bottom: 0.5rem;
    color: #555;
    font-weight: bold;
}

input[type="text"],
input[type="email"],
textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    box-sizing: border-box;
    font-size: 16px;
}

textarea {
    resize: vertical;
}

.submit-button {
    background: #667eea;
    color: white;
    padding: 12px 30px;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    cursor: pointer;
    width: 100%;
    transition: background 0.3s;
}

.submit-button:hover {
    background: #764ba2;
}

/* Success page styles */
.success {
    background: #d4edda;
    color: #155724;
    padding: 1rem;
    border-radius: 5px;
    margin: 1rem 0;
}

.success-title {
    color: #28a745;
}

.form-data {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 5px;
    margin: 1rem 0;
}

.info {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #eee;
}

a {
    color: #667eea;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}
```

### File: `src/nginx.conf` (Optional - for advanced setup)

```nginx
server {
    listen 80;
    server_name localhost;
    root /var/www/html;
    index index.php index.html;

    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
}
```

> 💡 **Note**: The nginx.conf file is included for reference but is not used in our simple PHP server setup. It would be needed if you decide to use the more advanced nginx + PHP-FPM configuration later.
