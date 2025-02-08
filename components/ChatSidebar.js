import { motion } from 'framer-motion';
import { useState } from 'react';

const ChatSidebar = ({ chatSessions, currentSessionId, onNewChat, onSelectChat, onRenameSession, onDeleteSession, isCollapsed, onToggle }) => {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [showOptions, setShowOptions] = useState(null);

  const handleDoubleClick = (session, e) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title || 'New Chat');
  };

  const handleTitleChange = (e) => {
    setEditTitle(e.target.value);
  };

  const handleTitleSubmit = (sessionId, e) => {
    e.preventDefault();
    if (editTitle.trim()) {
      onRenameSession(sessionId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleBlur = (sessionId) => {
    if (editTitle.trim()) {
      onRenameSession(sessionId, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleOptionsClick = (e, sessionId) => {
    e.stopPropagation();
    setShowOptions(showOptions === sessionId ? null : sessionId);
  };

  const handleDeleteClick = (e, sessionId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat?')) {
      onDeleteSession(sessionId);
    }
    setShowOptions(null);
  };

  return (
    <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'w-12' : 'w-64'} h-full bg-transparent text-white border-r border-[#A1E3F9] overflow-y-auto flex flex-col relative`}>
      <button
        onClick={onToggle}
        className="absolute -right-3 top-4 p-1 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 z-20"
      >
        <svg 
          className={`w-4 h-4 text-gray-600 transform transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {!isCollapsed && (
        <>
          <div className="p-4">
            <button 
              onClick={onNewChat}
              className="w-full px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg border border-gray-200 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <span>New Chat</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {chatSessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-4 cursor-pointer transition-all duration-200 border-b border-pink-800/50 hover:bg-[#1f3a8a] hover:text-white backdrop-blur-sm ${currentSessionId === session.id ? 'bg-[#1f3a8a] text-white shadow-md' : 'hover:shadow-md'}`}
                onClick={() => onSelectChat(session.id)}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {editingId === session.id ? (
                      <form onSubmit={(e) => handleTitleSubmit(session.id, e)}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={handleTitleChange}
                          onBlur={() => handleBlur(session.id)}
                          onKeyDown={handleKeyDown}
                          className="w-full px-3 py-2 text-sm font-medium bg-[#D1F8EF] border border-pink-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent shadow-inner backdrop-blur-sm"
                          autoFocus
                        />
                      </form>
                    ) : (
                      <div 
                        onDoubleClick={(e) => handleDoubleClick(session, e)}
                        className={`text-sm font-semibold truncate font-inter ${currentSessionId === session.id ? 'text-white' : 'text-black hover:text-white'}`}
                      >
                        {session.title || 'New Chat'}
                      </div>
                    )}
                    <div className={`text-xs mt-1.5 font-medium font-inter ${currentSessionId === session.id ? 'text-white' : 'text-black hover:text-white'}`}>
                      {session.messages.length} messages • {session.timestamp}
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => handleOptionsClick(e, session.id)}
                      className="p-1.5 hover:bg-pink-300/30 rounded-full transition-all duration-200 hover:shadow-sm active:scale-95"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ChatSidebar;
