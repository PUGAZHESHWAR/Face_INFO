from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
from sqlalchemy import and_
import os
import face_recognition
from dotenv import load_dotenv
import numpy as np
import random
import cv2
import platform
import time
import base64
import threading
from werkzeug.utils import secure_filename
from flask import render_template
from flask import Flask
from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()
def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    with app.app_context():
        # Clear existing models to prevent redefinition errors
        db.reflect()
        db.drop_all()
        
        # Define your models
        class Profile(db.Model):
            id = db.Column(db.Integer, primary_key=True)
            institution_name = db.Column(db.String(100), nullable=False)
            logo_filename = db.Column(db.String(100), nullable=True)
            created_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        # Create tables
        db.create_all()
    
    return app

app = create_app()

load_dotenv()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/uploads'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
class Profile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    institution_name = db.Column(db.String(100), nullable=False)
    logo_filename = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    Name = db.Column(db.String(20), nullable=False)
    Reg_No = db.Column(db.String(10), unique=True, nullable=False)
    DOB = db.Column(db.Date, unique=False, nullable=False)
    Blood_Group = db.Column(db.String(5), unique=False, nullable=False)
    Phone = db.Column(db.String(10), unique=True, nullable=False)
    Dept = db.Column(db.String(10), unique=False, nullable=False)
    Gender = db.Column(db.String(10), unique=False, nullable=False)
    Organization = db.Column(db.String(100), unique=False, nullable=True)
    Performance = db.Column(db.String(100), nullable=True)
    Remarks = db.Column(db.String(100), unique=False, nullable=False)
    Created_At = db.Column(db.DateTime, default=datetime.utcnow)

class Profile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    institution_name = db.Column(db.String(100), nullable=False)
    logo_filename = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


with app.app_context():
    db.create_all()

images_path = "Images"
if not os.path.exists(images_path):
    os.makedirs(images_path)
    
rand_id = []
data_dict = {}

for image_name in os.listdir(images_path):
    if image_name.endswith(('.jpg', '.png', '.jpeg')):
        card_id = os.path.splitext(image_name)[0]  
        image_path = os.path.join(images_path, image_name)
        image = face_recognition.load_image_file(image_path)
        face_encodings = face_recognition.face_encodings(image)

        if face_encodings:
            if card_id not in data_dict:
                data_dict[card_id] = []
            data_dict[card_id].append(face_encodings[0])

for key in data_dict:
    data_dict[key] = [encoding.tolist() for encoding in data_dict[key]]
    
camera = None
camera_thread = None
stop_camera = False

from flask import render_template

@app.route('/')
def home():
    print("[DEBUG] Home page loaded")
    return render_template('home.html')


@app.route('/api/get-profile')
def get_profile():
    profile = Profile.query.order_by(Profile.created_at.desc()).first()
    if not profile:
        return jsonify({
            'institution_name': 'Default Institution',
            'logo_url': None
        })
    return jsonify({
        'institution_name': profile.institution_name,
        'logo_url': f"/static/uploads/{profile.logo_filename}" if profile.logo_filename else None
    })

@app.route('/api/set-profile', methods=['POST'])
def set_profile():
    institution_name = request.form.get('institution_name')
    logo = request.files.get('logo')

    if not institution_name:
        return jsonify({'error': 'Institution name is required'}), 400

    filename = None
    if logo:
        filename = secure_filename(logo.filename)
        logo.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

    profile = Profile(institution_name=institution_name, logo_filename=filename)
    db.session.add(profile)
    db.session.commit()

    return jsonify({
        'message': 'Profile created successfully',
        'logo_url': f"/static/uploads/{filename}" if filename else None
    }), 201
@app.route('/api/start-camera', methods=['POST'])
def start_camera():
    global camera, camera_thread, stop_camera
    try:
        if camera is None:
            camera = cv2.VideoCapture(0)
            if not camera.isOpened():
                return jsonify({'error': 'Failed to open camera'}), 500
            stop_camera = False
            camera_thread = threading.Thread(target=camera_stream)
            camera_thread.start()
        return jsonify({'message': 'Camera started successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/set-profile', methods=['POST'])
def set_profile():
    institution_name = request.form.get('institution_name')
    logo = request.files.get('logo')

    if not institution_name:
        return jsonify({'error': 'Institution name is required'}), 400

    filename = None
    if logo:
        filename = secure_filename(logo.filename)
        logo.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

    profile = Profile(institution_name=institution_name, logo_filename=filename)
    db.session.add(profile)
    db.session.commit()

    return jsonify({'message': 'Profile created successfully'}), 201


@app.route('/api/stop-camera', methods=['POST'])
def stop_camera_route():
    global camera, camera_thread, stop_camera
    try:
        if camera is not None:
            stop_camera = True
            if camera_thread is not None:
                camera_thread.join()
            camera.release()
            camera = None
        return jsonify({'message': 'Camera stopped successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def camera_stream():
    global camera, stop_camera
    while not stop_camera:
        if camera is not None:
            success, frame = camera.read()
            if success:
                ret, buffer = cv2.imencode('.jpg', frame)
                if ret:
                    frame_bytes = base64.b64encode(buffer).decode('utf-8')
                    socketio.emit('camera_frame', {'image': frame_bytes})
        time.sleep(0.1)

recognition_thread = None
recognition_running = False

def background_face_recognition():
    global camera, recognition_running

    print("[DEBUG] Face recognition thread started")

    with app.app_context():
        while recognition_running:
            try:
                # ... [previous code remains the same] ...

                if not face_encodings:
                    print("[DEBUG] No face detected")
                    socketio.emit('face_recognition_result', {
                        'face_detected': False,
                        'identified': False,
                        'student_name': None,
                        'student': None  # Explicitly set student to None
                    })
                    continue  
                else:
                    unknown_encoding = face_encodings[0]
                    identified = False
                    matched_name = None

                    for card_id, encodings in data_dict.items():
                        known_encodings = [np.array(enc) for enc in encodings]
                        results = face_recognition.compare_faces(known_encodings, unknown_encoding, tolerance=0.45)
                        if True in results:
                            identified = True
                            student = Student.query.filter_by(id=int(card_id)).first()
                            if student:
                                matched_name = student.Name
                                # Send all student details
                                socketio.emit('face_recognition_result', {
                                    'face_detected': True,  # Fixed typo (was 'face_dected')
                                    'identified': True,
                                    'student': {
                                        'Name': student.Name,
                                        'Reg_No': student.Reg_No,
                                        'Organization': student.Organization,
                                        'Performance': student.Performance,
                                        'DOB': student.DOB.strftime('%Y-%m-%d'),
                                        'Blood_Group': student.Blood_Group,
                                        'Phone': student.Phone,
                                        'Dept': student.Dept,
                                        'Gender': student.Gender,
                                        'Remarks': student.Remarks
                                    }
                                })
                            break

                    if not identified:
                        print("[DEBUG] Face detected but not identified")
                        socketio.emit('face_recognition_result', {
                            'face_detected': True,
                            'identified': False,
                            'student_name': None
                        })

            except Exception as e:
                print(f"[ERROR] Exception in recognition thread: {e}")

            time.sleep(1/3)  # Process ~3 times per second

@app.route('/api/students', methods=['POST'])
def add_student():
    data = request.json
    try:
        new_num = None
        while True:
            new_num = random.randint(10**9, 10**10-1)
            if new_num not in rand_id:
                rand_id.append(new_num)
                break
        
        student = Student(
            Name=data['Name'].upper(),
            Reg_No=data['Reg_No'],
            DOB=datetime.strptime(data['DOB'], '%Y-%m-%d').date(),
            Blood_Group=data['Blood_Group'],
            Phone=data['Phone'],
            Dept=data['Dept'],
            Gender=data['Gender'],
            Organization=data.get('Organization', ''),
            Performance=data.get('Performance', ''),  
            Remarks=data.get('Remarks', '')
        )


        db.session.add(student)
        db.session.commit()
        return jsonify({
            'message': 'Student added successfully',
            'student': {
                'Name': student.Name,
                'Reg_No': student.Reg_No,
                'Performance': student.Performance,  
                'DOB': student.DOB,
                'Blood_Group': student.Blood_Group,
                'Phone': student.Phone,
                'Dept': student.Dept,
                'Gender': student.Gender,
                'Organization': student.Organization,  
                'Remarks': student.Remarks
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
    
@socketio.on('scan_card')
def handle_card_scan(data):
    card_id = data.get('card_id')
    student = Student.query.filter_by(Card_Id=card_id).first()

    if student:
        socketio.emit('face_recognition_result', {
            'face_detected': True,
            'identified': True,
            'student': {
                'Name': student.Name,
                'Reg_No': student.Reg_No,
                'DOB': student.DOB.strftime('%Y-%m-%d'),
                'Blood_Group': student.Blood_Group,
                'Phone': student.Phone,
                'Dept': student.Dept,
                'Gender': student.Gender,
                'Organization': student.Organization,  
                'Remarks': student.Remarks
            }
        })

    else:
        socketio.emit('card_scanned', {
            'success': False,
            'message': 'Card not found!'
        })

@app.route('/api/unassigned-cards', methods=['GET'])
def get_unassigned_cards():
    try:
        assigned_cards = {int(os.path.splitext(f)[0]) for f in os.listdir(images_path) 
                       if f.endswith(('.jpg', '.png', '.jpeg'))}
        all_students = Student.query.all()
        unassigned_cards = [student.id for student in all_students 
                          if student.id not in assigned_cards]
        print(f"Unassigned cards: {unassigned_cards}")  # Debug log
        return jsonify(unassigned_cards)
    except Exception as e:
        print(f"Error in get_unassigned_cards: {str(e)}")
        return jsonify({'error': str(e)}), 500
@app.route('/api/capture-image', methods=['POST'])
def capture_image():
    global camera
    try:
        data = request.json
        card_id = data.get('card_id')
        
        if not card_id:
            return jsonify({'error': 'Card ID is required'}), 400
            
        if camera is None:
            return jsonify({'error': 'Camera is not started'}), 400
            
        success, frame = camera.read()
        if not success:
            return jsonify({'error': 'Failed to capture image'}), 500

        image_path = os.path.join(images_path, f"{card_id}.jpg")
        cv2.imwrite(image_path, frame)
        camera.release()

        image = face_recognition.load_image_file(image_path)
        face_encodings = face_recognition.face_encodings(image)
        
        if face_encodings:
            if card_id not in data_dict:
                data_dict[card_id] = []
            data_dict[card_id].append(face_encodings[0].tolist())
            socketio.emit('image_captured', {'success': True})
            return jsonify({'message': 'Image captured and saved successfully'}), 200
        else:
            os.remove(image_path) 
            return jsonify({'error': 'No face detected in the captured image'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@socketio.on('perform_face_recognition')
def handle_face_recognition_trigger():
    global recognition_thread, recognition_running

    if not recognition_running:
        recognition_running = True
        recognition_thread = threading.Thread(target=background_face_recognition)
        recognition_thread.start()

@socketio.on('stop_face_recognition')
def stop_face_recognition():
    global recognition_running
    recognition_running = False


@app.route('/api/assign-image', methods=['POST'])
def assign_image():
    try:
        data = request.json
        card_id = data.get('card_id')
        image_data = data.get('image') 

        if not card_id or not image_data:
            return jsonify({'error': 'Card ID and image data are required'}), 400

        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]

        image_bytes = base64.b64decode(image_data)

        image_path = os.path.join(images_path, f"{card_id}.jpg")
        with open(image_path, 'wb') as f:
            f.write(image_bytes)

        image = face_recognition.load_image_file(image_path)
        face_encodings = face_recognition.face_encodings(image)
        
        if face_encodings:
            if card_id not in data_dict:
                data_dict[card_id] = []
            data_dict[card_id].append(face_encodings[0].tolist())
            return jsonify({'message': 'Image assigned successfully'}), 200
        else:
            os.remove(image_path)
            return jsonify({'error': 'No face detected in the image'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socket.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@app.route('/api/recognize-face', methods=['POST'])
def recognize_face():
    try:
        data = request.json
        image_data = data.get('image')
        if not image_data:
            return jsonify({'error': 'Image data is required'}), 400

        # Remove base64 header if present
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]
        image_bytes = base64.b64decode(image_data)

        # Convert bytes to numpy array for OpenCV
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({'error': 'Invalid image data'}), 400

        # Face recognition
        face_encodings = face_recognition.face_encodings(img)
        if not face_encodings:
            return jsonify({'recognized': False, 'message': 'No face detected'}), 200
        unknown_encoding = face_encodings[0]

        # Find best match
        best_match = None
        best_confidence = 0.0
        best_card_id = None
        for card_id, encodings in data_dict.items():
            known_encodings = [np.array(enc) for enc in encodings]
            results = face_recognition.compare_faces(known_encodings, unknown_encoding, tolerance=0.45)
            face_distances = face_recognition.face_distance(known_encodings, unknown_encoding)
            for idx, match in enumerate(results):
                if match:
                    confidence = 1 - face_distances[idx]  # Higher is better
                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_match = card_id
                        best_card_id = card_id
        if best_match:
            student = Student.query.filter_by(id=int(best_card_id)).first()
            if student:
                # Try to find the photo path
                photo_path = f"/Images/{best_card_id}.jpg"
                # Compose result
                result = {
                    'type': 'student',
                    'name': student.Name,
                    'id': student.Reg_No,
                    'department': student.Dept,
                    'class': '',  # Add class if available
                    'confidence': float(f"{best_confidence:.2f}"),
                    'photo': photo_path
                }
                return jsonify({'recognized': True, 'result': result}), 200
        # No match found
        return jsonify({'recognized': False, 'message': 'No match found'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, host='0.0.0.0', debug=True, port=5000)