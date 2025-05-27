
import React, { useState } from 'react';
import { GameState, Player, Team, TransferOffer, TransferRequestStatus, DivisionName } from '../types';
import TransferOfferCard from './TransferOfferCard';
import { ArrowsRightLeftIcon, ClipboardDocumentCheckIcon, BellAlertIcon, BanknotesIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

interface TransfersScreenProps {
  gameState: GameState | null;
  onPlayerRequestTransfer: () => void;
  onRespondToOffer: (offerId: string, response: 'accept' | 'reject') => void;
}

const ContractInfoItem: React.FC<{icon: React.ElementType, label: string, value: string | number}> = ({icon: Icon, label, value}) => (
    <div className="flex items-center text-gray-700">
        <Icon className="h-5 w-5 text-primary mr-2"/>
        <span>{label}: <span className="font-semibold">{typeof value === 'number' ? (label.toLowerCase().includes("wage") || label.toLowerCase().includes("value") ? `$${value.toLocaleString()}`: value) : value}</span></span>
    </div>
);

const TransfersScreen: React.FC<TransfersScreenProps> = ({ gameState, onPlayerRequestTransfer, onRespondToOffer }) => {
  const [isProcessingOffer, setIsProcessingOffer] = useState(false);

  if (!gameState || !gameState.userPlayerId) {
    return <div className="text-center p-8">Loading transfer data...</div>;
  }

  const userPlayer = gameState.teams.flatMap(t => t.players).find(p => p.id === gameState.userPlayerId);
  const playerTeam = userPlayer && userPlayer.teamId ? gameState.teams.find(t => t.id === userPlayer.teamId) : null;

  if (!userPlayer) {
    return <div className="text-center p-8">Player data not found.</div>;
  }

  const pendingOffers = gameState.pendingTransferOffers.filter(
    offer => offer.toPlayerId === userPlayer.id && offer.status === 'PENDING_PLAYER_RESPONSE'
  );
  const pastOffers = gameState.pendingTransferOffers.filter(
    offer => offer.toPlayerId === userPlayer.id && offer.status !== 'PENDING_PLAYER_RESPONSE'
  );

  const handleRespond = async (offerId: string, response: 'accept' | 'reject') => {
    setIsProcessingOffer(true);
    onRespondToOffer(offerId, response); // This function should handle its own async nature if needed, or be quick.
    // No direct await here, App.tsx handles state update. GameService handles logic.
    // We might need a small delay or rely on gameState update to re-render.
    // For now, we assume onRespondToOffer updates state triggering re-render.
    // If gameService is async, App.tsx should handle that and this component will re-render.
    // A better UX would be to have the button show a spinner until gameState updates.
    // For now, we'll just set isProcessingOffer to false after a short timeout to re-enable buttons
    // in case the state update is not immediate or the offer is invalid (e.g. team cant afford)
    setTimeout(() => setIsProcessingOffer(false), 1000); // Simulate processing time
  };
  
  const canRequestTransfer = userPlayer.transferRequestStatus === TransferRequestStatus.NONE && playerTeam;


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <ArrowsRightLeftIcon className="h-8 w-8 mr-3 text-primary" />
          Transfer Center
        </h1>
        <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
            gameState.transferWindowStatus === 'CLOSED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
            Transfer Window: {gameState.transferWindowStatus.replace('_', ' ')}
        </div>
      </div>

      {/* Player Contract & Status */}
      <div className="bg-white shadow-lg rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Your Contract & Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <ContractInfoItem icon={BanknotesIcon} label="Current Club" value={playerTeam?.name || "Free Agent"} />
            <ContractInfoItem icon={BanknotesIcon} label="Division" value={playerTeam?.division || "N/A"} />
            <ContractInfoItem icon={BanknotesIcon} label="Weekly Wage" value={userPlayer.weeklyWage} />
            <ContractInfoItem icon={CalendarDaysIcon} label="Contract Ends After Season" value={userPlayer.contractExpirySeason} />
            <ContractInfoItem icon={BanknotesIcon} label="Market Value" value={userPlayer.attributes.value} />
        </div>
        <div className="mt-4 pt-4 border-t">
             <p className="text-sm text-gray-600 mb-1">Transfer Request Status: <span className="font-semibold text-primary">{userPlayer.transferRequestStatus}</span></p>
            {userPlayer.isTransferListedByClub && <p className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded-md">Your club has placed you on the transfer list.</p>}
            
            {canRequestTransfer && gameState.transferWindowStatus !== 'CLOSED' && (
                 <button 
                    onClick={onPlayerRequestTransfer}
                    className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors flex items-center"
                >
                    <ClipboardDocumentCheckIcon className="h-5 w-5 mr-2"/> Request Transfer
                </button>
            )}
             {!canRequestTransfer && playerTeam && (
                 <p className="text-sm text-gray-500 mt-2 italic">
                     {userPlayer.transferRequestStatus !== TransferRequestStatus.NONE ? "You have already interacted with the club regarding a transfer." : "Transfer requests can only be made when your status is 'None'."}
                 </p>
             )}
             {gameState.transferWindowStatus === 'CLOSED' && playerTeam && (
                  <p className="text-sm text-red-500 mt-2 italic">Transfer requests can only be made when the transfer window is open.</p>
             )}
             {!playerTeam && (
                <p className="text-sm text-green-600 font-semibold mt-2">You are currently a Free Agent. You can accept offers from any interested club.</p>
             )}
        </div>
      </div>

      {/* Pending Offers */}
      <div className="bg-white shadow-lg rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center">
            <BellAlertIcon className="h-6 w-6 mr-2 text-accent"/>
            Pending Transfer Offers ({pendingOffers.length})
        </h2>
        {pendingOffers.length > 0 ? (
          <div className="space-y-4">
            {pendingOffers.map(offer => {
               const offeringTeamDetails = gameState.teams.find(t => t.id === offer.fromTeamId);
               return (
                <TransferOfferCard 
                    key={offer.offerId} 
                    offer={offer} 
                    player={userPlayer}
                    currentTeam={playerTeam}
                    offeringTeam={offeringTeamDetails || null}
                    onRespond={handleRespond}
                    isProcessing={isProcessingOffer}
                />
               );
            })}
          </div>
        ) : (
          <p className="text-gray-500 italic">No pending transfer offers at the moment.</p>
        )}
      </div>
      
      {/* Past Offers - Optional */}
      {pastOffers.length > 0 && (
        <div className="bg-gray-50 shadow-md rounded-xl p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-600 mb-3">Offer History</h2>
          <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            {pastOffers.map(offer => {
               const offeringTeamDetails = gameState.teams.find(t => t.id === offer.fromTeamId);
               return (
                 <TransferOfferCard 
                    key={offer.offerId} 
                    offer={offer} 
                    player={userPlayer}
                    currentTeam={playerTeam}
                    offeringTeam={offeringTeamDetails || null}
                    onRespond={() => {}} // No action for past offers
                    isProcessing={true} // Disable buttons
                />
               );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransfersScreen;
