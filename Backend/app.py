from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO
from datetime import datetime
import os
import face_recognition
import numpy as np
import cv2
import base64
import re
from io import BytesIO
from PIL import Image
import json
import logging
from werkzeug.utils import secure_filename
import sqlite3

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Configuration
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit
app.config['ALLOWED_EXTENSIONS'] = {'jpg', 'jpeg', 'png'}

# Face images directory
images_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'face-images'))
os.makedirs(images_path, exist_ok=True)

# In-memory storage for face encodings
data_dict = {}
face_registry_path = os.path.join(images_path, 'face_registry.json')
def validate_roll_number(roll_number):
    """Validate roll number format"""
    if not roll_number:
        raise ValueError("Roll number is required")
    if not isinstance(roll_number, str):
        raise ValueError("Roll number must be a string")
    if not roll_number.strip():
        raise ValueError("Roll number cannot be blank")
    if not re.match(r'^[a-zA-Z0-9\-_]+$', roll_number):
        raise ValueError("Roll number contains invalid characters")
    return roll_number.strip()

# Load existing face data
def load_face_data():
    global data_dict
    try:
        if os.path.exists(face_registry_path):
            with open(face_registry_path, 'r') as f:
                data_dict = json.load(f)
        logger.info(f"Loaded {len(data_dict)} face encodings")
    except Exception as e:
        logger.error(f"Error loading face data: {str(e)}")
        data_dict = {}

def save_face_data():
    try:
        with open(face_registry_path, 'w') as f:
            json.dump(data_dict, f)
    except Exception as e:
        logger.error(f"Error saving face data: {str(e)}")

# Initialize face data
load_face_data()

# Utility functions
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']
def validate_employee_id(employee_id):
    """Validate employee ID format"""
    if not employee_id:
        raise ValueError("Employee ID is required")
    if not isinstance(employee_id, str):
        raise ValueError("Employee ID must be a string")
    if not employee_id.strip():
        raise ValueError("Employee ID cannot be blank")
    if not re.match(r'^[a-zA-Z0-9\-_]+$', employee_id):
        raise ValueError("Employee ID contains invalid characters")
    return employee_id.strip()

def validate_student_identifier(identifier):
    """Ensure the identifier is valid before using in filenames"""
    if not identifier:
        raise ValueError("Identifier cannot be empty")
    if not isinstance(identifier, (str, int)):
        raise ValueError("Identifier must be string or number")
    if isinstance(identifier, str) and not identifier.strip():
        raise ValueError("Identifier cannot be blank")
    return str(identifier).strip()

def cleanup_undefined_files():
    """Remove any files saved as undefined.jpg"""
    undefined_path = os.path.join(images_path, 'undefined.jpg')
    if os.path.exists(undefined_path):
        os.remove(undefined_path)
        logger.info("Removed undefined.jpg")
    
    # Clean any files with 'undefined' in name
    for filename in os.listdir(images_path):
        if 'undefined' in filename.lower():
            os.remove(os.path.join(images_path, filename))
            logger.info(f"Removed invalid file: {filename}")

# Clean up at startup
cleanup_undefined_files()

def process_face_image(image_bytes, identifier):
    """Process and validate a face image"""
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Invalid image data")
        
        # Convert to RGB (face_recognition uses RGB)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Find face locations with multiple methods
        face_locations = face_recognition.face_locations(rgb_img, model="hog")
        if not face_locations:
            face_locations = face_recognition.face_locations(rgb_img, model="cnn")
        
        if not face_locations:
            raise ValueError("No face detected in image")
        
        # Get face encodings
        face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
        if not face_encodings:
            raise ValueError("Could not encode face")
        
        return face_encodings[0]
    except Exception as e:
        logger.error(f"Face processing failed: {str(e)}")
        raise


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
        
        # Convert to numpy array
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'error': 'Invalid image data'}), 400

        # Convert to RGB (face_recognition uses RGB)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Try multiple face detection methods
        face_locations = face_recognition.face_locations(rgb_img, model="hog")
        if not face_locations:
            face_locations = face_recognition.face_locations(rgb_img, model="cnn")
            logger.debug("Used CNN model to find faces")
        
        if not face_locations:
            return jsonify({
                'status': 'no_face',
                'message': 'No face detected in the image',
                'debug': {
                    'image_size': f"{rgb_img.shape[1]}x{rgb_img.shape[0]}"
                }
            }), 200
        
        # Get face encodings
        face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
        
        if not face_encodings:
            return jsonify({
                'status': 'no_encoding',
                'message': 'Face detected but could not generate encoding'
            }), 200
        
        # Check against face registry
        tolerance = 0.5
        best_match = None
        best_confidence = 0
        best_distance = 1.0
        
        for registry_key, encodings in data_dict.items():
            if registry_key == 'undefined':
                continue
                
            known_encodings = [np.array(enc) for enc in encodings]
            distances = face_recognition.face_distance(known_encodings, face_encodings[0])
            min_distance = min(distances)
            
            if min_distance < best_distance:
                best_distance = min_distance
                best_match = registry_key
                best_confidence = 1 - min_distance
        
        # Determine if match is good enough
        if best_match and best_distance <= tolerance:
            # Extract ID type and clean identifier
            if best_match.startswith('stu_'):
                id_type = 'student'
                clean_id = best_match[4:]
                # Fetch full student details from SQLite
                conn = sqlite3.connect(os.path.join(os.path.dirname(__file__), 'instance', 'app.db'))
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                cur.execute('SELECT * FROM student WHERE "Reg_No" = ?', (clean_id,))
                student_row = cur.fetchone()
                student_details = dict(student_row) if student_row else None
                conn.close()
                return jsonify({
                    'status': 'recognized',
                    'id_type': id_type,
                    'identifier': clean_id,
                    'confidence': float(f"{best_confidence:.2f}"),
                    'image_url': f"/face-images/{best_match}.jpg",
                    'student_details': student_details
                })
            elif best_match.startswith('staff_'):
                id_type = 'staff'
                clean_id = best_match[6:]
                return jsonify({
                    'status': 'recognized',
                    'id_type': id_type,
                    'identifier': clean_id,
                    'confidence': float(f"{best_confidence:.2f}"),
                    'image_url': f"/face-images/{best_match}.jpg"
                })
            else:
                id_type = 'unknown'
                clean_id = best_match
                return jsonify({
                    'status': 'recognized',
                    'id_type': id_type,
                    'identifier': clean_id,
                    'confidence': float(f"{best_confidence:.2f}"),
                    'image_url': f"/face-images/{best_match}.jpg"
                })
        else:
            return jsonify({
                'status': 'unrecognized',
                'message': 'No matching face in registry'
            })
            
    except Exception as e:
        logger.error(f"Recognition error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/face-registry', methods=['GET'])
def get_face_registry():
    """Get the complete face registry"""
    return jsonify({
        'count': len(data_dict),
        'roll_numbers': list(data_dict.keys()),
        'last_updated': datetime.now().isoformat()
    })

@app.route('/api/face-registry/<roll_number>', methods=['GET'])
def get_face_data(roll_number):
    """Get face data for specific roll number"""
    try:
        roll_number = validate_roll_number(roll_number)
        if roll_number in data_dict:
            return jsonify({
                'roll_number': roll_number,
                'encodings_count': len(data_dict[roll_number]),
                'image_exists': os.path.exists(os.path.join(images_path, f"{roll_number}.jpg"))
            })
        return jsonify({'error': 'Roll number not found'}), 404
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/face-registry/clean', methods=['POST'])
def clean_registry():
    """Clean invalid entries from registry"""
    try:
        # Remove entries with no corresponding image
        to_remove = []
        for roll_number in data_dict:
            if not os.path.exists(os.path.join(images_path, f"{roll_number}.jpg")):
                to_remove.append(roll_number)
        
        for roll_number in to_remove:
            del data_dict[roll_number]
        
        save_face_data()
        return jsonify({
            'removed': to_remove,
            'remaining': len(data_dict)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/upload-face', methods=['POST'])
def upload_face():
    try:
        if 'face' not in request.files:
            return jsonify({'error': 'No file part'}), 400
            
        file = request.files['face']
        identifier = request.form.get('identifier')  # Generic identifier
        id_type = request.form.get('id_type')  # 'student' or 'staff'
        
        # Validate based on type
        if id_type == 'student':
            identifier = validate_roll_number(identifier)
            prefix = 'stu_'
        elif id_type == 'staff':
            identifier = validate_employee_id(identifier)
            prefix = 'staff_'
        else:
            return jsonify({'error': 'Invalid ID type'}), 400
            
        if not identifier:
            return jsonify({'error': 'Identifier is required'}), 400
            
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        # Process the image
        image_bytes = file.read()
        face_encoding = process_face_image(image_bytes, identifier)
        
        # Save with prefixed filename
        filename = f"{prefix}{identifier}.jpg"
        filepath = os.path.join(images_path, filename)
        
        # Compress and save image
        img = Image.open(BytesIO(image_bytes))
        img.save(filepath, 'JPEG', quality=85, optimize=True)
        
        # Update registry with prefixed key
        registry_key = f"{prefix}{identifier}"
        if registry_key not in data_dict:
            data_dict[registry_key] = []
        data_dict[registry_key].append(face_encoding.tolist())
        save_face_data()
        
        return jsonify({
            'success': True,
            'identifier': identifier,
            'id_type': id_type,
            'image_path': filename
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/face-registry/<identifier>', methods=['DELETE'])
def remove_face_from_registry(identifier):
    """Remove a face from the registry"""
    try:
        if identifier in data_dict:
            del data_dict[identifier]
            save_face_data()
            
            # Optionally delete the image file
            image_path = os.path.join(images_path, f"{identifier}.jpg")
            if os.path.exists(image_path):
                os.remove(image_path)
                
            return jsonify({
                'message': f"Removed face data for {identifier}",
                'remaining': len(data_dict)
            })
        else:
            return jsonify({'error': 'Identifier not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500   
# Debug endpoints
@app.route('/api/debug/face-data', methods=['GET'])
def debug_face_data():
    """Inspect current face data"""
    return jsonify({
        'registered_faces': list(data_dict.keys()),
        'face_images': os.listdir(images_path),
        'data_dict_sample': {k: len(v) for k, v in data_dict.items()}
    })

@app.route('/api/debug/test-encoding', methods=['POST'])
def test_encoding():
    """Test if a face can be properly encoded"""
    try:
        image_data = request.json.get('image')
        if not image_data:
            return jsonify({'error': 'Image data required'}), 400
            
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]
            
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Try multiple face detection methods
        face_locations_hog = face_recognition.face_locations(rgb_img, model="hog")
        face_locations_cnn = face_recognition.face_locations(rgb_img, model="cnn")
        
        encodings = face_recognition.face_encodings(rgb_img, face_locations_hog)
        
        return jsonify({
            'hog_faces': len(face_locations_hog),
            'cnn_faces': len(face_locations_cnn),
            'encodings': len(encodings),
            'encoding_sample': encodings[0].tolist() if encodings else None
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reload-face-data', methods=['POST'])
def reload_face_data():
    """Re-register all faces from disk"""
    global data_dict
    data_dict = {}
    
    for filename in os.listdir(images_path):
        if filename.endswith(('.jpg', '.jpeg', '.png')):
            try:
                identifier = os.path.splitext(filename)[0]
                if identifier == 'undefined':
                    continue
                    
                image_path = os.path.join(images_path, filename)
                image = face_recognition.load_image_file(image_path)
                face_encodings = face_recognition.face_encodings(image)
                
                if face_encodings:
                    if identifier not in data_dict:
                        data_dict[identifier] = []
                    data_dict[identifier].append(face_encodings[0].tolist())
            except Exception as e:
                logger.error(f"Error processing {filename}: {str(e)}")
    
    save_face_data()
    return jsonify({
        'message': f'Reloaded {len(data_dict)} face encodings',
        'data_dict_keys': list(data_dict.keys())
    })

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)