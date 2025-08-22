# encode_faces.py
import face_recognition
import os
import pickle

print("Starting face encoding process...")

# --- Load images and encode faces ---
known_faces_dir = 'known_faces'
known_encodings = []
known_names = []

# Loop through each person in the known_faces directory
for name in os.listdir(known_faces_dir):
    person_dir = os.path.join(known_faces_dir, name)
    if not os.path.isdir(person_dir):
        continue

    # Loop through each image of the person
    for filename in os.listdir(person_dir):
        image_path = os.path.join(person_dir, filename)
        
        try:
            # Load the image
            image = face_recognition.load_image_file(image_path)
            
            # Find face locations and compute encodings
            # We assume one face per image for the enrollment process
            face_encodings = face_recognition.face_encodings(image)
            
            if face_encodings:
                encoding = face_encodings[0]
                known_encodings.append(encoding)
                known_names.append(name)
                print(f"Encoded {filename} for {name}")
            else:
                print(f"⚠️ No face found in {filename}, skipping.")

        except Exception as e:
            print(f"Error processing {image_path}: {e}")

# --- Save the encodings and names to a file ---
encoding_data = {"encodings": known_encodings, "names": known_names}
with open("encodings.pickle", "wb") as f:
    pickle.dump(encoding_data, f)

print("\nEncoding complete! Data saved to encodings.pickle")