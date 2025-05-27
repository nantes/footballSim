
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { 
  Player, PlayerAttributes, Team, League, GameState, MatchResult, PreferredPosition, DivisionName, TrainingOption, NationalTeam, UpcomingInternationalMatch, Injury, InjurySeverity, PlayerTacticalInstructionId, PlayerTacticalInstruction,
  PlayerMatchPerformance, PlayerTrait, PlayerTraitId, TraitUnlockCondition, AVAILABLE_PLAYER_TRAITS, TransferOffer, TransferRequestStatus, TransferWindowStatus, TransferOfferStatus, PlayerSeasonStats, PlayerCareerStats, Award, AwardType, AwardIdBase, CAREER_MILESTONE_DEFINITIONS, CareerMilestoneDefinition,
  Interaction, InteractionType, InteractionOption, InteractionEffect, InteractionEffectTarget, AVAILABLE_TACTICAL_INSTRUCTIONS, CustomPlayerData, PreferredFootType,
  MAX_ATTRIBUTE_VALUE, MIN_ATTRIBUTE_VALUE_NPC_DEV, MAX_MORALE_FORM_STAMINA_REPUTATION, INITIAL_PLAYER_AGE, INITIAL_USER_PLAYER_NAME, 
  TEAMS_PER_DIVISION, DIVISION_NAMES_ORDERED, NPC_TEAM_NAMES_PREFIXES, NPC_TEAM_NAMES_SUFFIXES,
  NPC_PLAYER_FIRST_NAMES, NPC_PLAYER_LAST_NAMES, MIN_PLAYERS_PER_TEAM, MAX_PLAYERS_PER_TEAM, RETIREMENT_START_AGE,
  AVAILABLE_TRAINING_OPTIONS, WEEKS_PER_SEASON,
  TRANSFER_WINDOW_PRE_SEASON_START_WEEK, TRANSFER_WINDOW_PRE_SEASON_END_WEEK,
  TRANSFER_WINDOW_MID_SEASON_START_WEEK, TRANSFER_WINDOW_MID_SEASON_END_WEEK,
  INITIAL_PLAYER_REPUTATION, OFFER_EXPIRY_DURATION_WEEKS, PROMOTION_COUNT, RELEGATION_COUNT, INTERACTION_EXPIRY_DURATION_WEEKS,
  MIN_APPEARANCES_FOR_SEASONAL_AWARDS, YOUNG_PLAYER_AGE_LIMIT, AVAILABLE_NATIONALITIES, NATIONAL_TEAM_SQUAD_SIZE, MIN_REPUTATION_FOR_NATIONAL_CALL, INTERNATIONAL_FIXTURE_WEEKS_DEFAULT, NATIONAL_TEAM_SELECTION_MIN_FORM,
  INJURY_BASE_CHANCE_PER_MATCH, INJURY_CHANCE_STAMINA_FACTOR, INJURY_CHANCE_AGE_FACTOR, INJURY_DURATION_WEEKS, PHYSIO_RECOVERY_BOOST_CHANCE,
  getWageByDivision, getBaseReputationByDivision, getBaseBudgetByDivision
} from '../types';

let ai: GoogleGenAI | null = null;
if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} else {
  console.warn("API_KEY environment variable not set. Gemini API features will be disabled.");
}

const hasTrait = (player: Player, traitId: PlayerTraitId): boolean => {
  return player.unlockedTraits.includes(traitId);
};

const assignKitNumber = (player: Player, team: Team, preferredNumber?: number | null): { updatedPlayer: Player, updatedTeam: Team } => {
  let numberToAssign: number | null = null;
  const updatedUsedNumbers = [...team.usedKitNumbers];

  if (preferredNumber !== null && preferredNumber !== undefined && preferredNumber >= 1 && preferredNumber <= 99 && !updatedUsedNumbers.includes(preferredNumber)) {
    numberToAssign = preferredNumber;
  } else {
    // Attempt to assign common numbers for positions if no preferred or preferred is taken
    let positionBasedNumbers: number[] = [];
    if(player.isUserPlayer || !preferredNumber) { // Only suggest for user or if NPC has no preference set yet
        switch(player.preferredPosition) {
            case PreferredPosition.GOALKEEPER: positionBasedNumbers = [1]; break;
            case PreferredPosition.DEFENDER: positionBasedNumbers = [2,3,4,5,6]; break;
            case PreferredPosition.MIDFIELDER: positionBasedNumbers = [6,7,8,10,11]; break;
            case PreferredPosition.FORWARD: positionBasedNumbers = [7,9,10,11]; break;
        }
        for(const num of positionBasedNumbers) {
            if(!updatedUsedNumbers.includes(num)) {
                numberToAssign = num;
                break;
            }
        }
    }

    if (numberToAssign === null) { // Fallback to any available number
        for (let i = 1; i <= 99; i++) {
            if (!updatedUsedNumbers.includes(i)) {
            numberToAssign = i;
            break;
            }
        }
    }
  }

  if (numberToAssign !== null) {
    updatedUsedNumbers.push(numberToAssign);
  } else {
    // Extremely rare case: all 1-99 are taken. Assign a high number or handle error.
    numberToAssign = 100 + Math.floor(Math.random() * 100); // Placeholder if all are taken
    updatedUsedNumbers.push(numberToAssign);
  }


  return {
    updatedPlayer: { ...player, currentKitNumber: numberToAssign },
    updatedTeam: { ...team, usedKitNumbers: updatedUsedNumbers }
  };
};


const checkAndUnlockTraits = (player: Player, currentGameState: GameState): { updatedPlayer: Player, newLogEntries: string[] } => {
  const newLogEntries: string[] = [];
  let updatedPlayer = { ...player, unlockedTraits: [...player.unlockedTraits] };

  AVAILABLE_PLAYER_TRAITS.forEach(trait => {
    if (updatedPlayer.unlockedTraits.includes(trait.id)) return; 

    let conditionsMet = true;
    trait.unlockConditions.forEach(condition => {
      if (!conditionsMet) return; 

      switch (condition.type) {
        case 'attribute':
          if (updatedPlayer.attributes[condition.attribute] < condition.threshold) {
            conditionsMet = false;
          }
          break;
        case 'milestone_season_stats':
          if (updatedPlayer.stats[condition.stat] < condition.threshold) {
            conditionsMet = false;
          }
          break;
        default:
          conditionsMet = false; 
      }
    });

    if (conditionsMet) {
      updatedPlayer.unlockedTraits.push(trait.id);
      newLogEntries.push(`${player.name} has unlocked a new trait: ${trait.name}! (${trait.description})`);
      const { updatedPlayer: playerAfterAchievement, newLogEntries: achievementLogs } = checkAndGrantCareerAchievements(updatedPlayer, currentGameState, AwardIdBase.CAREER_TRAITS_UNLOCKED_MILESTONE);
      updatedPlayer = playerAfterAchievement;
      newLogEntries.push(...achievementLogs);
    }
  });

  return { updatedPlayer, newLogEntries };
};


const generateRandomAttribute = (min: number = 30, max: number = 70): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const calculateNpcPlayerValue = (attributes: PlayerAttributes, division: DivisionName): number => {
  let value = 0;
  const keySkillsAverage = (attributes.skill + attributes.passing + attributes.shooting + attributes.tackle + attributes.speed + attributes.heading) / 6;
  
  value = (keySkillsAverage * 500) + (attributes.reputation * 1000) + (attributes.skillMoves * 2000) + (attributes.weakFootAccuracy * 1000); 
  
  if (attributes.age < 22) value *= (1.5 - (attributes.age - 16) * 0.05); 
  else if (attributes.age > 32) value *= (0.8 - (attributes.age - 32) * 0.07); 
  else if (attributes.age > 28) value *= 0.9; 

  const divIndex = DIVISION_NAMES_ORDERED.indexOf(division);
  const maxDivIndex = DIVISION_NAMES_ORDERED.length - 1;
  value *= (1 + (maxDivIndex - divIndex) * 0.2); 

  value = Math.max(1000, Math.floor(value / 100) * 100); 
  return Math.min(value, 100000000); 
};


const generateNpcPlayer = (id: string, team: Team, currentSeason: number, position?: PreferredPosition): Player => {
  const determinedPosition = position || PreferredPosition.MIDFIELDER;
  const teamDivision = team.division;
  const baseReputation = getBaseReputationByDivision(teamDivision);
  const nationality = AVAILABLE_NATIONALITIES[Math.floor(Math.random() * AVAILABLE_NATIONALITIES.length)];

  let attributes: PlayerAttributes = {
    goalkeeping: determinedPosition === PreferredPosition.GOALKEEPER ? generateRandomAttribute(50,75) : generateRandomAttribute(10,30),
    tackle: determinedPosition === PreferredPosition.DEFENDER ? generateRandomAttribute(50,75) : generateRandomAttribute(30,60),
    passing: generateRandomAttribute(40,70),
    shooting: determinedPosition === PreferredPosition.FORWARD ? generateRandomAttribute(50,75) : generateRandomAttribute(30,60),
    heading: generateRandomAttribute(40,70),
    morale: generateRandomAttribute(60,90),
    stamina: generateRandomAttribute(50,80),
    speed: generateRandomAttribute(40,75),
    skill: generateRandomAttribute(40,70),
    age: generateRandomAttribute(18,28),
    value: 0, 
    pressRelations: generateRandomAttribute(40,70),
    fanSupport: generateRandomAttribute(Math.max(10,baseReputation-20), Math.min(100, baseReputation+20)),
    form: generateRandomAttribute(50,80),
    reputation: generateRandomAttribute(Math.max(10, baseReputation-10), Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, baseReputation+10)),
    skillMoves: Math.floor(Math.random() * 3) + 1, // 1-3 stars for NPCs
    weakFootAccuracy: Math.floor(Math.random() * 3) + 1, // 1-3 stars for NPCs
  };

  switch(determinedPosition) {
    case PreferredPosition.GOALKEEPER:
      attributes.shooting = generateRandomAttribute(10,25);
      attributes.tackle = generateRandomAttribute(10,25);
      break;
    case PreferredPosition.DEFENDER:
      attributes.shooting = generateRandomAttribute(20,40);
      break;
    case PreferredPosition.FORWARD:
      attributes.tackle = generateRandomAttribute(20,40);
      break;
  }
  attributes.value = calculateNpcPlayerValue(attributes, teamDivision);
  const preferredFootOptions: PreferredFootType[] = ['Left', 'Right'];
  const preferredFoot = preferredFootOptions[Math.floor(Math.random() * preferredFootOptions.length)];


  const npcPlayer: Player = {
    id,
    name: `${NPC_PLAYER_FIRST_NAMES[Math.floor(Math.random() * NPC_PLAYER_FIRST_NAMES.length)]} ${NPC_PLAYER_LAST_NAMES[Math.floor(Math.random() * NPC_PLAYER_LAST_NAMES.length)]}`,
    attributes,
    preferredPosition: determinedPosition,
    teamId: team.id,
    isUserPlayer: false,
    clubHistory: [{ teamName: team.name, season: currentSeason, joinedWeek: 1 }],
    stats: { goals: 0, assists: 0, appearances: 0, totalMatchRating: 0, matchesRatedThisSeason: 0 },
    lastMatchPerformance: null,
    unlockedTraits: [],
    weeklyWage: Math.floor(getWageByDivision(teamDivision) * (Math.random() * 0.4 + 0.8)), 
    contractExpirySeason: currentSeason + Math.floor(Math.random() * 3) + 1, 
    transferRequestStatus: TransferRequestStatus.NONE,
    isTransferListedByClub: false,
    careerStats: { totalGoals: 0, totalAssists: 0, totalAppearances: 0, leagueTitlesWon: [], promotionsWon: [], careerAwardsCount: 0, totalInternationalCaps: 0, totalInternationalGoals: 0 },
    awards: [], 
    managerRelationship: 50,
    nationality,
    internationalCaps: 0,
    internationalGoals: 0,
    isOnNationalTeam: false,
    currentInjury: null,
    activeTacticalInstruction: null,
    preferredFoot,
    preferredKitNumber: null, 
    currentKitNumber: null,
  };
  return npcPlayer;
};

const calculateTeamChemistry = (team: Team): number => {
    if (team.players.length === 0) return 50;
    const avgMorale = team.players.reduce((sum, p) => sum + p.attributes.morale, 0) / team.players.length;
    let chemistry = Math.floor(avgMorale * 0.8 + 20); 
    return Math.max(10, Math.min(100, chemistry));
};


const generateTeam = (id: string, name: string, division: DivisionName, currentSeason: number): Team => {
  const team: Team = {
    id,
    name,
    division,
    players: [],
    points: 0,
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    budget: getBaseBudgetByDivision(division) * (Math.random() * 0.4 + 0.8), 
    reputation: getBaseReputationByDivision(division) + generateRandomAttribute(-10,10),
    teamChemistry: 50, 
    usedKitNumbers: [],
  };

  const numPlayers = generateRandomAttribute(MIN_PLAYERS_PER_TEAM, MAX_PLAYERS_PER_TEAM -5); 
  for (let i = 0; i < numPlayers; i++) {
    let pos: PreferredPosition;
    if (i < Math.floor(numPlayers * 0.15)) pos = PreferredPosition.GOALKEEPER; 
    else if (i < Math.floor(numPlayers * 0.45)) pos = PreferredPosition.DEFENDER; 
    else if (i < Math.floor(numPlayers * 0.75)) pos = PreferredPosition.MIDFIELDER; 
    else pos = PreferredPosition.FORWARD; 
    const npc = generateNpcPlayer(`npc-${id}-${i}`, team, currentSeason, pos);
    const { updatedPlayer: playerWithKit, updatedTeam: teamAfterKitAssign } = assignKitNumber(npc, team, npc.preferredKitNumber);
    team.players.push(playerWithKit);
    team.usedKitNumbers = teamAfterKitAssign.usedKitNumbers;
  }
  team.teamChemistry = calculateTeamChemistry(team);
  return team;
};

export const initializeGame = (customPlayerData?: CustomPlayerData): GameState => {
  const teams: Team[] = [];
  const league: League = {
    divisions: {
      [DivisionName.FIRST]: [],
      [DivisionName.SECOND]: [],
      [DivisionName.THIRD]: [],
      [DivisionName.FOURTH]: [],
      [DivisionName.FIFTH]: [],
    },
    currentSeason: 1,
    currentWeek: 1,
  };

  DIVISION_NAMES_ORDERED.forEach((divisionName, divIdx) => {
    for (let i = 0; i < TEAMS_PER_DIVISION; i++) {
      const teamId = `${divisionName.replace(/\s+/g, '')}-${i}`;
      const teamName = `${NPC_TEAM_NAMES_PREFIXES[Math.floor(Math.random() * NPC_TEAM_NAMES_PREFIXES.length)]} ${NPC_TEAM_NAMES_SUFFIXES[Math.floor(Math.random() * NPC_TEAM_NAMES_SUFFIXES.length)]}`;
      const team = generateTeam(teamId, teamName, divisionName, 1);
      teams.push(team);
      league.divisions[divisionName].push(team);
    }
  });
  
  let userPlayerTeam = teams.find(t => t.division === DivisionName.FIFTH);
  if (!userPlayerTeam) {
      userPlayerTeam = teams[Math.floor(Math.random() * teams.length)];
      if (!userPlayerTeam) throw new Error("No teams available to assign user player.");
  }
  
  const userPlayerName = customPlayerData?.name || INITIAL_USER_PLAYER_NAME;
  const userPlayerPosition = customPlayerData?.preferredPosition || PreferredPosition.FORWARD;
  const userPlayerFoot = customPlayerData?.preferredFoot || 'Right';
  const userPlayerNationality = customPlayerData?.nationality || AVAILABLE_NATIONALITIES[Math.floor(Math.random() * AVAILABLE_NATIONALITIES.length)];
  const userPlayerKitNumber = customPlayerData?.preferredKitNumber ?? null;
  const userPlayerSkillMoves = customPlayerData?.skillMoves || 2;
  const userPlayerWeakFoot = customPlayerData?.weakFootAccuracy || 2;

  let baseSkill = generateRandomAttribute(40, 60);
  baseSkill += (userPlayerSkillMoves - 2) * 2; // e.g., 5 stars = +6; 1 star = -2
  baseSkill += (userPlayerWeakFoot - 2) * 1;   // e.g., 5 stars = +3; 1 star = -2

  let userPlayerAttributes: PlayerAttributes = {
    goalkeeping: generateRandomAttribute(30,50),
    tackle: generateRandomAttribute(40,60),
    passing: generateRandomAttribute(45,65),
    shooting: generateRandomAttribute(45,65),
    heading: generateRandomAttribute(40,60),
    morale: 70,
    stamina: 80,
    speed: generateRandomAttribute(45,65),
    skill: Math.max(MIN_ATTRIBUTE_VALUE_NPC_DEV + 5, Math.min(MAX_ATTRIBUTE_VALUE - 10, baseSkill)), // Ensure skill is within reasonable starting bounds
    age: INITIAL_PLAYER_AGE,
    value: 0, 
    pressRelations: 50,
    fanSupport: 30,
    form: 75,
    reputation: INITIAL_PLAYER_REPUTATION,
    skillMoves: userPlayerSkillMoves,
    weakFootAccuracy: userPlayerWeakFoot,
  };
  // Adjust initial attributes based on position
  switch(userPlayerPosition) {
    case PreferredPosition.GOALKEEPER: userPlayerAttributes.goalkeeping = Math.min(MAX_ATTRIBUTE_VALUE, generateRandomAttribute(50,65)); break;
    case PreferredPosition.DEFENDER: userPlayerAttributes.tackle = Math.min(MAX_ATTRIBUTE_VALUE, generateRandomAttribute(50,65)); break;
    case PreferredPosition.MIDFIELDER: userPlayerAttributes.passing = Math.min(MAX_ATTRIBUTE_VALUE, generateRandomAttribute(50,65)); break;
    case PreferredPosition.FORWARD: userPlayerAttributes.shooting = Math.min(MAX_ATTRIBUTE_VALUE, generateRandomAttribute(50,65)); break;
  }
  userPlayerAttributes.value = calculateNpcPlayerValue(userPlayerAttributes, DivisionName.FIFTH);


  let userPlayer: Player = {
    id: 'user-player',
    name: userPlayerName,
    attributes: userPlayerAttributes,
    preferredPosition: userPlayerPosition,
    teamId: userPlayerTeam.id,
    isUserPlayer: true,
    clubHistory: [{ teamName: userPlayerTeam.name, season: 1, joinedWeek: 1, transferFee: 0 }],
    stats: { goals: 0, assists: 0, appearances: 0, totalMatchRating: 0, matchesRatedThisSeason: 0 },
    lastMatchPerformance: null,
    unlockedTraits: [],
    weeklyWage: getWageByDivision(DivisionName.FIFTH),
    contractExpirySeason: 1 + (Math.floor(Math.random() * 2) + 1), 
    transferRequestStatus: TransferRequestStatus.NONE,
    isTransferListedByClub: false,
    careerStats: { totalGoals: 0, totalAssists: 0, totalAppearances: 0, leagueTitlesWon: [], promotionsWon: [], careerAwardsCount: 0, totalInternationalCaps: 0, totalInternationalGoals: 0 },
    awards: [], 
    managerRelationship: 50,
    nationality: userPlayerNationality,
    internationalCaps: 0,
    internationalGoals: 0,
    isOnNationalTeam: false,
    currentInjury: null,
    activeTacticalInstruction: null,
    preferredFoot: userPlayerFoot,
    preferredKitNumber: userPlayerKitNumber,
    currentKitNumber: null,
  };

  const kitAssignmentResult = assignKitNumber(userPlayer, userPlayerTeam, userPlayer.preferredKitNumber);
  userPlayer = kitAssignmentResult.updatedPlayer;
  userPlayerTeam = kitAssignmentResult.updatedTeam;
  
  const userPlayerTeamIndex = teams.findIndex(t => t.id === userPlayerTeam!.id);
  if (userPlayerTeamIndex !== -1) {
      teams[userPlayerTeamIndex] = userPlayerTeam;
      teams[userPlayerTeamIndex].players.push(userPlayer);
      teams[userPlayerTeamIndex].teamChemistry = calculateTeamChemistry(teams[userPlayerTeamIndex]);
  } else {
      console.error("Critical error: User player's initial team not found in the main teams array after kit assignment.");
      if(teams.length > 0) {
        teams[0].players.push(userPlayer);
        userPlayer.teamId = teams[0].id;
      }
  }


  const nationalTeams: NationalTeam[] = AVAILABLE_NATIONALITIES.map(nat => ({
    id: `NATIONAL_${nat.toUpperCase().replace(/\s+/g, '_')}`,
    name: `${nat} National Team`,
    nationalityRepresented: nat,
    squad: [],
    reputation: generateRandomAttribute(60, 85), 
    managerName: `National Coach ${nat.substring(0,3)}`
  }));

  return {
    userPlayerId: userPlayer.id,
    teams,
    league,
    gameLog: ['Game initialized. Welcome to your football career!'],
    pendingTransferOffers: [],
    transferWindowStatus: updateTransferWindowStatus(1),
    pendingInteractions: [],
    nationalTeams,
    internationalFixtureWeeks: INTERNATIONAL_FIXTURE_WEEKS_DEFAULT,
    upcomingInternationalMatch: null,
    isPlayerCreated: customPlayerData ? true : false, 
  };
};

const checkForAndApplyInjury = (player: Player, gameState: GameState, context: 'match' | 'training'): { updatedPlayer: Player, injuryLog?: string } => {
    if (player.currentInjury) return { updatedPlayer: player }; 

    let injuryChance = context === 'match' ? INJURY_BASE_CHANCE_PER_MATCH : 0.01; 

    if (player.attributes.stamina < 50) {
        injuryChance += (50 - player.attributes.stamina) * INJURY_CHANCE_STAMINA_FACTOR;
    }
    if (player.attributes.age > 30) {
        injuryChance += (player.attributes.age - 30) * INJURY_CHANCE_AGE_FACTOR;
    }

    if (hasTrait(player, PlayerTraitId.SEASONED_PRO) || hasTrait(player, PlayerTraitId.WORKHORSE)) {
        injuryChance *= 0.85; 
    }


    if (Math.random() < injuryChance) {
        const injuryTypes = ["Sprained Ankle", "Pulled Hamstring", "Bruised Ribs", "Twisted Knee", "Strained Groin", "Calf Strain", "Shoulder Dislocation"];
        const type = injuryTypes[Math.floor(Math.random() * injuryTypes.length)];
        
        let severity: InjurySeverity;
        const randSeverity = Math.random();
        if (randSeverity < 0.6) severity = InjurySeverity.MINOR;      
        else if (randSeverity < 0.9) severity = InjurySeverity.MODERATE; 
        else severity = InjurySeverity.SERIOUS;   

        const durationRange = INJURY_DURATION_WEEKS[severity];
        const durationWeeks = Math.floor(Math.random() * (durationRange.max - durationRange.min + 1)) + durationRange.min;

        const newInjury: Injury = {
            id: `inj-${player.id}-${Date.now()}`,
            type,
            description: `Sustained during a ${context === 'match' ? 'match' : 'training session'}.`,
            severity,
            durationWeeks,
            weeksRemaining: durationWeeks,
            recoveryProgress: 0,
            diagnosedSeason: gameState.league.currentSeason,
            diagnosedWeek: gameState.league.currentWeek,
        };
        
        const updatedPlayer = { ...player, currentInjury: newInjury };
        updatedPlayer.attributes.form = Math.max(0, updatedPlayer.attributes.form - (severity === InjurySeverity.SERIOUS ? 30 : severity === InjurySeverity.MODERATE ? 20 : 10));
        updatedPlayer.attributes.morale = Math.max(0, updatedPlayer.attributes.morale - (severity === InjurySeverity.SERIOUS ? 15 : severity === InjurySeverity.MODERATE ? 10 : 5));
        
        const injuryLog = `${player.name} has suffered a ${severity.toLowerCase()} ${type} (${durationWeeks} weeks)!`;
        return { updatedPlayer, injuryLog };
    }

    return { updatedPlayer: player };
};

export const applyTraining = (player: Player, trainingId: TrainingOption['id'], currentGameState: GameState): {updatedPlayer: Player, newLogEntries: string[]} => {
  const option = AVAILABLE_TRAINING_OPTIONS.find(opt => opt.id === trainingId);
  if (!option) return {updatedPlayer: player, newLogEntries: []};

  let updatedPlayer = { ...player };
  let newLogEntries: string[] = [];

  if (updatedPlayer.currentInjury && trainingId !== 'stamina' && trainingId !== 'physio') {
      return {updatedPlayer, newLogEntries: [`${updatedPlayer.name} cannot perform '${option.name}' training while injured. Only Rest or Physio allowed.`]};
  }

  let staminaCost = option.cost !== undefined ? option.cost : 5; 

  if (updatedPlayer.attributes.stamina < staminaCost && trainingId !== 'stamina' && trainingId !== 'physio') {
    return {updatedPlayer, newLogEntries: [`Not enough stamina to train ${option.name}. Rest or choose lighter training.`]};
  }
  
  updatedPlayer.attributes.stamina = Math.max(0, updatedPlayer.attributes.stamina - staminaCost);
  
  if (trainingId === 'physio') {
      if (updatedPlayer.currentInjury) {
          if (Math.random() < PHYSIO_RECOVERY_BOOST_CHANCE) {
              updatedPlayer.currentInjury.weeksRemaining = Math.max(0, updatedPlayer.currentInjury.weeksRemaining - 1);
              newLogEntries.push(`${updatedPlayer.name} had a good physio session. Recovery time for ${updatedPlayer.currentInjury.type} slightly reduced!`);
          } else {
              newLogEntries.push(`${updatedPlayer.name} completed a physio session for their ${updatedPlayer.currentInjury.type}.`);
          }
          if(updatedPlayer.currentInjury.weeksRemaining > 0) {
            updatedPlayer.currentInjury.recoveryProgress = Math.min(100, Math.floor(((updatedPlayer.currentInjury.durationWeeks - updatedPlayer.currentInjury.weeksRemaining) / updatedPlayer.currentInjury.durationWeeks) * 100));
          } else { 
             newLogEntries.push(`${player.name} has fully recovered from ${player.currentInjury?.type} after the physio session!`);
             updatedPlayer.currentInjury = null;
             updatedPlayer.attributes.form = Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, updatedPlayer.attributes.form + 15);
             updatedPlayer.attributes.morale = Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, updatedPlayer.attributes.morale + 10);
          }
      } else {
          newLogEntries.push(`${updatedPlayer.name} had a light physio session. No specific injury to treat.`);
          updatedPlayer.attributes.stamina = Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, updatedPlayer.attributes.stamina + 5); 
      }
      return { updatedPlayer, newLogEntries };
  }


  let improvement = option.improvement;
  if (player.attributes.morale > 75) improvement *= 1.2;
  if (player.attributes.form > 75) improvement *= 1.2;
  if (player.attributes.morale < 40) improvement *= 0.8;
  if (player.attributes.form < 40) improvement *= 0.8;

  if (player.attributes.age < 20) improvement *= 1.3;
  else if (player.attributes.age > 30) improvement *= 0.7;

  improvement = Math.round(improvement);

  if (option.id === 'skillMoves' || option.id === 'weakFootAccuracy') {
    updatedPlayer.attributes[option.id as ('skillMoves' | 'weakFootAccuracy')] = Math.min(5, updatedPlayer.attributes[option.id as ('skillMoves' | 'weakFootAccuracy')] + improvement);
  } else if (updatedPlayer.attributes[option.id as keyof PlayerAttributes] !== undefined) {
    updatedPlayer.attributes[option.id as keyof PlayerAttributes] = Math.min(MAX_ATTRIBUTE_VALUE, updatedPlayer.attributes[option.id as keyof PlayerAttributes] + improvement);
  }


  if (option.id === 'reputation') {
     updatedPlayer.attributes.reputation = Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, updatedPlayer.attributes.reputation + improvement);
     updatedPlayer.attributes.pressRelations = Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, updatedPlayer.attributes.pressRelations + Math.round(improvement * 0.5));
  }
  
  const { updatedPlayer: playerAfterTraits, newLogEntries: traitLogEntries } = checkAndUnlockTraits(updatedPlayer, currentGameState);
  updatedPlayer = playerAfterTraits;
  
  newLogEntries.push(`${player.name} trained ${option.name}. ${option.id} +${improvement}. Stamina: ${updatedPlayer.attributes.stamina}.`);
  newLogEntries.push(...traitLogEntries);
  return { updatedPlayer, newLogEntries };
};

const generatePlayerMatchPerformanceStats = (player: Player, isWin: boolean, opponentStrengthFactor: number, isInternational: boolean = false): PlayerMatchPerformance => {
  let rating = 5.0;
  let goals = 0;
  let assists = 0;
  let shots = 0;
  let shotsOnTarget = 0;
  let tacklesAttempted = 0;
  let tacklesWon = 0;
  let keyPasses = 0;
  let interceptions = 0;

  const primarySkill = player.attributes[player.preferredPosition === PreferredPosition.GOALKEEPER ? 'goalkeeping' : player.preferredPosition === PreferredPosition.DEFENDER ? 'tackle' : player.preferredPosition === PreferredPosition.FORWARD ? 'shooting' : 'passing'];
  const basePerf = (primarySkill + player.attributes.skill + player.attributes.speed + player.attributes.reputation * (isInternational ? 0.3 : 0.1) ) / 3.3; 
  const formFactor = player.attributes.form / 100;
  
  let perfRoll = Math.random() * (basePerf * formFactor * opponentStrengthFactor); 

  let tacticalShootingBonus = 0;
  let tacticalKeyPassBonus = 0;
  let tacticalTackleAttemptBonus = 0;
  let tacticalForwardRunFactor = 1.0;
  let tacticalDribbleFactor = 1.0;

  if (player.activeTacticalInstruction) {
    switch (player.activeTacticalInstruction) {
      case PlayerTacticalInstructionId.SHOOT_ON_SIGHT:
        tacticalShootingBonus = 2 + Math.floor(player.attributes.shooting / 30); 
        break;
      case PlayerTacticalInstructionId.LOOK_FOR_THROUGH_BALLS:
        tacticalKeyPassBonus = 1 + Math.floor(player.attributes.passing / 35); 
        break;
      case PlayerTacticalInstructionId.AGGRESSIVE_TACKLING:
        tacticalTackleAttemptBonus = 2 + Math.floor(player.attributes.tackle / 30); 
        break;
      case PlayerTacticalInstructionId.MAKE_FORWARD_RUNS:
        tacticalForwardRunFactor = 1.15; 
        perfRoll *= 1.05; 
        break;
      case PlayerTacticalInstructionId.DRIBBLE_MORE:
        tacticalDribbleFactor = 1.2 * (player.attributes.skillMoves / 3); 
        perfRoll *= (1.0 + (player.attributes.skillMoves - 1) * 0.015);
        break;
      case PlayerTacticalInstructionId.STAY_BACK_DEFENDING:
        perfRoll *= 0.9; 
        rating += 0.2; 
        break;
       case PlayerTacticalInstructionId.HOLD_UP_PLAY:
        perfRoll *= 0.95;
        keyPasses += Math.random() < 0.1 ? 1 : 0; 
        break;
    }
  }

  if (hasTrait(player, PlayerTraitId.SEASONED_PRO)) perfRoll *= 1.02;
  if (hasTrait(player, PlayerTraitId.WORKHORSE)) perfRoll *= 1.02;
  if (hasTrait(player, PlayerTraitId.SPEED_DEMON)) perfRoll *= 1.01;

  const performAction = (baseSuccessChance: number, weakFootPenaltyFactor: number): boolean => {
    let successChance = baseSuccessChance;
    if (player.preferredFoot !== 'Ambidextrous' && Math.random() < 0.3) {
        const weakFootModifier = 1.0 - ( (5 - player.attributes.weakFootAccuracy) * weakFootPenaltyFactor ); 
        successChance *= Math.max(0.1, weakFootModifier); 
    }
    return Math.random() * 100 < successChance;
  };


  if (player.preferredPosition === PreferredPosition.FORWARD || player.preferredPosition === PreferredPosition.MIDFIELDER) {
    shots = Math.floor(Math.random() * (perfRoll / (isInternational ? 18 : 20)) * tacticalForwardRunFactor) + tacticalShootingBonus;
    if (hasTrait(player, PlayerTraitId.GOAL_POACHER)) shots = Math.max(shots, Math.floor(Math.random() * (perfRoll / (isInternational ? 13 : 15)) * tacticalForwardRunFactor));
    
    for (let i = 0; i < shots; i++) {
      let shotQuality = player.attributes.shooting * (player.attributes.form / 100);
      if (hasTrait(player, PlayerTraitId.CLINICAL_FINISHER)) shotQuality *= 1.1;
      if (player.activeTacticalInstruction === PlayerTacticalInstructionId.SHOOT_ON_SIGHT && player.attributes.shooting < 70) shotQuality *= 0.9; 
      
      if (performAction(shotQuality * 0.7, 0.15)) shotsOnTarget++; 
      if (performAction(shotQuality * 0.3, 0.25)) { 
         goals++;
         rating += 1.5;
      }
    }
    keyPasses = Math.floor(Math.random() * (player.attributes.passing / (isInternational ? 22 : 25)) * tacticalDribbleFactor) + tacticalKeyPassBonus;
    if (hasTrait(player, PlayerTraitId.PLAYMAKER_VISION)) keyPasses = Math.max(keyPasses, Math.floor(Math.random() * (player.attributes.passing / (isInternational ? 16 : 18))));
    for (let i = 0; i < keyPasses; i++) {
       if (performAction(player.attributes.passing * 0.2, 0.20)) { 
        assists++;
        rating += 1.0;
      }
    }
  }

  if (player.preferredPosition === PreferredPosition.DEFENDER || player.preferredPosition === PreferredPosition.MIDFIELDER) {
    tacklesAttempted = Math.floor(Math.random() * (player.attributes.tackle / (isInternational ? 13 : 15))) + tacticalTackleAttemptBonus;
    for (let i = 0; i < tacklesAttempted; i++) {
      let tackleQuality = player.attributes.tackle * (player.attributes.form / 100);
      if (hasTrait(player, PlayerTraitId.DEFENSIVE_ROCK)) tackleQuality *= 1.1;
      if (player.activeTacticalInstruction === PlayerTacticalInstructionId.AGGRESSIVE_TACKLING) tackleQuality *= 1.05; 
      if (Math.random() * 100 < tackleQuality) tacklesWon++;
    }
    interceptions = Math.floor(Math.random() * (player.attributes.tackle / (isInternational ? 18 : 20)));
    if (player.activeTacticalInstruction === PlayerTacticalInstructionId.STAY_BACK_DEFENDING) interceptions += Math.random() < 0.2 ? 1 : 0;
    rating += (tacklesWon * 0.3) + (interceptions * 0.2);
  }
  
  if (player.preferredPosition === PreferredPosition.GOALKEEPER) {
    rating += Math.max(0, 3 - Math.floor(Math.random() * 4)); 
  }


  rating += perfRoll / (isInternational ? 25 : 30); 
  if (isWin) rating += (isInternational ? 0.7 : 0.5); else rating -= (isInternational ? 0.3 : 0.2);
  if (hasTrait(player, PlayerTraitId.FAN_FAVOURITE) && isWin) rating += 0.2;


  rating = Math.max(3.0, Math.min(10.0, parseFloat((rating + Math.random() * 1.0 - 0.5).toFixed(1)) )); 

  return { rating, goals, assists, shots, shotsOnTarget, tacklesAttempted, tacklesWon, keyPasses, interceptions, narrativeSummary: "Summary pending..." };
};

const generateMatchNarrative = async (playerPerformance: PlayerMatchPerformance, playerName: string, teamName: string, opponentName: string, playerScore: number, opponentScore: number, isInternational: boolean): Promise<string> => {
  if (!ai) {
    return "Match summary generation is currently unavailable.";
  }
  const matchType = isInternational ? "international friendly" : "league match";
  const prompt = `Generate a short, engaging pundit-style narrative (1-2 sentences) for a football player named ${playerName} playing for ${teamName} against ${opponentName} in an ${matchType}.
The match result was ${teamName} ${playerScore} - ${opponentScore} ${opponentName}.
${playerName}'s key stats: Rating: ${playerPerformance.rating.toFixed(1)}, Goals: ${playerPerformance.goals}, Assists: ${playerPerformance.assists}, Shots: ${playerPerformance.shots} (${playerPerformance.shotsOnTarget} on target), Tackles Won: ${playerPerformance.tacklesWon}/${playerPerformance.tacklesAttempted}, Key Passes: ${playerPerformance.keyPasses}, Interceptions: ${playerPerformance.interceptions}.
Focus on their individual contribution and the overall match context. Be creative and avoid just listing stats.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17', 
        contents: prompt
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating match narrative:", error);
    return "Could not retrieve detailed match summary at this time.";
  }
};

const simulateSingleMatch = (homeEntity: Team | NationalTeam, awayEntity: Team | NationalTeam, userPlayer: Player | undefined, allPlayers: Player[]): MatchResult => {
  const homeAdvantage = 1.1;
  
  const getEntityStrength = (entity: Team | NationalTeam): number => {
    if ('players' in entity) { 
        const teamChemistryFactor = 0.8 + (entity.teamChemistry / 500);
        const fitPlayers = entity.players.filter(p => !p.currentInjury);
        if (fitPlayers.length === 0) return 30; 
        return fitPlayers.reduce((sum, p) => sum + p.attributes.skill + p.attributes.form, 0) / fitPlayers.length * teamChemistryFactor;
    } else { 
        const squadPlayers = allPlayers.filter(p => entity.squad.includes(p.id) && !p.currentInjury);
        if (squadPlayers.length > 0) {
            return squadPlayers.reduce((sum, p) => sum + p.attributes.skill + p.attributes.form + p.attributes.reputation * 0.5, 0) / squadPlayers.length;
        }
        return entity.reputation * 0.8; 
    }
  };

  const homeStrength = getEntityStrength(homeEntity) * (('players' in homeEntity) ? homeAdvantage : 1.05); 
  const awayStrength = getEntityStrength(awayEntity);

  const scoreRandomness = ('players' in homeEntity) ? 3 : 2.5; 
  let homeScore = Math.floor(Math.random() * (homeStrength / (awayStrength || 1)) * scoreRandomness);
  let awayScore = Math.floor(Math.random() * (awayStrength / (homeStrength || 1)) * scoreRandomness);
  
  homeScore = Math.min(homeScore, 7); 
  awayScore = Math.min(awayScore, 7);

  const playerPerformances: Record<string, Partial<PlayerMatchPerformance>> = {};
  const isInternationalFixture = !('players' in homeEntity); 

  if (userPlayer && userPlayer.currentInjury === null && (isInternationalFixture ? userPlayer.isOnNationalTeam : userPlayer.teamId)) {
      const isUserHome = isInternationalFixture ? (homeEntity as NationalTeam).squad.includes(userPlayer.id) : userPlayer.teamId === (homeEntity as Team).id;
      
      let userOnCorrectTeam = false;
      if(isInternationalFixture){
        userOnCorrectTeam = (homeEntity as NationalTeam).squad.includes(userPlayer.id) || (awayEntity as NationalTeam).squad.includes(userPlayer.id);
      } else {
        userOnCorrectTeam = userPlayer.teamId === (homeEntity as Team).id || userPlayer.teamId === (awayEntity as Team).id;
      }

      if(userOnCorrectTeam) {
        const isWin = (isUserHome && homeScore > awayScore) || (!isUserHome && awayScore > homeScore);
        const opponentStrengthFactor = isUserHome ? (awayStrength / homeStrength) : (homeStrength / awayStrength);
        const performance = generatePlayerMatchPerformanceStats(userPlayer, isWin, opponentStrengthFactor, isInternationalFixture);
        playerPerformances[userPlayer.id] = performance;
      }
  }

  return {
    homeTeamId: homeEntity.id,
    awayTeamId: awayEntity.id,
    homeScore,
    awayScore,
    summary: `${homeEntity.name} ${homeScore} - ${awayScore} ${awayEntity.name}`,
    playerPerformances,
    isInternationalFixture
  };
};

export const updateTransferWindowStatus = (currentWeek: number): TransferWindowStatus => {
  const isPreSeasonOpen = currentWeek >= TRANSFER_WINDOW_PRE_SEASON_START_WEEK && currentWeek <= TRANSFER_WINDOW_PRE_SEASON_END_WEEK;
  const isMidSeasonOpen = currentWeek >= TRANSFER_WINDOW_MID_SEASON_START_WEEK && currentWeek <= TRANSFER_WINDOW_MID_SEASON_END_WEEK;

  if (isPreSeasonOpen) return 'OPEN_PRE_SEASON';
  if (isMidSeasonOpen) return 'OPEN_MID_SEASON';
  return 'CLOSED';
};

const generateAndAddTransferOffers = (gameState: GameState): GameState => {
  if (gameState.transferWindowStatus === 'CLOSED') return gameState;

  const userPlayer = gameState.teams.flatMap(t => t.players).find(p => p.id === gameState.userPlayerId);
  if (!userPlayer || userPlayer.currentInjury) return gameState; 

  const currentTeam = userPlayer.teamId ? gameState.teams.find(t => t.id === userPlayer.teamId) : null;
  
  let newOffers: TransferOffer[] = [...gameState.pendingTransferOffers];
  const logEntries: string[] = [];

  if (Math.random() > 0.7) { 
     gameState.teams.forEach(potentialOfferingTeam => {
        if (potentialOfferingTeam.id === userPlayer.teamId) return; 
        if (newOffers.some(o => o.fromTeamId === potentialOfferingTeam.id && o.toPlayerId === userPlayer.id && o.status === 'PENDING_PLAYER_RESPONSE')) return; 

        const playerReputationFactor = userPlayer.attributes.reputation / 100;
        const playerValueFactor = userPlayer.attributes.value / 100000; 
        const teamReputationFactor = potentialOfferingTeam.reputation / (currentTeam?.reputation || 30); 
        const contractStatusFactor = (!userPlayer.teamId || (userPlayer.contractExpirySeason - gameState.league.currentSeason <= 1)) ? 1.5 : 1.0; 
        const transferListFactor = userPlayer.isTransferListedByClub || userPlayer.transferRequestStatus === TransferRequestStatus.APPROVED_BY_CLUB ? 1.3 : 1.0;
        
        let interestScore = playerReputationFactor * playerValueFactor * teamReputationFactor * contractStatusFactor * transferListFactor;
        interestScore *= (!currentTeam || DIVISION_NAMES_ORDERED.indexOf(potentialOfferingTeam.division) <= DIVISION_NAMES_ORDERED.indexOf(currentTeam.division) ? 1.2 : 0.8); 

        if (interestScore > (0.2 + Math.random() * 0.3)) { 
            let transferFee = 0;
            if (userPlayer.teamId && userPlayer.contractExpirySeason > gameState.league.currentSeason) { 
                transferFee = Math.floor(userPlayer.attributes.value * (0.5 + Math.random() * 1.0) * ( (userPlayer.contractExpirySeason - gameState.league.currentSeason) / 3 ) ); 
                transferFee = Math.max(500, transferFee); 
            }
            
            if (potentialOfferingTeam.budget < transferFee) return; 

            const offeredWage = Math.floor(getWageByDivision(potentialOfferingTeam.division) * (0.9 + Math.random() * 0.4) * (playerReputationFactor + teamReputationFactor)/2);
            const contractLengthYears = Math.floor(Math.random() * 3) + 1; 
            const signingBonus = Math.floor(offeredWage * contractLengthYears * (0.05 + Math.random() * 0.1)); 

            const offer: TransferOffer = {
                offerId: `offer-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                fromTeamId: potentialOfferingTeam.id,
                fromTeamName: potentialOfferingTeam.name,
                fromTeamDivision: potentialOfferingTeam.division,
                toPlayerId: userPlayer.id,
                transferFee,
                offeredWage,
                contractLengthYears,
                signingBonus,
                status: 'PENDING_PLAYER_RESPONSE',
                offerDateSeason: gameState.league.currentSeason,
                offerDateWeek: gameState.league.currentWeek,
                expiresOnSeason: gameState.league.currentSeason, 
                expiresOnWeek: gameState.league.currentWeek + OFFER_EXPIRY_DURATION_WEEKS,
            };
            newOffers.push(offer);
            logEntries.push(`Transfer Offer: ${potentialOfferingTeam.name} have made an offer for ${userPlayer.name}.`);
        }
    });
  }
  
  return { ...gameState, pendingTransferOffers: newOffers, gameLog: [...gameState.gameLog, ...logEntries].slice(-50) };
};

export const handlePlayerTransferRequest = (currentGameState: GameState): GameState => {
    let player = currentGameState.teams.flatMap(t => t.players).find(p => p.id === currentGameState.userPlayerId);
    if (!player || !player.teamId) { 
        return {...currentGameState, gameLog: ["Cannot request transfer: You are currently not signed with a club.", ...currentGameState.gameLog].slice(-50) };
    }
    if (player.currentInjury) {
        return {...currentGameState, gameLog: ["Cannot request transfer while injured.", ...currentGameState.gameLog].slice(-50) };
    }

    let newLogEntries: string[] = [];
    if (player.transferRequestStatus === TransferRequestStatus.NONE) {
        player.transferRequestStatus = TransferRequestStatus.REQUESTED_BY_PLAYER;
        newLogEntries.push(`${player.name} has requested a transfer from ${currentGameState.teams.find(t=>t.id === player!.teamId)?.name}.`);
    } else {
        newLogEntries.push(`${player.name} has already submitted a transfer request or the club has responded.`);
    }
    
    const teams = currentGameState.teams.map(t => ({
        ...t,
        players: t.players.map(p => p.id === player!.id ? player! : p)
    }));

    return { ...currentGameState, teams, gameLog: [...currentGameState.gameLog, ...newLogEntries].slice(-50) };
};

export const handleRespondToTransferOffer = (currentGameState: GameState, offerId: string, response: 'accept' | 'reject'): GameState => {
    const offerIndex = currentGameState.pendingTransferOffers.findIndex(o => o.offerId === offerId);
    if (offerIndex === -1) return currentGameState;

    const offer = currentGameState.pendingTransferOffers[offerIndex];
    let player = currentGameState.teams.flatMap(t => t.players).find(p => p.id === offer.toPlayerId);
    if (!player) return currentGameState; 
    if (player.currentInjury && response === 'accept') {
         return {...currentGameState, gameLog: ["Cannot accept transfer offer: You are currently injured. Clubs are hesitant to sign injured players.", ...currentGameState.gameLog].slice(-50) };
    }


    let newLogEntries: string[] = [];
    let updatedTeams = [...currentGameState.teams];
    let updatedPendingOffers = [...currentGameState.pendingTransferOffers];
    
    if (response === 'accept') {
        const oldTeamId = player.teamId; 
        let oldTeamIndex = oldTeamId ? updatedTeams.findIndex(t => t.id === oldTeamId) : -1;
        const newTeamIndex = updatedTeams.findIndex(t => t.id === offer.fromTeamId);

        if (newTeamIndex === -1) { 
             newLogEntries.push(`Transfer failed: Offering team ${offer.fromTeamName} not found.`);
             updatedPendingOffers[offerIndex] = { ...offer, status: 'WITHDRAWN_BY_CLUB' as TransferOfferStatus }; 
             return { ...currentGameState, pendingTransferOffers: updatedPendingOffers, gameLog: [...currentGameState.gameLog, ...newLogEntries].slice(-50) };
        }
        
        let newTeam = { ...updatedTeams[newTeamIndex] };

        if (newTeam.budget < (offer.transferFee + offer.signingBonus)) {
            newLogEntries.push(`Transfer failed: ${newTeam.name} cannot afford the total cost of $${(offer.transferFee + offer.signingBonus).toLocaleString()}. Their budget is $${newTeam.budget.toLocaleString()}.`);
            updatedPendingOffers[offerIndex] = { ...offer, status: 'WITHDRAWN_BY_CLUB' as TransferOfferStatus }; 
            return { ...currentGameState, pendingTransferOffers: updatedPendingOffers, gameLog: [...currentGameState.gameLog, ...newLogEntries].slice(-50) };
        }
        if (newTeam.players.length >= MAX_PLAYERS_PER_TEAM) {
             newLogEntries.push(`Transfer failed: ${newTeam.name} has a full squad (${newTeam.players.length}/${MAX_PLAYERS_PER_TEAM}).`);
             updatedPendingOffers[offerIndex] = { ...offer, status: 'WITHDRAWN_BY_CLUB' as TransferOfferStatus }; 
             return { ...currentGameState, pendingTransferOffers: updatedPendingOffers, gameLog: [...currentGameState.gameLog, ...newLogEntries].slice(-50) };
        }

        const previousTeamName = oldTeamId ? updatedTeams[oldTeamIndex]?.name : "Free Agency";
        
        if (oldTeamId && oldTeamIndex !== -1 && player.currentKitNumber !== null) {
            let oldTeam = updatedTeams[oldTeamIndex];
            oldTeam.usedKitNumbers = oldTeam.usedKitNumbers.filter(kn => kn !== player.currentKitNumber);
            updatedTeams[oldTeamIndex] = oldTeam;
        }
        
        player.teamId = newTeam.id;
        player.weeklyWage = offer.offeredWage;
        player.contractExpirySeason = currentGameState.league.currentSeason + offer.contractLengthYears; 
        player.attributes.value = Math.floor(player.attributes.value * 1.05 + offer.transferFee * 0.05 + offer.signingBonus * 0.1); 
        player.attributes.morale = Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, player.attributes.morale + 20); 
        player.transferRequestStatus = TransferRequestStatus.NONE;
        player.isTransferListedByClub = false;
        player.managerRelationship = 50; 
        
        const kitAssignmentResult = assignKitNumber(player, newTeam, player.preferredKitNumber);
        player = kitAssignmentResult.updatedPlayer;
        newTeam = kitAssignmentResult.updatedTeam;
        
        const lastClubEntryIndex = player.clubHistory.length -1;
        if(lastClubEntryIndex >=0){
             if (player.clubHistory[lastClubEntryIndex].teamName === previousTeamName || (oldTeamId === null && player.clubHistory[lastClubEntryIndex].teamName.includes("Free Agent"))) { 
                player.clubHistory[lastClubEntryIndex].leftWeek = currentGameState.league.currentWeek;
            }
        }

        player.clubHistory.push({ 
            teamName: newTeam.name, 
            season: currentGameState.league.currentSeason, 
            joinedWeek: currentGameState.league.currentWeek,
            transferFee: offer.transferFee 
        });

        if (oldTeamId && oldTeamIndex !== -1) {
            const oldTeamToUpdate = { ...updatedTeams[oldTeamIndex] };
            oldTeamToUpdate.players = oldTeamToUpdate.players.filter(p => p.id !== player!.id);
            oldTeamToUpdate.budget += offer.transferFee;
            oldTeamToUpdate.teamChemistry = calculateTeamChemistry(oldTeamToUpdate);
            updatedTeams[oldTeamIndex] = oldTeamToUpdate;
        }

        newTeam.players.push(player);
        newTeam.budget -= (offer.transferFee + offer.signingBonus);
        newTeam.teamChemistry = calculateTeamChemistry(newTeam);
        updatedTeams[newTeamIndex] = newTeam;
        
        newLogEntries.push(`${player.name} has accepted the offer from ${newTeam.name}! Fee: $${offer.transferFee.toLocaleString()}, Wage: $${offer.offeredWage.toLocaleString()}/wk. Moved from ${previousTeamName}.`);
        
        updatedPendingOffers = updatedPendingOffers.filter(o => o.toPlayerId !== player!.id || o.offerId === offer.offerId); 
        const acceptedOfferIdx = updatedPendingOffers.findIndex(o => o.offerId === offer.offerId);
        if(acceptedOfferIdx !== -1) updatedPendingOffers[acceptedOfferIdx].status = 'ACCEPTED_BY_PLAYER';

    } else { 
        updatedPendingOffers[offerIndex] = { ...offer, status: 'REJECTED_BY_PLAYER' };
        newLogEntries.push(`${player.name} has rejected the offer from ${offer.fromTeamName}.`);
        player.attributes.morale = Math.max(0, player.attributes.morale - 5); 
        player.managerRelationship = Math.max(0, player.managerRelationship -5); 
         const teamsWithPlayerUpdate = currentGameState.teams.map(t => ({
            ...t,
            players: t.players.map(p => p.id === player!.id ? player! : p)
        }));
        updatedTeams = teamsWithPlayerUpdate;
    }
    
    return { ...currentGameState, teams: updatedTeams, pendingTransferOffers: updatedPendingOffers, gameLog: [...currentGameState.gameLog, ...newLogEntries].slice(-50) };
};

const developNpcPlayerAttributes = (player: Player, teamDivision: DivisionName): Player => {
  if (player.isUserPlayer) return player;
  if (player.currentInjury) return player; 

  let updatedAttrs = { ...player.attributes };
  const age = updatedAttrs.age;

  const attributesToDevelop: (keyof PlayerAttributes)[] = ['goalkeeping', 'tackle', 'passing', 'shooting', 'heading', 'stamina', 'speed', 'skill', 'skillMoves', 'weakFootAccuracy'];

  attributesToDevelop.forEach(attrKey => {
    let change = 0;
    const currentVal = updatedAttrs[attrKey];
    const isStarStat = attrKey === 'skillMoves' || attrKey === 'weakFootAccuracy';
    const maxVal = isStarStat ? 5 : MAX_ATTRIBUTE_VALUE;
    const minVal = isStarStat ? 1 : MIN_ATTRIBUTE_VALUE_NPC_DEV;


    if (age < 20) { 
      if (currentVal < (isStarStat ? 4 : 85)) change = Math.floor(Math.random() * (isStarStat ? 2 : 3)) + (isStarStat ? 0 : 1); 
      else if (currentVal < maxVal) change = Math.floor(Math.random() * (isStarStat ? 1 : 2)); 
    } else if (age < 25) { 
      if (currentVal < (isStarStat ? 3 : 80)) change = Math.floor(Math.random() * (isStarStat ? 1 : 3)); 
      else if (currentVal < maxVal) change = Math.floor(Math.random() * (isStarStat ? 1 : 2)); 
    } else if (age < 30) { 
      if (attrKey === 'speed' || attrKey === 'stamina') { 
        change = Math.floor(Math.random() * 2) -1 ; 
      } else if (!isStarStat) {
         change = Math.floor(Math.random() * 3) - 1; 
      } else { 
         change = Math.random() < 0.1 ? -1 : (Math.random() < 0.2 ? 1 : 0);
      }
    } else if (age < 34) { 
      if (attrKey === 'speed' || attrKey === 'stamina') {
        change = -(Math.floor(Math.random() * 3) + 1); 
      } else if (!isStarStat) {
        change = -(Math.floor(Math.random() * 2)); 
      } else { 
        change = Math.random() < 0.3 ? -1 : 0;
      }
    } else { 
      if (attrKey === 'speed' || attrKey === 'stamina') {
        change = -(Math.floor(Math.random() * 3) + 2); 
      } else if (!isStarStat) {
        change = -(Math.floor(Math.random() * 2) + 1); 
      } else { 
        change = Math.random() < 0.5 ? -1 : 0;
      }
    }

    if (player.preferredPosition === PreferredPosition.GOALKEEPER && attrKey === 'goalkeeping') {
        if (age < 27 && currentVal < 85) change = Math.max(change, Math.floor(Math.random() * 2)); 
        if (age > 32 && change < 0) change = Math.max(change, -2); 
    }

    updatedAttrs[attrKey] = Math.max(minVal, Math.min(maxVal, currentVal + change));
  });

  updatedAttrs.value = calculateNpcPlayerValue(updatedAttrs, teamDivision);
  
  return { ...player, attributes: updatedAttrs };
};

const grantAward = (player: Player, awardIdBase: AwardIdBase, name: string, description: string, type: AwardType, season: number, division?: DivisionName, value?: string | number, nationality?: string): Player => {
    const award: Award = {
        id: `${awardIdBase}_${player.id}_S${season}` + (division ? `_${division.replace(/\s+/g, '')}` : '') + (nationality ? `_NAT_${nationality}` : '') + `_V${value || ''}_${Date.now()}`,
        awardIdBase,
        name,
        description,
        type,
        seasonAchieved: season,
        divisionAchievedIn: division,
        value,
        forPlayerId: player.id,
        nationality,
    };
    const updatedPlayer = { ...player, awards: [...player.awards, award] };
    updatedPlayer.attributes.reputation = Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, updatedPlayer.attributes.reputation + (type === AwardType.CAREER_MILESTONE ? 2 : type === AwardType.SEASONAL_INTERNATIONAL ? 7 : 5));
    updatedPlayer.attributes.fanSupport = Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, updatedPlayer.attributes.fanSupport + (type === AwardType.CAREER_MILESTONE ? 1 : type === AwardType.SEASONAL_INTERNATIONAL ? 4 : 3));
    if (type !== AwardType.CAREER_MILESTONE) { 
        updatedPlayer.careerStats.careerAwardsCount = (updatedPlayer.careerStats.careerAwardsCount || 0) + 1;
    }
    return updatedPlayer;
};

const checkAndGrantCareerAchievements = (player: Player, gameState: GameState, specificMilestoneType?: AwardIdBase): { updatedPlayer: Player, newLogEntries: string[] } => {
    let updatedPlayer = { ...player };
    const newLogEntries: string[] = [];

    CAREER_MILESTONE_DEFINITIONS.forEach(def => {
        if (specificMilestoneType && def.idBase !== specificMilestoneType) return;

        let currentValue: number;
        if (def.statProperty === 'unlockedTraits.length') {
            currentValue = updatedPlayer.unlockedTraits.length;
        } else if (def.statProperty === 'awards.length') {
            currentValue = updatedPlayer.careerStats.careerAwardsCount; 
        } else if (def.statProperty === 'internationalCaps') {
            currentValue = updatedPlayer.careerStats.totalInternationalCaps;
        } else if (def.statProperty === 'internationalGoals') {
            currentValue = updatedPlayer.careerStats.totalInternationalGoals;
        }
         else {
            currentValue = updatedPlayer.careerStats[def.statProperty as keyof PlayerCareerStats] as number;
        }

        if (currentValue === undefined && !['unlockedTraits.length', 'awards.length', 'internationalCaps', 'internationalGoals'].includes(def.statProperty)) return;


        def.thresholds.forEach(threshold => {
            if (currentValue >= threshold) {
                const awardName = def.nameTemplate.replace("{X}", threshold.toString());
                const alreadyAwarded = updatedPlayer.awards.some(
                    aw => aw.awardIdBase === def.idBase && aw.name === awardName 
                );

                if (!alreadyAwarded) {
                    const awardDescription = def.descriptionTemplate.replace("{X}", threshold.toString());
                    updatedPlayer = grantAward(updatedPlayer, def.idBase, awardName, awardDescription, AwardType.CAREER_MILESTONE, gameState.league.currentSeason);
                    newLogEntries.push(`${updatedPlayer.name} achieved a career milestone: ${awardName}!`);
                }
            }
        });
    });
    return { updatedPlayer, newLogEntries };
};


const processEndOfSeasonAwardsAndAchievements = (gameState: GameState): { updatedGameState: GameState, newLogEntries: string[] } => {
    let updatedGameState = { ...gameState };
    const newLogEntries: string[] = [];

    updatedGameState.teams = updatedGameState.teams.map(team => ({
        ...team,
        players: team.players.map(p => {
            const updatedPlayer = { ...p };
            updatedPlayer.careerStats.totalGoals += p.stats.goals;
            updatedPlayer.careerStats.totalAssists += p.stats.assists;
            updatedPlayer.careerStats.totalAppearances += p.stats.appearances;
            return updatedPlayer;
        })
    }));

    DIVISION_NAMES_ORDERED.forEach(divisionName => {
        const playersInDivision = updatedGameState.teams
            .filter(t => t.division === divisionName)
            .flatMap(t => t.players)
            .filter(p => p.stats.appearances >= MIN_APPEARANCES_FOR_SEASONAL_AWARDS);

        if (playersInDivision.length === 0) return;

        const topScorers = [...playersInDivision].sort((a, b) => b.stats.goals - a.stats.goals);
        if (topScorers.length > 0 && topScorers[0].stats.goals > 0) {
            const maxGoals = topScorers[0].stats.goals;
            topScorers.filter(p => p.stats.goals === maxGoals).forEach(winner => {
                updatedGameState.teams = updatedGameState.teams.map(team => ({
                    ...team, players: team.players.map(p => p.id === winner.id ? grantAward(p, AwardIdBase.LEAGUE_TOP_SCORER, `${divisionName} Top Scorer - S${gameState.league.currentSeason}`, `Scored ${maxGoals} goals.`, AwardType.SEASONAL_LEAGUE, gameState.league.currentSeason, divisionName, maxGoals) : p)
                }));
                newLogEntries.push(`${winner.name} wins ${divisionName} Top Scorer with ${maxGoals} goals! (S${gameState.league.currentSeason})`);
            });
        }
        
        const topAssisters = [...playersInDivision].sort((a,b) => b.stats.assists - a.stats.assists);
        if (topAssisters.length > 0 && topAssisters[0].stats.assists > 0) {
            const maxAssists = topAssisters[0].stats.assists;
            topAssisters.filter(p => p.stats.assists === maxAssists).forEach(winner => {
                 updatedGameState.teams = updatedGameState.teams.map(team => ({
                    ...team, players: team.players.map(p => p.id === winner.id ? grantAward(p, AwardIdBase.LEAGUE_MOST_ASSISTS, `${divisionName} Most Assists - S${gameState.league.currentSeason}`, `Provided ${maxAssists} assists.`, AwardType.SEASONAL_LEAGUE, gameState.league.currentSeason, divisionName, maxAssists) : p)
                }));
                newLogEntries.push(`${winner.name} wins ${divisionName} Most Assists with ${maxAssists} assists! (S${gameState.league.currentSeason})`);
            });
        }

        const eligibleForPOTS = playersInDivision.filter(p => p.stats.matchesRatedThisSeason > 0);
        const potsWinners = [...eligibleForPOTS].sort((a,b) => (b.stats.totalMatchRating / b.stats.matchesRatedThisSeason) - (a.stats.totalMatchRating / a.stats.matchesRatedThisSeason));
        if (potsWinners.length > 0) {
            const bestAvgRating = (potsWinners[0].stats.totalMatchRating / potsWinners[0].stats.matchesRatedThisSeason);
             if (bestAvgRating >= 6.0) { 
                potsWinners.filter(p => (p.stats.totalMatchRating / p.stats.matchesRatedThisSeason) === bestAvgRating).forEach(winner => {
                     updatedGameState.teams = updatedGameState.teams.map(team => ({
                        ...team, players: team.players.map(p => p.id === winner.id ? grantAward(p, AwardIdBase.LEAGUE_PLAYER_OF_THE_SEASON, `${divisionName} Player of the Season - S${gameState.league.currentSeason}`, `Avg Rating: ${bestAvgRating.toFixed(2)}`, AwardType.SEASONAL_LEAGUE, gameState.league.currentSeason, divisionName, bestAvgRating.toFixed(2)) : p)
                    }));
                    newLogEntries.push(`${winner.name} wins ${divisionName} Player of the Season with an average rating of ${bestAvgRating.toFixed(2)}! (S${gameState.league.currentSeason})`);
                });
            }
        }

        const eligibleForYOTS = eligibleForPOTS.filter(p => p.attributes.age <= YOUNG_PLAYER_AGE_LIMIT);
        const yotsWinners = [...eligibleForYOTS].sort((a,b) => (b.stats.totalMatchRating / b.stats.matchesRatedThisSeason) - (a.stats.totalMatchRating / a.stats.matchesRatedThisSeason));
        if (yotsWinners.length > 0) {
            const bestYoungAvgRating = (yotsWinners[0].stats.totalMatchRating / yotsWinners[0].stats.matchesRatedThisSeason);
            if (bestYoungAvgRating >= 6.0) { 
                yotsWinners.filter(p => (p.stats.totalMatchRating / p.stats.matchesRatedThisSeason) === bestYoungAvgRating).forEach(winner => {
                    updatedGameState.teams = updatedGameState.teams.map(team => ({
                        ...team, players: team.players.map(p => p.id === winner.id ? grantAward(p, AwardIdBase.LEAGUE_YOUNG_PLAYER_OF_THE_SEASON, `${divisionName} Young Player of the Season - S${gameState.league.currentSeason}`, `Age: ${p.attributes.age}, Avg Rating: ${bestYoungAvgRating.toFixed(2)}`, AwardType.SEASONAL_LEAGUE, gameState.league.currentSeason, divisionName, bestYoungAvgRating.toFixed(2)) : p)
                    }));
                    newLogEntries.push(`${winner.name} (Age ${winner.attributes.age}) wins ${divisionName} Young Player of the Season with an average rating of ${bestYoungAvgRating.toFixed(2)}! (S${gameState.league.currentSeason})`);
                });
            }
        }
    });

    updatedGameState.teams = updatedGameState.teams.map(team => ({
        ...team,
        players: team.players.map(p => {
            const { updatedPlayer, newLogEntries: achievementLogs } = checkAndGrantCareerAchievements(p, updatedGameState);
            newLogEntries.push(...achievementLogs);
            return updatedPlayer;
        })
    }));

    return { updatedGameState, newLogEntries };
};

const generateMediaQuestion = async (player: Player, team: Team | null): Promise<string> => {
    if (!ai || !player.lastMatchPerformance) {
      return "The media had no specific questions for you after the last game.";
    }
  
    const perf = player.lastMatchPerformance;
    const resultText = perf.rating > 7 ? "a great result" : perf.rating < 5 ? "a disappointing outcome" : "a mixed result";
    const playerFocus = `Your performance included ${perf.goals} goals, ${perf.assists} assists, and a rating of ${perf.rating.toFixed(1)}.`;
  
    const prompt = `You are a sports journalist. Generate one concise, open-ended question for football player ${player.name} of ${team?.name || 'their club'} after a match which was ${resultText} for them. ${playerFocus}. Ask about their feelings, the team's performance, or future outlook. Avoid yes/no questions.`;
  
    try {
      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-preview-04-17', contents: prompt });
      return response.text.trim();
    } catch (error) {
      console.error("Error generating media question:", error);
      return "Awaiting media questions...";
    }
};
  
const generateInteractions = async (gameState: GameState): Promise<Interaction[]> => {
    const newInteractions: Interaction[] = [];
    const userPlayer = gameState.teams.flatMap(t => t.players).find(p => p.id === gameState.userPlayerId);
    const playerTeam = userPlayer?.teamId ? gameState.teams.find(t => t.id === userPlayer.teamId) : null;
  
    if (!userPlayer || userPlayer.currentInjury) return []; 
  
    if (userPlayer.lastMatchPerformance && Math.random() < 0.4) { 
      const question = await generateMediaQuestion(userPlayer, playerTeam);
      const options: InteractionOption[] = [
        { id: 'media_positive', text: "Praise the team and look forward positively.", effects: [
            { target: InteractionEffectTarget.PLAYER_ATTRIBUTE, stat: 'fanSupport', change: 5, logPrivate: "The fans appreciate your positive attitude." },
            { target: InteractionEffectTarget.PLAYER_ATTRIBUTE, stat: 'pressRelations', change: 3, logPrivate: "The media noted your positive comments." },
            { target: InteractionEffectTarget.PLAYER_ATTRIBUTE, stat: 'morale', change: 2 }
        ]},
        { id: 'media_humble', text: "Acknowledge your role but focus on team effort.", effects: [
            { target: InteractionEffectTarget.PLAYER_ATTRIBUTE, stat: 'fanSupport', change: 3 },
            { target: InteractionEffectTarget.PLAYER_ATTRIBUTE, stat: 'pressRelations', change: 5, logPrivate: "Your humility was well-received by the press." },
            { target: InteractionEffectTarget.MANAGER_RELATIONSHIP, change: 2, logPrivate: "Your manager appreciates your team-first mentality."}
        ]},
        { id: 'media_critical_self', text: "Critique your own performance, vow to improve.", effects: [
            { target: InteractionEffectTarget.PLAYER_ATTRIBUTE, stat: 'pressRelations', change: 2 },
            { target: InteractionEffectTarget.PLAYER_ATTRIBUTE, stat: 'morale', change: -2, logPrivate: "You feel the pressure to improve."},
            { target: InteractionEffectTarget.MANAGER_RELATIONSHIP, change: 3, logPrivate: "Your manager respects your self-awareness."}
        ]},
         { id: 'media_no_comment', text: "Offer a polite 'no comment' or a generic statement.", effects: [
            { target: InteractionEffectTarget.PLAYER_ATTRIBUTE, stat: 'pressRelations', change: -5, logPrivate: "The media were disappointed by your lack of engagement." },
         ]}
      ];
      newInteractions.push({
        interactionId: `media-${Date.now()}`, type: InteractionType.MEDIA_INTERVIEW_POST_MATCH,
        promptText: question, options, status: 'PENDING',
        triggerSeason: gameState.league.currentSeason, triggerWeek: gameState.league.currentWeek,
        expiresOnWeek: gameState.league.currentWeek + INTERACTION_EXPIRY_DURATION_WEEKS,
      });
    }
  
    if (Math.random() < 0.2) { 
      let prompt = "The manager calls you into their office. 'How are you feeling about your current form and role in the team?'";
      if(userPlayer.attributes.form < 40) prompt = "The manager looks concerned. 'Your recent performances haven't been up to scratch. What's going on?'";
      else if (userPlayer.attributes.form > 80) prompt = "The manager beams. 'Excellent work recently! You're a key part of our success. Anything on your mind?'"

      const options: InteractionOption[] = [
        { id: 'manager_positive', text: "Express confidence and commitment.", effects: [
            { target: InteractionEffectTarget.MANAGER_RELATIONSHIP, change: 5, logPrivate: "Your manager seems pleased with your attitude." },
            { target: InteractionEffectTarget.PLAYER_ATTRIBUTE, stat: 'morale', change: 3 }
        ]},
        { id: 'manager_ask_feedback', text: "Ask for specific feedback on how to improve.", effects: [
            { target: InteractionEffectTarget.MANAGER_RELATIONSHIP, change: 7, logPrivate: "Your manager appreciates your desire to improve." },
        ]},
        { id: 'manager_raise_concern', text: "Politely raise a minor concern (e.g., playing time if low, preferred role).", effects: [
            { target: InteractionEffectTarget.MANAGER_RELATIONSHIP, change: userPlayer.managerRelationship > 60 ? 2 : -3, logPrivate: userPlayer.managerRelationship > 60 ? "Your manager listened to your concern." : "Your manager seemed a bit defensive about your concern." },
            { target: InteractionEffectTarget.PLAYER_ATTRIBUTE, stat: 'morale', change: -1 }
        ]},
      ];
      newInteractions.push({
        interactionId: `manager-${Date.now()}`, type: InteractionType.MANAGER_TALK_FORM,
        promptText: prompt, options, status: 'PENDING',
        triggerSeason: gameState.league.currentSeason, triggerWeek: gameState.league.currentWeek,
        expiresOnWeek: gameState.league.currentWeek + INTERACTION_EXPIRY_DURATION_WEEKS,
      });
    }
    return newInteractions;
};

export const handleInteractionResponse = (gameState: GameState, interactionId: string, optionId: string): GameState => {
    let updatedGameState = { ...gameState };
    const interactionIndex = updatedGameState.pendingInteractions.findIndex(i => i.interactionId === interactionId);
  
    if (interactionIndex === -1) return updatedGameState;
  
    const interaction = updatedGameState.pendingInteractions[interactionIndex];
    const chosenOption = interaction.options.find(opt => opt.id === optionId);
  
    if (!chosenOption) return updatedGameState;
  
    let userPlayer = updatedGameState.teams.flatMap(t => t.players).find(p => p.id === updatedGameState.userPlayerId);
    if (!userPlayer) return updatedGameState;
  
    const newLogEntries: string[] = [];
  
    chosenOption.effects.forEach(effect => {
      switch (effect.target) {
        case InteractionEffectTarget.PLAYER_ATTRIBUTE:
          if (effect.stat && userPlayer!.attributes[effect.stat] !== undefined) {
            userPlayer!.attributes[effect.stat] = Math.max(0, Math.min(100, userPlayer!.attributes[effect.stat] + effect.change));
          }
          break;
        case InteractionEffectTarget.MANAGER_RELATIONSHIP:
          userPlayer!.managerRelationship = Math.max(0, Math.min(100, userPlayer!.managerRelationship + effect.change));
          break;
      }
      if (effect.logPublic) newLogEntries.push(effect.logPublic);
      if (effect.logPrivate) newLogEntries.push(`(Private) ${effect.logPrivate}`);
    });
  
    updatedGameState.pendingInteractions[interactionIndex].status = 'COMPLETED';
  
    updatedGameState.teams = updatedGameState.teams.map(t => {
      const updatedPlayers = t.players.map(p => p.id === userPlayer!.id ? userPlayer! : p);
      const newTeamChemistry = calculateTeamChemistry({ ...t, players: updatedPlayers });
      return { ...t, players: updatedPlayers, teamChemistry: newTeamChemistry };
    });
    
    updatedGameState.gameLog = [...updatedGameState.gameLog, ...newLogEntries].slice(-50);
    return updatedGameState;
};

const selectNationalSquads = (gameState: GameState): { updatedNationalTeams: NationalTeam[], updatedPlayers: Player[], newLogEntries: string[] } => {
    const newLogEntries: string[] = [];
    let allPlayers = gameState.teams.flatMap(t => t.players);

    const updatedNationalTeams = gameState.nationalTeams.map(natTeam => {
        const eligiblePlayers = allPlayers
            .filter(p => !p.currentInjury && 
                         p.nationality === natTeam.nationalityRepresented && 
                         p.attributes.reputation >= MIN_REPUTATION_FOR_NATIONAL_CALL &&
                         p.attributes.form >= NATIONAL_TEAM_SELECTION_MIN_FORM &&
                         p.teamId !== null 
                         )
            .sort((a, b) => b.attributes.reputation - a.attributes.reputation || b.attributes.form - a.attributes.form)
            .slice(0, NATIONAL_TEAM_SQUAD_SIZE);

        if (eligiblePlayers.some(p => p.id === gameState.userPlayerId && p.isUserPlayer) && !allPlayers.find(p=>p.id===gameState.userPlayerId)!.isOnNationalTeam) {
            newLogEntries.push(`${allPlayers.find(p=>p.id===gameState.userPlayerId)!.name} has been called up to the ${natTeam.name}!`);
        }
        
        return { ...natTeam, squad: eligiblePlayers.map(p => p.id) };
    });

    const updatedPlayers = allPlayers.map(p => {
        const nationalTeam = updatedNationalTeams.find(nt => nt.nationalityRepresented === p.nationality);
        const newIsOnNationalTeam = nationalTeam ? nationalTeam.squad.includes(p.id) : false;
        if (p.isUserPlayer && newIsOnNationalTeam && !p.isOnNationalTeam) {
        } else if (p.isUserPlayer && !newIsOnNationalTeam && p.isOnNationalTeam) {
            newLogEntries.push(`${p.name} has been dropped from the ${nationalTeam?.name || 'national squad'}.`);
        }
        return { ...p, isOnNationalTeam: newIsOnNationalTeam };
    });

    return { updatedNationalTeams, updatedPlayers, newLogEntries };
};

const scheduleAndPrepareInternationalMatch = (gameState: GameState): GameState => {
    let updatedGameState = { ...gameState, upcomingInternationalMatch: null as UpcomingInternationalMatch | null };
    const userPlayer = updatedGameState.teams.flatMap(t => t.players).find(p => p.id === updatedGameState.userPlayerId);

    if (userPlayer && userPlayer.isOnNationalTeam && !userPlayer.currentInjury) { 
        const userNationalTeam = updatedGameState.nationalTeams.find(nt => nt.nationalityRepresented === userPlayer.nationality);
        if (userNationalTeam) {
            const otherNationalTeams = updatedGameState.nationalTeams.filter(nt => nt.id !== userNationalTeam.id);
            if (otherNationalTeams.length > 0) {
                const opponentNationalTeam = otherNationalTeams[Math.floor(Math.random() * otherNationalTeams.length)];
                updatedGameState.upcomingInternationalMatch = {
                    week: updatedGameState.league.currentWeek,
                    homeNationalTeamId: userNationalTeam.id, 
                    awayNationalTeamId: opponentNationalTeam.id,
                    userPlayerInvolved: true,
                    matchType: 'Friendly',
                };
            }
        }
    }
    return updatedGameState;
};

export const setPlayerTacticalInstruction = (currentPlayer: Player, instructionId: PlayerTacticalInstructionId | null): {updatedPlayer: Player, logEntry: string} => {
  const updatedPlayer = { ...currentPlayer, activeTacticalInstruction: instructionId };
  let logEntry = `${currentPlayer.name} has cleared their tactical instruction.`;
  if (instructionId && instructionId !== PlayerTacticalInstructionId.NONE) {
    const instructionDetails = AVAILABLE_TACTICAL_INSTRUCTIONS.find(inst => inst.id === instructionId);
    logEntry = `${currentPlayer.name} will now focus on: ${instructionDetails?.name || 'a new tactic'}.`;
  }
  return { updatedPlayer, logEntry };
};


export const advanceWeek = async (currentGameState: GameState): Promise<GameState> => {
  let newState = { ...currentGameState };
  newState.league.currentWeek += 1;
  let newLogEntries: string[] = [];

  const newTransferWindowStatus = updateTransferWindowStatus(newState.league.currentWeek);
  if (newTransferWindowStatus !== newState.transferWindowStatus) {
      newState.transferWindowStatus = newTransferWindowStatus;
      newLogEntries.push(`Transfer window is now ${newState.transferWindowStatus === 'CLOSED' ? 'CLOSED' : 'OPEN'}.`);
  }

  newState.pendingTransferOffers = newState.pendingTransferOffers.map((offer: TransferOffer): TransferOffer => {
    if (offer.status === 'PENDING_PLAYER_RESPONSE' && 
        (newState.league.currentSeason > offer.expiresOnSeason || 
        (newState.league.currentSeason === offer.expiresOnSeason && newState.league.currentWeek >= offer.expiresOnWeek))) {
      newLogEntries.push(`Offer from ${offer.fromTeamName} for ${newState.teams.flatMap(t=>t.players).find(p=>p.id === offer.toPlayerId)?.name} has expired.`);
      return {...offer, status: 'EXPIRED' as TransferOfferStatus};
    }
    return offer;
  }).filter((offer: TransferOffer) => offer.status !== 'EXPIRED' || currentGameState.pendingTransferOffers.includes(offer)); 


  newState.pendingInteractions = newState.pendingInteractions.map(interaction => {
    if (interaction.status === 'PENDING' && newState.league.currentWeek >= interaction.expiresOnWeek && newState.league.currentSeason === interaction.triggerSeason) {
      newLogEntries.push(`Interaction opportunity '${interaction.type.replace(/_/g, ' ').toLowerCase()}' has expired.`);
      return { ...interaction, status: 'COMPLETED' }; 
    }
    return interaction;
  });


  if (newState.userPlayerId) {
      newState = generateAndAddTransferOffers(newState); 
      newLogEntries.push(...(newState.gameLog.slice(currentGameState.gameLog.length))); 
      newState.gameLog = currentGameState.gameLog; 

      const newGeneratedInteractions = await generateInteractions(newState);
      newState.pendingInteractions = [...newState.pendingInteractions, ...newGeneratedInteractions];
  }
  
  let userPlayer = newState.teams.flatMap(t => t.players).find(p => p.id === newState.userPlayerId);
  if (userPlayer && userPlayer.teamId && userPlayer.transferRequestStatus === TransferRequestStatus.REQUESTED_BY_PLAYER && !userPlayer.currentInjury) {
      const club = newState.teams.find(t => t.id === userPlayer!.teamId);
      if (club) { 
        const approvalChance = 0.4 + (userPlayer.managerRelationship / 250); 
        if (Math.random() < approvalChance) { 
            userPlayer.transferRequestStatus = TransferRequestStatus.APPROVED_BY_CLUB;
            userPlayer.isTransferListedByClub = true;
            newLogEntries.push(`${userPlayer.name}'s transfer request has been APPROVED by ${club.name}. They are now transfer listed.`);
        } else {
            userPlayer.transferRequestStatus = TransferRequestStatus.REJECTED_BY_CLUB;
            newLogEntries.push(`${userPlayer.name}'s transfer request has been REJECTED by ${club.name}.`);
            userPlayer.attributes.morale = Math.max(0, userPlayer.attributes.morale - 10);
            userPlayer.managerRelationship = Math.max(0, userPlayer.managerRelationship - 15);
        }
        newState.teams = newState.teams.map(t => ({...t, players: t.players.map(p => p.id === userPlayer!.id ? userPlayer! : p)}));
      }
  }
  
  if (userPlayer && userPlayer.currentInjury) {
      userPlayer.currentInjury.weeksRemaining--;
      if (userPlayer.currentInjury.weeksRemaining <= 0) {
          newLogEntries.push(`${userPlayer.name} has recovered from their ${userPlayer.currentInjury.type}!`);
          userPlayer.currentInjury = null;
          userPlayer.attributes.form = Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, userPlayer.attributes.form + 20);
          userPlayer.attributes.morale = Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, userPlayer.attributes.morale + 10);
      } else {
          userPlayer.currentInjury.recoveryProgress = Math.min(100, Math.floor(((userPlayer.currentInjury.durationWeeks - userPlayer.currentInjury.weeksRemaining) / userPlayer.currentInjury.durationWeeks) * 100));
          newLogEntries.push(`${userPlayer.name} is still recovering from ${userPlayer.currentInjury.type} (${userPlayer.currentInjury.weeksRemaining} weeks left).`);
      }
      newState.teams = newState.teams.map(team => ({ ...team, players: team.players.map(p => p.id === userPlayer!.id ? userPlayer! : p) }));
  }
  
  const isInternationalWeek = newState.internationalFixtureWeeks.includes(newState.league.currentWeek);
  if (isInternationalWeek) {
      newLogEntries.push(`It's an international break! Week ${newState.league.currentWeek}.`);
      const selectionResult = selectNationalSquads(newState);
      newState.nationalTeams = selectionResult.updatedNationalTeams;
      newState.teams = newState.teams.map(team => ({ 
          ...team,
          players: team.players.map(p => selectionResult.updatedPlayers.find(up => up.id === p.id) || p)
      }));
      newLogEntries.push(...selectionResult.newLogEntries);

      newState = scheduleAndPrepareInternationalMatch(newState);
      userPlayer = newState.teams.flatMap(t => t.players).find(p => p.id === newState.userPlayerId);

      if (newState.upcomingInternationalMatch && userPlayer && userPlayer.isOnNationalTeam && !userPlayer.currentInjury) {
          const homeNatTeam = newState.nationalTeams.find(nt => nt.id === newState.upcomingInternationalMatch!.homeNationalTeamId);
          const awayNatTeam = newState.nationalTeams.find(nt => nt.id === newState.upcomingInternationalMatch!.awayNationalTeamId);

          if (homeNatTeam && awayNatTeam) {
              const allPlayersForSim = newState.teams.flatMap(t => t.players);
              const intMatchResult = simulateSingleMatch(homeNatTeam, awayNatTeam, userPlayer, allPlayersForSim);
              newLogEntries.push(`International Friendly: ${intMatchResult.summary}`);

              if (intMatchResult.playerPerformances && intMatchResult.playerPerformances[userPlayer.id]) {
                  let perf = intMatchResult.playerPerformances[userPlayer.id] as PlayerMatchPerformance;
                  perf.narrativeSummary = await generateMatchNarrative(perf, userPlayer.name, homeNatTeam.name, awayNatTeam.name, intMatchResult.homeScore, intMatchResult.awayScore, true);
                  
                  userPlayer.lastMatchPerformance = perf;
                  userPlayer.internationalCaps++;
                  userPlayer.internationalGoals += perf.goals;
                  userPlayer.careerStats.totalInternationalCaps = (userPlayer.careerStats.totalInternationalCaps || 0) + 1;
                  userPlayer.careerStats.totalInternationalGoals = (userPlayer.careerStats.totalInternationalGoals || 0) + perf.goals;

                  userPlayer.attributes.form = Math.min(100, Math.max(0, userPlayer.attributes.form + Math.floor(perf.rating) - 5));
                  userPlayer.attributes.morale += Math.floor(perf.rating / 1.5) - 3; 
                  userPlayer.attributes.stamina = Math.max(0, userPlayer.attributes.stamina - generateRandomAttribute(15,25));
                  userPlayer.attributes.reputation = Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, userPlayer.attributes.reputation + (perf.rating > 7 ? 2 : perf.rating < 5 ? -1 : 1));

                  const { updatedPlayer: pAfterTraits, newLogEntries: traitLogs } = checkAndUnlockTraits(userPlayer, newState);
                  userPlayer = pAfterTraits; newLogEntries.push(...traitLogs);
                  const { updatedPlayer: pAfterAch, newLogEntries: achLogs } = checkAndGrantCareerAchievements(userPlayer, newState);
                  userPlayer = pAfterAch; newLogEntries.push(...achLogs);

                  newState.teams = newState.teams.map(team => ({
                      ...team, players: team.players.map(p => p.id === userPlayer!.id ? userPlayer! : p)
                  }));
              }
          }
      } else if (userPlayer && userPlayer.isOnNationalTeam && userPlayer.currentInjury) {
          newLogEntries.push(`${userPlayer.name} misses the international match for ${userPlayer.nationality} due to injury.`);
      }
      newState.upcomingInternationalMatch = null; 
  } else {
      const schedule = generateScheduleForWeek(newState.league, newState.teams, newState.league.currentWeek);
      const matchResults: MatchResult[] = [];
      const allPlayersForClubSim = newState.teams.flatMap(t => t.players);

      for (const match of schedule) {
          const homeTeam = newState.teams.find(t => t.id === match.homeTeamId);
          const awayTeam = newState.teams.find(t => t.id === match.awayTeamId);
          if (homeTeam && awayTeam) {
              const result = simulateSingleMatch(homeTeam, awayTeam, userPlayer, allPlayersForClubSim);
              matchResults.push(result);

              homeTeam.matchesPlayed++;
              awayTeam.matchesPlayed++;
              homeTeam.goalsFor += result.homeScore;
              homeTeam.goalsAgainst += result.awayScore;
              awayTeam.goalsFor += result.awayScore;
              awayTeam.goalsAgainst += result.homeScore;

              if (result.homeScore > result.awayScore) {
                  homeTeam.wins++; homeTeam.points += 3; awayTeam.losses++;
              } else if (result.awayScore > result.homeScore) {
                  awayTeam.wins++; awayTeam.points += 3; homeTeam.losses++;
              } else {
                  homeTeam.draws++; awayTeam.draws++; homeTeam.points += 1; awayTeam.points += 1;
              }
              newLogEntries.push(`Match: ${result.summary}`);
          }
      }
      
      userPlayer = newState.teams.flatMap(t => t.players).find(p => p.id === newState.userPlayerId);
      const userPlayerTeamId = userPlayer?.teamId;

      if (userPlayer && userPlayerTeamId && !userPlayer.currentInjury) {
          const playerTeamForMatch = newState.teams.find(t => t.id === userPlayerTeamId); 
          if (playerTeamForMatch) { 
              const userMatch = matchResults.find(m => (m.homeTeamId === userPlayerTeamId || m.awayTeamId === userPlayerTeamId) && m.playerPerformances && m.playerPerformances[userPlayer!.id]);
              if (userMatch && userMatch.playerPerformances && userMatch.playerPerformances[userPlayer.id]) {
                  let perf = userMatch.playerPerformances[userPlayer.id] as PlayerMatchPerformance; 

                  const opponentTeamId = userMatch.homeTeamId === playerTeamForMatch?.id ? userMatch.awayTeamId : userMatch.homeTeamId;
                  const opponentTeam = newState.teams.find(t => t.id === opponentTeamId);
                  const playerScore = userMatch.homeTeamId === playerTeamForMatch?.id ? userMatch.homeScore : userMatch.awayScore;
                  const opponentScore = userMatch.homeTeamId === playerTeamForMatch?.id ? userMatch.awayScore : userMatch.homeScore;

                  if (playerTeamForMatch && opponentTeam) {
                      perf.narrativeSummary = "Loading summary..."; 
                      userPlayer.lastMatchPerformance = perf; 
                      generateMatchNarrative(perf, userPlayer.name, playerTeamForMatch.name, opponentTeam.name, playerScore, opponentScore, false)
                          .then(narrative => {
                              const latestPlayerInState = newState.teams.flatMap(t => t.players).find(p => p.id === userPlayer!.id);
                              if (latestPlayerInState && latestPlayerInState.lastMatchPerformance) {
                                  latestPlayerInState.lastMatchPerformance.narrativeSummary = narrative;
                              }
                          });
                  }

                  userPlayer.stats.appearances++;
                  userPlayer.stats.goals += perf.goals;
                  userPlayer.stats.assists += perf.assists;
                  if(perf.rating > 0){ userPlayer.stats.totalMatchRating += perf.rating; userPlayer.stats.matchesRatedThisSeason++; }
                  
                  userPlayer.attributes.form = Math.min(100, Math.max(0, userPlayer.attributes.form + Math.floor(perf.rating) - 6)); 
                  userPlayer.attributes.morale += Math.floor(perf.rating / 2) - 2; 
                  if (hasTrait(userPlayer, PlayerTraitId.FAN_FAVOURITE) && perf.rating > 7) userPlayer.attributes.fanSupport = Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, userPlayer.attributes.fanSupport + 2);
                  else userPlayer.attributes.fanSupport = Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, userPlayer.attributes.fanSupport + (perf.rating > 6 ? 1: -1));
                  userPlayer.attributes.stamina = Math.max(0, userPlayer.attributes.stamina - generateRandomAttribute(10,20)); 
                  if (hasTrait(userPlayer, PlayerTraitId.SEASONED_PRO) || hasTrait(userPlayer, PlayerTraitId.WORKHORSE)) {
                      userPlayer.attributes.stamina = Math.max(0, userPlayer.attributes.stamina + 5); 
                  }
                  const divisionMultiplier = 1 + ( (DIVISION_NAMES_ORDERED.length - 1 - DIVISION_NAMES_ORDERED.indexOf(playerTeamForMatch?.division || DivisionName.FIFTH)) * 0.2); 
                  if (perf.rating > 7.5) userPlayer.attributes.reputation = Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, userPlayer.attributes.reputation + Math.round(1 * divisionMultiplier));
                  else if (perf.rating < 5.5) userPlayer.attributes.reputation = Math.max(0, userPlayer.attributes.reputation - Math.round(1 * divisionMultiplier));
                  userPlayer.attributes.morale = Math.min(100, Math.max(0, userPlayer.attributes.morale));
                  userPlayer.attributes.fanSupport = Math.min(100, Math.max(0, userPlayer.attributes.fanSupport));
                  userPlayer.managerRelationship = Math.max(0, Math.min(100, userPlayer.managerRelationship + (perf.rating > 7 ? 1 : perf.rating < 5 ? -1 : 0)));

                  const { updatedPlayer: pInjuryCheck, injuryLog } = checkForAndApplyInjury(userPlayer, newState, 'match');
                  userPlayer = pInjuryCheck;
                  if (injuryLog) newLogEntries.push(injuryLog);


                  const { updatedPlayer: playerAfterTraits, newLogEntries: traitLogEntries } = checkAndUnlockTraits(userPlayer, newState);
                  userPlayer = playerAfterTraits; newLogEntries.push(...traitLogEntries);
                  const { updatedPlayer: playerAfterAchievements, newLogEntries: achievementLogs } = checkAndGrantCareerAchievements(userPlayer, newState); 
                  userPlayer = playerAfterAchievements; newLogEntries.push(...achievementLogs);

                  newState.teams = newState.teams.map(team => ({ ...team, players: team.players.map(p => p.id === userPlayer!.id ? userPlayer! : p) }));
              } else { 
                  userPlayer.attributes.form = Math.min(100, userPlayer.attributes.form + 2); 
                  userPlayer.attributes.stamina = Math.min(100, userPlayer.attributes.stamina + 10); 
                  userPlayer.lastMatchPerformance = null; 
                  newState.teams = newState.teams.map(team => ({ ...team, players: team.players.map(p => p.id === userPlayer!.id ? userPlayer! : p) }));
              }
          } 
      } else if (userPlayer) { 
          if (!userPlayer.currentInjury) { 
              userPlayer.attributes.form = Math.min(100, userPlayer.attributes.form + 1); 
              userPlayer.attributes.stamina = Math.min(100, userPlayer.attributes.stamina + 5); 
          }
          userPlayer.lastMatchPerformance = null; 
          newState.teams = newState.teams.map(team => ({ ...team, players: team.players.map(p => p.id === userPlayer!.id ? userPlayer! : p) }));
      }
  }
  
  if (isInternationalWeek && userPlayer) { 
      userPlayer.isOnNationalTeam = false;
      newState.teams = newState.teams.map(team => ({
          ...team, players: team.players.map(p => p.id === userPlayer!.id ? userPlayer! : (p.isOnNationalTeam ? {...p, isOnNationalTeam: false} : p))
      }));
  }


  newState.teams = newState.teams.map(team => ({ ...team, teamChemistry: calculateTeamChemistry(team) }));

  if (newState.league.currentWeek > WEEKS_PER_SEASON) {
    newLogEntries.push(`Season ${newState.league.currentSeason} has ended!`);
    const { updatedGameState: stateAfterAwards, newLogEntries: awardLogEntries } = processEndOfSeasonAwardsAndAchievements(newState);
    newState = stateAfterAwards; newLogEntries.push(...awardLogEntries);
    newLogEntries.push(`Processing promotions and relegations...`);
    const divisionChanges: { teamId: string, newDivision: DivisionName, oldDivision: DivisionName }[] = [];

    for (let i = 0; i < DIVISION_NAMES_ORDERED.length; i++) {
        const currentDivisionName = DIVISION_NAMES_ORDERED[i];
        const teamsInDivision = newState.teams.filter(t => t.division === currentDivisionName)
            .sort((a, b) => { if (b.points !== a.points) return b.points - a.points; const gdA = a.goalsFor - a.goalsAgainst; const gdB = b.goalsFor - b.goalsAgainst; if (gdB !== gdA) return gdB - gdA; if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor; return a.name.localeCompare(b.name); });

        if (i > 0) { 
            const teamsToPromote = teamsInDivision.slice(0, PROMOTION_COUNT);
            const targetDivisionName = DIVISION_NAMES_ORDERED[i - 1]; 
            teamsToPromote.forEach(team => {
                divisionChanges.push({ teamId: team.id, newDivision: targetDivisionName, oldDivision: currentDivisionName });
                const userP = team.players.find(p => p.id === newState.userPlayerId && p.isUserPlayer);
                if(userP){
                    const promotionAwardName = `Promoted with ${team.name} to ${targetDivisionName} - S${newState.league.currentSeason}`;
                    const promotionAwardDesc = `Achieved promotion from ${currentDivisionName} with ${team.name}.`;
                    const updatedUserP = grantAward(userP, AwardIdBase.CAREER_PROMOTION_WON, promotionAwardName, promotionAwardDesc, AwardType.CAREER_MILESTONE, newState.league.currentSeason, currentDivisionName, team.name);
                    updatedUserP.careerStats.promotionsWon.push({ fromDivision: currentDivisionName, toDivision: targetDivisionName, season: newState.league.currentSeason, teamName: team.name });
                    team.players = team.players.map(p => p.id === userP.id ? updatedUserP : p);
                    newLogEntries.push(`${userP.name} has been promoted with ${team.name} to ${targetDivisionName}! (Career Achievement)`);
                }
            });
        }
        if (i < DIVISION_NAMES_ORDERED.length - 1) { 
            const teamsToRelegate = teamsInDivision.slice(-RELEGATION_COUNT);
            const targetDivisionName = DIVISION_NAMES_ORDERED[i + 1]; 
            teamsToRelegate.forEach(team => divisionChanges.push({ teamId: team.id, newDivision: targetDivisionName, oldDivision: currentDivisionName }));
        }
        if (teamsInDivision.length > 0 && teamsInDivision[0].points > 0 && teamsInDivision[0].players.some(p => p.id === newState.userPlayerId && p.isUserPlayer)) {
            let userWinningPlayer = teamsInDivision[0].players.find(p => p.id === newState.userPlayerId && p.isUserPlayer)!;
            const leagueTitleAwardName = `Won ${currentDivisionName} with ${teamsInDivision[0].name} - S${newState.league.currentSeason}`;
            const leagueTitleAwardDesc = `Clinched the ${currentDivisionName} title.`;
            userWinningPlayer = grantAward(userWinningPlayer, AwardIdBase.CAREER_LEAGUE_TITLE_WON, leagueTitleAwardName, leagueTitleAwardDesc, AwardType.CAREER_MILESTONE, newState.league.currentSeason, currentDivisionName, teamsInDivision[0].name);
            userWinningPlayer.careerStats.leagueTitlesWon.push({ division: currentDivisionName, season: newState.league.currentSeason, teamName: teamsInDivision[0].name });
            teamsInDivision[0].players = teamsInDivision[0].players.map(p => p.id === userWinningPlayer.id ? userWinningPlayer : p);
            newLogEntries.push(`${userWinningPlayer.name} has won ${currentDivisionName} with ${teamsInDivision[0].name}! (Career Achievement)`);
        }
    }
    
    newState.teams = newState.teams.map(team => {
        const change = divisionChanges.find(dc => dc.teamId === team.id);
        if (change) {
            if (change.newDivision !== change.oldDivision) { 
                 if (DIVISION_NAMES_ORDERED.indexOf(change.newDivision) < DIVISION_NAMES_ORDERED.indexOf(change.oldDivision)) newLogEntries.push(`${team.name} has been PROMOTED from ${change.oldDivision} to ${change.newDivision}!`);
                 else newLogEntries.push(`${team.name} has been RELEGATED from ${change.oldDivision} to ${change.newDivision}.`);
                 team.division = change.newDivision;
                 team.budget = getBaseBudgetByDivision(team.division) * (0.85 + Math.random() * 0.3); 
                 team.reputation = Math.min(MAX_MORALE_FORM_STAMINA_REPUTATION, Math.max(10, getBaseReputationByDivision(team.division) + generateRandomAttribute(-5, 10)));
            }
        }
        return team;
    });
    newState.league.divisions = { [DivisionName.FIRST]: [], [DivisionName.SECOND]: [], [DivisionName.THIRD]: [], [DivisionName.FOURTH]: [], [DivisionName.FIFTH]: [] };
    newState.teams.forEach(team => {
        if (newState.league.divisions[team.division]) newState.league.divisions[team.division].push(team);
        else { console.warn(`Team ${team.name} (ID: ${team.id}) assigned to an unexpected division: ${team.division}. Placing in lowest.`); newState.league.divisions[DIVISION_NAMES_ORDERED[DIVISION_NAMES_ORDERED.length -1]].push(team); }
    });
    newState.league.currentSeason += 1;
    newState.league.currentWeek = 1;
    newLogEntries.push(`Starting new season: ${newState.league.currentSeason}.`);
    newState.teams.forEach(team => {
      team.matchesPlayed=0; team.wins=0; team.draws=0; team.losses=0; team.points=0; team.goalsFor=0; team.goalsAgainst=0;
      team.players.forEach(p => {
        p.stats = { goals:0, assists:0, appearances:0, totalMatchRating:0, matchesRatedThisSeason:0 };
        if (!p.isUserPlayer || (p.isUserPlayer && !p.currentInjury)) { 
            p.attributes.age +=1;
        }
        if (!p.isUserPlayer) { const devP = developNpcPlayerAttributes(p, team.division); p.attributes = devP.attributes; }
        p.attributes.form = Math.max(50, Math.min(85, p.attributes.form + generateRandomAttribute(-10, 10))); 
        p.attributes.stamina = MAX_MORALE_FORM_STAMINA_REPUTATION; 
        if(p.attributes.age > RETIREMENT_START_AGE + Math.random() * 7 && !p.isUserPlayer) { 
            newLogEntries.push(`${p.name} (${p.attributes.age}) from ${team.name} has retired.`);
            if (p.currentKitNumber !== null) {
                team.usedKitNumbers = team.usedKitNumbers.filter(kn => kn !== p.currentKitNumber);
            }
            team.players = team.players.filter(pl => pl.id !== p.id);
            if(team.players.length < MIN_PLAYERS_PER_TEAM && team.players.length < MAX_PLAYERS_PER_TEAM) {
                 const newNpc = generateNpcPlayer(`npc-${team.id}-retired-${p.attributes.age}-${Date.now()}`, team, newState.league.currentSeason, p.preferredPosition);
                 const { updatedPlayer: npcWithKit, updatedTeam: teamAfterNewNpcKit } = assignKitNumber(newNpc, team, null);
                 team.players.push(npcWithKit);
                 team.usedKitNumbers = teamAfterNewNpcKit.usedKitNumbers;
            }
        }
        if(p.isUserPlayer && p.teamId && p.contractExpirySeason < newState.league.currentSeason) { 
            const club = newState.teams.find(t => t.id === p.teamId);
            newLogEntries.push(`${p.name}'s contract with ${club?.name || 'their club'} has expired! They are now a free agent.`);
            if (p.currentKitNumber !== null && club) {
                club.usedKitNumbers = club.usedKitNumbers.filter(kn => kn !== p.currentKitNumber);
            }
            p.teamId = null; p.weeklyWage = 0; p.currentKitNumber = null;
            if (p.clubHistory.length > 0) p.clubHistory[p.clubHistory.length - 1].leftWeek = WEEKS_PER_SEASON; 
            p.clubHistory.push({teamName: "Free Agent", season: newState.league.currentSeason, joinedWeek: 1});
        }
      });
      team.teamChemistry = calculateTeamChemistry(team);
    });
    userPlayer = newState.teams.flatMap(t => t.players).find(p => p.id === newState.userPlayerId); 
    if(userPlayer) { 
        if(userPlayer.teamId) { userPlayer.transferRequestStatus = TransferRequestStatus.NONE; userPlayer.isTransferListedByClub = false; }
        userPlayer.managerRelationship = 50; 
        if(userPlayer.currentInjury) { 
            userPlayer.attributes.form = Math.max(10, Math.min(50, userPlayer.attributes.form)); 
        } else {
             userPlayer.attributes.form = Math.max(50, Math.min(85, userPlayer.attributes.form + generateRandomAttribute(-10, 10)));
        }
        newState.teams = newState.teams.map(team => ({ ...team, players: team.players.map(p => p.id === userPlayer!.id ? userPlayer! : p) }));
    }
  }
  
  newState.gameLog = [...currentGameState.gameLog, ...newLogEntries].slice(-50); 
  return newState;
};


const generateScheduleForWeek = (league: League, teams: Team[], week: number): { homeTeamId: string, awayTeamId: string }[] => {
  const fixtures: { homeTeamId: string, awayTeamId: string }[] = [];
  
  DIVISION_NAMES_ORDERED.forEach(divisionName => {
    const divisionTeams = teams.filter(t => t.division === divisionName);
    if (divisionTeams.length < 2) return;
    
    const availableTeams = [...divisionTeams];
    
    for (let i = availableTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableTeams[i], availableTeams[j]] = [availableTeams[j], availableTeams[i]];
    }

    while(availableTeams.length >= 2) {
        const homeTeam = availableTeams.pop();
        const awayTeam = availableTeams.pop();
        if(homeTeam && awayTeam) {
            if ( Math.random() < 0.5 ) { 
                 fixtures.push({ homeTeamId: homeTeam.id, awayTeamId: awayTeam.id });
            } else {
                 fixtures.push({ homeTeamId: awayTeam.id, awayTeamId: homeTeam.id });
            }
        }
    }
  });
  return fixtures;
};
