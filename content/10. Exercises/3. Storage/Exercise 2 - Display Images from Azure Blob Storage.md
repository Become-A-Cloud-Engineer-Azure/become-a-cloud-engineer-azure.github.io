+++
title = "2. Display Images from Azure Blob Storage in a PHP Web Application"
weight = 2
date = 2025-08-24
draft = false
+++

## Introduction

In this tutorial, we're going to guide you through the steps to display images stored in Azure
Blob Storage on a PHP web application. This process involves setting up Blob Storage with public
access, uploading images to it, and then configuring a PHP web application to retrieve and
display these images.

## Method

- We will utilize the Azure portal to configure a Blob Storage container, which is anonymously accessible.
- A PHP web application will be developed to serve our images.
- Within the web application, we will use the Azure SDK for PHP to fetch image URLs from Azure Blob Storage.
- The configurations, such as the connection string and container name, will be loaded via environment variables.

## Prerequisites

- An Azure account. If you don't have one, sign up at [Azure's official site](https://azure.microsoft.com/).
- Basic familiarity with Azure services and PHP web development.
- Composer installed (PHP dependency manager)

### Install Composer

**On macOS:**

```bash
# Using Homebrew (recommended)
brew install composer

# Or manual installation
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

**On Linux:**

```bash
# Download and install globally
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Or use package manager (Ubuntu/Debian)
sudo apt update
sudo apt install composer
```

**On Windows:**

- Download and run the installer from
  [https://getcomposer.org/Composer-Setup.exe](https://getcomposer.org/Composer-Setup.exe)
- The installer will set up Composer globally

**Verify installation:**

```bash
composer --version
```

## Step 1: Set Up Azure Blob Storage

1. Create a Resource Group `BlobDemoRG`
2. Create a Storage Account:
   - Select **Storage accounts** in the resource menu
   - Click the **+ Create** button
     - Resource Group: `BlobDemoRG`
     - Storage account name: `blobdemo<datetime>` (change datetime to the current date and time)
     - Press **Review**
     - Press **Create**
     - Press **Go to resource**
   - Select **Configuration** in the _Settings_ section of the storage account menu
     - (Alt: Select **Security** from storage account _Overview_)
   - Enable **Allow Blob anonymous access**
   - Press **Save**
3. Create a Blob Storage:
   - Select **Container** in the _Data storage_ section of the storage account menu
   - Press **+ Container**
     - Choose a name: `imagerepository`
     - Anonymous access level: `Blob (anonymous read access for blobs only)`
     - Press **Create**
4. Upload images
   - Select the `imagerepository`
   - Press **Upload**
   - Select the images and press **Upload**

### Verify the image upload

- Select an image to open up details
- Copy the URL and open in a private browser window

> It's important that it is a private browser window since you are logged in to the Azure
> portal in the regular browser window. This will grant you access also to images that are
> not necessarily publically accessible on the Internet

### Retrieve the Connection String

- Select your newly created blob storage `blobdemo<datetime>`
- Go to **Access keys** in the _Security + networking_ section of the storage account menu
- Find _Connection string_ and press **Show**. Copy the _Connection string_ and use it in your app

## Step 2: Create the PHP Web Application

### Set Up the Webapp

Create a directory called `blob-storage-php` and navigate to it:

```bash
mkdir blob-storage-php
cd blob-storage-php
```

Then add the following files:

#### Install Azure SDK for PHP

Create a `composer.json` file:

> composer.json

```json
{
    "require": {
        "microsoft/azure-storage-blob": "^1.5"
    }
}
```

Install dependencies:

```bash
composer install
```

#### Create environment configuration

> .env

```bash
# Azure Blob Storage Configuration
AZURE_STORAGE_CONNECTION_STRING="Paste your connection string here"
AZURE_STORAGE_CONTAINER_NAME="imagerepository"
```

**Important:** Replace `"Paste your connection string here"` with your actual Azure Storage
connection string that you copied from Step 1. The connection string should look like:

```text
DefaultEndpointsProtocol=https;AccountName=yourstorageaccount;AccountKey=yourkey;EndpointSuffix=core.windows.net
```

#### Create the main application file

> index.php

```php
<?php
// Suppress deprecation warnings for Azure SDK compatibility
error_reporting(E_ALL & ~E_DEPRECATED);

require_once 'vendor/autoload.php';
use MicrosoftAzure\Storage\Blob\BlobRestProxy;
use MicrosoftAzure\Storage\Common\ServiceException;

// Load environment variables
function loadEnv($file) {
    if (!file_exists($file)) return;
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && substr($line, 0, 1) !== '#') {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value, '"');
        }
    }
}

loadEnv('.env');

function getImageUrls() {
    try {
        // Create blob client
        $connectionString = $_ENV['AZURE_STORAGE_CONNECTION_STRING'];
        $containerName = $_ENV['AZURE_STORAGE_CONTAINER_NAME'];
        
        $blobClient = BlobRestProxy::createBlobService($connectionString);
        
        // List blobs in container
        $blobList = $blobClient->listBlobs($containerName);
        $imageUrls = [];
        
        foreach ($blobList->getBlobs() as $blob) {
            $blobUrl = $blobClient->getBlobUrl($containerName, $blob->getName());
            $imageUrls[] = $blobUrl;
        }
        
        return $imageUrls;
    } catch (ServiceException $e) {
        error_log("Error: " . $e->getMessage());
        return [];
    }
}

$imageUrls = getImageUrls();
?>

<!DOCTYPE html>
<html>
<head>
    <title>Azure Blob Storage Images</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .image-gallery { display: flex; flex-wrap: wrap; gap: 20px; }
        .image-item { text-align: center; }
        .image-item img { max-width: 200px; height: auto; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <h1>Images from Azure Blob Storage</h1>
    
    <?php if (empty($imageUrls)): ?>
        <p>No images found or unable to connect to Azure Blob Storage.</p>
    <?php else: ?>
        <div class="image-gallery">
            <?php foreach ($imageUrls as $imageUrl): ?>
                <div class="image-item">
                    <img src="<?php echo htmlspecialchars($imageUrl); ?>" alt="Image from Azure Blob Storage">
                </div>
            <?php endforeach; ?>
        </div>
        <p>Found <?php echo count($imageUrls); ?> images.</p>
    <?php endif; ?>
</body>
</html>
```

> **Note:** The Azure Storage PHP SDK was retired in March 2024, but it still functions
> correctly. The `error_reporting` line at the top suppresses deprecation warnings that
> appear with newer PHP versions.

### Install dependencies and run the application

First, install the Azure SDK using Composer:

```bash
composer install
```

Then start a local PHP server:

```bash
php -S localhost:8000
```

Visit `http://localhost:8000` to see your images.

**Note:** Make sure to add your actual Azure Storage connection string to the `.env` file
before running the application.

## Conclusion

You've successfully learned how to display images from Azure Blob Storage in a PHP web
application. This guide introduced you to creating and configuring Blob Storage for public
access, uploading images, and setting up a PHP web application to display these images using
the Azure SDK for PHP.

## Don't Forget

Azure services incur costs. Delete resources you no longer need.

## References

This tutorial is based on the following articles:

Working with Azure Blob Storage:
<https://learn.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-dotnet?tabs=net-cli%2Cmanaged-identity%2Croles-azure-portal%2Csign-in-azure-cli%2Cidentity-visual-studio&pivots=blob-storage-quickstart-scratch>

Lifetime:
<https://devblogs.microsoft.com/azure-sdk/lifetime-management-and-thread-safety-guarantees-of-azure-sdk-net-clients/>

## Happy Developing! 🚀

## Working with Azure Storage Accounts Locally

Developing cloud applications often involves interacting with resources in the cloud itself.
However, constantly interacting with live cloud resources during development can be slow and
cost-ineffective.

This tutorial guides you through setting up your local development environment for working
with Azure Storage accounts using two tools allowing you to emulate Azure Storage accounts
locally:

- Azurite emulator (VSCode Extension)
- Azure Storage Explorer (Application for Windows, Mac and Linux)

### Using the Azurite Emulator with VSCode

Azurite is an open-source storage emulator supported by Azure. It emulates Azure Blob, Queue,
and Table storage services locally, enabling offline development. The easiest way to use
Azurite is through its VSCode extension.

#### Setting up Azurite in VSCode

1. **Install the Azurite Extension**: Open VSCode, go to the Extensions view by clicking on
   the extension icon on the sidebar. Search for "Azurite" and install the extension.
2. **Start Azurite**: Once installed, open the Command Palette with `Ctrl+Shift+P` (or
   `Cmd+Shift+P` on Mac), type "Azurite: Start", and select the command. This action starts
   the emulator and creates a default storage account locally. (You will also find the
   Azurite services in the bottom status bar, where you can easily toggle the services
   on and off)

#### Configuring Your Application

1. Create the Blob storage container in the emulator
   - Go to the "Azure" icon in the VSCode left menu bar
   - Under the "Workspace" section you find the emulator. Expand "Attached Storage Accounts"
   - Right click the Blob Containers and create the `imagerepository`

2. To interact with the emulated storage account, update your application's storage connection
   string to use Azurite's default settings in the Development environment:

   > appsettings.Development.json

   ```json
   {
     "AzureBlobImageService": {
       "ConnectionString": "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;",
       "ContainerName": "imagerepository"
     }
   }
   ```

For guidance on Azurite and detailed setup instructions, go to the [official Microsoft Learn
documentation](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite?tabs=visual-studio-code%2Cblob-storage#connect-to-azurite-with-sdks-and-tools).

### Exploring Local Storage with Azure Storage Explorer

Azure Storage Explorer is a standalone application that allows you to manage Azure Storage data.
It supports browsing data in Azure Blob, File Shares, Queues, Tables, and Cosmos DB and it
also **works with local data emulated by Azurite**.

#### Setting Up Azure Storage Explorer

1. **Download Azure Storage Explorer**: Go to the
   [Azure Storage Explorer download page](https://azure.microsoft.com/en-us/products/storage/storage-explorer)
   and download the version compatible with your operating system.
2. **Install and Open Azure Storage Explorer**: Follow the installation guide. Once installed,
   launch the application.

#### Connecting to Azurite

1. **Open Azure Storage Explorer** and navigate to the "Local & Attached" section in the
   Explorer pane.
2. **Connect to Azurite**: Right-click on "Storage Accounts", select "Connect to Azure
   Storage...", and choose "Attach to a local emulator (standard ports)".
3. **Replicate Cloud Settings Locally**: Right-click on "imagerepository" to change the
   settings for _public access settings_ to Blob
4. Upload some content

If you want to know more about Azure Storage Explorer, go to the
[official documentation](https://docs.microsoft.com/azure/vs-azure-tools-storage-manage-with-storage-explorer).

> You can run **Azurite: Clean** from the Command Palette do delete the local blob storage.

##### Verify

Start you application and verify that you see the local content

### Summary

Azurite, combined with the Azure Storage Explorer, provides a great setup for local
development, allowing you to emulate, manage, and interact with storage accounts locally.
