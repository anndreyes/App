import React, { useState, useEffect } from 'react';
import { Copy, CheckCircle, Users, Phone, Monitor, AlertCircle, Wrench, ArrowRight, Clock } from 'lucide-react';

interface FormData {
  customerName: string;
  customerPhone: string;
  deviceName: string;
  issue: string;
  workLocation: 'office' | 'remote' | '';
  hasWorkedBefore: boolean | null;
  lastWorkedDate: string;
  errorMessage: string;
  usersAffected: number | '';
  actionTaken: string;
  nextSteps: string;
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerPhone: '',
    deviceName: '',
    issue: '',
    workLocation: '',
    hasWorkedBefore: null,
    lastWorkedDate: '',
    errorMessage: '',
    usersAffected: '',
    actionTaken: '',
    nextSteps: ''
  });

  const [copySuccess, setCopySuccess] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatForClipboard = () => {
    return `IT SUPPORT TICKET NOTES
========================

CUSTOMER INFORMATION:
• Customer Name: ${formData.customerName || 'N/A'}
• Phone Number: ${formData.customerPhone || 'N/A'}
• Device Name: ${formData.deviceName || 'N/A'}

ISSUE DESCRIPTION:
${formData.issue || 'N/A'}

PROBING DETAILS:
• Work Location: ${formData.workLocation ? (formData.workLocation === 'office' ? 'Office' : 'Remote') : 'N/A'}
• Has it worked before: ${formData.hasWorkedBefore === null ? 'N/A' : (formData.hasWorkedBefore ? 'Yes' : 'No')}
• Last worked: ${formData.lastWorkedDate || 'N/A'}
• Users affected: ${formData.usersAffected || 'N/A'}
• Error message: ${formData.errorMessage || 'N/A'}

ACTION TAKEN:
${formData.actionTaken || 'N/A'}

NEXT STEPS:
${formData.nextSteps || 'N/A'}

Generated: ${new Date().toLocaleString()}`;
  };

  const copyToClipboard = async () => {
    try {
      const formattedText = formatForClipboard();
      await navigator.clipboard.writeText(formattedText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const clearForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      deviceName: '',
      issue: '',
      workLocation: '',
      hasWorkedBefore: null,
      lastWorkedDate: '',
      errorMessage: '',
      usersAffected: '',
      actionTaken: '',
      nextSteps: ''
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white text-center mb-2">
                Helpdesk Note Taker
              </h1>
              <p className="text-blue-200 text-center">Streamlined documentation for support tickets</p>
            </div>
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg px-4 py-3 border border-slate-600/50">
              <div className="text-blue-200 text-sm mb-1">Local Time</div>
              <div className="text-white text-xl font-mono font-bold">
                {currentTime.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        <form className="space-y-6">
          {/* Customer Information */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-slate-600/30">
            <div className="px-6 py-4 border-b border-slate-600/30">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Customer Information
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="customerName" className="block text-sm font-medium text-white mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-md shadow-sm focus:ring-blue-400 focus:border-blue-400 transition-colors text-white placeholder-slate-400"
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <label htmlFor="customerPhone" className="block text-sm font-medium text-white mb-2">
                    <Phone className="inline h-4 w-4 mr-1" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-md shadow-sm focus:ring-blue-400 focus:border-blue-400 transition-colors text-white placeholder-slate-400"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="deviceName" className="block text-sm font-medium text-white mb-2">
                  Device Name
                </label>
                <input
                  type="text"
                  id="deviceName"
                  value={formData.deviceName}
                  onChange={(e) => handleInputChange('deviceName', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-md shadow-sm focus:ring-blue-400 focus:border-blue-400 transition-colors text-white placeholder-slate-400"
                  placeholder="Enter device name or identifier"
                />
              </div>
            </div>
          </div>

          {/* Issue Description */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-slate-600/30">
            <div className="px-6 py-4 border-b border-slate-600/30">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                Issue Description
              </h2>
            </div>
            <div className="p-6">
              <label htmlFor="issue" className="block text-sm font-medium text-white mb-2">
                Describe the Issue
              </label>
              <textarea
                id="issue"
                rows={4}
                value={formData.issue}
                onChange={(e) => handleInputChange('issue', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-md shadow-sm focus:ring-blue-400 focus:border-blue-400 transition-colors text-white placeholder-slate-400"
                placeholder="Provide a detailed description of the issue..."
              />
            </div>
          </div>

          {/* Probing Details */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-slate-600/30">
            <div className="px-6 py-4 border-b border-slate-600/30">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-400" />
                Probing Details
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* Work Location */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  Work Location
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="workLocation"
                      value="office"
                      checked={formData.workLocation === 'office'}
                      onChange={(e) => handleInputChange('workLocation', e.target.value)}
                      className="h-4 w-4 text-blue-400 focus:ring-blue-400 border-slate-500"
                    />
                    <span className="ml-2 text-sm text-white">Office</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="workLocation"
                      value="remote"
                      checked={formData.workLocation === 'remote'}
                      onChange={(e) => handleInputChange('workLocation', e.target.value)}
                      className="h-4 w-4 text-blue-400 focus:ring-blue-400 border-slate-500"
                    />
                    <span className="ml-2 text-sm text-white">Remote</span>
                  </label>
                </div>
              </div>

              {/* Has it worked before */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  Has it worked before?
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleInputChange('hasWorkedBefore', true)}
                    className={`px-4 py-2 rounded-md border transition-colors ${
                      formData.hasWorkedBefore === true
                        ? 'bg-green-600/40 border-green-400 text-green-200'
                        : 'bg-slate-700/50 border-slate-500 text-white hover:bg-slate-600/50'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('hasWorkedBefore', false)}
                    className={`px-4 py-2 rounded-md border transition-colors ${
                      formData.hasWorkedBefore === false
                        ? 'bg-red-600/40 border-red-400 text-red-200'
                        : 'bg-slate-700/50 border-slate-500 text-white hover:bg-slate-600/50'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Last worked date */}
              <div>
                <label htmlFor="lastWorkedDate" className="block text-sm font-medium text-white mb-2">
                  When was the last time it worked?
                </label>
                <input
                  type="text"
                  id="lastWorkedDate"
                  value={formData.lastWorkedDate}
                  onChange={(e) => handleInputChange('lastWorkedDate', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-md shadow-sm focus:ring-blue-400 focus:border-blue-400 transition-colors text-white placeholder-slate-400"
                  placeholder="e.g., Yesterday, Last week, Never..."
                />
              </div>

              {/* Users affected */}
              <div>
                <label htmlFor="usersAffected" className="block text-sm font-medium text-white mb-2">
                  How many users are affected?
                </label>
                <input
                  type="number"
                  id="usersAffected"
                  min="1"
                  value={formData.usersAffected}
                  onChange={(e) => handleInputChange('usersAffected', e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-md shadow-sm focus:ring-blue-400 focus:border-blue-400 transition-colors text-white placeholder-slate-400"
                  placeholder="Enter number of users"
                />
              </div>

              {/* Error message */}
              <div>
                <label htmlFor="errorMessage" className="block text-sm font-medium text-white mb-2">
                  Exact error message
                </label>
                <textarea
                  id="errorMessage"
                  rows={3}
                  value={formData.errorMessage}
                  onChange={(e) => handleInputChange('errorMessage', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-md shadow-sm focus:ring-blue-400 focus:border-blue-400 transition-colors text-white placeholder-slate-400"
                  placeholder="Copy/paste the exact error message here..."
                />
              </div>
            </div>
          </div>

          {/* Action Taken */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-slate-600/30">
            <div className="px-6 py-4 border-b border-slate-600/30">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Wrench className="h-5 w-5 text-green-400" />
                Action Taken
              </h2>
            </div>
            <div className="p-6">
              <label htmlFor="actionTaken" className="block text-sm font-medium text-white mb-2">
                What actions have been taken to resolve the issue?
              </label>
              <textarea
                id="actionTaken"
                rows={4}
                value={formData.actionTaken}
                onChange={(e) => handleInputChange('actionTaken', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-md shadow-sm focus:ring-blue-400 focus:border-blue-400 transition-colors text-white placeholder-slate-400"
                placeholder="Describe troubleshooting steps, configurations changed, software installed, etc..."
              />
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-slate-600/30">
            <div className="px-6 py-4 border-b border-slate-600/30">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-blue-400" />
                Next Steps
              </h2>
            </div>
            <div className="p-6">
              <label htmlFor="nextSteps" className="block text-sm font-medium text-white mb-2">
                What are the next steps or follow-up actions?
              </label>
              <textarea
                id="nextSteps"
                rows={4}
                value={formData.nextSteps}
                onChange={(e) => handleInputChange('nextSteps', e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600/50 rounded-md shadow-sm focus:ring-blue-400 focus:border-blue-400 transition-colors text-white placeholder-slate-400"
                placeholder="Describe planned actions, scheduled follow-ups, escalations, etc..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-slate-600/30 p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={copyToClipboard}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-md font-medium transition-all ${
                  copySuccess
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
                }`}
              >
                {copySuccess ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    Copy Notes to Clipboard
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={clearForm}
                className="flex-1 sm:flex-initial px-6 py-3 border border-slate-500 rounded-md font-medium text-white bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
              >
                Clear Form
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;