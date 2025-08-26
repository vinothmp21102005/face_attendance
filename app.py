from flask import Flask, render_template, request, jsonify, Response, send_file
from flask_cors import CORS
import cv2
import face_recognition
import os
import pickle
import numpy as np
import csv
from datetime import datetime
import base64
import io
from PIL import Image
import threading
import time

app = Flask(__name__)
CORS(app)

# Global variables for camera and state management
camera = None
camera_lock = threading.Lock()
current_mode = None  # 'collect', 'attendance', or None
current_student_name = None
capture_count = 0

class CameraManager:
    def __init__(self):
        self.cap = None
        self.is_running = False
        
    def start_camera(self):
        if self.cap is None:
            self.cap = cv2.VideoCapture(0)
        self.is_running = True
        
    def stop_camera(self):
        self.is_running = False
        if self.cap:
            self.cap.release()
            self.cap = None
            
    def get_frame(self):
        if self.cap and self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret:
                return frame
        return None

camera_manager = CameraManager()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/collect')
def collect_page():
    return render_template('collect.html')

@app.route('/encode')
def encode_page():
    return render_template('encode.html')

@app.route('/attendance')
def attendance_page():
    return render_template('attendance.html')

@app.route('/api/start_collection', methods=['POST'])
def start_collection():
    global current_mode, current_student_name, capture_count
    
    data = request.get_json()
    student_name = data.get('student_name', '').strip().lower().replace(" ", "_")
    
    if not student_name:
        return jsonify({'error': 'Student name is required'}), 400
    
    # Create directories
    output_folder = 'known_faces'
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    student_folder = os.path.join(output_folder, student_name)
    if not os.path.exists(student_folder):
        os.makedirs(student_folder)
    
    current_mode = 'collect'
    current_student_name = student_name
    capture_count = 0
    
    camera_manager.start_camera()
    
    return jsonify({'success': True, 'message': f'Started collection for {student_name}'})

@app.route('/api/capture_image', methods=['POST'])
def capture_image():
    global capture_count, current_student_name
    
    if current_mode != 'collect' or not current_student_name:
        return jsonify({'error': 'Collection not started'}), 400
    
    frame = camera_manager.get_frame()
    if frame is None:
        return jsonify({'error': 'Could not capture frame'}), 500
    
    # Save the image
    student_folder = os.path.join('known_faces', current_student_name)
    img_name = os.path.join(student_folder, f"{capture_count}.jpg")
    cv2.imwrite(img_name, frame)
    
    capture_count += 1
    
    return jsonify({
        'success': True, 
        'message': f'Image {capture_count} captured for {current_student_name}',
        'count': capture_count
    })

@app.route('/api/stop_collection', methods=['POST'])
def stop_collection():
    global current_mode, current_student_name, capture_count
    
    camera_manager.stop_camera()
    
    result = {
        'success': True,
        'message': f'Captured {capture_count} images for {current_student_name}',
        'count': capture_count
    }
    
    current_mode = None
    current_student_name = None
    capture_count = 0
    
    return jsonify(result)

@app.route('/api/encode_faces', methods=['POST'])
def encode_faces():
    try:
        known_faces_dir = 'known_faces'
        if not os.path.exists(known_faces_dir):
            return jsonify({'error': 'No faces directory found'}), 400
        
        known_encodings = []
        known_names = []
        processed_files = []
        
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
                    face_encodings = face_recognition.face_encodings(image)
                    
                    if face_encodings:
                        encoding = face_encodings[0]
                        known_encodings.append(encoding)
                        known_names.append(name)
                        processed_files.append(f"{name}/{filename}")
                    else:
                        processed_files.append(f"{name}/{filename} (no face found)")

                except Exception as e:
                    processed_files.append(f"{name}/{filename} (error: {str(e)})")

        # Save the encodings and names to a file
        encoding_data = {"encodings": known_encodings, "names": known_names}
        with open("encodings.pickle", "wb") as f:
            pickle.dump(encoding_data, f)

        return jsonify({
            'success': True,
            'message': f'Encoded {len(known_encodings)} faces',
            'processed_files': processed_files
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/start_attendance', methods=['POST'])
def start_attendance():
    global current_mode
    
    # Check if encodings file exists
    if not os.path.exists('encodings.pickle'):
        return jsonify({'error': 'No encodings file found. Please encode faces first.'}), 400
    
    current_mode = 'attendance'
    camera_manager.start_camera()
    
    return jsonify({'success': True, 'message': 'Attendance system started'})

@app.route('/api/stop_attendance', methods=['POST'])
def stop_attendance():
    global current_mode
    
    camera_manager.stop_camera()
    current_mode = None
    
    return jsonify({'success': True, 'message': 'Attendance system stopped'})

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
                    return False
    except FileNotFoundError:
        # File doesn't exist, so no one is marked yet
        pass
        
    # If not marked, append their name and time
    with open(filename, 'a', newline='') as f:
        writer = csv.writer(f)
        timestamp = datetime.now().strftime('%H:%M:%S')
        writer.writerow([name, timestamp])
        return True

@app.route('/api/video_feed')
def video_feed():
    def generate_frames():
        # Load encodings if in attendance mode
        known_encodings = []
        known_names = []
        
        if current_mode == 'attendance' and os.path.exists('encodings.pickle'):
            with open("encodings.pickle", "rb") as f:
                encoding_data = pickle.load(f)
            known_encodings = encoding_data["encodings"]
            known_names = encoding_data["names"]
        
        while camera_manager.is_running:
            frame = camera_manager.get_frame()
            if frame is None:
                continue
                
            # Process frame based on current mode
            if current_mode == 'attendance' and known_encodings:
                # Convert the frame from BGR to RGB
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
                    if matches:
                        face_distances = face_recognition.face_distance(known_encodings, face_encoding)
                        best_match_index = np.argmin(face_distances)
                        if matches[best_match_index]:
                            name = known_names[best_match_index]
                            # Log attendance for the recognized person
                            if log_attendance(name):
                                print(f"✅ Attendance marked for {name}")

                    # Draw a box around the face and display the name
                    top, right, bottom, left = face_location
                    cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
                    cv2.putText(frame, name, (left, top - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 255, 0), 2)
            
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', frame)
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            time.sleep(0.1)  # Small delay to prevent overwhelming the browser
    
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/attendance_records')
def get_attendance_records():
    today_str = datetime.now().strftime('%Y-%m-%d')
    filename = f"attendance_{today_str}.csv"
    
    records = []
    try:
        with open(filename, 'r', newline='') as f:
            reader = csv.reader(f)
            for row in reader:
                if row:
                    records.append({'name': row[0], 'time': row[1]})
    except FileNotFoundError:
        pass
    
    return jsonify({'records': records, 'date': today_str})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)