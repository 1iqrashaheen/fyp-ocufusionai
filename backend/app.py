# from flask import Flask, request, jsonify, render_template
# from flask_cors import CORS
# import os
# import torch
# import numpy as np
# from PIL import Image
# import torchvision.transforms as transforms
# from werkzeug.utils import secure_filename
# import argparse
# import logging

# # Import your model classes
# from model.flair_multilayer import FLAIRMultiLayer
# from utils.eval import load_model

# # Configure logging
# logging.basicConfig(
#     level=logging.DEBUG,
#     format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
# )
# logger = logging.getLogger(__name__)

# app = Flask(__name__)

# # CORS Configuration - IMPORTANT!
# CORS(app, resources={
#     r"/predict/*": {
#         "origins": ["http://localhost:5173", "http://localhost:*", "http://127.0.0.1:*"],
#         "methods": ["POST", "OPTIONS"],
#         "allow_headers": ["Content-Type", "ngrok-skip-browser-warning"],
#         "expose_headers": ["Content-Type"],
#         "supports_credentials": False
#     },
#     r"/health": {
#         "origins": "*",
#         "methods": ["GET", "OPTIONS"]
#     }
# })

# app.config['UPLOAD_FOLDER'] = 'upload_cache'
# app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max file size (for 2 images)
# app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}

# # Create upload cache directory if it doesn't exist
# os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# # Disease classes
# DISEASES = ['NOR', 'AMD', 'CSC', 'DR', 'GLC', 'MEM', 'MYO', 'RVO', 'WAMD']
# DISEASE_NAMES = {
#     'NOR': 'Normal',
#     'AMD': 'Age-related Macular Degeneration',
#     'CSC': 'Central Serous Chorioretinopathy',
#     'DR': 'Diabetic Retinopathy',
#     'GLC': 'Glaucoma',
#     'MEM': 'Macular Edema/Membrane',
#     'MYO': 'Myopia',
#     'RVO': 'Retinal Vein Occlusion',
#     'WAMD': 'Wet AMD'
# }

# # Global variables for models
# models = {}
# device = None
# transform = None


# def allowed_file(filename):
#     return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


# def get_args(modality):
#     """Create args object with default values for specific modality"""
#     parser = argparse.ArgumentParser()
#     parser.add_argument('--modality', default=modality, type=str)
#     parser.add_argument('--device_id', default='0', type=str)
#     parser.add_argument('--device', default='cuda', type=str)
#     parser.add_argument('--seed', default=0, type=int)
#     parser.add_argument('--input_size', default=512, type=int)
#     parser.add_argument('--n_classes', default=9, type=int)
#     parser.add_argument('--concept_path', default='concept_library', type=str)
#     parser.add_argument('--alpha_distill', type=float, default=1)
#     parser.add_argument('--beta_distill', type=float, default=10)
#     parser.add_argument('--temperature', type=float, default=0.4)
    
#     # Different checkpoint paths for different modalities
#     if modality == 'oct':
#         parser.add_argument('--checkpoint_path', default='checkpoint/oct_checkpoint', type=str)
#     else:  # fundus
#         parser.add_argument('--checkpoint_path', default='checkpoint/fundus_checkpoint', type=str)
    
#     args, _ = parser.parse_known_args([])
#     return args


# def load_model_for_modality(modality):
#     """Load model for specific modality (oct or fundus)"""
#     global device
    
#     args = get_args(modality)
    
#     logger.info(f"Loading {modality.upper()} model from {args.checkpoint_path}...")
#     print(f"Loading {modality.upper()} model from {args.checkpoint_path}...")
    
#     # Load model
#     concept_feat_path = os.path.join(args.concept_path, 'concepts_raw.npy')
#     model = FLAIRMultiLayer(args, device, concept_feat_path)
    
#     model_state_dict = load_model(args=args, if_best=True, device=device, 
#                                   checkpoint=args.checkpoint_path)
#     model.load_state_dict(model_state_dict, strict=False)
#     model = model.to(device)
#     model.eval()
    
#     logger.info(f"{modality.upper()} model loaded successfully!")
#     print(f"{modality.upper()} model loaded successfully!")
#     return model


# def initialize_models():
#     """Initialize both OCT and Fundus models at startup"""
#     global models, device, transform
    
#     # Set device
#     device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
#     logger.info(f"Using device: {device}")
#     print(f"Using device: {device}")
    
#     # Define image transforms
#     transform = transforms.Compose([
#         transforms.Resize((512, 512)),
#         transforms.ToTensor(),
#         transforms.Normalize(mean=[0.485, 0.456, 0.406], 
#                            std=[0.229, 0.224, 0.225])
#     ])
    
#     # Load both models
#     print("="*50)
#     print("Initializing models...")
#     print("="*50)
    
#     try:
#         models['oct'] = load_model_for_modality('oct')
#         models['fundus'] = load_model_for_modality('fundus')
        
#         print("="*50)
#         print("All models loaded successfully!")
#         print("="*50)
#         logger.info("All models initialized successfully")
#     except Exception as e:
#         logger.error(f"Error initializing models: {str(e)}")
#         print(f"ERROR: Failed to initialize models: {str(e)}")
#         raise


# def predict_image(image_path, modality):
#     """Make prediction on a single image using specified modality model"""
#     global models, device, transform
    
#     if modality not in models:
#         raise ValueError(f"Invalid modality: {modality}. Must be 'oct' or 'fundus'")
    
#     model = models[modality]
    
#     logger.info(f"Making prediction with {modality.upper()} model for image: {image_path}")
    
#     # Load and preprocess image
#     image = Image.open(image_path).convert('RGB')
#     image_tensor = transform(image).unsqueeze(0).to(device)
    
#     # Make prediction
#     with torch.no_grad():
#         with torch.cuda.amp.autocast():
#             outputs, concept_sim = model.forward_concept(image_tensor)
    
#     # Process outputs
#     prediction_prob = torch.softmax(outputs, dim=1)
#     prediction_decode = torch.argmax(prediction_prob, dim=1)
    
#     # Convert to numpy
#     probs = prediction_prob.cpu().numpy()[0]
#     predicted_class = prediction_decode.cpu().item()
    
#     # Create results dictionary
#     results = {
#         'predicted_class': DISEASES[predicted_class],
#         'predicted_class_name': DISEASE_NAMES[DISEASES[predicted_class]],
#         'confidence': float(probs[predicted_class]),
#         'all_probabilities': {
#             DISEASES[i]: float(probs[i]) for i in range(len(DISEASES))
#         },
#         'all_probabilities_named': {
#             DISEASE_NAMES[DISEASES[i]]: float(probs[i]) for i in range(len(DISEASES))
#         }
#     }
    
#     logger.info(f"Prediction complete: {results['predicted_class_name']} (confidence: {results['confidence']:.2%})")
    
#     return results


# @app.route('/')
# def index():
#     """Render the main page"""
#     return jsonify({
#         'message': 'Ocufusion AI API',
#         'endpoints': {
#             '/predict/oct': 'POST - OCT image prediction',
#             '/predict/fundus': 'POST - Fundus image prediction',
#             '/predict/combined': 'POST - Combined OCT + Fundus prediction',
#             '/health': 'GET - Health check'
#         }
#     })


# @app.route('/predict/oct', methods=['POST', 'OPTIONS'])
# def predict_oct():
#     """Handle OCT image prediction requests"""
#     if request.method == 'OPTIONS':
#         return '', 204
#     return handle_prediction('oct')


# @app.route('/predict/fundus', methods=['POST', 'OPTIONS'])
# def predict_fundus():
#     """Handle Fundus image prediction requests"""
#     if request.method == 'OPTIONS':
#         return '', 204
#     return handle_prediction('fundus')


# @app.route('/predict/combined', methods=['POST', 'OPTIONS'])
# def predict_combined():
#     """Handle combined OCT + Fundus prediction for the same person"""
#     if request.method == 'OPTIONS':
#         return '', 204
    
#     logger.info("Received combined OCT + Fundus prediction request")
#     print(f"\n{'='*60}")
#     print(f"NEW COMBINED PREDICTION REQUEST (OCT + FUNDUS)")
#     print(f"{'='*60}")
    
#     # Check if both files are present
#     if 'oct_file' not in request.files or 'fundus_file' not in request.files:
#         logger.error("Missing files in request")
#         print("ERROR: Both oct_file and fundus_file are required")
#         return jsonify({
#             'error': 'Both oct_file and fundus_file are required'
#         }), 400
    
#     oct_file = request.files['oct_file']
#     fundus_file = request.files['fundus_file']
    
#     # Validate files
#     if oct_file.filename == '' or fundus_file.filename == '':
#         logger.error("Empty filename")
#         print("ERROR: Empty filename for one or both files")
#         return jsonify({'error': 'No file selected'}), 400
    
#     if not allowed_file(oct_file.filename) or not allowed_file(fundus_file.filename):
#         logger.error(f"Invalid file type")
#         print(f"ERROR: Invalid file type")
#         return jsonify({'error': 'Invalid file type. Allowed types: png, jpg, jpeg'}), 400
    
#     oct_filepath = None
#     fundus_filepath = None
    
#     try:
#         # Save OCT file
#         oct_filename = secure_filename(oct_file.filename)
#         oct_filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"oct_{oct_filename}")
#         oct_file.save(oct_filepath)
#         logger.info(f"OCT file saved: {oct_filepath}")
#         print(f"OCT file saved: {oct_filepath}")
        
#         # Save Fundus file
#         fundus_filename = secure_filename(fundus_file.filename)
#         fundus_filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"fundus_{fundus_filename}")
#         fundus_file.save(fundus_filepath)
#         logger.info(f"Fundus file saved: {fundus_filepath}")
#         print(f"Fundus file saved: {fundus_filepath}")
        
#         # Make predictions for both modalities
#         print(f"\n[1/2] Running OCT model inference...")
#         oct_results = predict_image(oct_filepath, 'oct')
        
#         print(f"\n[2/2] Running Fundus model inference...")
#         fundus_results = predict_image(fundus_filepath, 'fundus')
        
#         # Combine results
#         combined_results = {
#             'patient_analysis': {
#                 'oct': oct_results,
#                 'fundus': fundus_results
#             },
#             'summary': {
#                 'oct_diagnosis': oct_results['predicted_class_name'],
#                 'oct_confidence': oct_results['confidence'],
#                 'fundus_diagnosis': fundus_results['predicted_class_name'],
#                 'fundus_confidence': fundus_results['confidence'],
#                 'agreement': oct_results['predicted_class'] == fundus_results['predicted_class'],
#                 #'consensus_diagnosis': oct_results['predicted_class_name'] if oct_results['predicted_class'] == fundus_results['predicted_class'] else 'Images are of different Eye'
#             }
#         }
        
#         # Log results to console
#         print(f"\n{'='*60}")
#         print(f"COMBINED PREDICTION RESULTS:")
#         print(f"{'='*60}")
#         print(f"\nOCT Analysis:")
#         print(f"  Filename:     {oct_filename}")
#         print(f"  Predicted:    {oct_results['predicted_class_name']}")
#         print(f"  Confidence:   {oct_results['confidence']:.2%}")
        
#         print(f"\nFundus Analysis:")
#         print(f"  Filename:     {fundus_filename}")
#         print(f"  Predicted:    {fundus_results['predicted_class_name']}")
#         print(f"  Confidence:   {fundus_results['confidence']:.2%}")
        
#         print(f"\nSummary:")
#         #print(f"  Models Agree: {combined_results['summary']['agreement']}")
#         #print(f"  Consensus:    {combined_results['summary']['consensus_diagnosis']}")
#         print(f"{'='*60}\n")
        
#         logger.info(f"Combined prediction successful")
        
#         return jsonify(combined_results), 200
    
#     except Exception as e:
#         error_msg = str(e)
#         logger.error(f"Prediction error: {error_msg}", exc_info=True)
#         print(f"\nERROR during prediction: {error_msg}\n")
#         return jsonify({'error': error_msg}), 500
    
#     finally:
#         # Clean up uploaded files
#         if oct_filepath and os.path.exists(oct_filepath):
#             os.remove(oct_filepath)
#             logger.info(f"Cleaned up OCT file: {oct_filepath}")
#         if fundus_filepath and os.path.exists(fundus_filepath):
#             os.remove(fundus_filepath)
#             logger.info(f"Cleaned up Fundus file: {fundus_filepath}")


# def handle_prediction(modality):
#     """Common prediction handler for single modality"""
#     logger.info(f"Received {modality.upper()} prediction request")
#     print(f"\n{'='*60}")
#     print(f"NEW {modality.upper()} PREDICTION REQUEST")
#     print(f"{'='*60}")
    
#     if 'file' not in request.files:
#         logger.error("No file in request")
#         print("ERROR: No file in request")
#         return jsonify({'error': 'No file uploaded'}), 400
    
#     file = request.files['file']
    
#     if file.filename == '':
#         logger.error("Empty filename")
#         print("ERROR: Empty filename")
#         return jsonify({'error': 'No file selected'}), 400
    
#     if not allowed_file(file.filename):
#         logger.error(f"Invalid file type: {file.filename}")
#         print(f"ERROR: Invalid file type: {file.filename}")
#         return jsonify({'error': 'Invalid file type. Allowed types: png, jpg, jpeg'}), 400
    
#     filepath = None
    
#     try:
#         # Save uploaded file
#         filename = secure_filename(file.filename)
#         filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
#         file.save(filepath)
        
#         logger.info(f"File saved: {filepath}")
#         print(f"File saved: {filepath}")
        
#         # Make prediction
#         print(f"Running {modality.upper()} model inference...")
#         results = predict_image(filepath, modality)
        
#         # Add modality to results
#         results['modality'] = modality.upper()
        
#         # Log results to console
#         print(f"\n{'='*60}")
#         print(f"PREDICTION RESULTS:")
#         print(f"{'='*60}")
#         print(f"Modality:     {results['modality']}")
#         print(f"Filename:     {filename}")
#         print(f"Predicted:    {results['predicted_class_name']}")
#         print(f"Confidence:   {results['confidence']:.2%}")
#         print(f"\nAll Probabilities:")
#         for disease, prob in results['all_probabilities_named'].items():
#             print(f"  {disease:40s} {prob:.2%}")
#         print(f"{'='*60}\n")
        
#         logger.info(f"Prediction successful: {results['predicted_class_name']}")
        
#         return jsonify(results), 200
    
#     except Exception as e:
#         error_msg = str(e)
#         logger.error(f"Prediction error: {error_msg}", exc_info=True)
#         print(f"\nERROR during prediction: {error_msg}\n")
#         return jsonify({'error': error_msg}), 500
    
#     finally:
#         # Clean up uploaded file
#         if filepath and os.path.exists(filepath):
#             os.remove(filepath)
#             logger.info(f"Cleaned up file: {filepath}")


# @app.route('/health', methods=['GET'])
# def health():
#     """Health check endpoint"""
#     status = {
#         'status': 'healthy',
#         'oct_model_loaded': 'oct' in models,
#         'fundus_model_loaded': 'fundus' in models,
#         'device': str(device) if device else 'not set'
#     }
#     logger.info(f"Health check: {status}")
#     return jsonify(status), 200


# # Error handlers
# @app.errorhandler(413)
# def request_entity_too_large(error):
#     logger.error("File too large")
#     return jsonify({'error': 'File too large. Maximum size is 32MB'}), 413


# @app.errorhandler(500)
# def internal_server_error(error):
#     logger.error(f"Internal server error: {str(error)}")
#     return jsonify({'error': 'Internal server error'}), 500


# if __name__ == '__main__':
#     print("\n" + "="*60)
#     print("OCUFUSION AI - Starting Server")
#     print("="*60)
    
#     try:
#         print("\n[1/2] Initializing models...")
#         initialize_models()
        
#         print("\n[2/2] Starting Flask server...")
#         print("="*60)
#         print("Server running at: http://0.0.0.0:5000")
#         print("Available endpoints:")
#         print("  - POST /predict/oct")
#         print("  - POST /predict/fundus")
#         print("  - POST /predict/combined  (NEW - for same person)")
#         print("  - GET  /health")
#         print("="*60 + "\n")
        
#         app.run(debug=True, host='0.0.0.0', port=5000)
        
#     except Exception as e:
#         print(f"\nFATAL ERROR: Failed to start server")
#         print(f"Error: {str(e)}\n")
#         logger.error("Failed to start server", exc_info=True)
#         raisefrom flask import Flask, request, jsonify, render_template

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
import torch
import numpy as np
from PIL import Image
import torchvision.transforms as transforms
from werkzeug.utils import secure_filename
import argparse
import logging
from dotenv import load_dotenv  # NEW

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# -------------------------------------------------------------------
# Configuration from environment variables (with safe defaults)
# -------------------------------------------------------------------
FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")

# Default port 5001 to avoid common macOS conflicts on 5000
FLASK_PORT = int(os.getenv("FLASK_PORT", "5001"))

FLASK_DEBUG = os.getenv("FLASK_DEBUG", "True").lower() == "true"

# Frontend origins for CORS (comma-separated)
_frontend_origins = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
)
FRONTEND_ORIGINS = [o.strip() for o in _frontend_origins.split(",") if o.strip()]

app = Flask(__name__)

# CORS Configuration - IMPORTANT!
CORS(app, resources={
    r"/predict/*": {
        "origins": FRONTEND_ORIGINS,
        "methods": ["POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "ngrok-skip-browser-warning"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": False
    },
    r"/health": {
        "origins": "*",
        "methods": ["GET", "OPTIONS"]
    }
})

app.config['UPLOAD_FOLDER'] = 'upload_cache'
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max file size (for 2 images)
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}

# Create upload cache directory if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Disease classes
DISEASES = ['NOR', 'AMD', 'CSC', 'DR', 'GLC', 'MEM', 'MYO', 'RVO', 'WAMD']
DISEASE_NAMES = {
    'NOR': 'Normal',
    'AMD': 'Age-related Macular Degeneration',
    'CSC': 'Central Serous Chorioretinopathy',
    'DR': 'Diabetic Retinopathy',
    'GLC': 'Glaucoma',
    'MEM': 'Macular Edema/Membrane',
    'MYO': 'Myopia',
    'RVO': 'Retinal Vein Occlusion',
    'WAMD': 'Wet AMD'
}

# Global variables for models
models = {}
device = None
transform = None


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


def get_args(modality):
    """Create args object with default values for specific modality"""
    parser = argparse.ArgumentParser()
    parser.add_argument('--modality', default=modality, type=str)
    parser.add_argument('--device_id', default='0', type=str)
    parser.add_argument('--device', default='cuda', type=str)
    parser.add_argument('--seed', default=0, type=int)
    parser.add_argument('--input_size', default=512, type=int)
    parser.add_argument('--n_classes', default=9, type=int)
    parser.add_argument('--concept_path', default='concept_library', type=str)
    parser.add_argument('--alpha_distill', type=float, default=1)
    parser.add_argument('--beta_distill', type=float, default=10)
    parser.add_argument('--temperature', type=float, default=0.4)
    
    # Different checkpoint paths for different modalities
    if modality == 'oct':
        parser.add_argument('--checkpoint_path', default='checkpoint/oct_checkpoint', type=str)
    else:  # fundus
        parser.add_argument('--checkpoint_path', default='checkpoint/fundus_checkpoint', type=str)
    
    args, _ = parser.parse_known_args([])
    return args


def load_model_for_modality(modality):
    """Load model for specific modality (oct or fundus)"""
    global device
    
    args = get_args(modality)
    
    logger.info(f"Loading {modality.upper()} model from {args.checkpoint_path}...")
    print(f"Loading {modality.upper()} model from {args.checkpoint_path}...")
    
    # Load model
    from model.flair_multilayer import FLAIRMultiLayer
    from utils.eval import load_model

    concept_feat_path = os.path.join(args.concept_path, 'concepts_raw.npy')
    model = FLAIRMultiLayer(args, device, concept_feat_path)
    
    model_state_dict = load_model(args=args, if_best=True, device=device, 
                                  checkpoint=args.checkpoint_path)
    model.load_state_dict(model_state_dict, strict=False)
    model = model.to(device)
    model.eval()
    
    logger.info(f"{modality.upper()} model loaded successfully!")
    print(f"{modality.upper()} model loaded successfully!")
    return model


def initialize_models():
    """Initialize both OCT and Fundus models at startup"""
    global models, device, transform
    
    # Set device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Using device: {device}")
    print(f"Using device: {device}")
    
    # Define image transforms
    transform = transforms.Compose([
        transforms.Resize((512, 512)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                             std=[0.229, 0.224, 0.225])
    ])
    
    # Load both models
    print("="*50)
    print("Initializing models...")
    print("="*50)
    
    try:
        models['oct'] = load_model_for_modality('oct')
        models['fundus'] = load_model_for_modality('fundus')
        
        print("="*50)
        print("All models loaded successfully!")
        print("="*50)
        logger.info("All models initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing models: {str(e)}")
        print(f"ERROR: Failed to initialize models: {str(e)}")
        raise


def predict_image(image_path, modality):
    """Make prediction on a single image using specified modality model"""
    global models, device, transform
    
    if modality not in models:
        raise ValueError(f"Invalid modality: {modality}. Must be 'oct' or 'fundus'")
    
    model = models[modality]
    
    logger.info(f"Making prediction with {modality.upper()} model for image: {image_path}")
    
    # Load and preprocess image
    image = Image.open(image_path).convert('RGB')
    image_tensor = transform(image).unsqueeze(0).to(device)
    
    # Make prediction
    with torch.no_grad():
        with torch.cuda.amp.autocast():
            outputs, concept_sim = model.forward_concept(image_tensor)
    
    # Process outputs
    prediction_prob = torch.softmax(outputs, dim=1)
    prediction_decode = torch.argmax(prediction_prob, dim=1)
    
    # Convert to numpy
    probs = prediction_prob.cpu().numpy()[0]
    predicted_class = prediction_decode.cpu().item()
    
    # Create results dictionary
    results = {
        'predicted_class': DISEASES[predicted_class],
        'predicted_class_name': DISEASE_NAMES[DISEASES[predicted_class]],
        'confidence': float(probs[predicted_class]),
        'all_probabilities': {
            DISEASES[i]: float(probs[i]) for i in range(len(DISEASES))
        },
        'all_probabilities_named': {
            DISEASE_NAMES[DISEASES[i]]: float(probs[i]) for i in range(len(DISEASES))
        }
    }
    
    logger.info(f"Prediction complete: {results['predicted_class_name']} (confidence: {results['confidence']:.2%})")
    
    return results


@app.route('/')
def index():
    """Render the main page"""
    return jsonify({
        'message': 'Ocufusion AI API',
        'endpoints': {
            '/predict/oct': 'POST - OCT image prediction',
            '/predict/fundus': 'POST - Fundus image prediction',
            '/predict/combined': 'POST - Combined OCT + Fundus prediction',
            '/health': 'GET - Health check'
        }
    })


@app.route('/predict/oct', methods=['POST', 'OPTIONS'])
def predict_oct():
    """Handle OCT image prediction requests"""
    if request.method == 'OPTIONS':
        return '', 204
    return handle_prediction('oct')


@app.route('/predict/fundus', methods=['POST', 'OPTIONS'])
def predict_fundus():
    """Handle Fundus image prediction requests"""
    if request.method == 'OPTIONS':
        return '', 204
    return handle_prediction('fundus')


@app.route('/predict/combined', methods=['POST', 'OPTIONS'])
def predict_combined():
    """Handle combined OCT + Fundus prediction for the same person"""
    if request.method == 'OPTIONS':
        return '', 204
    
    logger.info("Received combined OCT + Fundus prediction request")
    print(f"\n{'='*60}")
    print(f"NEW COMBINED PREDICTION REQUEST (OCT + FUNDUS)")
    print(f"{'='*60}")
    
    # Check if both files are present
    if 'oct_file' not in request.files or 'fundus_file' not in request.files:
        logger.error("Missing files in request")
        print("ERROR: Both oct_file and fundus_file are required")
        return jsonify({
            'error': 'Both oct_file and fundus_file are required'
        }), 400
    
    oct_file = request.files['oct_file']
    fundus_file = request.files['fundus_file']
    
    # Validate files
    if oct_file.filename == '' or fundus_file.filename == '':
        logger.error("Empty filename")
        print("ERROR: Empty filename for one or both files")
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(oct_file.filename) or not allowed_file(fundus_file.filename):
        logger.error(f"Invalid file type")
        print(f"ERROR: Invalid file type")
        return jsonify({'error': 'Invalid file type. Allowed types: png, jpg, jpeg'}), 400
    
    oct_filepath = None
    fundus_filepath = None
    
    try:
        # Save OCT file
        oct_filename = secure_filename(oct_file.filename)
        oct_filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"oct_{oct_filename}")
        oct_file.save(oct_filepath)
        logger.info(f"OCT file saved: {oct_filepath}")
        print(f"OCT file saved: {oct_filepath}")
        
        # Save Fundus file
        fundus_filename = secure_filename(fundus_file.filename)
        fundus_filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"fundus_{fundus_filename}")
        fundus_file.save(fundus_filepath)
        logger.info(f"Fundus file saved: {fundus_filepath}")
        print(f"Fundus file saved: {fundus_filepath}")
        
        # Make predictions for both modalities
        print(f"\n[1/2] Running OCT model inference...")
        oct_results = predict_image(oct_filepath, 'oct')
        
        print(f"\n[2/2] Running Fundus model inference...")
        fundus_results = predict_image(fundus_filepath, 'fundus')
        
        # Combine results
        combined_results = {
            'patient_analysis': {
                'oct': oct_results,
                'fundus': fundus_results
            },
            'summary': {
                'oct_diagnosis': oct_results['predicted_class_name'],
                'oct_confidence': oct_results['confidence'],
                'fundus_diagnosis': fundus_results['predicted_class_name'],
                'fundus_confidence': fundus_results['confidence'],
                'agreement': oct_results['predicted_class'] == fundus_results['predicted_class'],
            }
        }
        
        # Log results to console
        print(f"\n{'='*60}")
        print(f"COMBINED PREDICTION RESULTS:")
        print(f"{'='*60}")
        print(f"\nOCT Analysis:")
        print(f"  Filename:     {oct_filename}")
        print(f"  Predicted:    {oct_results['predicted_class_name']}")
        print(f"  Confidence:   {oct_results['confidence']:.2%}")
        
        print(f"\nFundus Analysis:")
        print(f"  Filename:     {fundus_filename}")
        print(f"  Predicted:    {fundus_results['predicted_class_name']}")
        print(f"  Confidence:   {fundus_results['confidence']:.2%}")
        
        print(f"\nSummary:")
        print(f"{'='*60}\n")
        
        logger.info(f"Combined prediction successful")
        
        return jsonify(combined_results), 200
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Prediction error: {error_msg}", exc_info=True)
        print(f"\nERROR during prediction: {error_msg}\n")
        return jsonify({'error': error_msg}), 500
    
    finally:
        # Clean up uploaded files
        if oct_filepath and os.path.exists(oct_filepath):
            os.remove(oct_filepath)
            logger.info(f"Cleaned up OCT file: {oct_filepath}")
        if fundus_filepath and os.path.exists(fundus_filepath):
            os.remove(fundus_filepath)
            logger.info(f"Cleaned up Fundus file: {fundus_filepath}")


def handle_prediction(modality):
    """Common prediction handler for single modality"""
    logger.info(f"Received {modality.upper()} prediction request")
    print(f"\n{'='*60}")
    print(f"NEW {modality.upper()} PREDICTION REQUEST")
    print(f"{'='*60}")
    
    if 'file' not in request.files:
        logger.error("No file in request")
        print("ERROR: No file in request")
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        logger.error("Empty filename")
        print("ERROR: Empty filename")
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        logger.error(f"Invalid file type: {file.filename}")
        print(f"ERROR: Invalid file type: {file.filename}")
        return jsonify({'error': 'Invalid file type. Allowed types: png, jpg, jpeg'}), 400
    
    filepath = None
    
    try:
        # Save uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        logger.info(f"File saved: {filepath}")
        print(f"File saved: {filepath}")
        
        # Make prediction
        print(f"Running {modality.upper()} model inference...")
        results = predict_image(filepath, modality)
        
        # Add modality to results
        results['modality'] = modality.upper()
        
        # Log results to console
        print(f"\n{'='*60}")
        print(f"PREDICTION RESULTS:")
        print(f"{'='*60}")
        print(f"Modality:     {results['modality']}")
        print(f"Filename:     {filename}")
        print(f"Predicted:    {results['predicted_class_name']}")
        print(f"Confidence:   {results['confidence']:.2%}")
        print(f"\nAll Probabilities:")
        for disease, prob in results['all_probabilities_named'].items():
            print(f"  {disease:40s} {prob:.2%}")
        print(f"{'='*60}\n")
        
        logger.info(f"Prediction successful: {results['predicted_class_name']}")
        
        return jsonify(results), 200
    
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Prediction error: {error_msg}", exc_info=True)
        print(f"\nERROR during prediction: {error_msg}\n")
        return jsonify({'error': error_msg}), 500
    
    finally:
        # Clean up uploaded file
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f"Cleaned up file: {filepath}")


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    status = {
        'status': 'healthy',
        'oct_model_loaded': 'oct' in models,
        'fundus_model_loaded': 'fundus' in models,
        'device': str(device) if device else 'not set'
    }
    logger.info(f"Health check: {status}")
    return jsonify(status), 200


# Error handlers
@app.errorhandler(413)
def request_entity_too_large(error):
    logger.error("File too large")
    return jsonify({'error': 'File too large. Maximum size is 32MB'}), 413


@app.errorhandler(500)
def internal_server_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    print("\n" + "="*60)
    print("OCUFUSION AI - Starting Server")
    print("="*60)
    
    try:
        print("\n[1/2] Initializing models...")
        initialize_models()
        
        print("\n[2/2] Starting Flask server...")
        print("="*60)
        print(f"Server running at: http://{FLASK_HOST}:{FLASK_PORT}")
        print("Available endpoints:")
        print("  - POST /predict/oct")
        print("  - POST /predict/fundus")
        print("  - POST /predict/combined  (NEW - for same person)")
        print("  - GET  /health")
        print("="*60 + "\n")
        
        app.run(
            debug=FLASK_DEBUG,
            host=FLASK_HOST,
            port=FLASK_PORT
        )
        
    except Exception as e:
        print(f"\nFATAL ERROR: Failed to start server")
        print(f"Error: {str(e)}\n")
        logger.error("Failed to start server", exc_info=True)
        raise
