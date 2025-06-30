import React from 'react';
import { AIMonitorDashboard } from '../components/AIMonitorDashboard';

export const AIMonitorPage: React.FC = () => {
  // Determine API URL based on environment
  const getApiUrl = () => {
    // In Docker, use port 3002
    if (window.location.hostname === 'localhost' && window.location.port === '5173') {
      return 'http://localhost:3002';
    }
    
    // Production or custom deployment
    return process.env.VITE_AI_MONITOR_URL || 'http://localhost:3001';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">AI Monitor Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Real-time monitoring of AI CLI tools running in Shelltender sessions
          </p>
        </div>

        <AIMonitorDashboard apiUrl={getApiUrl()} />

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Start</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">1. Create a Terminal Session</h3>
              <p className="text-sm text-gray-600">
                Go to the main Shelltender page and create a new terminal session
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">2. Run an AI Tool</h3>
              <p className="text-sm text-gray-600">
                In the terminal, run: <code className="bg-gray-100 px-2 py-1 rounded">claude</code>
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">3. Watch the Dashboard</h3>
              <p className="text-sm text-gray-600">
                The AI Monitor will automatically detect and start monitoring the AI session
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Docker Setup</h3>
          <p className="text-sm text-blue-700">
            This dashboard is connected to the AI Monitor at: <strong>{getApiUrl()}</strong>
          </p>
          <p className="text-sm text-blue-700 mt-1">
            Make sure both containers are running: <code className="bg-blue-100 px-2 py-1 rounded">docker-compose up -d</code>
          </p>
        </div>
      </div>
    </div>
  );
};