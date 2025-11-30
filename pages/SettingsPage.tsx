import React from 'react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">System Settings</h1>
      
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-medium text-white mb-1">General Configuration</h2>
          <p className="text-sm text-slate-400">Manage how LogNova interacts with your system.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Log Retention</div>
              <div className="text-slate-500 text-sm">How many lines to fetch by default</div>
            </div>
            <select className="bg-slate-900 border border-slate-600 text-white text-sm rounded px-3 py-2 outline-none focus:border-primary-500">
              <option>100 Lines</option>
              <option>500 Lines</option>
              <option>1000 Lines</option>
            </select>
          </div>
          
           <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <div>
              <div className="text-white font-medium">Dark Mode</div>
              <div className="text-slate-500 text-sm">Force dark mode appearance</div>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input type="checkbox" name="toggle" id="toggle" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" defaultChecked/>
                <label htmlFor="toggle" className="toggle-label block overflow-hidden h-5 rounded-full bg-primary-500 cursor-pointer"></label>
            </div>
          </div>
        </div>
      </div>

       <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-lg font-medium text-white mb-1">AI Integration (Perplexity/Gemini)</h2>
          <p className="text-sm text-slate-400">Configure API keys for log analysis.</p>
        </div>
        <div className="p-6 space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">API Key</label>
                <input type="password" placeholder="sk-..." className="w-full bg-slate-900 border border-slate-600 text-white rounded px-3 py-2 focus:border-primary-500 outline-none" />
            </div>
             <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                Save API Key
            </button>
        </div>
       </div>
    </div>
  );
};