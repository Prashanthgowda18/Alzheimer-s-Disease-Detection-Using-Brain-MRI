"""
Alzheimer's Stage Classification — ResNet50 Transfer Learning
================================================================
Trains a ResNet50 (ImageNet pretrained) on the 4-class Alzheimer's MRI dataset:
    NonDemented, VeryMildDemented, MildDemented, ModerateDemented

Dataset (Kaggle): tourist55/alzheimers-dataset-4-class-of-images
Expected folder structure after download:
    data/
        train/
            NonDemented/
            VeryMildDemented/
            MildDemented/
            ModerateDemented/
        test/
            NonDemented/
            VeryMildDemented/
            MildDemented/
            ModerateDemented/

Usage:
    1. Download dataset:
        pip install kaggle
        kaggle datasets download -d tourist55/alzheimers-dataset-4-class-of-images
        unzip alzheimers-dataset-4-class-of-images.zip -d data

    2. Run training:
        python train.py

    Output: model/resnet50_alzheimer.pth  (state_dict, load with the same
    architecture defined below — used by app.py for inference)
"""

import os
import time
import copy
import json

import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim import lr_scheduler
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
DATA_DIR = "data"
MODEL_OUT_DIR = "model"
MODEL_OUT_PATH = os.path.join(MODEL_OUT_DIR, "resnet50_alzheimer.pth")
CLASS_NAMES_PATH = os.path.join(MODEL_OUT_DIR, "class_names.json")

NUM_CLASSES = 4
BATCH_SIZE = 32
NUM_EPOCHS = 1          # changed to 1 for CPU training time
LEARNING_RATE = 1e-4
UNFREEZE_LAST_BLOCK = True   # fine-tune layer4 + fc, freeze everything before

# ImageNet normalization — matches your report's preprocessing spec exactly
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")


# ----------------------------------------------------------------------------
# Data transforms & loaders
# ----------------------------------------------------------------------------
data_transforms = {
    "train": transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ]),
    "test": transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ]),
}


def build_dataloaders():
    image_datasets = {
        split: datasets.ImageFolder(os.path.join(DATA_DIR, split), data_transforms[split])
        for split in ["train", "test"]
    }
    dataloaders = {
        split: DataLoader(
            image_datasets[split],
            batch_size=BATCH_SIZE,
            shuffle=(split == "train"),
            num_workers=2,
        )
        for split in ["train", "test"]
    }
    dataset_sizes = {split: len(image_datasets[split]) for split in ["train", "test"]}
    class_names = image_datasets["train"].classes  # alphabetical order from folder names
    return dataloaders, dataset_sizes, class_names


# ----------------------------------------------------------------------------
# Model
# ----------------------------------------------------------------------------
def build_model(num_classes=NUM_CLASSES):
    model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)

    # Freeze all layers first
    for param in model.parameters():
        param.requires_grad = False

    if UNFREEZE_LAST_BLOCK:
        for param in model.layer4.parameters():
            param.requires_grad = True

    # Replace final FC layer for 4-class output (always trainable)
    num_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.4),
        nn.Linear(num_features, num_classes),
    )

    return model.to(device)


# ----------------------------------------------------------------------------
# Training loop
# ----------------------------------------------------------------------------
def train_model(model, dataloaders, dataset_sizes, criterion, optimizer, scheduler, num_epochs):
    best_model_wts = copy.deepcopy(model.state_dict())
    best_acc = 0.0

    for epoch in range(num_epochs):
        print(f"\nEpoch {epoch + 1}/{num_epochs}")
        print("-" * 30)

        for phase in ["train", "test"]:
            model.train() if phase == "train" else model.eval()

            running_loss = 0.0
            running_corrects = 0

            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                with torch.set_grad_enabled(phase == "train"):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)

                    if phase == "train":
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)

            if phase == "train":
                scheduler.step()

            epoch_loss = running_loss / dataset_sizes[phase]
            epoch_acc = running_corrects.double() / dataset_sizes[phase]

            print(f"{phase:5s} Loss: {epoch_loss:.4f}  Acc: {epoch_acc:.4f}")

            if phase == "test" and epoch_acc > best_acc:
                best_acc = epoch_acc
                best_model_wts = copy.deepcopy(model.state_dict())

    print(f"\nBest test accuracy: {best_acc:.4f}")
    model.load_state_dict(best_model_wts)
    return model


# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------
if __name__ == "__main__":
    os.makedirs(MODEL_OUT_DIR, exist_ok=True)

    dataloaders, dataset_sizes, class_names = build_dataloaders()
    print(f"Classes (alphabetical): {class_names}")
    print(f"Train size: {dataset_sizes['train']}  Test size: {dataset_sizes['test']}")

    model = build_model()

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LEARNING_RATE,
    )
    scheduler = lr_scheduler.StepLR(optimizer, step_size=7, gamma=0.1)

    start = time.time()
    model = train_model(model, dataloaders, dataset_sizes, criterion, optimizer, scheduler, NUM_EPOCHS)
    elapsed = time.time() - start
    print(f"\nTraining complete in {elapsed // 60:.0f}m {elapsed % 60:.0f}s")

    torch.save(model.state_dict(), MODEL_OUT_PATH)
    with open(CLASS_NAMES_PATH, "w") as f:
        json.dump(class_names, f)

    print(f"\nSaved model weights to: {MODEL_OUT_PATH}")
    print(f"Saved class names to:   {CLASS_NAMES_PATH}")
