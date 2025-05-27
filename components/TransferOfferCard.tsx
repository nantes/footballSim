
import React from 'react';
import { TransferOffer, Player, Team, GameState } from '../types';
import { CheckCircleIcon, XCircleIcon, BuildingLibraryIcon, CurrencyDollarIcon, CalendarDaysIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface TransferOfferCardProps {
  offer: TransferOffer;
  player: Player | null; // Current player viewing the offer
  currentTeam: Team | null; // Player's current team
  offeringTeam: Team | null; // Team making the offer
  onRespond: (offerId: string, response: 'accept' | 'reject') => void;
  isProcessing: boolean; // To disable buttons during action
}

const OfferDetail: React.FC<{icon: React.ElementType, label: string, value: string | number, strong?: boolean}> = ({icon: Icon, label, value, strong}) => (
    <div className="flex items-center text-sm text-gray-600 py-1">
        <Icon className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
        <span>{label}:</span>
        <span className={`ml-1 ${strong ? 'font-semibold text-gray-800' : ''}`}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
    </div>
);

const TransferOfferCard: React.FC<TransferOfferCardProps> = ({ offer, player, currentTeam, offeringTeam, onRespond, isProcessing }) => {
  if (!player || !offeringTeam) return <div className="p-4 border rounded-lg shadow-sm bg-gray-50 text-gray-500">Loading offer details...</div>;

  const handleAccept = () => {
    if (window.confirm(`Are you sure you want to accept the offer from ${offer.fromTeamName} and transfer for a fee of $${offer.transferFee.toLocaleString()}? Your new wage will be $${offer.offeredWage.toLocaleString()}/week.`)) {
        onRespond(offer.offerId, 'accept');
    }
  };
  
  const handleReject = () => {
    if (window.confirm(`Are you sure you want to reject the offer from ${offer.fromTeamName}?`)) {
        onRespond(offer.offerId, 'reject');
    }
  };

  const isOfferActionable = offer.status === 'PENDING_PLAYER_RESPONSE';

  return (
    <div className="p-4 border border-gray-300 rounded-lg shadow-md bg-white hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
            <h3 className="text-lg font-semibold text-primary">Offer from: {offer.fromTeamName}</h3>
            <p className="text-xs text-gray-500">Division: {offer.fromTeamDivision} | Reputation: {offeringTeam.reputation}</p>
        </div>
        {isOfferActionable && (
            <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">Pending</span>
        )}
        {offer.status === 'ACCEPTED_BY_PLAYER' && (
            <span className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-200 rounded-full">Accepted</span>
        )}
        {offer.status === 'REJECTED_BY_PLAYER' && (
            <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full">Rejected</span>
        )}
         {offer.status === 'EXPIRED' && (
            <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full">Expired</span>
        )}
         {offer.status === 'WITHDRAWN_BY_CLUB' && (
            <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full">Withdrawn</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mb-4">
        <OfferDetail icon={BuildingLibraryIcon} label="Current Club" value={currentTeam?.name || 'N/A'} />
        <OfferDetail icon={CurrencyDollarIcon} label="Transfer Fee" value={`$${offer.transferFee}`} strong />
        <OfferDetail icon={CurrencyDollarIcon} label="Offered Wage" value={`$${offer.offeredWage}/week`} strong />
        <OfferDetail icon={CalendarDaysIcon} label="Contract Length" value={`${offer.contractLengthYears} year(s)`} />
        <OfferDetail icon={CurrencyDollarIcon} label="Signing Bonus" value={`$${offer.signingBonus}`} />
        <OfferDetail icon={CalendarDaysIcon} label="Offer Expires" value={`Season ${offer.expiresOnSeason}, Week ${offer.expiresOnWeek}`} />
      </div>
      
      {offer.status === 'PENDING_PLAYER_RESPONSE' && (
        <div className="mt-4 flex space-x-3">
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors disabled:bg-gray-300 flex items-center justify-center"
          >
            <CheckCircleIcon className="h-5 w-5 mr-2"/> Accept
          </button>
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors disabled:bg-gray-300 flex items-center justify-center"
          >
            <XCircleIcon className="h-5 w-5 mr-2"/> Reject
          </button>
        </div>
      )}
       {offer.status !== 'PENDING_PLAYER_RESPONSE' && (
         <p className="text-sm text-gray-500 italic mt-2 text-center">This offer is no longer active.</p>
       )}
    </div>
  );
};

export default TransferOfferCard;
