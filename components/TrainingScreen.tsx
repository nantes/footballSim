
import React from 'react';
import { Player, TrainingOption, AVAILABLE_TRAINING_OPTIONS, PreferredPosition } from '../types';
import PlayerAttributesCard from './PlayerAttributesCard';
import { TrainingIcon, HeartIcon } from '../constants';

interface TrainingScreenProps {
  player: Player | null;
  onTrainAttribute: (trainingId: TrainingOption['id']) => void;
}

const TrainingScreen: React.FC<TrainingScreenProps> = ({ player, onTrainAttribute }) => {
  if (!player) {
    return <div className="text-center p-8">Loading player data...</div>;
  }

  const isInjured = !!player.currentInjury;

  const availableOptions = AVAILABLE_TRAINING_OPTIONS.filter(opt => {
    if (isInjured) {
      return opt.id === 'stamina' || opt.id === 'physio'; // Only rest (stamina with cost 0) and physio if injured
    }
    if (opt.id === 'goalkeeping' && player.preferredPosition !== PreferredPosition.GOALKEEPER) {
      return false; 
    }
    if (opt.id === 'physio' && !isInjured) { // Don't show physio if not injured, unless for general recovery
        return false; // Or make it a very light stamina recovery option if desired
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Training Center</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <PlayerAttributesCard player={player} />
        </div>
        <div className="md:col-span-2 bg-white shadow-lg rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Choose a Training Drill</h2>
          
          {isInjured && player.currentInjury && (
            <div className="text-red-600 bg-red-100 p-3 rounded-md mb-4 border border-red-300">
              <p className="font-semibold">You are currently injured with a {player.currentInjury.type} ({player.currentInjury.severity}).</p>
              <p>Focus on recovery. Only Rest and Physio sessions are available.</p>
              <p>Weeks remaining: {player.currentInjury.weeksRemaining}</p>
            </div>
          )}

          {player.attributes.stamina < 20 && !isInjured && (
            <p className="text-yellow-600 bg-yellow-100 p-3 rounded-md mb-4 border border-yellow-300">Your stamina is low. Consider resting or light training.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableOptions.map((option) => {
              const disabledByInjury = isInjured && option.id !== 'stamina' && option.id !== 'physio';
              const disabledByStamina = !isInjured && player.attributes.stamina < (option.cost || 5) && option.id !== 'stamina';
              const isDisabled = disabledByInjury || disabledByStamina;

              return (
                <div key={option.id} className={`border rounded-lg p-4 transition-shadow ${isDisabled ? 'bg-gray-100 opacity-70' : 'bg-white hover:shadow-md'}`}>
                  <h3 className={`text-lg font-semibold ${option.id === 'physio' && isInjured ? 'text-red-600' : 'text-primary'}`}>{option.name}</h3>
                  <p className="text-sm text-gray-600 my-2">{option.description}</p>
                  <p className="text-xs text-gray-500">Improves: {option.id === 'physio' ? 'Recovery' : option.id}</p>
                  {option.id !== 'physio' && <p className="text-xs text-gray-500">Stamina Cost: {option.cost || (option.id === 'stamina' ? 0 : 5)}</p>}
                  
                  <button
                    onClick={() => onTrainAttribute(option.id)}
                    disabled={isDisabled}
                    className={`mt-3 w-full font-semibold py-2 px-4 rounded-md flex items-center justify-center transition-colors duration-150 
                                ${isDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                            : (option.id === 'physio' && isInjured ? 'bg-red-500 hover:bg-red-600 text-white' 
                                                                                : 'bg-accent hover:bg-green-600 text-white')}`}
                  >
                    {option.id === 'physio' && isInjured ? <HeartIcon className="mr-2 h-5 w-5" /> : <TrainingIcon className="mr-2 h-5 w-5" />}
                    {option.id === 'physio' && isInjured ? 'Physio Session' : 'Train'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingScreen;
