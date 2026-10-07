# Comprehensive Project Report: Alzheimer's MRI Prediction System

This report provides a detailed breakdown of the tools, technologies, and architecture used in the development of the Alzheimer's MRI Prediction System. It is designed to serve as a reference document and includes a Q&A guide to help prepare for presentation defenses.

---

## Part 1: Techniques Used

### 1. Deep Learning & CNNs (ResNet50)
We implemented a Deep Learning approach using Convolutional Neural Networks (CNNs), specifically the ResNet50 architecture. CNNs are highly effective for image analysis because they automatically detect spatial hierarchies and visual patterns (like edges, textures, and structures) in MRI scans. The ResNet50 model, being 50 layers deep, uses residual blocks (skip connections) to train effectively without losing crucial information, making it ideal for complex medical image classification.

### 2. Transfer Learning (ImageNet)
Instead of training a model from scratch—which requires vast amounts of data and computational power—we utilized Transfer Learning. We took a ResNet50 model that was pre-trained on ImageNet (a dataset of over 14 million images). By doing so, the model already understood basic visual features. We then fine-tuned the final layers of this model specifically on our Alzheimer's MRI dataset. This approach drastically reduced training time and significantly improved the model's accuracy on a smaller, specialized medical dataset.

### 3. Image Preprocessing & Data Augmentation
To ensure the model trained reliably and didn't just memorize the training data (overfitting), we applied rigorous preprocessing and augmentation techniques:
*   **Preprocessing:** All MRI scans were standardized by resizing them to 224x224 pixels, converting them to RGB, and normalizing their pixel values to match the format the ResNet50 model expects.
*   **Augmentation:** We artificially expanded our dataset by applying random transformations during training, such as rotation, flipping, zooming, shifting, and brightness adjustments. This forced the model to learn the true structural signs of dementia rather than relying on image artifacts or positioning.

### 4. Multi-Class Classification
Our system goes beyond simple binary classification (sick vs. healthy). It performs multi-class classification, successfully categorizing MRI images into four distinct stages of cognitive impairment: *NonDemented, VeryMildDemented, MildDemented, and ModerateDemented*. This granularity provides medical professionals with much more actionable diagnostic information.

### 5. RESTful API & Secure Web Integration
We designed a decoupled, secure architecture. The heavy machine learning model is isolated within a dedicated Python Flask RESTful API. The web application communicates with this API by sending the MRI scans securely over HTTP. Furthermore, the system integrates with a robust backend (PostgreSQL/Supabase) to enforce Role-Based Access Control (RBAC) and securely store patient scans in isolated Object Storage, ensuring strict adherence to data privacy and medical compliance standards.

---

## Part 2: Detailed Technology Stack Explanation

### 1. Machine Learning & AI Technologies
*   **Python:** The foundational programming language used for all data science, model training, and backend API logic. Selected for its extensive ecosystem of machine learning libraries.
*   **PyTorch & Torchvision:** The primary deep learning framework. PyTorch provides the flexible tensor computations necessary for training neural networks, while Torchvision supplies the pre-trained models and image transformation utilities.
*   **ResNet50 Architecture:** A 50-layer deep Convolutional Neural Network (CNN). It utilizes "skip connections" (residual blocks) to solve the vanishing gradient problem, allowing the network to learn extremely complex patterns without degrading accuracy.
*   **Transfer Learning (ImageNet):** The ResNet50 model was pre-trained on ImageNet (a dataset of over 14 million everyday images). We utilized this pre-trained model for "feature extraction"—leveraging its existing ability to recognize shapes and textures, and only retraining the final layers to specifically classify MRI brain scans.
*   **Pillow (PIL):** A Python Imaging Library used for loading and applying initial formatting to the raw MRI images before they are passed into the deep learning pipeline.

### 2. Backend & API Infrastructure
*   **Flask:** A lightweight and highly customizable Python web framework. It was used to build the dedicated backend service (`app.py`) that loads the PyTorch model into memory and listens for incoming image data.
*   **RESTful API Integration:** The system uses standard HTTP methods. When a user uploads an image, the frontend sends a `POST` request to the Flask API's `/predict` endpoint. The API processes the image and returns a structured JSON response containing the predicted dementia stage and confidence scores.

### 3. Frontend Web Application
*   **React & TanStack Start:** A modern React framework utilized for building the user interface. TanStack Start was chosen for its Server-Side Rendering (SSR) capabilities, which ensures the application loads quickly and securely handles backend logic before sending HTML to the client.
*   **Node.js & npm:** The JavaScript runtime environment and package manager used to build, manage dependencies, and run the frontend application.

### 4. Database & Security Architecture
*   **PostgreSQL:** An advanced, open-source relational database used to store structured data such as doctor profiles, patient registries, and historical prediction records.
*   **Supabase:** A Backend-as-a-Service platform built on top of PostgreSQL. It provided the infrastructure for:
    *   **Secure Object Storage:** Used to store the physical MRI image files. Images are accessed via Short-Lived Signed URLs, ensuring links expire quickly and data remains private.
    *   **Row-Level Security (RLS):** Database policies that ensure data is strictly isolated. A doctor can only query and view rows in the database that belong to their specific patients.
    *   **Role-Based Access Control (RBAC):** Custom roles (e.g., `admin`, `doctor`) enforced at the database level to restrict who can upload scans or view system-wide analytics.

---

## Part 3: Guide - Potential Presentation Questions (Q&A)

Here are common technical questions a panel might ask during your presentation, along with guided answers.

### Q1: Why did you choose ResNet50 instead of building a simple CNN from scratch?
**Answer:** Building a CNN from scratch requires a massive dataset to train the model to recognize basic shapes and edges before it can even begin to understand complex medical images. By using ResNet50 with Transfer Learning, the model already understood basic visual features. This allowed us to achieve much higher accuracy and faster convergence using a smaller, specialized medical dataset. Furthermore, ResNet50's residual connections prevent the vanishing gradient problem, making it highly reliable.

### Q2: Medical datasets are often imbalanced. Did you encounter this, and how did you handle it?
**Answer:** Yes, classes like "Moderate Demented" often have significantly fewer images than "Non Demented". We handled this by implementing class weighting in our loss function during training (via `train_weighted.py`). This technique heavily penalizes the model when it misclassifies a rare class, forcing the AI to pay equal attention to all stages of dementia rather than just guessing the majority class.

### Q3: Why did you separate the ML model into a Flask API instead of running it directly within the web app?
**Answer:** Decoupling the architecture provides three major benefits:
1. **Performance:** PyTorch models are memory-intensive. Running them on a dedicated backend prevents the frontend web app from slowing down or crashing.
2. **Security:** The model weights and proprietary AI logic remain hidden on our secure server, rather than being exposed in the client's browser.
3. **Scalability:** If user traffic increases, we can scale the lightweight frontend and the heavy ML backend independently of each other.

### Q4: How do you ensure patient data and MRI scans remain private and secure?
**Answer:** Security is implemented at multiple layers. First, we use **Role-Based Access Control (RBAC)** to ensure only authenticated medical professionals can log in. Second, we utilize PostgreSQL's **Row-Level Security (RLS)**, meaning the database physically prevents a doctor from querying patients that aren't assigned to them. Finally, the actual MRI scans are stored in secure Object Storage and are only accessible via dynamically generated, **Short-Lived Signed URLs** that expire within minutes.

### Q5: What is data augmentation, and why did you use it?
**Answer:** Data augmentation involves artificially expanding our dataset by applying random transformations to our existing training images—such as slight rotations, zooming, flipping, and brightness adjustments. We used this to prevent the model from memorizing the exact training images (overfitting) and to force it to learn the underlying structural patterns of Alzheimer's, making it more robust when analyzing entirely new MRI scans.

---
*Generated for presentation preparation.*
