import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trophy, Users, Calendar, Clock } from 'lucide-react';

const SportsCard = ({ title, children, collapsible = false, defaultExpanded = true, icon: Icon, frameless = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (frameless) {
    return (
      <div className="w-full">
        {(!collapsible || isExpanded) && children}
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {Icon && <Icon className="w-5 h-5 text-sky-400" />}
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        {collapsible && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-sky-400 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {(!collapsible || isExpanded) && (
        <div className="space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default SportsCard;
