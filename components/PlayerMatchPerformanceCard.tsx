
import React from 'react';
import { PlayerMatchPerformance } from '../types';
import { StarIcon, ShieldCheckIcon, PaperAirplaneIcon, AdjustmentsHorizontalIcon, ForwardIcon, SunIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline'; // Using Heroicons

interface PlayerMatchPerformanceCardProps {
  performance: PlayerMatchPerformance | null;
}

const StatItem: React.FC<{ icon: React.ElementType, label: string, value: string | number, color?: string }> = ({ icon: Icon, label, value, color = "text-primary" }) => (
  <div className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
    <Icon className={`h-6 w-6 ${color}`} />
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-md font-semibold text-gray-800">{value}</p>
    </div>
  </div>
);

const RatingDisplay: React.FC<{ rating: number }> = ({ rating }) => {
  const getRatingColor = () => {
    if (rating >= 8) return 'text-green-500 bg-green-100';
    if (rating >= 6) return 'text-yellow-500 bg-yellow-100';
    return 'text-red-500 bg-red-100';
  };

  return (
    <div className={`p-3 rounded-lg text-center ${getRatingColor()}`}>
      <p className="text-sm font-medium">Match Rating</p>
      <p className="text-3xl font-bold">{rating.toFixed(1)} <span className="text-lg">/ 10</span></p>
    </div>
  );
};


const PlayerMatchPerformanceCard: React.FC<PlayerMatchPerformanceCardProps> = ({ performance }) => {
  if (!performance) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-6 text-center">
        <ChatBubbleBottomCenterTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Last Match Performance</h3>
        <p className="text-gray-500">No match data available yet. Play a match to see your performance.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-6">
      <h3 className="text-2xl font-bold text-gray-800 mb-4">Last Match Performance</h3>
      
      <RatingDisplay rating={performance.rating} />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-6">
        <StatItem icon={ForwardIcon} label="Goals" value={performance.goals} color="text-blue-500" />
        <StatItem icon={AdjustmentsHorizontalIcon} label="Assists" value={performance.assists} color="text-teal-500" />
        <StatItem icon={SunIcon} label="Shots (On Target)" value={`${performance.shots} (${performance.shotsOnTarget})`} color="text-orange-500"/>
        <StatItem icon={ShieldCheckIcon} label="Tackles (Won)" value={`${performance.tacklesWon}/${performance.tacklesAttempted}`} color="text-red-500" />
        <StatItem icon={PaperAirplaneIcon} label="Key Passes" value={performance.keyPasses} color="text-indigo-500"/>
        <StatItem icon={StarIcon} label="Interceptions" value={performance.interceptions} color="text-purple-500"/>
      </div>

      <div>
        <h4 className="text-lg font-semibold text-gray-700 mb-2 flex items-center">
            <ChatBubbleBottomCenterTextIcon className="h-6 w-6 mr-2 text-primary" />
            Pundit's View
        </h4>
        {performance.narrativeSummary === "Match summary generation is currently unavailable." || performance.narrativeSummary === "Could not retrieve detailed match summary at this time." ? (
          <p className="text-sm text-gray-500 italic bg-yellow-50 p-3 rounded-md">{performance.narrativeSummary} (Ensure API Key is configured for AI summaries)</p>
        ) : performance.narrativeSummary.includes("Loading summary...") ? (
           <div className="flex items-center text-sm text-gray-500 italic">
             <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            {performance.narrativeSummary}
           </div>
        ): (
          <p className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-md border-l-4 border-primary">{performance.narrativeSummary}</p>
        )}
      </div>
    </div>
  );
};

export default PlayerMatchPerformanceCard;
