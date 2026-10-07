import os
import sys
import time
import json
import torch
import torch.nn as nn
from torchvision import models, transforms
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io

START_TIME = time.time()

app = Flask(__name__)
CORS(app)

# ----------------------------------------------------------------------------
# Model configuration and loading
# ----------------------------------------------------------------------------
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model')
MODEL_PATH = os.path.join(MODEL_DIR, 'resnet50_alzheimer.pth')
CLASS_NAMES_PATH = os.path.join(MODEL_DIR, 'class_names.json')

# Recommendations mapping based on previous STAGE_TEMPLATES
RECOMMENDATIONS = {
    "NonDemented": "No signs of cognitive impairment detected. Maintain a healthy lifestyle, regular exercise, and return for standard baseline follow-up in 12 months.",
    "VeryMildDemented": "Very mild cognitive patterns identified. Consider scheduling a routine neuropsychological screening and lifestyle modifications to support brain health.",
    "MildDemented": "Mild dementia markers detected. Recommend scheduling a comprehensive neurological consult and brain imaging review for early intervention planning.",
    "ModerateDemented": "Moderate diagnostic patterns present. Refer patient for formal geriatric psychiatric review, cognitive support planning, and medical care coordination."
}

# Human-readable labels mapping
DISPLAY_LABELS = {
    "NonDemented": "Non Demented",
    "VeryMildDemented": "Very Mild Demented",
    "MildDemented": "Mild Demented",
    "ModerateDemented": "Moderate Demented"
}

# 6. Fallback if model files are missing
default_class_names = ["MildDemented", "ModerateDemented", "NonDemented", "VeryMildDemented"]
if not os.path.exists(CLASS_NAMES_PATH):
    print(f"WARNING: Class names file not found at {CLASS_NAMES_PATH}. Using defaults.", file=sys.stderr)
    class_names = default_class_names
else:
    with open(CLASS_NAMES_PATH, 'r') as f:
        class_names = json.load(f)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Loading ResNet50 model to {device}...")

# Build model architecture matching train.py
def build_model(num_classes):
    model = models.resnet50()
    num_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(num_features, num_classes),
    )
    return model

model = build_model(len(class_names))

if not os.path.exists(MODEL_PATH):
    print(f"WARNING: Model weights not found at {MODEL_PATH}. Using randomly initialized weights for demonstration.", file=sys.stderr)
else:
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))

model.to(device)
model.eval()
print("Model loaded successfully.")

# ImageNet normalization from train.py
data_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# ----------------------------------------------------------------------------
# API Endpoints
# ----------------------------------------------------------------------------
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "model": "ResNet50",
        "version": "1.0",
        "uptime_ms": int((time.time() - START_TIME) * 1000)
    }), 200

@app.route('/predict', methods=['POST'])
def predict():
    request_start = time.time()
    
    if 'image' not in request.files:
        return jsonify({"success": False, "error": "Invalid request: Form field 'image' containing the scan file is missing."}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"success": False, "error": "Invalid request: No file selected for upload."}), 400

    try:
        # Read image directly from memory instead of saving to disk
        image_bytes = file.read()
        import hashlib, sys
        print(f"DEBUG: Received file {file.filename}, Size: {len(image_bytes)} bytes, Hash (first 20 bytes): {hashlib.sha256(image_bytes[:20]).hexdigest()}", file=sys.stderr, flush=True)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Preprocess
        input_tensor = data_transform(image).unsqueeze(0).to(device)

        # Inference
        with torch.no_grad():
            outputs = model(input_tensor)
            probs = torch.nn.functional.softmax(outputs, dim=1)[0]
            confidence, preds = torch.max(probs, 0)
        
        predicted_class = class_names[preds.item()]
        probabilities = {class_names[i]: float(probs[i]) for i in range(len(class_names))}

        stage = DISPLAY_LABELS.get(predicted_class, predicted_class)
        recommendation = RECOMMENDATIONS.get(predicted_class, "Consult with a healthcare professional.")

        response_data = {
            "success": True,
            "stage": stage,
            "confidence": float(confidence),
            "recommendation": recommendation,
            "processing_ms": int((time.time() - request_start) * 1000),
            "model": "ResNet50",
            "version": "1.0",
            "probabilities": probabilities
        }

        return jsonify(response_data), 200

    except Exception as e:
        print(f"Internal Server Error: {str(e)}", file=sys.stderr)
        return jsonify({
            "success": False,
            "error": f"Internal Server Error: {str(e)}"
        }), 500

if __name__ == '__main__':
    print("*" * 50)
    print("Alzheimer ML API running (PyTorch ResNet50)")
    print("URL: http://127.0.0.1:5000")
    print("*" * 50)
    app.run(host='0.0.0.0', port=5000, debug=False)
