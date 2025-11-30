import React, { useState } from 'react';
import { UsersManagement } from '../components/UsersManagement';

interface SettingsPageProps {
  user?: { username: string; role: string } | null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'users'>('general');
  const isAdmin = user?.role === 'admin';

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
      
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'general'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'ai'
              ? 'text-blue-500 border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          AI Integration
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            User Management
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-lg font-medium text-white mb-1">General Configuration</h2>
            <p className="text-sm text-gray-400">Manage how LogNova interacts with your system.</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">Log Retention</div>
                <div className="text-gray-400 text-sm">How many lines to fetch by default</div>
              </div>
              <select className="bg-gray-900 border border-gray-600 text-white text-sm rounded px-3 py-2 outline-none focus:border-blue-500">
                <option>100 Lines</option>
                <option>500 Lines</option>
                <option>1000 Lines</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <div>
                <div className="text-white font-medium">Dark Mode</div>
                <div className="text-gray-400 text-sm">Force dark mode appearance</div>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input type="checkbox" name="toggle" id="toggle" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" defaultChecked />
                <label htmlFor="toggle" className="toggle-label block overflow-hidden h-5 rounded-full bg-blue-500 cursor-pointer"></label>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-lg font-medium text-white mb-1">AI Integration (Perplexity/Gemini)</h2>
            <p className="text-sm text-gray-400">Configure API keys for log analysis.</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">API Key</label>
              <input
                type="password"
                placeholder="sk-..."
                className="w-full bg-gray-900 border border-gray-600 text-white rounded px-3 py-2 focus:border-blue-500 outline-none"
              />
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
              Save API Key
            </button>
          </div>
        </div>
      )}

      {activeTab === 'users' && isAdmin && <UsersManagement />}
    </div>
  );
};
