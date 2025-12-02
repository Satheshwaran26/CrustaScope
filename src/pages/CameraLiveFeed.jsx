import { useState, useEffect } from 'react';
import { 
  Camera, 
  Play, 
  Pause, 
  Square, 
  RotateCw,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
  Maximize,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import api from '../services/api';

const CameraLiveFeed = () => {
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCameras();
    
    // Poll for system status
    const statusInterval = setInterval(fetchSystemStatus, 2000);
    return () => clearInterval(statusInterval);
  }, []);

  const fetchCameras = async () => {
    try {
      setLoading(true);
      const response = await api.listCameras();
      const cameraList = response.cameras.map(index => ({
        id: index,
        name: `Camera ${index} - CrustaScope Monitor`,
        status: 'offline',
        location: 'Aquaculture Tank'
      }));
      setCameras(cameraList);
      if (cameraList.length > 0 && !selectedCamera) {
        setSelectedCamera(cameraList[0].id);
      }
    } catch (err) {
      setError('Failed to fetch cameras');
      console.error('Error fetching cameras:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const status = await api.getStatus();
      setSystemStatus(status);
      
      // Update camera status based on monitoring
      setCameras(prev => prev.map(camera => ({
        ...camera,
        status: camera.id === selectedCamera && isPlaying ? 'online' : 'offline'
      })));
    } catch (err) {
      console.error('Error fetching system status:', err);
    }
  };

  const startMonitoring = async () => {
    if (selectedCamera === null) return;
    
    try {
      await api.startMonitoring(selectedCamera);
      setIsPlaying(true);
      setError(null);
    } catch (err) {
      setError('Failed to start camera monitoring');
      console.error('Error starting monitoring:', err);
    }
  };

  const stopMonitoring = async () => {
    try {
      await api.stopMonitoring();
      setIsPlaying(false);
      setError(null);
    } catch (err) {
      setError('Failed to stop camera monitoring');
      console.error('Error stopping monitoring:', err);
    }
  };

  const selectedCameraData = cameras.find(camera => camera.id === selectedCamera);
  
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Connection Error</h3>
              <p className="text-red-600">{error}</p>
              <button 
                onClick={() => {setError(null); fetchCameras();}}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'offline': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return <Wifi size={14} />;
      case 'offline': return <WifiOff size={14} />;
      case 'warning': return <AlertCircle size={14} />;
      default: return <WifiOff size={14} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Camera Live Feed</h1>
            <p className="text-gray-600 mt-1">Monitor your security cameras in real-time</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">LIVE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Camera List */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Camera List</h3>
            <div className="space-y-2">
              {cameras.map((camera) => (
                <button
                  key={camera.id}
                  onClick={() => setSelectedCamera(camera.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                    selectedCamera === camera.id
                      ? 'bg-blue-50 border-2 border-blue-200'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900">{camera.name}</span>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(camera.status)}`}>
                      {getStatusIcon(camera.status)}
                      <span className="capitalize">{camera.status}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">{camera.location}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Video Feed */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Video Header */}
            <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Camera size={20} />
                <div>
                  <h3 className="font-semibold">{selectedCameraData?.name}</h3>
                  <p className="text-sm text-gray-300">{selectedCameraData?.location}</p>
                </div>
              </div>
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedCameraData?.status)}`}>
                {getStatusIcon(selectedCameraData?.status)}
                <span className="capitalize text-white">{selectedCameraData?.status}</span>
              </div>
            </div>

            {/* Video Area */}
            <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
              {loading ? (
                <div className="text-center text-gray-400">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-lg font-medium">Loading Camera...</p>
                </div>
              ) : selectedCamera === null ? (
                <div className="text-center text-gray-400">
                  <Camera size={48} className="mx-auto mb-4" />
                  <p className="text-lg font-medium">No Camera Selected</p>
                  <p className="text-sm">Select a camera from the list</p>
                </div>
              ) : !isPlaying ? (
                <div className="text-center text-gray-400">
                  <Play size={48} className="mx-auto mb-4" />
                  <p className="text-lg font-medium">Camera Stopped</p>
                  <p className="text-sm">Click play to start monitoring</p>
                  <button 
                    onClick={startMonitoring}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Start Monitoring
                  </button>
                </div>
              ) : (
                <div className="w-full h-full relative">
                  <img 
                    src={api.getVideoFeedUrl()} 
                    alt="Live Camera Feed"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Video feed error');
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden w-full h-full items-center justify-center text-center text-gray-400">
                    <div>
                      <WifiOff size={48} className="mx-auto mb-4" />
                      <p className="text-lg font-medium">Video Feed Unavailable</p>
                      <p className="text-sm">Check camera connection</p>
                    </div>
                  </div>
                  
                  {/* Detection Status Overlay */}
                  {systemStatus && (
                    <div className="absolute top-4 right-4 bg-black bg-opacity-75 rounded-lg px-3 py-2">
                      <div className={`text-sm font-medium ${
                        systemStatus.label === 'WSSV DETECTED' ? 'text-red-400' :
                        systemStatus.label === 'Healthy Shrimp' ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {systemStatus.label || 'No Detection'}
                        {systemStatus.confidence && (
                          <span className="block text-xs text-gray-300">
                            {(systemStatus.confidence * 100).toFixed(1)}% confidence
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Video Controls Overlay */}
              {selectedCamera !== null && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-black bg-opacity-75 rounded-lg px-4 py-2 flex items-center space-x-3">
                    <button
                      onClick={isPlaying ? stopMonitoring : startMonitoring}
                      className="text-white hover:text-blue-400 transition-colors duration-200"
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    
                    <button className="text-white hover:text-blue-400 transition-colors duration-200">
                      <Square size={20} />
                    </button>
                    
                    <div className="w-px h-6 bg-gray-600"></div>
                    
                    <button className="text-white hover:text-blue-400 transition-colors duration-200">
                      <ZoomOut size={20} />
                    </button>
                    
                    <button className="text-white hover:text-blue-400 transition-colors duration-200">
                      <ZoomIn size={20} />
                    </button>
                    
                    <button className="text-white hover:text-blue-400 transition-colors duration-200">
                      <RotateCw size={20} />
                    </button>
                    
                    <div className="w-px h-6 bg-gray-600"></div>
                    
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-white hover:text-blue-400 transition-colors duration-200"
                    >
                      {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    
                    <button className="text-white hover:text-blue-400 transition-colors duration-200">
                      <Maximize size={20} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Info */}
            <div className="p-4 bg-gray-50 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Resolution</p>
                  <p className="font-semibold text-gray-900">1920x1080</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Frame Rate</p>
                  <p className="font-semibold text-gray-900">30 FPS</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Recording</p>
                  <p className="font-semibold text-green-600">Active</p>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Camera Grid Toggle */}
          <div className="mt-4 bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Multi-Camera View</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                View All Cameras
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {cameras.slice(0, 4).map((camera) => (
                <div key={camera.id} className="relative bg-gray-200 aspect-video rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera size={24} className="text-gray-400" />
                  </div>
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-black bg-opacity-75 rounded px-2 py-1">
                      <p className="text-white text-xs font-medium truncate">{camera.name}</p>
                    </div>
                  </div>
                  <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                    camera.status === 'online' ? 'bg-green-500' : 
                    camera.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraLiveFeed;