import { useState } from 'react';

export default function Chatbot() {
  const [message, setMessage] = useState('');
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [messages, setMessages] = useState([]);
  const [aiStatus, setAiStatus] = useState({ 
    text: 'Researching', 
    state: 'researching',
    showSteps: ['researching'] 
  });
  const [showResponse, setShowResponse] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const updateStatus = async () => {
    setShowResponse(false);
    setIsExpanded(true);
    // Start with Researching
    setAiStatus({ 
      text: 'Researching', 
      state: 'researching',
      showSteps: ['researching']
    });
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Show Reasoning with R1
    setAiStatus({ 
      text: 'Reasoning with R1', 
      state: 'reasoning',
      showSteps: ['researching', 'reasoning']
    });
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Automatically fold after reasoning
    setIsExpanded(false);
    
    // Show Responded
    setAiStatus({ 
      text: 'Responded', 
      state: 'responded',
      showSteps: ['researching', 'reasoning', 'responded']
    });
    setShowResponse(true);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    setIsResponding(true);
    setMessages(prev => [...prev, { text: message, type: 'user' }]);
    
    try {
      const res = await fetch('/api/gpt4o', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      
      const data = await res.json();
      await updateStatus();
      
      // Make sure the response is properly formatted
      setResponses(prev => [...prev, { 
        response: data.response,
        timestamp: new Date().toISOString()
      }]);
      
      console.log('Response data:', data);
      console.log('Current responses:', responses);
      console.log('Show response:', showResponse);
      
    } catch (error) {
      console.error('Error:', error);
      // Add error handling UI here
    } finally {
      setIsLoading(false);
      setMessage('');
    }
  };

  return (
    <div className={`app-container ${isResponding ? 'split-layout' : ''}`}>
      <div className={`background-container ${isResponding ? 'sidebar' : ''}`}>
        <div className="header">
          <div className="logo">
            <span>Hello AI</span>
          </div>
          <div className="profile-icon">
            {/* Add profile icon here */}
          </div>
        </div>

        <div className="content">
          {!isResponding && (
            <>
              <h1>Hello!</h1>
              <h2>What would you like to know?</h2>
              <p className="subtitle">Use one of the most common prompts below<br />or use your own to begin</p>

              <div className="prompt-cards">
                <div className="card">
                  <span className="icon">📝</span>
                  <p>Write a to-do list for a personal project or task</p>
                </div>
                <div className="card">
                  <span className="icon">📧</span>
                  <p>Generate an email to job offer</p>
                </div>
                <div className="card">
                  <span className="icon">ℹ️</span>
                  <p>How does AI work in a technical capacity</p>
                </div>
              </div>
            </>
          )}

          {isResponding && (
            <div className="messages-container">
              {messages.map((msg, index) => (
                <div key={index} className="message user-message">
                  <span className="message-text">{msg.text}</span>
                  <img src="/usericon.png" alt="User" className="user-icon" />
                </div>
              ))}
            </div>
          )}

          <div className={`input-container ${isResponding ? 'bottom-fixed' : ''}`}>
            <input 
              type="text" 
              placeholder="Ask whatever you want" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button 
              className="send-button" 
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? '...' : '→'}
            </button>
          </div>
        </div>
      </div>

      {isResponding && (
        <div className="response-page">
          <div className="search-process-container">
            <div 
              className="process-header" 
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span className="process-title">Pro Search</span>
              <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
            </div>
            
            {isExpanded && (
              <div className="search-steps">
                {aiStatus.showSteps.includes('researching') && (
                  <div className="search-step">
                    <span className="step-title">Researching</span>
                  </div>
                )}

                {aiStatus.showSteps.includes('reasoning') && (
                  <div className="search-step">
                    <span className="step-title">Generating output</span>
                    <div className="step-details">
                      <div className="step-item">Beginning analysis</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="responses-container">
            <div className="responses-wrapper">
              {showResponse && responses.map((item, index) => (
                <div key={item.timestamp} className="ai-message">
                  <div className="ai-icon">
                    <img src="/usericon.png" alt="AI" />
                  </div>
                  <div className="ai-response-container">
                    <div className="ai-header">
                      <span className="ai-name">AI Assistant</span>
                      <span 
                        className="ai-status"
                        data-status={index === responses.length - 1 && !showResponse ? aiStatus.state : 'responded'}
                      >
                        {index === responses.length - 1 && !showResponse ? aiStatus.text : 'Responded'}
                      </span>
                    </div>
                    <div className="ai-content">
                      <pre>{item.response}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
