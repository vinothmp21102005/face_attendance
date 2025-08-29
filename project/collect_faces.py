# collect_faces.py
import cv2
import os

# --- Create a directory to store faces ---
output_folder = 'known_faces'
if not os.path.exists(output_folder):
    os.makedirs(output_folder)

# --- Get student's name and create their folder ---
student_name = input("Enter the student's name: ").strip().lower().replace(" ", "_")
student_folder = os.path.join(output_folder, student_name)
if not os.path.exists(student_folder):
    os.makedirs(student_folder)
    print(f"Directory created for {student_name}")

# --- Initialize webcam ---
cap = cv2.VideoCapture(0) # 0 is the default camera
if not cap.isOpened():
    print("Error: Could not open webcam.")
    exit()

print("\nWebcam started. Look at the camera.")
print("Press 'c' to capture an image. Press 'q' to quit.")

img_count = 0
while True:
    # Capture frame-by-frame
    ret, frame = cap.read()
    if not ret:
        print("Error: Can't receive frame. Exiting ...")
        break

    # Display the resulting frame
    cv2.imshow('Capture Faces - Press "c" to capture, "q" to quit', frame)

    # Wait for key press
    key = cv2.waitKey(1) & 0xFF

    if key == ord('c'):
        # Save the captured frame
        img_name = os.path.join(student_folder, f"{img_count}.jpg")
        cv2.imwrite(img_name, frame)
        print(f"📸 Image saved: {img_name}")
        img_count += 1
    
    elif key == ord('q'):
        break

# --- Release everything when done ---
print(f"\nCaptured {img_count} images for {student_name}.")
cap.release()
cv2.destroyAllWindows()