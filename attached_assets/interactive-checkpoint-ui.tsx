import React, { useState } from 'react';
import { CheckCircle, Circle, Clock, AlertTriangle, ChevronRight, ChevronDown, Calendar, Users, Zap, BarChart3, FileText, Code, Bot, Database, PlusCircle, Settings, Terminal, RefreshCw } from 'lucide-react';

const ProjectCheckpointUI = () => {
  const [expandedPhase, setExpandedPhase] = useState('phase1');
  const [expandedMonth, setExpandedMonth] = useState('month1');
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [connectedApis, setConnectedApis] = useState([
    { id: 'api1', name: 'OpenAI GPT-4', status: 'connected', type: 'llm', lastSync: '10 min ago' },
    { id: 'api2', name: 'Custom NLP Service', status: 'connected', type: 'nlp', lastSync: '1 hour ago' }
  ]);
  
  // Current progress state (in a real app, this would come from your database)
  const [checkpoints, setCheckpoints] = useState({
    'phase1-month1-week1': { status: 'completed', notes: 'All user stories defined and prioritized' },
    'phase1-month1-week2': { status: 'completed', notes: 'Wireframes approved by stakeholders' },
    'phase1-month1-week3': { status: 'inProgress', notes: 'API spec 75% complete' },
    'phase1-month1-week4': { status: 'notStarted', notes: '' },
    // More checkpoints would be defined here
  });

  const togglePhase = (phaseId) => {
    setExpandedPhase(expandedPhase === phaseId ? null : phaseId);
  };

  const toggleMonth = (monthId) => {
    setExpandedMonth(expandedMonth === monthId ? null : monthId);
  };

  const updateCheckpointStatus = (checkpointId, status) => {
    setCheckpoints({
      ...checkpoints,
      [checkpointId]: { ...checkpoints[checkpointId], status }
    });
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <CheckCircle className="text-green-500" />;
      case 'inProgress': return <Clock className="text-blue-500" />;
      case 'atRisk': return <AlertTriangle className="text-orange-500" />;
      case 'blocked': return <AlertTriangle className="text-red-500" />;
      default: return <Circle className="text-gray-300" />;
    }
  };

  // Implementation phases data
  const phases = [
    {
      id: 'phase1',
      name: 'Foundation',
      timeframe: 'Months 1-3',
      description: 'Setting up the core platform architecture and basic functionality',
      months: [
        {
          id: 'month1',
          name: 'Requirements & Design',
          weeks: [
            { id: 'phase1-month1-week1', name: 'Finalize user stories and acceptance criteria' },
            { id: 'phase1-month1-week2', name: 'Create detailed wireframes for core user flows' },
            { id: 'phase1-month1-week3', name: 'Design database schema and API specifications' },
            { id: 'phase1-month1-week4', name: 'Set up development environment and CI/CD pipeline' },
          ]
        },
        {
          id: 'month2',
          name: 'Core Platform Development',
          weeks: [
            { id: 'phase1-month2-week1', name: 'Develop user authentication and profile management' },
            { id: 'phase1-month2-week2', name: 'Continue user authentication and profile development' },
            { id: 'phase1-month2-week3', name: 'Implement idea submission and initial AI analysis engine' },
            { id: 'phase1-month2-week4', name: 'Create basic dashboard for idea tracking' },
          ]
        },
        {
          id: 'month3',
          name: 'Template System Groundwork',
          weeks: [
            { id: 'phase1-month3-week1', name: 'Develop template framework architecture' },
            { id: 'phase1-month3-week2', name: 'Create first interactive template (Business Model Canvas)' },
            { id: 'phase1-month3-week3', name: 'Implement template customization capabilities' },
            { id: 'phase1-month3-week4', name: 'Internal testing and bug fixes' },
          ]
        }
      ]
    },
    {
      id: 'phase2',
      name: 'MVP Development',
      timeframe: 'Months 4-6',
      description: 'Building core features and preparing for alpha release',
      months: [
        {
          id: 'month4',
          name: 'AI Integration',
          weeks: [
            { id: 'phase2-month4-week1', name: 'Implement natural language processing for idea analysis' },
            { id: 'phase2-month4-week2', name: 'Develop AI recommendation engine for idea improvement' },
            { id: 'phase2-month4-week3', name: 'Build market research automation features' },
            { id: 'phase2-month4-week4', name: 'Testing and refinement of AI capabilities' },
          ]
        }
        // Additional months would be defined here
      ]
    }
    // Additional phases would be defined here
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Platform Development Roadmap</h1>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2">
            <Calendar size={16} />
            <span>View Timeline</span>
          </button>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-md flex items-center gap-2">
            <Users size={16} />
            <span>Team View</span>
          </button>
          <button 
            onClick={() => setApiModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md flex items-center gap-2"
          >
            <Bot size={16} />
            <span>AI Connections</span>
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full">
          <CheckCircle size={16} />
          <span>Completed: 7</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
          <Clock size={16} />
          <span>In Progress: 3</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full">
          <AlertTriangle size={16} />
          <span>At Risk: 1</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full">
          <Circle size={16} />
          <span>Not Started: 21</span>
        </div>
      </div>

      <div className="space-y-4">
        {phases.map(phase => (
          <div key={phase.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div 
              className={`flex items-center justify-between p-4 cursor-pointer ${expandedPhase === phase.id ? 'bg-gray-100' : 'bg-white'}`}
              onClick={() => togglePhase(phase.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center">
                  <Zap size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{phase.name}</h3>
                  <p className="text-sm text-gray-500">{phase.timeframe}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">33% Complete</span>
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full" style={{ width: '33%' }}></div>
                </div>
                {expandedPhase === phase.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
            </div>

            {expandedPhase === phase.id && (
              <div className="border-t border-gray-200">
                <div className="p-4 bg-gray-50">
                  <p className="text-sm text-gray-600">{phase.description}</p>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {phase.months.map(month => (
                    <div key={month.id}>
                      <div 
                        className={`flex items-center justify-between p-4 pl-8 cursor-pointer ${expandedMonth === month.id ? 'bg-blue-50' : 'bg-white'}`}
                        onClick={() => toggleMonth(month.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
                            <Calendar size={14} />
                          </div>
                          <h4 className="font-medium">{month.name}</h4>
                        </div>
                        {expandedMonth === month.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>

                      {expandedMonth === month.id && (
                        <div className="bg-white p-2">
                          <div className="border border-gray-200 rounded-md overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Checkpoint</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {month.weeks.map(week => (
                                  <tr key={week.id}>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      <div className="flex items-center">
                                        {getStatusIcon(checkpoints[week.id]?.status || 'notStarted')}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2">
                                      <div className="text-sm text-gray-900">{week.name}</div>
                                      {checkpoints[week.id]?.notes && (
                                        <div className="text-xs text-gray-500">{checkpoints[week.id].notes}</div>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-sm">
                                      <div className="flex gap-2">
                                        <button 
                                          className="p-1 text-gray-500 hover:text-green-600"
                                          onClick={() => updateCheckpointStatus(week.id, 'completed')}
                                        >
                                          <CheckCircle size={16} />
                                        </button>
                                        <button 
                                          className="p-1 text-gray-500 hover:text-blue-600"
                                          onClick={() => updateCheckpointStatus(week.id, 'inProgress')}
                                        >
                                          <Clock size={16} />
                                        </button>
                                        <button 
                                          className="p-1 text-gray-500 hover:text-orange-600"
                                          onClick={() => updateCheckpointStatus(week.id, 'atRisk')}
                                        >
                                          <AlertTriangle size={16} />
                                        </button>
                                        <button className="p-1 text-gray-500 hover:text-indigo-600">
                                          <FileText size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="text-indigo-600" />
          <h3 className="font-semibold">Implementation Progress Overview</h3>
        </div>
        <div className="flex gap-4">
          <div className="flex-1 p-3 bg-white rounded-md shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Overall Progress</div>
            <div className="text-2xl font-bold text-gray-800">23%</div>
            <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: '23%' }}></div>
            </div>
          </div>
          <div className="flex-1 p-3 bg-white rounded-md shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Phase 1 Progress</div>
            <div className="text-2xl font-bold text-gray-800">33%</div>
            <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
              <div className="h-full bg-purple-600 rounded-full" style={{ width: '33%' }}></div>
            </div>
          </div>
          <div className="flex-1 p-3 bg-white rounded-md shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Current Phase ETA</div>
            <div className="text-xl font-bold text-gray-800">12 days</div>
            <div className="text-xs text-gray-500 mt-1">Ahead of schedule by 2 days</div>
          </div>
        </div>
      </div>

      {/* AI APIs Connection Modal */}
      {apiModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-3/4 max-w-3xl max-h-3/4 overflow-auto">
            <div className="border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">AI Service Connections</h2>
              <button onClick={() => setApiModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Connect AI services to enhance your development process. These services will provide automated assistance, code generation, and intelligent insights throughout your project lifecycle.
                </p>
                
                <div className="flex flex-wrap gap-3 mb-4">
                  <button className="px-3 py-2 bg-green-600 text-white rounded-md flex items-center gap-2">
                    <PlusCircle size={16} />
                    <span>Add New Connection</span>
                  </button>
                  <button className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md flex items-center gap-2">
                    <Settings size={16} />
                    <span>Connection Settings</span>
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Bot className="text-indigo-600" size={18} />
                  Connected AI Services
                </h3>
                
                <div className="overflow-hidden border border-gray-200 rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Sync</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {connectedApis.map(api => (
                        <tr key={api.id}>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center mr-3">
                                {api.type === 'llm' ? <Bot size={16} /> : <Code size={16} />}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{api.name}</div>
                                <div className="text-xs text-gray-500">API ID: {api.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                              {api.type === 'llm' ? 'Large Language Model' : 'Natural Language Processing'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <span className="h-2 w-2 rounded-full bg-green-500 mr-1"></span>
                              {api.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{api.lastSync}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex space-x-2">
                              <button className="p-1 text-gray-400 hover:text-indigo-600">
                                <RefreshCw size={16} />
                              </button>
                              <button className="p-1 text-gray-400 hover:text-indigo-600">
                                <Settings size={16} />
                              </button>
                              <button className="p-1 text-gray-400 hover:text-red-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Terminal className="text-indigo-600" size={18} />
                  API Configuration
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://api.youraiprovider.com/v1/"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                    <div className="flex">
                      <input 
                        type="password" 
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter your API key"
                      />
                      <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-r-md">
                        Show
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AI Service Type</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option>Large Language Model (LLM)</option>
                      <option>Code Generation</option>
                      <option>Natural Language Processing</option>
                      <option>Data Analysis</option>
                      <option>Custom AI Service</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Integration Points</label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input type="checkbox" id="checkpoint-generation" className="h-4 w-4 text-indigo-600" checked />
                        <label htmlFor="checkpoint-generation" className="ml-2 text-sm text-gray-700">Checkpoint Generation</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="code-review" className="h-4 w-4 text-indigo-600" checked />
                        <label htmlFor="code-review" className="ml-2 text-sm text-gray-700">Code Review</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="timeline-optimization" className="h-4 w-4 text-indigo-600" checked />
                        <label htmlFor="timeline-optimization" className="ml-2 text-sm text-gray-700">Timeline Optimization</label>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" id="risk-detection" className="h-4 w-4 text-indigo-600" />
                        <label htmlFor="risk-detection" className="ml-2 text-sm text-gray-700">Risk Detection & Mitigation</label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition">
                      Connect & Test API
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCheckpointUI;