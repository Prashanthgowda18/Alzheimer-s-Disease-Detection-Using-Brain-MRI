import os
import zipfile
import shutil

zip_path = os.path.expanduser('~\\Downloads\\archive.zip')
temp_extract_dir = 'data_temp'
final_data_dir = 'data'

mapping = {
    'No Impairment': 'NonDemented',
    'Very Mild Impairment': 'VeryMildDemented',
    'Mild Impairment': 'MildDemented',
    'Moderate Impairment': 'ModerateDemented'
}

print(f"Extracting {zip_path} to {temp_extract_dir}...")
with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall(temp_extract_dir)

print("Restructuring and renaming folders...")
for split in ['train', 'test']:
    src_split_dir = os.path.join(temp_extract_dir, 'Combined Dataset', split)
    dst_split_dir = os.path.join(final_data_dir, split)
    
    os.makedirs(dst_split_dir, exist_ok=True)
    
    if os.path.exists(src_split_dir):
        for class_folder in os.listdir(src_split_dir):
            if class_folder in mapping:
                src_path = os.path.join(src_split_dir, class_folder)
                dst_path = os.path.join(dst_split_dir, mapping[class_folder])
                print(f"Moving {src_path} -> {dst_path}")
                shutil.move(src_path, dst_path)

print("Cleaning up temporary directory...")
shutil.rmtree(temp_extract_dir)

print("Dataset processing complete!")
