import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useOrganization } from '../context/OrganizationContext';
import toast from 'react-hot-toast';

const FaceRecognition: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const webcamRef = useRef<Webcam>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const capture = useCallback(async () => {
    if (!webcamRef.current) return;
    
    setIsProcessing(true);
    const imageSrc = webcamRef.current.getScreenshot();
    
    if (imageSrc) {
      try {
        const response = await fetch('http://localhost:5000/api/recognize-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageSrc })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Recognition failed');
        }
        
        // Handle different response statuses
        switch (data.status) {
          case 'no_face':
            toast.error('No face detected. Please ensure your face is clearly visible');
            setRecognitionResult(null);
            break;
            
          case 'no_encoding':
            toast.error('Could not process face. Try again with better lighting');
            setRecognitionResult(null);
            break;
            
          case 'recognized':
            setRecognitionResult({
              ...data,
              name: data.student_details ? data.student_details.Name : (data.id_type === 'staff' ? `Staff ${data.identifier}` : `Student ${data.identifier}`),
              photo: data.image_url
            });
            toast.success(`Recognized: ${data.student_details ? data.student_details.Name : (data.id_type === 'staff' ? `Staff ${data.identifier}` : `Student ${data.identifier}`)}`);
            break;
            
          case 'unrecognized':
            setRecognitionResult({
              recognized: false,
              message: 'Person not registered in the system'
            });
            toast.error('Person not registered');
            break;
            
          default:
            throw new Error('Unknown response status');
        }
      } catch (error: any) {
        setRecognitionResult(null);
        toast.error(error.message || 'Recognition failed');
      } finally {
        setIsProcessing(false);
      }
    }
  }, []);

  const resetRecognition = () => {
    setRecognitionResult(null);
    setIsProcessing(false);
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">Please select an organization first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Face Recognition</h1>
        <div className="text-sm text-gray-500">
          Real-time identity verification for {currentOrganization.name}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Camera Feed</h2>
          
          <div className="relative">
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                videoConstraints={{
                  width: 640,
                  height: 480,
                  facingMode: "user"
                }}
              />
            </div>
            
            {isProcessing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Processing face recognition...</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-center space-x-4">
            <button
              onClick={capture}
              disabled={isProcessing}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Camera className="w-5 h-5 mr-2" />
              {isProcessing ? 'Processing...' : 'Capture & Recognize'}
            </button>
            
            {recognitionResult && (
              <button
                onClick={resetRecognition}
                className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recognition Results</h2>
          
          {!recognitionResult && !isProcessing && (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Capture a photo to start face recognition</p>
            </div>
          )}

          {isProcessing && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing face...</p>
            </div>
          )}

          {recognitionResult === null && !isProcessing && (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">No Match Found</h3>
              <p className="text-gray-600">The person is not recognized in the database</p>
            </div>
          )}

          {recognitionResult && (
            <div className="space-y-4">
              <div className="flex items-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                <h3 className="text-lg font-semibold text-green-600">Person Recognized</h3>
              </div>

              <div className="flex items-start space-x-4">
                <img
                  src={recognitionResult.photo}
                  alt={recognitionResult.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h4 className="text-xl font-semibold text-gray-900">{recognitionResult.name}</h4>
                  <p className="text-gray-600 capitalize">{recognitionResult.type}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">ID:</span> {recognitionResult.id}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Department:</span> {recognitionResult.department}
                    </p>
                    {recognitionResult.class && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Class:</span> {recognitionResult.class}
                      </p>
                    )}
                    {recognitionResult.role && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Role:</span> {recognitionResult.role}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm text-green-800">
                      <span className="font-medium">Confidence:</span> {(recognitionResult.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="w-24 bg-green-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${recognitionResult.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use Face Recognition</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div className="flex items-start">
            <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-xs font-bold">1</span>
            </div>
            <div>
              <p className="font-medium">Position Face</p>
              <p>Ensure the person's face is clearly visible and well-lit in the camera frame.</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-xs font-bold">2</span>
            </div>
            <div>
              <p className="font-medium">Capture Photo</p>
              <p>Click "Capture & Recognize" to take a photo and start the recognition process.</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-xs font-bold">3</span>
            </div>
            <div>
              <p className="font-medium">View Results</p>
              <p>The system will display the person's information if they are found in the database.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognition;