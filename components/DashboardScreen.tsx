
import React from 'react';
import { Link } from 'react-router-dom';
import { GameState, TransferOfferStatus, Interaction, PlayerTacticalInstructionId, AVAILABLE_TACTICAL_INSTRUCTIONS } from '../types';
import PlayerAttributesCard from './PlayerAttributesCard';
import PlayerMatchPerformanceCard from './PlayerMatchPerformanceCard'; 
import { CalendarIcon, InformationCircleIcon, ChatBubbleLeftRightIcon as InteractionIcon, GlobeAltIcon, HeartIcon, AdjustmentsVerticalIcon } from '@heroicons/react/24/outline';
import { NextWeekIcon } from '../constants'; 


interface DashboardScreenProps {
  gameState: GameState | null;
  onAdvanceWeek: () => void;
  isAdvancingWeek: boolean;
  onSetTacticalInstruction: (instructionId: PlayerTacticalInstructionId | null) => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ gameState, onAdvanceWeek, isAdvancingWeek, onSetTacticalInstruction }) => {
  if (!gameState || !gameState.userPlayerId) {
    return <div className="text-center p-8">Loading game data or game not initialized...</div>;
  }

  const userPlayer = gameState.teams.flatMap(t => t.players).find(p => p.id === gameState.userPlayerId);
  const playerTeam = userPlayer ? gameState.teams.find(t => t.id === userPlayer.teamId) : null;

  const pendingOffersCount = gameState.pendingTransferOffers.filter(offer => offer.toPlayerId === gameState.userPlayerId && offer.status === 'PENDING_PLAYER_RESPONSE').length;
  const pendingInteractionsCount = gameState.pendingInteractions.filter(i => i.status === 'PENDING').length;
  const isInternationalWeek = gameState.internationalFixtureWeeks.includes(gameState.league.currentWeek);

  const handleTacticalInstructionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as PlayerTacticalInstructionId | "NONE_NULL"; // Handle "NONE_NULL" as a special case for clearing
    if (value === "NONE_NULL") {
      onSetTacticalInstruction(null);
    } else {
      onSetTacticalInstruction(value as PlayerTacticalInstructionId);
    }
  };
  
  const scrollbarStyles = `
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #cbd5e1; /* cool-gray-300 */
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #94a3b8; /* cool-gray-400 */
    }
  `;

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <button
          onClick={onAdvanceWeek}
          disabled={isAdvancingWeek || pendingInteractionsCount > 0 || (userPlayer?.currentInjury !== null && userPlayer?.currentInjury !== undefined) } 
          className="bg-accent hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center transition-colors duration-150 disabled:bg-gray-400 disabled:cursor-not-allowed"
          aria-live="polite"
          aria-atomic="true"
          title={pendingInteractionsCount > 0 ? "Please resolve pending interactions first." : (userPlayer?.currentInjury ? "Cannot advance week: Player is injured. Rest or use Physio via Training screen." : "Advance to next week")}
        >
          {isAdvancingWeek ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Advancing...
            </>
          ) : (
            <>
              <NextWeekIcon className="mr-2" /> Advance Week
            </>
          )}
        </button>
      </div>

      {userPlayer?.currentInjury && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow" role="alert">
          <div className="flex">
            <div className="py-1"><HeartIcon className="h-6 w-6 text-red-500 mr-3"/></div>
            <div>
              <p className="font-bold">Player Injured!</p>
              <p className="text-sm">
                {userPlayer.name} is currently suffering from a {userPlayer.currentInjury.severity.toLowerCase()} {userPlayer.currentInjury.type}. 
                ({userPlayer.currentInjury.weeksRemaining} weeks remaining). 
                Visit the <Link to="/training" className="font-medium underline hover:text-red-600">Training screen</Link> for Physio options.
              </p>
            </div>
          </div>
        </div>
      )}

      {pendingInteractionsCount > 0 && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow" role="alert">
          <div className="flex">
            <div className="py-1"><InteractionIcon className="h-6 w-6 text-yellow-500 mr-3"/></div>
            <div>
              <p className="font-bold">You have {pendingInteractionsCount} pending interaction{pendingInteractionsCount > 1 ? 's' : ''}!</p>
              <p className="text-sm">Please respond to continue. The interaction modal should be visible.</p>
            </div>
          </div>
        </div>
      )}

      {isInternationalWeek && (
        <div className="bg-indigo-100 border-l-4 border-indigo-500 text-indigo-700 p-4 rounded-md shadow" role="alert">
          <div className="flex">
            <div className="py-1"><GlobeAltIcon className="h-6 w-6 text-indigo-500 mr-3"/></div>
            <div>
              <p className="font-bold">International Break!</p>
              <p className="text-sm">Club matches are suspended. National teams may be in action.</p>
               {gameState.upcomingInternationalMatch && gameState.upcomingInternationalMatch.userPlayerInvolved && userPlayer && !userPlayer.currentInjury && (
                <p className="text-sm mt-1">
                    Your national team ({userPlayer.nationality}) is scheduled to play against {gameState.nationalTeams.find(nt => nt.id === gameState.upcomingInternationalMatch?.awayNationalTeamId)?.name || 'Opponent'} this week!
                </p>
              )}
               {userPlayer && userPlayer.currentInjury && userPlayer.isOnNationalTeam && (
                 <p className="text-sm mt-1 text-red-600">You will miss the international match due to injury.</p>
               )}
            </div>
          </div>
        </div>
      )}

      {pendingOffersCount > 0 && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md shadow mt-4" role="alert">
          <div className="flex">
            <div className="py-1"><InformationCircleIcon className="h-6 w-6 text-blue-500 mr-3"/></div>
            <div>
              <p className="font-bold">You have {pendingOffersCount} pending transfer offer{pendingOffersCount > 1 ? 's' : ''}!</p>
              <p className="text-sm">Visit the <Link to="/transfers" className="font-medium underline hover:text-blue-600">Transfers screen</Link> to review.</p>
            </div>
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
           <PlayerAttributesCard player={userPlayer || null} />
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <PlayerMatchPerformanceCard performance={userPlayer?.lastMatchPerformance || null} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white shadow-lg rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center">
                <CalendarIcon className="mr-2 text-primary" /> Current Status
              </h2>
              <p className="text-gray-600">Season: <span className="font-medium">{gameState.league.currentSeason}</span></p>
              <p className="text-gray-600">Week: <span className="font-medium">{gameState.league.currentWeek}</span></p>
              <p className="text-gray-600">Transfer Window: 
                <span className={`font-medium ml-1 px-2 py-0.5 rounded-full text-xs ${
                  gameState.transferWindowStatus === 'CLOSED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {gameState.transferWindowStatus.replace('_', ' ')}
                </span>
              </p>
              {playerTeam ? (
                <>
                  <p className="text-gray-600 mt-2">Team: <span className="font-medium">{playerTeam.name}</span></p>
                  <p className="text-gray-600">Division: <span className="font-medium">{playerTeam.division}</span></p>
                  <p className="text-gray-600">Team Chemistry: <span className="font-medium">{playerTeam.teamChemistry}/100</span></p>
                </>
              ) : (
                 <p className="text-gray-600 mt-2 font-semibold text-red-600">Currently without a club (Free Agent)</p>
              )}
              {userPlayer && userPlayer.isOnNationalTeam && !userPlayer.currentInjury && (
                <p className="text-gray-600 mt-1">Status: <span className="font-medium text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full text-xs">On National Team Duty ({userPlayer.nationality})</span></p>
              )}
            </div>

             <div className="bg-white shadow-lg rounded-xl p-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center">
                  <AdjustmentsVerticalIcon className="mr-2 text-primary h-6 w-6" /> Match Focus
                </h2>
                {userPlayer && !userPlayer.currentInjury ? (
                  <>
                    <label htmlFor="tactical-instruction" className="block text-sm font-medium text-gray-700 mb-1">
                      Current Instruction:
                    </label>
                    <select
                      id="tactical-instruction"
                      name="tactical-instruction"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
                      value={userPlayer.activeTacticalInstruction || "NONE_NULL"}
                      onChange={handleTacticalInstructionChange}
                      disabled={isAdvancingWeek}
                    >
                      {AVAILABLE_TACTICAL_INSTRUCTIONS.map(instr => (
                        <option key={instr.id} value={instr.id === PlayerTacticalInstructionId.NONE ? "NONE_NULL" : instr.id} title={instr.effectDescription}>
                          {instr.name} ({instr.category})
                        </option>
                      ))}
                    </select>
                    {userPlayer.activeTacticalInstruction && AVAILABLE_TACTICAL_INSTRUCTIONS.find(i => i.id === userPlayer.activeTacticalInstruction) && (
                      <p className="mt-2 text-xs text-gray-500 italic">
                        {AVAILABLE_TACTICAL_INSTRUCTIONS.find(i => i.id === userPlayer.activeTacticalInstruction)?.effectDescription}
                      </p>
                    )}
                     {userPlayer.activeTacticalInstruction === null && (
                      <p className="mt-2 text-xs text-gray-500 italic">
                        {AVAILABLE_TACTICAL_INSTRUCTIONS.find(i => i.id === PlayerTacticalInstructionId.NONE)?.effectDescription}
                      </p>
                    )}
                  </>
                ) : userPlayer?.currentInjury ? (
                   <p className="text-sm text-gray-500 italic">Cannot set match focus while injured.</p>
                ) : (
                  <p className="text-sm text-gray-500 italic">Loading player data...</p>
                )}
              </div>

            <div className="bg-white shadow-lg rounded-xl p-6 md:col-span-2">
              <h2 className="text-xl font-semibold text-gray-700 mb-3">Game Log</h2>
              <ul className="space-y-2 max-h-48 overflow-y-auto text-sm custom-scrollbar">
                {gameState.gameLog.map((entry, index) => (
                  <li key={index} className="text-gray-600 border-b border-gray-200 pb-1 last:border-b-0">
                    {entry}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
