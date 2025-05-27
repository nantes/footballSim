
import React from 'react';
import { Player, PlayerAttributes, PreferredPosition, PlayerTrait, AVAILABLE_PLAYER_TRAITS, PlayerTraitId, Injury } from '../types';
import { PlayerIcon, StarIcon as TraitIcon, GlobeAltIcon, HeartIcon } from '../constants'; 

interface PlayerAttributesCardProps {
  player: Player | null;
}

const AttributeItem: React.FC<{ label: string; value: string | number; isPositive?: boolean; isNegative?: boolean; maxValue?: number; isCurrency?: boolean; icon?: React.ElementType; isStarRating?: boolean; maxStars?: number }> = 
    ({ label, value, isPositive, isNegative, maxValue, isCurrency, icon: Icon, isStarRating, maxStars = 5 }) => {
  
  const barPercentage = maxValue && typeof value === 'number' && !isStarRating ? (value / maxValue) * 100 : 0;
  let barColor = 'bg-blue-500';
  if (isPositive) barColor = 'bg-green-500';
  if (isNegative) barColor = 'bg-red-500';
  
  if (maxValue && !isCurrency && !isStarRating) { 
    if (typeof value === 'number') {
      if (value < maxValue * 0.4) barColor = 'bg-red-500';
      else if (value < maxValue * 0.7) barColor = 'bg-yellow-500';
      else barColor = 'bg-green-500';
    }
  }

  const displayValue = isCurrency && typeof value === 'number' ? `$${value.toLocaleString()}` : value;

  const renderStars = () => {
    if (!isStarRating || typeof value !== 'number') return null;
    const stars = [];
    for (let i = 1; i <= maxStars; i++) {
      stars.push(
        <TraitIcon 
          key={i} 
          className={`h-4 w-4 ${i <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
        />
      );
    }
    return <div className="flex">{stars}</div>;
  };

  return (
    <div className="mb-2">
      <div className="flex justify-between items-center text-sm mb-1">
        <span className="font-medium text-gray-600 flex items-center">
            {Icon && <Icon className="h-4 w-4 mr-1.5 text-gray-500" />}
            {label}
        </span>
        {isStarRating ? renderStars() : (
            <span className={`font-semibold ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-800'}`}>
                {displayValue} {maxValue && typeof value === 'number' && !isCurrency ? `/ ${maxValue}` : ''}
            </span>
        )}
      </div>
      {maxValue && typeof value === 'number' && !isCurrency && !isStarRating && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${barPercentage}%` }}></div>
        </div>
      )}
    </div>
  );
};

const UnlockedTraitItem: React.FC<{ trait: PlayerTrait }> = ({ trait }) => {
  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-2 shadow-sm">
        <div className="flex items-center">
            <TraitIcon className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
            <h4 className="text-md font-semibold text-blue-700">{trait.name}</h4>
        </div>
      <p className="text-xs text-gray-600 mt-1 italic">{trait.description}</p>
      {trait.effectDescription && <p className="text-xs text-blue-600 mt-1">{trait.effectDescription}</p>}
    </div>
  );
};

const InjuryDisplay: React.FC<{ injury: Injury }> = ({ injury }) => {
  return (
    <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md shadow-sm">
      <h3 className="text-lg font-semibold text-red-700 mb-2 flex items-center">
        <HeartIcon className="h-6 w-6 mr-2 text-red-500" />
        Current Injury
      </h3>
      <p className="text-sm text-red-600"><strong>Type:</strong> {injury.type} ({injury.severity})</p>
      <p className="text-sm text-red-600"><strong>Description:</strong> {injury.description}</p>
      <p className="text-sm text-red-600"><strong>Duration:</strong> {injury.weeksRemaining} weeks remaining (out of {injury.durationWeeks})</p>
      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
        <div className="bg-red-400 h-2.5 rounded-full" style={{ width: `${injury.recoveryProgress}%` }}></div>
      </div>
      <p className="text-xs text-red-500 text-right mt-1">{injury.recoveryProgress}% Recovered</p>
    </div>
  );
};


const PlayerAttributesCard: React.FC<PlayerAttributesCardProps> = ({ player }) => {
  if (!player) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-6 text-center text-gray-500">
        No player data available.
      </div>
    );
  }

  const { name, attributes, preferredPosition, unlockedTraits, weeklyWage, contractExpirySeason, managerRelationship, nationality, internationalCaps, internationalGoals, currentInjury, preferredFoot, currentKitNumber } = player;

  const coreSkills = [
    { label: 'Shooting', value: attributes.shooting, keyVal: 'shooting' },
    { label: 'Passing', value: attributes.passing, keyVal: 'passing' },
    { label: 'Tackling', value: attributes.tackle, keyVal: 'tackle' },
    { label: 'Heading', value: attributes.heading, keyVal: 'heading' },
    { label: 'Skill', value: attributes.skill, keyVal: 'skill' }, // General skill
    { label: 'Speed', value: attributes.speed, keyVal: 'speed' },
  ];
  if (preferredPosition === PreferredPosition.GOALKEEPER) {
    coreSkills.unshift({ label: 'Goalkeeping', value: attributes.goalkeeping, keyVal: 'goalkeeping' });
  }
  
  const mentalPhysical = [
    { label: 'Morale', value: attributes.morale, keyVal: 'morale', maxValue: 100 },
    { label: 'Stamina', value: attributes.stamina, keyVal: 'stamina', maxValue: 100 },
    { label: 'Form', value: attributes.form, keyVal: 'form', maxValue: 100 },
  ];

  const generalInfo = [
    { label: 'Age', value: attributes.age, keyVal: 'age' },
    { label: 'Value', value: attributes.value, keyVal: 'value', isCurrency: true },
    { label: 'Position', value: preferredPosition, keyVal: 'position' },
    { label: 'Kit Number', value: currentKitNumber !== null ? currentKitNumber : 'N/A', keyVal: 'kit'},
    { label: 'Preferred Foot', value: preferredFoot, keyVal: 'foot'},
    { label: 'Skill Moves', value: attributes.skillMoves, keyVal: 'skillmoves', isStarRating: true, maxStars: 5 },
    { label: 'Weak Foot Accuracy', value: attributes.weakFootAccuracy, keyVal: 'weakfoot', isStarRating: true, maxStars: 5 },
  ];

  const contractInfo = [
     { label: 'Weekly Wage', value: weeklyWage, keyVal: 'wage', isCurrency: true },
     { label: 'Contract Ends After Season', value: contractExpirySeason, keyVal: 'contract' },
  ];
  
  const socialInfo = [
    { label: 'Press Relations', value: attributes.pressRelations, keyVal: 'press', maxValue: 100 },
    { label: 'Fan Support', value: attributes.fanSupport, keyVal: 'fans', maxValue: 100 },
    { label: 'Reputation', value: attributes.reputation, keyVal: 'reputation', maxValue: 100 },
    { label: 'Manager Relationship', value: managerRelationship, keyVal: 'managerRel', maxValue: 100 },
  ];

  const internationalInfo = [
    { label: 'Nationality', value: nationality, keyVal: 'nationality', icon: GlobeAltIcon },
    { label: 'Int. Caps', value: internationalCaps, keyVal: 'caps' },
    { label: 'Int. Goals', value: internationalGoals, keyVal: 'intgoals' },
  ];

  const displayedTraits = unlockedTraits
    .map(traitId => AVAILABLE_PLAYER_TRAITS.find(t => t.id === traitId))
    .filter(trait => trait !== undefined) as PlayerTrait[];


  return (
    <div className="bg-white shadow-lg rounded-xl p-6 max-w-md mx-auto">
      <div className="flex items-center mb-6">
        <PlayerIcon className="h-16 w-16 text-primary mr-4" />
        <div>
          <h2 className="text-3xl font-bold text-gray-800">{name}</h2>
          <p className="text-gray-600">{preferredPosition} {currentKitNumber !== null ? `(#${currentKitNumber})` : ''}</p>
        </div>
      </div>

      {currentInjury && <InjuryDisplay injury={currentInjury} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 mt-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-3">Core Skills</h3>
          {coreSkills.map(attr => (
            <AttributeItem key={attr.keyVal} label={attr.label} value={attr.value} maxValue={99} />
          ))}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-700 mb-3">Mental & Physical</h3>
          {mentalPhysical.map(attr => (
            <AttributeItem key={attr.keyVal} label={attr.label} value={attr.value} maxValue={attr.maxValue} />
          ))}
           <h3 className="text-xl font-semibold text-gray-700 mt-6 mb-3">General</h3>
          {generalInfo.map(attr => (
             <AttributeItem key={attr.keyVal} label={attr.label} value={attr.value} isCurrency={attr.isCurrency} isStarRating={attr.isStarRating} maxStars={attr.maxStars}/>
          ))}
        </div>
      </div>
      
      <div className="mt-6">
         <h3 className="text-xl font-semibold text-gray-700 mb-3">Contract Info</h3>
         {contractInfo.map(attr => (
            <AttributeItem key={attr.keyVal} label={attr.label} value={attr.value} isCurrency={attr.isCurrency}/>
         ))}
      </div>
      
      <div className="mt-6">
         <h3 className="text-xl font-semibold text-gray-700 mb-3">Social Standing</h3>
         {socialInfo.map(attr => (
            <AttributeItem key={attr.keyVal} label={attr.label} value={attr.value} maxValue={attr.maxValue} />
         ))}
      </div>

      <div className="mt-6">
         <h3 className="text-xl font-semibold text-gray-700 mb-3">International</h3>
         {internationalInfo.map(attr => (
            <AttributeItem key={attr.keyVal} label={attr.label} value={attr.value} icon={attr.icon} />
         ))}
      </div>

      {displayedTraits.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold text-gray-700 mb-3 flex items-center">
            <TraitIcon className="h-6 w-6 text-primary mr-2" />
            Unlocked Traits
          </h3>
          {displayedTraits.map(trait => (
            <UnlockedTraitItem key={trait.id} trait={trait} />
          ))}
        </div>
      )}

    </div>
  );
};

export default PlayerAttributesCard;
