
import React, { useState } from 'react';
import { CustomPlayerData, PreferredPosition, PreferredFootType, AVAILABLE_NATIONALITIES } from '../types';
import { StarIcon as EmptyStarIcon } from '@heroicons/react/24/outline';
import { StarIcon as FilledStarIcon } from '@heroicons/react/24/solid';


interface PlayerCreationScreenProps {
  onPlayerCreated: (data: CustomPlayerData) => void;
}

const StarRatingInput: React.FC<{ label: string; value: number; onChange: (value: number) => void; maxStars?: number }> = ({ label, value, onChange, maxStars = 5 }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex space-x-1">
        {[...Array(maxStars)].map((_, index) => {
          const starValue = index + 1;
          return (
            <button
              key={starValue}
              type="button"
              onClick={() => onChange(starValue)}
              className={`p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 ${
                starValue <= value ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
              }`}
              aria-label={`Set rating to ${starValue}`}
            >
              {starValue <= value ? <FilledStarIcon className="h-6 w-6" /> : <EmptyStarIcon className="h-6 w-6" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const PlayerCreationScreen: React.FC<PlayerCreationScreenProps> = ({ onPlayerCreated }) => {
  const [name, setName] = useState('');
  const [preferredPosition, setPreferredPosition] = useState<PreferredPosition>(PreferredPosition.FORWARD);
  const [preferredFoot, setPreferredFoot] = useState<PreferredFootType>('Right');
  const [nationality, setNationality] = useState<string>(AVAILABLE_NATIONALITIES[0]);
  const [preferredKitNumber, setPreferredKitNumber] = useState<string>('');
  const [skillMoves, setSkillMoves] = useState<number>(2); // Default 2 stars
  const [weakFootAccuracy, setWeakFootAccuracy] = useState<number>(2); // Default 2 stars

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
        alert("Player name cannot be empty.");
        return;
    }
    const kitNumber = preferredKitNumber ? parseInt(preferredKitNumber, 10) : null;
    if (kitNumber !== null && (isNaN(kitNumber) || kitNumber < 1 || kitNumber > 99)) {
        alert("Preferred kit number must be between 1 and 99, or left empty.");
        return;
    }

    onPlayerCreated({
      name: name.trim(),
      preferredPosition,
      preferredFoot,
      nationality,
      preferredKitNumber: kitNumber,
      skillMoves,
      weakFootAccuracy,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Create Your Player</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Player Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., Lionel Messi Jr."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="preferredPosition" className="block text-sm font-medium text-gray-700">Preferred Position</label>
              <select
                id="preferredPosition"
                value={preferredPosition}
                onChange={(e) => setPreferredPosition(e.target.value as PreferredPosition)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                {Object.values(PreferredPosition).map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="preferredFoot" className="block text-sm font-medium text-gray-700">Preferred Foot</label>
              <select
                id="preferredFoot"
                value={preferredFoot}
                onChange={(e) => setPreferredFoot(e.target.value as PreferredFootType)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="Right">Right</option>
                <option value="Left">Left</option>
                <option value="Ambidextrous">Ambidextrous</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">Nationality</label>
              <select
                id="nationality"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                {AVAILABLE_NATIONALITIES.sort().map(nat => (
                  <option key={nat} value={nat}>{nat}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="preferredKitNumber" className="block text-sm font-medium text-gray-700">Preferred Kit Number (1-99)</label>
              <input
                type="number"
                id="preferredKitNumber"
                value={preferredKitNumber}
                onChange={(e) => setPreferredKitNumber(e.target.value)}
                min="1"
                max="99"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., 10 (Optional)"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
             <StarRatingInput label="Skill Moves (1-5 Stars)" value={skillMoves} onChange={setSkillMoves} />
             <StarRatingInput label="Weak Foot Accuracy (1-5 Stars)" value={weakFootAccuracy} onChange={setWeakFootAccuracy} />
          </div>


          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-accent hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            Start Career
          </button>
        </form>
      </div>
    </div>
  );
};

export default PlayerCreationScreen;
