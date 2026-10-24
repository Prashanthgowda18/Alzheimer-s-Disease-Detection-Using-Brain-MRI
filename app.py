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

import uuid
import datetime

START_TIME = time.time()

# Simple in‑memory store for predictions (demo only)
_predictions_store = {}

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
# New API endpoints for client wrapper
@app.route('/api/predictions/upload', methods=['POST'])
def upload_prediction():
    # Reuse /predict logic but store result
    request_start = time.time()
    file = request.files.get('image') or request.files.get('file')
    if not file:
        return jsonify({"success": False, "error": "Missing 'image' or 'file' form data."}), 400
    if file.filename == '':
        return jsonify({"success": False, "error": "No file selected."}), 400
    try:
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        input_tensor = data_transform(image).unsqueeze(0).to(device)
        with torch.no_grad():
            outputs = model(input_tensor)
            probs = torch.nn.functional.softmax(outputs, dim=1)[0]
            confidence, preds = torch.max(probs, 0)
        predicted_class = class_names[preds.item()]
        probabilities = {class_names[i]: float(probs[i]) for i in range(len(class_names))}
        stage = DISPLAY_LABELS.get(predicted_class, predicted_class)
        recommendation = RECOMMENDATIONS.get(predicted_class, "Consult with a healthcare professional.")
        
        confidence_val = float(confidence)
        confidence_level = "High" if confidence_val > 0.8 else ("Moderate" if confidence_val > 0.5 else "Low")

        # Build response data
        response_data = {
            "success": True,
            "stage": stage,
            "confidence": confidence_val,
            "confidence_level": confidence_level,
            "recommendation": recommendation,
            "recommendation_display": recommendation,
            "processing_ms": int((time.time() - request_start) * 1000),
            "model": "ResNet50",
            "model_name": "ResNet50",
            "version": "1.0",
            "model_version": "1.0",
            "probabilities": probabilities,
        }
        # Store with UUID
        pred_id = str(uuid.uuid4())
        patient_id = request.form.get('patientId') or ''
        stored_payload = {
            "id": pred_id,
            "predictionId": pred_id,
            "patient_id": patient_id,
            "patientId": patient_id,
            "patient_name": request.form.get('patientName', 'Clinical Patient'),
            **response_data,
        }
        stored = {
            "id": pred_id,
            "created_at": datetime.datetime.utcnow().isoformat() + 'Z',
            "data": stored_payload,
        }
        if patient_id:
            stored["patientId"] = patient_id
        _predictions_store[pred_id] = stored
        # Return stored payload (including id and predictionId)
        return jsonify({"id": pred_id, "predictionId": pred_id, "data": stored_payload, **response_data}), 200
    except Exception as e:
        print(f"Internal Server Error in upload_prediction: {str(e)}", file=sys.stderr)
        return jsonify({"success": False, "error": f"Internal Server Error: {str(e)}"}), 500

@app.route('/api/predictions/<pred_id>', methods=['GET'])
def get_prediction(pred_id):
    stored = _predictions_store.get(pred_id)
    if not stored:
        return jsonify({"success": False, "error": "Prediction not found."}), 404
    # Return stored data (including id and predictionId)
    resp = {"id": pred_id, "predictionId": pred_id, **stored["data"]}
    return jsonify(resp), 200

@app.route('/api/predictions/<pred_id>', methods=['DELETE'])
def delete_prediction(pred_id):
    if pred_id in _predictions_store:
        del _predictions_store[pred_id]
        return jsonify({"success": True, "deleted": pred_id}), 200
    else:
        return jsonify({"success": False, "error": "Prediction not found."}), 404

@app.route('/api/predictions/me', methods=['GET'])
def list_my_predictions():
    # Simple pagination parameters
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    stage_filter = request.args.get('stage', '')
    items = list(_predictions_store.values())
    if stage_filter:
        items = [i for i in items if i["data"].get("stage") == stage_filter]
    # sort by creation (newest first)
    items.sort(key=lambda x: x["created_at"], reverse=True)
    start = (page - 1) * limit
    end = start + limit
    paged = items[start:end]
    result = [{"id": i["id"], "predictionId": i["id"], **i["data"]} for i in paged]
    return jsonify({"items": result, "data": result, "page": page, "limit": limit, "total": len(items)}), 200

@app.route('/api/patients/<patient_id>/predictions', methods=['GET'])
def list_patient_predictions(patient_id):
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    items = [i for i in _predictions_store.values() if i.get('patientId') == patient_id]
    items.sort(key=lambda x: x["created_at"], reverse=True)
    start = (page - 1) * limit
    end = start + limit
    paged = items[start:end]
    result = [{"id": i["id"], "predictionId": i["id"], **i["data"]} for i in paged]
    return jsonify({"items": result, "data": result, "page": page, "limit": limit, "total": len(items)}), 200

# ----------------------------------------------------------------------------
@app.route('/', methods=['GET'])
def index():
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alzheimer ML API Server</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; box-sizing: border-box; }
        .card { background: #1e293b; border: 1px solid #334155; padding: 2.2rem; border-radius: 1rem; max-width: 560px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .badge { background: #10b981; color: #022c22; font-weight: bold; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; display: inline-block; }
        h1 { margin: 0.75rem 0 0.5rem; font-size: 1.5rem; color: #f8fafc; }
        p { color: #94a3b8; line-height: 1.5; font-size: 0.95rem; }
        .btn { display: inline-block; background: #3b82f6; color: white; padding: 0.75rem 1.25rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; margin-top: 1rem; }
        .btn:hover { background: #2563eb; }
        code { background: #0f172a; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-size: 0.85rem; color: #38bdf8; }
        ul { padding-left: 1.2rem; color: #cbd5e1; }
        li { margin-bottom: 0.5rem; }
    </style>
</head>
<body>
    <div class="card">
        <span class="badge">&#10003; API ONLINE</span>
        <h1>Alzheimer ML Backend Service</h1>
        <p>This is the <strong>PyTorch ResNet50 Inference API</strong> running on port 5000. It receives brain MRI scans from the web application and performs classification.</p>
        
        <p><strong>To use the main Web Application:</strong></p>
        <a class="btn" href="http://localhost:3000">Open Web Application (Port 3000) &rarr;</a>
        
        <h3 style="margin-top: 1.75rem; font-size: 1.1rem; color: #f8fafc;">API Endpoints:</h3>
        <ul>
            <li><code>GET /health</code> &mdash; Health check & uptime status</li>
            <li><code>POST /predict</code> &mdash; MRI scan image classification</li>
        </ul>
    </div>
</body>
</html>
""", 200

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
    
    file = request.files.get('image') or request.files.get('file')
    if not file:
        return jsonify({"success": False, "error": "Invalid request: Form field 'image' or 'file' containing the scan file is missing."}), 400

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
    app.run(host='127.0.0.1', port=5000, debug=False)
