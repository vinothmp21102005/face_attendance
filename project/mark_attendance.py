# mark_attendance.py
import cv2
import face_recognition
import pickle
import numpy as np
import csv
from datetime import datetime

print("Loading encoding data...")
# --- Load the saved encodings ---
with open("encodings.pickle", "rb") as f:
    encoding_data = pickle.load(f)

known_encodings = encoding_data["encodings"]
known_names = encoding_data["names"]

# --- Function to log attendance ---
def log_attendance(name):
    """Logs the attendance of a person to a CSV file if not already present for the day."""
    today_str = datetime.now().strftime('%Y-%m-%d')
    filename = f"attendance_{today_str}.csv"
    
    # Check if the person has already been marked today
    try:
        with open(filename, 'r', newline='') as f:
            reader = csv.reader(f)
            for row in reader:
                if row and row[0] == name:
                    # Already marked today
                    return
    except FileNotFoundError:
        # File doesn't exist, so no one is marked yet
        pass
        
    # If not marked, append their name and time
    with open(filename, 'a', newline='') as f:
        writer = csv.writer(f)
        timestamp = datetime.now().strftime('%H:%M:%S')
        writer.writerow([name, timestamp])
        print(f"✅ Attendance marked for {name} at {timestamp}")


# --- Initialize webcam ---
cap = cv2.VideoCapture(0)

print("\nStarting video stream. Press 'q' to quit.")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Convert the frame from BGR (OpenCV) to RGB (face_recognition)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Find all faces and their encodings in the current frame
    face_locations = face_recognition.face_locations(rgb_frame)
    face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

    # Loop through each face found in the frame
    for face_encoding, face_location in zip(face_encodings, face_locations):
        # Compare the found face with known faces
        matches = face_recognition.compare_faces(known_encodings, face_encoding, tolerance=0.5)
        name = "Unknown"

        # Find the best match
        face_distances = face_recognition.face_distance(known_encodings, face_encoding)
        best_match_index = np.argmin(face_distances)
        if matches[best_match_index]:
            name = known_names[best_match_index]
            # Log attendance for the recognized person
            log_attendance(name)

        # Draw a box around the face and display the name
        top, right, bottom, left = face_location
        cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
        cv2.putText(frame, name, (left, top - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 255, 0), 2)

    # Display the resulting image
    cv2.imshow('Face Attendance - Press "q" to quit', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# --- Release handle to the webcam ---
cap.release()
cv2.destroyAllWindows()
print("Attendance system stopped.")