import zipfile
import os
import json
import io
from collections import defaultdict

zip_path = os.path.expanduser('~\\Downloads\\archive.zip')

print("=== DATASET LOCATION ===")
print(zip_path)

print("\n=== DATASET STRUCTURE ===")
if not os.path.exists(zip_path):
    print("Zip file not found!")
else:
    with zipfile.ZipFile(zip_path, 'r') as z:
        file_list = z.namelist()
        
        tree = defaultdict(int)
        for f in file_list:
            if not f.endswith('/'):
                parts = f.split('/')
                if len(parts) >= 3: # e.g. Combined Dataset/train/Class/img.jpg
                    folder_path = '/'.join(parts[:-1])
                    tree[folder_path] += 1
        
        for k, v in sorted(tree.items()):
            print(f"{k}: {v} images")

print("\n=== TRAIN.PY EXPECTATIONS ===")
with open('train.py', 'r') as f:
    content = f.read()
    print("Model Architecture: ResNet50? " + str("resnet50" in content.lower()))
    
    # Just printing some snippets that might show batch size, image size, classes
    lines = content.split('\n')
    for line in lines:
        line = line.strip()
        if 'batch_size' in line.lower() or 'img_size' in line.lower() or 'size' in line.lower() or 'epochs' in line.lower() or 'class' in line.lower():
            if len(line) < 100:
                print(line)
