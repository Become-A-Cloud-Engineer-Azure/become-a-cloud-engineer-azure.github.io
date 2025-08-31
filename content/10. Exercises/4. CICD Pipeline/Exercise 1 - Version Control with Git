+++
title = "1. Version Control with Git and GitHub"
weight = 1
date = 2025-08-31
draft = false
+++

## 🎯 Goal

Create a static HTML website and establish version control using Git and GitHub to prepare for automated deployment to Azure with nginx.

## 📋 Prerequisites

Before beginning this exercise, you should:

- Have VS Code installed on your local machine
- Have Git installed and working in your terminal
- Have created a free GitHub account at github.com
- Understand basic command line navigation

## 📚 Learning Objectives

By the end of this exercise, you will:

- Configure **Git** with your identity for commit tracking
- Use **essential Git commands** (init, add, commit, status, log, diff)
- Create and manage a **local Git repository**
- Connect a local repository to **GitHub as a remote**
- Understand the **staging area** and commit workflow
- **Push and pull** changes between local and remote repositories

## 🔍 Why This Matters

In real-world applications, version control is crucial because:

- It enables team collaboration on the same codebase
- It's an industry standard for tracking code changes and history
- It will be foundational for the CI/CD pipeline we'll build next

## 📝 Step-by-Step Instructions

### Step 1: Configure Git Identity

1. Open VS Code and access the integrated terminal (Terminal → New Terminal or `Ctrl+` `)
2. Configure your Git username and email globally:

    ```bash
    git config --global user.name "Your Name"
    git config --global user.email "your.email@example.com"
    ```

3. Verify your configuration:

    ```bash
    git config --list
    ```

> 💡 **Information**
>
> - **Global Configuration**: These settings apply to all Git repositories on your machine
> - **Commit Attribution**: Every commit you make will be tagged with this identity
> - This is a one-time setup unless you need different identities for different projects
>
> ⚠️ **Common Mistakes**
>
> - Using a fake email will prevent GitHub from linking commits to your account
> - Forgetting to configure Git will prompt for this information on first commit

### Step 2: Create Project Structure

1. Create and navigate to project directory in terminal:

    ```bash
    mkdir my-azure-webapp
    cd my-azure-webapp
    code .
    ```

2. In VS Code Explorer panel, create the following folder structure:
   - Right-click → New Folder → `html`
   - Inside `html`, create folders: `css`, `js`, `images`

3. Create the main HTML file:
   - Right-click on `html` folder → New File → `index.html`
   - Add the following content:

    > `html/index.html`

    ```html
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My Azure Web App</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f0f0f0;
            }
            .container {
                background-color: white;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #0078d4; }
            .info {
                background-color: #e7f3ff;
                padding: 15px;
                border-radius: 5px;
                margin-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Welcome to My Azure Web Application</h1>
            <p>This is a simple static website that will be served by nginx on Azure.</p>
            <div class="info">
                <h2>Version Information</h2>
                <p>Version: 1.0.0</p>
                <p>Environment: Development</p>
                <p>Last Updated: <span id="date"></span></p>
            </div>
        </div>
        <script>
            document.getElementById('date').textContent = new Date().toLocaleDateString();
        </script>
    </body>
    </html>
    ```

4. Create README file:
   - Right-click in root → New File → `README.md`
   - Add content:

    > `README.md`

    ```markdown
    # My Azure Web Application
    
    A simple static website designed to be served by nginx on Azure.
    
    ## Structure
    - `html/` - Contains all web content
    - `html/index.html` - Main landing page
    
    ## Deployment
    This application will be deployed to an Ubuntu VM on Azure running nginx.
    ```

> 💡 **Information**
>
> - **Project Structure**: Organizing files in folders keeps the project maintainable
> - **HTML5 Template**: Using semantic HTML and embedded styles for simplicity
> - **README**: Documents the project for other developers (or future you)

### Step 3: Initialize Git Repository

1. In VS Code's integrated terminal, initialize repository:

    ```bash
    git init
    ```

2. Create `.gitignore` file:
   - Right-click in root → New File → `.gitignore`
   - Add content:

    > `.gitignore`

    ```gitignore
    # OS generated files
    .DS_Store
    Thumbs.db
    
    # Editor directories
    .vscode/
    .idea/
    
    # Logs and temp files
    *.log
    *.tmp
    temp/
    ```

3. Check repository status:

    ```bash
    git status
    ```

> 💡 **Information**
>
> - **git init**: Creates a hidden `.git` folder containing repository metadata
> - **.gitignore**: Prevents unwanted files from being tracked
> - **git status**: Shows working directory state and staging area
>
> ⚠️ **Common Mistakes**
>
> - Running `git init` in the wrong directory creates nested repositories
> - Forgetting `.gitignore` may commit sensitive or unnecessary files

### Step 4: Stage and Commit Files

1. Add all files to staging area:

    ```bash
    git add .
    ```

2. Verify staged files (should appear in green):

    ```bash
    git status
    ```

3. Create first commit:

    ```bash
    git commit -m "Initial commit: Basic HTML structure for nginx deployment"
    ```

4. View commit history:

    ```bash
    git log --oneline
    ```

> 💡 **Information**
>
> - **Staging Area**: A buffer between working directory and repository
> - **Commit Messages**: Should be descriptive and follow conventions
> - **Atomic Commits**: Each commit should represent one logical change
>
> **Alternative: VS Code Source Control**
>
> - Click Source Control icon (Ctrl+Shift+G)
> - Stage files with + button
> - Enter message and click checkmark to commit

### Step 5: Make and Track Changes

1. Open `html/index.html` and add features section before closing `</div>`:

    > `html/index.html` (addition)

    ```html
    <div class="features">
        <h2>Features</h2>
        <ul>
            <li>Static HTML content</li>
            <li>Responsive design</li>
            <li>Ready for nginx deployment</li>
            <li>Version controlled with Git</li>
        </ul>
    </div>
    ```

2. Save file (Ctrl+S) and check changes:

    ```bash
    git diff
    ```

3. Stage and commit:

    ```bash
    git add html/index.html
    git commit -m "Add features section to homepage"
    ```

> 💡 **Information**
>
> - **git diff**: Shows unstaged changes line by line
> - **Partial Staging**: You can stage specific files instead of everything
> - **Commit Frequency**: Commit logical units of work, not time-based

### Step 6: Create GitHub Repository

1. Log into GitHub.com
2. Click "New repository" (+ icon in top right)
3. Configure repository:
   - **Name**: `my-azure-webapp`
   - **Description**: "Simple web application for Azure nginx deployment"
   - **Visibility**: Public
   - **DO NOT** initialize with README, .gitignore, or license

4. Click "Create repository"

> ⚠️ **Common Mistakes**
>
> - Initializing with README creates a commit that conflicts with local repository
> - Private repositories require authentication for CI/CD pipelines

### Step 7: Connect Local to Remote

1. Add GitHub as remote (replace USERNAME):

    ```bash
    git remote add origin https://github.com/USERNAME/my-azure-webapp.git
    ```

2. Verify remote configuration:

    ```bash
    git remote -v
    ```

3. Push to GitHub:

    ```bash
    git branch -M main
    git push -u origin main
    ```

> 💡 **Information**
>
> - **origin**: Conventional name for primary remote repository
> - **-u flag**: Sets upstream tracking for easier future pushes
> - **main branch**: Modern convention replacing "master"
>
> ⚠️ **Common Mistakes**
>
> - GitHub now requires Personal Access Tokens instead of passwords
> - Generate token at: Settings → Developer settings → Personal access tokens

### Step 8: Practice Remote Workflow

1. Make local change - update version in `html/index.html` to "1.1.0"
2. Commit and push:

    ```bash
    git add html/index.html
    git commit -m "Update version to 1.1.0"
    git push
    ```

3. Make remote change on GitHub:
   - Edit README.md on GitHub
   - Add line: `## Author: [Your Name]`
   - Commit with message "Add author information"

4. Pull remote changes:

    ```bash
    git pull
    ```

> 💡 **Information**
>
> - **push**: Uploads local commits to remote
> - **pull**: Downloads and merges remote changes
> - **Merge Conflicts**: Occur when same lines changed in both places

## ✅ Verification

Run these checks to ensure exercise completion:

```bash
# Check Git configuration
git config user.name
git config user.email

# Verify repository status
git status  # Should show "nothing to commit, working tree clean"

# Check commit history
git log --oneline  # Should show at least 3 commits

# Verify remote
git remote -v  # Should show origin URLs

# Test website
open html/index.html  # Should display in browser
```

## 🎉 Summary

You've successfully:

- Created a Git repository with proper configuration
- Made multiple commits with descriptive messages
- Connected to GitHub as a remote repository
- Practiced the push/pull workflow

This foundation enables collaborative development and prepares for automated CI/CD deployment in the next exercise.

## 📌 Troubleshooting

| Problem | Solution |
|---------|----------|
| Push requires authentication | Use Personal Access Token, not password |
| Rejected push | Pull first: `git pull`, resolve conflicts, then push |
| Wrong commit author | `git commit --amend --reset-author` |
| Can't see Git panel in VS Code | Open folder containing .git (File → Open Folder) |

## 🚀 Next Exercise

In Exercise 2, you will create a GitHub Actions workflow to automatically deploy this website to an Azure VM running nginx.
