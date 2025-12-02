import { useState, useEffect } from 'react';
import { 
  Activity, 
  Camera, 
  FileText, 
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Thermometer,
  Droplets,
  Waves
} from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
  const [sensorData, setSensorData] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [snapshots, setSnapshots] = useState({ wssv: [], healthy: [] });
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [sensorResponse, statusResponse, wssvSnaps, healthySnaps, camerasResponse] = await Promise.all([
          api.getSensorLive().catch(() => null),
          api.getStatus().catch(() => null),
          api.getSnapshots('wssv').catch(() => ({ items: [] })),
          api.getSnapshots('healthy').catch(() => ({ items: [] })),
          api.listCameras().catch(() => ({ cameras: [] }))
        ]);

        setSensorData(sensorResponse);
        setSystemStatus(statusResponse);
        setSnapshots({
          wssv: wssvSnaps.items || [],
          healthy: healthySnaps.items || []
        });
        setCameras(camerasResponse.cameras || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Set up polling for real-time data
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);
  const stats = [
    {
      title: 'Temperature',
      value: sensorData?.temperature_c ? `${sensorData.temperature_c}°C` : 'N/A',
      change: 'Current reading',
      changeType: 'positive',
      icon: Thermometer,
      color: 'bg-blue-500'
    },
    {
      title: 'pH Level',
      value: sensorData?.ph || 'N/A',
      change: 'Current reading',
      changeType: 'positive',
      icon: Droplets,
      color: 'bg-green-500'
    },
    {
      title: 'Turbidity',
      value: sensorData?.turbidity ? `${sensorData.turbidity} NTU` : 'N/A',
      change: 'Current reading',
      changeType: 'positive',
      icon: Waves,
      color: 'bg-purple-500'
    },
    {
      title: 'TDS',
      value: sensorData?.tds ? `${sensorData.tds} ppm` : 'N/A',
      change: 'Current reading',
      changeType: 'positive',
      icon: Activity,
      color: 'bg-orange-500'
    }
  ];

  // Generate recent activity from real data
  const recentActivity = [
    ...snapshots.wssv.slice(0, 3).map((snap, index) => ({
      id: `wssv-${index}`,
      title: `WSSV Detection - ${(snap.confidence * 100).toFixed(1)}% confidence`,
      time: snap.created_at ? new Date(snap.created_at).toLocaleString() : 'Unknown time',
      status: 'warning',
      icon: AlertTriangle
    })),
    ...snapshots.healthy.slice(0, 2).map((snap, index) => ({
      id: `healthy-${index}`,
      title: `Healthy Shrimp - ${(snap.confidence * 100).toFixed(1)}% confidence`,
      time: snap.created_at ? new Date(snap.created_at).toLocaleString() : 'Unknown time',
      status: 'success',
      icon: CheckCircle
    }))
  ].slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your CrustaScope system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className={`text-xs mt-1 ${
                    stat.changeType === 'positive' 
                      ? 'text-green-600' 
                      : stat.changeType === 'negative' 
                        ? 'text-red-600' 
                        : 'text-gray-500'
                  }`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity & Live Sensor Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.status === 'success' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Activity className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Sensor Data */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Sensor Data</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : sensorData ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Thermometer className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Temperature</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {sensorData.temperature_c ? `${sensorData.temperature_c}°C` : 'N/A'}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Droplets className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">pH Level</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {sensorData.ph || 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Waves className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">Turbidity</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {sensorData.turbidity ? `${sensorData.turbidity} NTU` : 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-gray-900">TDS</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {sensorData.tds ? `${sensorData.tds} ppm` : 'N/A'}
                </span>
              </div>

              {sensorData.timestamp && (
                <div className="text-center pt-2">
                  <p className="text-xs text-gray-500">
                    Last updated: {new Date(sensorData.timestamp).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Activity className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No sensor data available</p>
            </div>
          )}
        </div>
      </div>

 
    </div>
  );
};

export default Dashboard;