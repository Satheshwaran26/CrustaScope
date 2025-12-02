// CrustaScope API Service
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class CrustaScopeAPI {
  // Helper method for making API calls
  async apiCall(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Camera management
  async listCameras() {
    return this.apiCall('/cameras');
  }

  async startMonitoring(cameraIndex) {
    return this.apiCall('/start', {
      method: 'POST',
      body: JSON.stringify({ camera_index: cameraIndex }),
    });
  }

  async stopMonitoring() {
    return this.apiCall('/stop', {
      method: 'POST',
    });
  }

  async getStatus() {
    return this.apiCall('/status');
  }

  // Get video feed URL
  getVideoFeedUrl() {
    return `${API_BASE_URL}/video_feed`;
  }

  // Sensor data
  async getSensorLive() {
    return this.apiCall('/sensor_live');
  }

  // Snapshots/Gallery
  async getSnapshots(kind = 'wssv') {
    return this.apiCall(`/snaps?kind=${kind}`);
  }

  async deleteSnapshot(kind, snapId) {
    return this.apiCall(`/snap/${kind}/${snapId}`, {
      method: 'DELETE',
    });
  }

  getSnapshotImageUrl(kind, snapId) {
    return `${API_BASE_URL}/snap_image/${kind}/${snapId}`;
  }

  getDownloadUrl(kind, snapId, format = 'jpg') {
    return `${API_BASE_URL}/download/${kind}/${snapId}?fmt=${format}`;
  }

  // Upload test
  async uploadTest(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    return fetch(`${API_BASE_URL}/upload_test`, {
      method: 'POST',
      body: formData,
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    });
  }
}

// Create singleton instance
const api = new CrustaScopeAPI();

export default api;