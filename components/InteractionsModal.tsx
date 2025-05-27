
import React from 'react';
import { Interaction, InteractionOption } from '../types';
import { ChatBubbleLeftRightIcon, Cog6ToothIcon, UserGroupIcon } from '@heroicons/react/24/outline'; // Example icons

interface InteractionsModalProps {
  interaction: Interaction;
  onOptionSelected: (interactionId: string, optionId: string) => void;
  onClose: () => void; // Allow closing the modal, though usually an option must be picked
}

const InteractionsModal: React.FC<InteractionsModalProps> = ({ interaction, onOptionSelected, onClose }) => {
  const getIconForType = (type: Interaction['type']) => {
    switch (type) {
      case 'MANAGER_TALK_FORM':
        return <UserGroupIcon className="h-8 w-8 text-primary" />;
      case 'MEDIA_INTERVIEW_POST_MATCH':
        return <ChatBubbleLeftRightIcon className="h-8 w-8 text-accent" />;
      default:
        return <Cog6ToothIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg transform transition-all">
        <div className="flex items-center mb-4">
          {getIconForType(interaction.type)}
          <h2 className="text-xl font-semibold text-gray-800 ml-3">
            {interaction.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h2>
        </div>

        <p className="text-gray-700 mb-6 whitespace-pre-line text-md leading-relaxed">
          {interaction.promptText}
        </p>

        <div className="space-y-3">
          {interaction.options.map((option) => (
            <button
              key={option.id}
              onClick={() => onOptionSelected(interaction.interactionId, option.id)}
              className="w-full text-left bg-gray-100 hover:bg-secondary hover:text-white text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-opacity-50 shadow-sm hover:shadow-md"
              aria-label={`Choose option: ${option.text}`}
            >
              {option.text}
            </button>
          ))}
        </div>
        
        {/* 
          Modal usually requires a choice. If explicit close is needed:
          <button 
            onClick={onClose}
            className="mt-6 w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-md transition-colors"
          >
            Dismiss
          </button> 
        */}
      </div>
    </div>
  );
};

export default InteractionsModal;