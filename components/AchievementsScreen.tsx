
import React from 'react';
import { GameState, Award, AwardType, Player, DivisionName, AwardIdBase } from '../types';
import { TrophyIcon, CalendarDaysIcon, ShieldCheckIcon, ArrowUpCircleIcon, IdentificationIcon, SparklesIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface AchievementsScreenProps {
  gameState: GameState | null;
}

const AwardCard: React.FC<{ award: Award }> = ({ award }) => {
  let icon = <TrophyIcon className="h-8 w-8 text-yellow-500" />;
  if (award.type === AwardType.CAREER_MILESTONE) {
    if (award.awardIdBase === AwardIdBase.CAREER_INTERNATIONAL_CAPS_MILESTONE || award.awardIdBase === AwardIdBase.CAREER_INTERNATIONAL_GOALS_MILESTONE) {
        icon = <GlobeAltIcon className="h-8 w-8 text-cyan-500" />;
    } else {
        icon = <SparklesIcon className="h-8 w-8 text-indigo-500" />;
    }
  } else if (award.type === AwardType.SEASONAL_INTERNATIONAL) {
    icon = <GlobeAltIcon className="h-8 w-8 text-blue-500" />;
  }


  return (
    <div className="bg-white shadow-md rounded-lg p-4 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start">
        <div className="mr-4 flex-shrink-0">{icon}</div>
        <div>
          <h3 className="text-md font-semibold text-primary">{award.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{award.description}</p>
          <div className="mt-2 text-xs text-gray-500">
            <span>Achieved: Season {award.seasonAchieved}</span>
            {award.divisionAchievedIn && <span className="ml-2">({award.divisionAchievedIn})</span>}
            {award.nationality && <span className="ml-2">({award.nationality})</span>}
            {award.value && <span className="ml-2">| Value: {award.value}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ gameState }) => {
  if (!gameState || !gameState.userPlayerId) {
    return <div className="text-center p-8">Loading achievements data...</div>;
  }

  const userPlayer = gameState.teams.flatMap(t => t.players).find(p => p.id === gameState.userPlayerId);

  if (!userPlayer) {
    return <div className="text-center p-8">Player data not found.</div>;
  }

  const seasonalAwards = userPlayer.awards.filter(a => a.type === AwardType.SEASONAL_LEAGUE || a.type === AwardType.SEASONAL_TEAM || a.type === AwardType.SEASONAL_INTERNATIONAL)
    .sort((a,b) => b.seasonAchieved - a.seasonAchieved || a.name.localeCompare(b.name));
  const careerMilestones = userPlayer.awards.filter(a => a.type === AwardType.CAREER_MILESTONE)
    .sort((a,b) => b.seasonAchieved - a.seasonAchieved || a.name.localeCompare(b.name)); 

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800 flex items-center">
        <TrophyIcon className="h-8 w-8 mr-3 text-primary" />
        Player Achievements & Awards
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Seasonal Awards Section */}
        <section className="bg-gray-50 p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
            <CalendarDaysIcon className="h-7 w-7 mr-2 text-green-500" />
            Seasonal Awards
          </h2>
          {seasonalAwards.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {seasonalAwards.map(award => <AwardCard key={award.id} award={award} />)}
            </div>
          ) : (
            <p className="text-gray-500 italic">No seasonal awards won yet. Keep performing well!</p>
          )}
        </section>

        {/* Career Milestones Section */}
        <section className="bg-gray-50 p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
            <IdentificationIcon className="h-7 w-7 mr-2 text-blue-500" />
            Career Milestones
          </h2>
          {careerMilestones.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {careerMilestones.map(award => <AwardCard key={award.id} award={award} />)}
            </div>
          ) : (
            <p className="text-gray-500 italic">No career milestones achieved yet. Your journey continues!</p>
          )}
        </section>
      </div>
        <style dangerouslySetInnerHTML={{ __html: `
            .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
            background: #f9fafb; /* gray-50 */
            border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #d1d5db; /* gray-300 */
            border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #9ca3af; /* gray-400 */
            }
        ` }} />
    </div>
  );
};

export default AchievementsScreen;
