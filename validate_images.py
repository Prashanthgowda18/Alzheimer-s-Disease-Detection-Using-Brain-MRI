import zipfile
import os
import io
from PIL import Image

zip_path = os.path.expanduser('~\\Downloads\\archive.zip')

print("Validating images...")
corrupted = []
unsupported = []
empty = []

supported_formats = {'.jpg', '.jpeg', '.png', '.bmp'}

with zipfile.ZipFile(zip_path, 'r') as z:
    file_list = z.namelist()
    images = [f for f in file_list if not f.endswith('/') and 'Combined Dataset' in f]
    
    for i, f in enumerate(images):
        if i % 1000 == 0:
            print(f"Processed {i}/{len(images)}...")
        
        ext = os.path.splitext(f)[1].lower()
        if ext not in supported_formats:
            unsupported.append(f)
            continue
            
        try:
            img_bytes = z.read(f)
            if len(img_bytes) == 0:
                empty.append(f)
                continue
                
            img = Image.open(io.BytesIO(img_bytes))
            img.verify() # Verify that it is, in fact, an image
        except Exception as e:
            corrupted.append(f)

print(f"\nValidation complete. Total images: {len(images)}")
print(f"Corrupted: {len(corrupted)}")
for c in corrupted: print(f" - {c}")
print(f"Unsupported: {len(unsupported)}")
for u in unsupported: print(f" - {u}")
print(f"Empty: {len(empty)}")
for e in empty: print(f" - {e}")
