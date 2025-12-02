import { useState, useEffect } from 'react';
import { 
  Download, 
  Search,
  Trash2,
  Activity,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Image as ImageIcon
} from 'lucide-react';
import api from '../services/api';

const Reports = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [snapshots, setSnapshots] = useState({ wssv: [], healthy: [] });
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const fetchSnapshots = async () => {
    try {
      setLoading(true);
      const [wssvResponse, healthyResponse] = await Promise.all([
        api.getSnapshots('wssv'),
        api.getSnapshots('healthy')
      ]);
      
      setSnapshots({
        wssv: wssvResponse.items || [],
        healthy: healthyResponse.items || []
      });
    } catch (error) {
      console.error('Error fetching snapshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSnapshot = async (kind, id) => {
    if (!confirm(`Are you sure you want to delete this ${kind} snapshot?`)) return;
    
    try {
      await api.deleteSnapshot(kind, id);
      await fetchSnapshots(); // Refresh data
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      alert('Failed to delete snapshot');
    }
  };

  const getAllSnapshots = () => {
    const allSnapshots = [
      ...snapshots.wssv.map(snap => ({ ...snap, type: 'WSSV Detection' })),
      ...snapshots.healthy.map(snap => ({ ...snap, type: 'Healthy Sample' }))
    ].sort((a, b) => {
      const dateA = new Date(a.timestamp || a.created_at);
      const dateB = new Date(b.timestamp || b.created_at);
      return dateB - dateA;
    });

    if (selectedFilter === 'wssv') {
      return snapshots.wssv.map(snap => ({ ...snap, type: 'WSSV Detection' }));
    }
    if (selectedFilter === 'healthy') {
      return snapshots.healthy.map(snap => ({ ...snap, type: 'Healthy Sample' }));
    }
    return allSnapshots;
  };

  const filteredSnapshots = getAllSnapshots().filter(snapshot =>
    snapshot.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    snapshot.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detection Reports</h1>
            <p className="text-gray-600 mt-1">View and manage WSSV and healthy shrimp detection snapshots</p>
          </div>
          <button 
            onClick={fetchSnapshots}
            className="mt-4 md:mt-0 inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Activity size={20} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search detections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({snapshots.wssv.length + snapshots.healthy.length})
              </button>
              <button
                onClick={() => setSelectedFilter('wssv')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedFilter === 'wssv'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                WSSV ({snapshots.wssv.length})
              </button>
              <button
                onClick={() => setSelectedFilter('healthy')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedFilter === 'healthy'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Healthy ({snapshots.healthy.length})
              </button>
            </div>
          </div>
        </div>
      </div>

 

      {/* Snapshot Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detection Snapshots</h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading snapshots...</span>
          </div>
        ) : filteredSnapshots.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No detection snapshots found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Label
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Camera Index
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSnapshots.map((snapshot) => (
                  <tr key={snapshot.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                      {snapshot.id.substring(0, 12)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={api.getSnapshotImageUrl(snapshot.type === 'WSSV Detection' ? 'wssv' : 'healthy', snapshot.id)}
                        alt={snapshot.label}
                        className="h-16 w-24 object-cover rounded cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={() => setSelectedImage(snapshot)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        snapshot.type === 'WSSV Detection' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {snapshot.type === 'WSSV Detection' ? 'WSSV' : 'Healthy'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {snapshot.label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(snapshot.confidence * 100).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {snapshot.camera_index !== undefined ? snapshot.camera_index : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(snapshot.timestamp || snapshot.created_at).toLocaleString()}
                    </td>
                
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setSelectedImage(snapshot)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <ImageIcon size={18} />
                        </button>
                        <a
                          href={api.getDownloadUrl(snapshot.type === 'WSSV Detection' ? 'wssv' : 'healthy', snapshot.id)}
                          download
                          className="text-green-600 hover:text-green-900"
                          title="Download"
                        >
                          <Download size={18} />
                        </a>
                        <button
                          onClick={() => handleDeleteSnapshot(snapshot.type === 'WSSV Detection' ? 'wssv' : 'healthy', snapshot.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-lg max-w-lg w-full my-8">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-base font-semibold">{selectedImage.label}</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
              <div className="p-4">
                <img
                  src={api.getSnapshotImageUrl(selectedImage.type === 'WSSV Detection' ? 'wssv' : 'healthy', selectedImage.id)}
                  alt={selectedImage.label}
                  className="w-full h-auto rounded"
                />
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-gray-200">
                    <span className="text-gray-500">ID</span>
                    <span className="font-medium text-gray-900">{selectedImage.id}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-200">
                    <span className="text-gray-500">Label</span>
                    <span className="font-medium text-gray-900">{selectedImage.label}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-200">
                    <span className="text-gray-500">Confidence</span>
                    <span className="font-medium text-gray-900">{(selectedImage.confidence * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-200">
                    <span className="text-gray-500">Camera Index</span>
                    <span className="font-medium text-gray-900">{selectedImage.camera_index !== undefined ? selectedImage.camera_index : '-'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-500">Timestamp</span>
                    <span className="font-medium text-gray-900">{new Date(selectedImage.timestamp || selectedImage.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;