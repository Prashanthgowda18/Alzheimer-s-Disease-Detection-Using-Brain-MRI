import torch
from sklearn.metrics import classification_report, confusion_matrix
import numpy as np

# Import the necessary builder functions and variables from your existing train.py
from train import build_dataloaders, build_model, MODEL_OUT_PATH, device

def main():
    print("Loading dataloaders...")
    dataloaders, dataset_sizes, class_names = build_dataloaders()
    test_loader = dataloaders["test"]
    
    print("Loading model architecture...")
    model = build_model()
    
    print(f"Loading trained weights from {MODEL_OUT_PATH}...")
    try:
        model.load_state_dict(torch.load(MODEL_OUT_PATH, map_location=device))
    except FileNotFoundError:
        print(f"Error: Could not find model weights at {MODEL_OUT_PATH}.")
        print("Make sure you have finished running train.py first!")
        return
        
    model.eval()
    
    all_preds = []
    all_labels = []
    
    print("Running inference on the test set. This might take a minute...")
    with torch.no_grad():
        for inputs, labels in test_loader:
            inputs = inputs.to(device)
            labels = labels.to(device)
            outputs = model(inputs)
            _, preds = torch.max(outputs, 1)
            
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            
    print("\n" + "="*50)
    print("EVALUATION RESULTS")
    print("="*50)
    
    print("\nClassification Report (Accuracy, Precision, Recall, F1-Score):")
    # Using digits=4 to give you precise numbers for your IEEE paper
    report = classification_report(all_labels, all_preds, target_names=class_names, digits=4)
    print(report)
    
    print("\nConfusion Matrix:")
    cm = confusion_matrix(all_labels, all_preds)
    print(cm)
    
    print("\nNote: You can copy the Precision, Recall, F1-Score, and Support directly into Table II of your paper.")

if __name__ == "__main__":
    main()
