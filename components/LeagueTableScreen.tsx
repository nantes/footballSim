
import React, { useState } from 'react';
import { GameState, Team, DivisionName, DIVISION_NAMES_ORDERED } from '../types';
import { ChevronUpIcon, ChevronDownIcon } from '../constants';

interface LeagueTableScreenProps {
  gameState: GameState | null;
}

const LeagueTableScreen: React.FC<LeagueTableScreenProps> = ({ gameState }) => {
  const [expandedDivision, setExpandedDivision] = useState<DivisionName | null>(
    gameState?.teams.find(t => t.id === gameState.teams.flatMap(tm => tm.players).find(p => p.id === gameState.userPlayerId)?.teamId)?.division || DIVISION_NAMES_ORDERED[DIVISION_NAMES_ORDERED.length -1]
  );

  if (!gameState) {
    return <div className="text-center p-8">Loading league data...</div>;
  }

  const toggleDivision = (divisionName: DivisionName) => {
    setExpandedDivision(expandedDivision === divisionName ? null : divisionName);
  };
  
  const renderTeamRow = (team: Team, index: number, userPlayerTeamId: string | null | undefined) => {
    const isUserTeam = team.id === userPlayerTeamId;
    return (
      <tr key={team.id} className={`${isUserTeam ? 'bg-blue-100 font-semibold' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')} hover:bg-gray-100 transition-colors`}>
        <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
        <td className="px-4 py-3 text-sm text-gray-900">{team.name}</td>
        <td className="px-4 py-3 text-sm text-gray-700 text-center">{team.matchesPlayed}</td>
        <td className="px-4 py-3 text-sm text-gray-700 text-center">{team.wins}</td>
        <td className="px-4 py-3 text-sm text-gray-700 text-center">{team.draws}</td>
        <td className="px-4 py-3 text-sm text-gray-700 text-center">{team.losses}</td>
        <td className="px-4 py-3 text-sm text-gray-700 text-center">{team.goalsFor}</td>
        <td className="px-4 py-3 text-sm text-gray-700 text-center">{team.goalsAgainst}</td>
        <td className="px-4 py-3 text-sm text-gray-700 text-center">{team.goalsFor - team.goalsAgainst}</td>
        <td className="px-4 py-3 text-sm text-gray-900 font-bold text-center">{team.points}</td>
      </tr>
    );
  };
  
  const userPlayerTeamId = gameState.teams.flatMap(t => t.players).find(p => p.id === gameState.userPlayerId)?.teamId;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">League Standings</h1>
      
      {DIVISION_NAMES_ORDERED.map((divisionName) => {
        const teamsInDivision = gameState.teams
          .filter(team => team.division === divisionName)
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            const gdA = a.goalsFor - a.goalsAgainst;
            const gdB = b.goalsFor - b.goalsAgainst;
            if (gdB !== gdA) return gdB - gdA;
            return b.goalsFor - a.goalsFor;
          });

        if (teamsInDivision.length === 0 && divisionName !== expandedDivision) return null; // Don't show empty divisions unless it's the one we want to see (e.g. player's)

        return (
          <div key={divisionName} className="bg-white shadow-lg rounded-xl overflow-hidden">
            <button
              onClick={() => toggleDivision(divisionName)}
              className="w-full flex justify-between items-center p-4 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <h2 className="text-xl font-semibold text-primary">{divisionName}</h2>
              {expandedDivision === divisionName ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </button>

            {expandedDivision === divisionName && (
              <div className="overflow-x-auto">
                {teamsInDivision.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pos</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">MP</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">W</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">D</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">L</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">GF</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">GA</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">GD</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teamsInDivision.map((team, index) => renderTeamRow(team, index, userPlayerTeamId))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-4 text-gray-500">No teams currently in this division.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LeagueTableScreen;
