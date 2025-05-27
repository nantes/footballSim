
export enum PreferredPosition {
  GOALKEEPER = 'Goalkeeper',
  DEFENDER = 'Defender',
  MIDFIELDER = 'Midfielder',
  FORWARD = 'Forward',
}

export type PreferredFootType = 'Left' | 'Right' | 'Ambidextrous';

export interface PlayerAttributes {
  goalkeeping: number;
  tackle: number;
  passing: number;
  shooting: number;
  heading: number;
  morale: number;
  stamina: number;
  speed: number;
  skill: number; // Overall technical ability, dribbling
  age: number;
  value: number;
  pressRelations: number; // How media perceives player
  fanSupport: number; // How fans like player
  form: number; // Current match readiness (0-100)
  reputation: number; // Player's overall reputation (0-100)
  skillMoves: number; // 1-5 stars
  weakFootAccuracy: number; // 1-5 stars
}

export interface PlayerMatchPerformance {
  rating: number; // 1-10
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  tacklesAttempted: number;
  tacklesWon: number;
  keyPasses: number;
  interceptions: number;
  narrativeSummary: string; // Gemini-generated summary
}

export enum PlayerTraitId {
  CLINICAL_FINISHER = "CLINICAL_FINISHER",
  PLAYMAKER_VISION = "PLAYMAKER_VISION",
  DEFENSIVE_ROCK = "DEFENSIVE_ROCK",
  FAN_FAVOURITE = "FAN_FAVOURITE",
  SEASONED_PRO = "SEASONED_PRO",
  GOAL_POACHER = "GOAL_POACHER",
  ASSIST_KING = "ASSIST_KING",
  WORKHORSE = "WORKHORSE",
  SPEED_DEMON = "SPEED_DEMON",
}

export interface TraitUnlockConditionAttribute {
  type: 'attribute';
  attribute: keyof Pick<PlayerAttributes, 'shooting' | 'passing' | 'tackle' | 'speed' | 'stamina' | 'fanSupport' | 'age' | 'reputation'>;
  threshold: number;
}
export interface TraitUnlockConditionMilestone {
  type: 'milestone_season_stats';
  stat: keyof PlayerSeasonStats; // Updated to use PlayerSeasonStats
  threshold: number;
}

export type TraitUnlockCondition = TraitUnlockConditionAttribute | TraitUnlockConditionMilestone;

export interface PlayerTrait {
  id: PlayerTraitId;
  name: string;
  description: string;
  unlockConditions: TraitUnlockCondition[];
  effectDescription?: string; // User-facing summary of what it does
}

export enum TransferRequestStatus {
  NONE = "None",
  REQUESTED_BY_PLAYER = "Requested by Player",
  APPROVED_BY_CLUB = "Approved by Club - Listed",
  REJECTED_BY_CLUB = "Rejected by Club",
}

export interface PlayerSeasonStats {
  goals: number;
  assists: number;
  appearances: number;
  totalMatchRating: number; // Sum of all ratings this season
  matchesRatedThisSeason: number; // Count of matches where rating was recorded
}

export interface PlayerCareerStats {
  totalGoals: number;
  totalAssists: number;
  totalAppearances: number;
  leagueTitlesWon: { division: DivisionName, season: number, teamName: string }[];
  promotionsWon: { fromDivision: DivisionName, toDivision: DivisionName, season: number, teamName: string }[];
  careerAwardsCount: number; // General count of major career awards
  totalInternationalCaps: number;
  totalInternationalGoals: number;
}

export enum AwardType {
  SEASONAL_LEAGUE = 'SEASONAL_LEAGUE',
  SEASONAL_TEAM = 'SEASONAL_TEAM', // e.g. Club Player of the Year
  CAREER_MILESTONE = 'CAREER_MILESTONE',
  SEASONAL_INTERNATIONAL = 'SEASONAL_INTERNATIONAL', // e.g. Tournament Best Player
}

export enum AwardIdBase {
  // Seasonal League Awards
  LEAGUE_TOP_SCORER = "LEAGUE_TOP_SCORER",
  LEAGUE_MOST_ASSISTS = "LEAGUE_MOST_ASSISTS",
  LEAGUE_PLAYER_OF_THE_SEASON = "LEAGUE_PLAYER_OF_THE_SEASON",
  LEAGUE_YOUNG_PLAYER_OF_THE_SEASON = "LEAGUE_YOUNG_PLAYER_OF_THE_SEASON",
  // Team Awards
  CLUB_PLAYER_OF_THE_YEAR = "CLUB_PLAYER_OF_THE_YEAR",
  // Career Milestones
  CAREER_GOALS_MILESTONE = "CAREER_GOALS_MILESTONE",
  CAREER_ASSISTS_MILESTONE = "CAREER_ASSISTS_MILESTONE",
  CAREER_APPEARANCES_MILESTONE = "CAREER_APPEARANCES_MILESTONE",
  CAREER_LEAGUE_TITLE_WON = "CAREER_LEAGUE_TITLE_WON", 
  CAREER_PROMOTION_WON = "CAREER_PROMOTION_WON",     
  CAREER_TRAITS_UNLOCKED_MILESTONE = "CAREER_TRAITS_UNLOCKED_MILESTONE",
  CAREER_INTERNATIONAL_CAPS_MILESTONE = "CAREER_INTERNATIONAL_CAPS_MILESTONE",
  CAREER_INTERNATIONAL_GOALS_MILESTONE = "CAREER_INTERNATIONAL_GOALS_MILESTONE",
  CAREER_HALL_OF_FAME = "CAREER_HALL_OF_FAME", 
}

export interface Award {
  id: string; 
  awardIdBase: AwardIdBase;
  name: string; 
  description: string; 
  type: AwardType;
  seasonAchieved: number;
  divisionAchievedIn?: DivisionName; 
  value?: number | string; 
  forPlayerId: string; 
  nationality?: string; // For international awards if needed
}

// Interactions System
export enum InteractionType {
  MANAGER_TALK_FORM = "MANAGER_TALK_FORM",
  MEDIA_INTERVIEW_POST_MATCH = "MEDIA_INTERVIEW_POST_MATCH",
}

export enum InteractionEffectTarget {
  PLAYER_ATTRIBUTE = "PLAYER_ATTRIBUTE",
  MANAGER_RELATIONSHIP = "MANAGER_RELATIONSHIP",
  TEAM_CHEMISTRY = "TEAM_CHEMISTRY", // Could be direct or indirect
}

export interface InteractionEffect {
  target: InteractionEffectTarget;
  stat?: keyof Pick<PlayerAttributes, 'morale' | 'pressRelations' | 'fanSupport'>; // Restrict to sensible interaction-affected stats
  change: number; // Positive or negative
  logPublic?: string; // Message for game log if choice has public consequence
  logPrivate?: string; // Message for player, e.g., "Your manager relationship improved."
}

export interface InteractionOption {
  id: string; // e.g., "positive_response", "evasive_response"
  text: string; // What the player chooses to say/do
  effects: InteractionEffect[];
}

export interface Interaction {
  interactionId: string; // Unique instance ID
  type: InteractionType;
  promptText: string; // e.g., Manager: "How are you feeling about your current form?" or Media Question from Gemini
  options: InteractionOption[];
  status: 'PENDING' | 'COMPLETED';
  triggerSeason: number;
  triggerWeek: number;
  relatedMatchId?: string; // For media interviews linking back to a specific match
  expiresOnWeek: number; // Week number in the current season when the interaction auto-completes or disappears
}

export enum InjurySeverity {
    MINOR = "Minor",
    MODERATE = "Moderate",
    SERIOUS = "Serious",
}

export interface Injury {
    id: string;
    type: string; // e.g., "Sprained Ankle", "Pulled Hamstring"
    description: string; // How it happened
    severity: InjurySeverity;
    durationWeeks: number; // Total initial estimated duration
    weeksRemaining: number;
    recoveryProgress: number; // 0-100
    diagnosedSeason: number;
    diagnosedWeek: number;
}

export enum PlayerTacticalInstructionId {
  NONE = "NONE", // Explicitly no instruction
  MAKE_FORWARD_RUNS = "MAKE_FORWARD_RUNS",
  SHOOT_ON_SIGHT = "SHOOT_ON_SIGHT",
  DRIBBLE_MORE = "DRIBBLE_MORE",
  STAY_BACK_DEFENDING = "STAY_BACK_DEFENDING",
  AGGRESSIVE_TACKLING = "AGGRESSIVE_TACKLING",
  LOOK_FOR_THROUGH_BALLS = "LOOK_FOR_THROUGH_BALLS",
  HOLD_UP_PLAY = "HOLD_UP_PLAY",
}

export interface PlayerTacticalInstruction {
  id: PlayerTacticalInstructionId;
  name: string;
  description: string; // Tooltip or brief explanation
  category: 'Attacking' | 'Defensive' | 'Playmaking' | 'General';
  effectDescription: string; // More detailed in-game effect summary
  conflictsWith?: PlayerTacticalInstructionId[]; // Optional: instructions that can't be active at the same time
}

export interface Player {
  id: string;
  name: string;
  attributes: PlayerAttributes;
  preferredPosition: PreferredPosition;
  teamId: string | null;
  isUserPlayer: boolean;
  clubHistory: { teamName: string; season: number; joinedWeek?: number; leftWeek?: number; transferFee?: number }[];
  stats: PlayerSeasonStats; 
  lastMatchPerformance: PlayerMatchPerformance | null;
  unlockedTraits: PlayerTraitId[];
  weeklyWage: number;
  contractExpirySeason: number; 
  transferRequestStatus: TransferRequestStatus;
  isTransferListedByClub: boolean;
  careerStats: PlayerCareerStats; 
  awards: Award[]; 
  managerRelationship: number; // 0-100, Player's perception of relationship with current team manager
  nationality: string;
  internationalCaps: number;
  internationalGoals: number;
  isOnNationalTeam: boolean;
  currentInjury: Injury | null;
  activeTacticalInstruction: PlayerTacticalInstructionId | null;
  preferredFoot: PreferredFootType;
  preferredKitNumber: number | null;
  currentKitNumber: number | null;
}

export interface Team {
  id:string;
  name: string;
  division: DivisionName;
  players: Player[];
  points: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  budget: number; 
  reputation: number; 
  teamChemistry: number; // 0-100, affects team performance slightly
  usedKitNumbers: number[];
}

export enum DivisionName {
  FIRST = 'First Division',
  SECOND = 'Second Division',
  THIRD = 'Third Division',
  FOURTH = 'Fourth Division',
  FIFTH = 'Fifth Division',
}

export interface League {
  divisions: Record<DivisionName, Team[]>;
  currentSeason: number;
  currentWeek: number;
}

export interface MatchResult {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  summary?: string; 
  playerPerformances?: Record<string, Partial<PlayerMatchPerformance>>;
  isInternationalFixture?: boolean;
}

export type TransferOfferStatus = 'PENDING_PLAYER_RESPONSE' | 'ACCEPTED_BY_PLAYER' | 'REJECTED_BY_PLAYER' | 'EXPIRED' | 'WITHDRAWN_BY_CLUB';

export interface TransferOffer {
  offerId: string;
  fromTeamId: string;
  fromTeamName: string;
  fromTeamDivision: DivisionName;
  toPlayerId: string;
  transferFee: number; 
  offeredWage: number;
  contractLengthYears: number; 
  signingBonus: number; 
  status: TransferOfferStatus;
  offerDateSeason: number;
  offerDateWeek: number;
  expiresOnSeason: number;
  expiresOnWeek: number; 
}

export type TransferWindowStatus = 'OPEN_PRE_SEASON' | 'OPEN_MID_SEASON' | 'CLOSED';

export interface NationalTeam {
  id: string;
  name: string;
  nationalityRepresented: string;
  squad: string[]; // Array of Player IDs
  reputation: number; // Average reputation, influences match simulation
  managerName: string;
}

export interface UpcomingInternationalMatch {
  week: number;
  homeNationalTeamId: string;
  awayNationalTeamId: string;
  userPlayerInvolved: boolean;
  matchType: 'Friendly' | 'Qualifier' | 'Tournament'; // Example
}

export interface CustomPlayerData {
  name: string;
  preferredPosition: PreferredPosition;
  preferredFoot: PreferredFootType;
  nationality: string;
  preferredKitNumber: number | null;
  skillMoves: number; // 1-5
  weakFootAccuracy: number; // 1-5
}

export interface GameState {
  userPlayerId: string | null;
  teams: Team[];
  league: League;
  gameLog: string[];
  pendingTransferOffers: TransferOffer[];
  transferWindowStatus: TransferWindowStatus;
  pendingInteractions: Interaction[];
  nationalTeams: NationalTeam[];
  internationalFixtureWeeks: number[];
  upcomingInternationalMatch: UpcomingInternationalMatch | null;
  isPlayerCreated?: boolean; // Flag to track if initial player creation is done
}

export interface TrainingOption {
  id: keyof Pick<PlayerAttributes, 'shooting' | 'passing' | 'tackle' | 'speed' | 'skill' | 'stamina' | 'goalkeeping' | 'heading' | 'reputation' | 'skillMoves' | 'weakFootAccuracy'> | 'physio';
  name: string;
  description: string;
  cost?: number; 
  improvement: number; 
}

// Constants
export const MAX_ATTRIBUTE_VALUE = 99;
export const MIN_ATTRIBUTE_VALUE_NPC_DEV = 20;
export const MAX_MORALE_FORM_STAMINA_REPUTATION = 100;
export const INITIAL_PLAYER_AGE = 16;
export const RETIREMENT_START_AGE = 33;
export const MAX_PLAYERS_PER_TEAM = 28; 
export const MIN_PLAYERS_PER_TEAM = 16; 
export const TEAMS_PER_DIVISION = 20; 
export const INITIAL_USER_PLAYER_NAME = "My Player";
export const WEEKS_PER_SEASON = (TEAMS_PER_DIVISION -1) * 2; 

export const TRANSFER_WINDOW_PRE_SEASON_START_WEEK = 1;
export const TRANSFER_WINDOW_PRE_SEASON_END_WEEK = 4;
export const TRANSFER_WINDOW_MID_SEASON_START_WEEK = Math.floor(WEEKS_PER_SEASON / 2) - 1; 
export const TRANSFER_WINDOW_MID_SEASON_END_WEEK = Math.floor(WEEKS_PER_SEASON / 2) + 2; 

export const INITIAL_PLAYER_REPUTATION = 30;
export const INITIAL_PLAYER_WAGE_FIFTH_DIV = 250;
export const OFFER_EXPIRY_DURATION_WEEKS = 2;
export const INTERACTION_EXPIRY_DURATION_WEEKS = 2; // Interactions expire after 2 weeks if not handled

export const PROMOTION_COUNT = 3;
export const RELEGATION_COUNT = 3;

export const MIN_APPEARANCES_FOR_SEASONAL_AWARDS = Math.floor(WEEKS_PER_SEASON * 0.5); 
export const YOUNG_PLAYER_AGE_LIMIT = 21; 

// International Play Constants
export const AVAILABLE_NATIONALITIES: string[] = [
    "England", "Brazil", "Germany", "Argentina", "France", 
    "Spain", "Italy", "Netherlands", "Portugal", "Belgium",
    "USA", "Mexico", "Japan", "South Korea", "Australia",
    "Nigeria", "Egypt", "Canada", "Sweden", "Norway"
];
export const NATIONAL_TEAM_SQUAD_SIZE = 23;
export const MIN_REPUTATION_FOR_NATIONAL_CALL = 65; // Minimum player reputation
export const NATIONAL_TEAM_SELECTION_MIN_FORM = 60; // Minimum player form
export const INTERNATIONAL_FIXTURE_WEEKS_DEFAULT: number[] = [8, 12, 26, 30]; // Example weeks

// Injury Constants
export const INJURY_BASE_CHANCE_PER_MATCH = 0.05; // 5% base chance to get injured in a match
export const INJURY_CHANCE_STAMINA_FACTOR = 0.001; // Increase chance by this much per point of stamina *below* 50
export const INJURY_CHANCE_AGE_FACTOR = 0.0005; // Increase chance by this much per year over 30
export const INJURY_DURATION_WEEKS: Record<InjurySeverity, {min: number, max: number}> = {
    [InjurySeverity.MINOR]: {min: 1, max: 2},
    [InjurySeverity.MODERATE]: {min: 3, max: 6},
    [InjurySeverity.SERIOUS]: {min: 8, max: 24},
};
export const PHYSIO_RECOVERY_BOOST_CHANCE = 0.3; // 30% chance physio session reduces recovery time by 1 week

export interface CareerMilestoneDefinition {
  idBase: AwardIdBase;
  thresholds: number[];
  nameTemplate: string; 
  descriptionTemplate: string; 
  statProperty: keyof PlayerCareerStats | 'unlockedTraits.length' | 'awards.length' | 'internationalCaps' | 'internationalGoals'; 
}

export const CAREER_MILESTONE_DEFINITIONS: CareerMilestoneDefinition[] = [
  { 
    idBase: AwardIdBase.CAREER_GOALS_MILESTONE, 
    thresholds: [10, 25, 50, 100, 150, 200, 300], 
    nameTemplate: "Goal Machine: {X} Goals",
    descriptionTemplate: "Celebrated scoring {X} career goals.",
    statProperty: 'totalGoals'
  },
  { 
    idBase: AwardIdBase.CAREER_ASSISTS_MILESTONE, 
    thresholds: [10, 25, 50, 100, 150, 200], 
    nameTemplate: "Assist Virtuoso: {X} Assists",
    descriptionTemplate: "Provided {X} career assists for teammates.",
    statProperty: 'totalAssists'
  },
  { 
    idBase: AwardIdBase.CAREER_APPEARANCES_MILESTONE, 
    thresholds: [25, 50, 100, 200, 300, 400, 500], 
    nameTemplate: "Club Legend: {X} Appearances",
    descriptionTemplate: "Made {X} professional appearances.",
    statProperty: 'totalAppearances'
  },
  {
    idBase: AwardIdBase.CAREER_TRAITS_UNLOCKED_MILESTONE,
    thresholds: [1, 3, 5, 7],
    nameTemplate: "Specialist: {X} Traits",
    descriptionTemplate: "Mastered {X} unique player traits.",
    statProperty: 'unlockedTraits.length' 
  },
  {
    idBase: AwardIdBase.CAREER_INTERNATIONAL_CAPS_MILESTONE,
    thresholds: [1, 5, 10, 25, 50, 75, 100],
    nameTemplate: "International Star: {X} Caps",
    descriptionTemplate: "Earned {X} caps for their national team.",
    statProperty: 'totalInternationalCaps'
  },
  {
    idBase: AwardIdBase.CAREER_INTERNATIONAL_GOALS_MILESTONE,
    thresholds: [1, 5, 10, 20, 30, 50],
    nameTemplate: "National Hero: {X} Int. Goals",
    descriptionTemplate: "Scored {X} goals for their country.",
    statProperty: 'totalInternationalGoals'
  },
];


export const AVAILABLE_TRAINING_OPTIONS: TrainingOption[] = [
  { id: 'shooting', name: 'Shooting Practice', description: 'Improve your finishing.', improvement: 2, cost: 7 },
  { id: 'passing', name: 'Passing Drills', description: 'Enhance passing accuracy.', improvement: 2, cost: 6 },
  { id: 'tackle', name: 'Defensive Work', description: 'Sharpen tackling skills.', improvement: 2, cost: 8 },
  { id: 'speed', name: 'Sprint Training', description: 'Increase your pace.', improvement: 1, cost: 10 },
  { id: 'skill', name: 'Skill Drills', description: 'Improve technical ability & general skill.', improvement: 2, cost: 5 },
  { id: 'skillMoves', name: 'Skill Moves Training', description: 'Improve star rating for skill moves (max 5).', improvement: 1, cost: 6 },
  { id: 'weakFootAccuracy', name: 'Weak Foot Training', description: 'Improve star rating for weak foot (max 5).', improvement: 1, cost: 6 },
  { id: 'stamina', name: 'Endurance Run', description: 'Build up stamina.', improvement: 3, cost: 0 }, 
  { id: 'goalkeeping', name: 'GK Training', description: 'For goalkeepers only.', improvement: 2, cost: 7 },
  { id: 'heading', name: 'Heading Practice', description: 'Improve aerial ability.', improvement: 1, cost: 5 },
  { id: 'reputation', name: 'Media Training', description: 'Improve press relations & reputation.', improvement: 1, cost: 3},
  { id: 'physio', name: 'Physio Session', description: 'Work with medical staff to aid injury recovery.', improvement: 0, cost: 0}
];

export const AVAILABLE_PLAYER_TRAITS: PlayerTrait[] = [
  {
    id: PlayerTraitId.CLINICAL_FINISHER,
    name: "Clinical Finisher",
    description: "Excels at finding the back of the net when an opportunity arises.",
    unlockConditions: [{ type: 'attribute', attribute: 'shooting', threshold: 80 }],
    effectDescription: "Slightly improves shot accuracy and conversion rate.",
  },
  {
    id: PlayerTraitId.PLAYMAKER_VISION,
    name: "Playmaker Vision",
    description: "Possesses an uncanny ability to spot and execute defense-splitting passes.",
    unlockConditions: [{ type: 'attribute', attribute: 'passing', threshold: 80 }],
    effectDescription: "Slightly increases the likelihood of successful key passes.",
  },
  {
    id: PlayerTraitId.DEFENSIVE_ROCK,
    name: "Defensive Rock",
    description: "A formidable presence in defense, consistently winning challenges.",
    unlockConditions: [{ type: 'attribute', attribute: 'tackle', threshold: 80 }],
    effectDescription: "Slightly improves tackle success rate.",
  },
  {
    id: PlayerTraitId.FAN_FAVOURITE,
    name: "Fan Favourite",
    description: "Adored by the fans, which boosts morale and support.",
    unlockConditions: [{ type: 'attribute', attribute: 'fanSupport', threshold: 85 }],
    effectDescription: "Increases fan support gain and provides a small morale boost after wins.",
  },
  {
    id: PlayerTraitId.SEASONED_PRO,
    name: "Seasoned Pro",
    description: "Years of experience allow for better game management and stamina conservation.",
    unlockConditions: [{ type: 'attribute', attribute: 'age', threshold: 28 }],
    effectDescription: "Slightly reduces stamina decay from matches and training. Might reduce injury risk slightly.",
  },
  {
    id: PlayerTraitId.GOAL_POACHER,
    name: "Goal Poacher",
    description: "A natural instinct for being in the right place at the right time to score.",
    unlockConditions: [{ type: 'milestone_season_stats', stat: 'goals', threshold: 15 }],
    effectDescription: "Small bonus to goal scoring probability in offensive situations.",
  },
  {
    id: PlayerTraitId.ASSIST_KING,
    name: "Assist King",
    description: "Master of the final pass, regularly setting up teammates.",
    unlockConditions: [{ type: 'milestone_season_stats', stat: 'assists', threshold: 10 }],
    effectDescription: "Small bonus to assist probability.",
  },
   {
    id: PlayerTraitId.WORKHORSE,
    name: "Workhorse",
    description: "Tirelessly covers ground for the team, maintaining high energy levels.",
    unlockConditions: [{ type: 'attribute', attribute: 'stamina', threshold: 85 }],
    effectDescription: "Stamina depletes slightly slower during matches. Might reduce injury risk slightly.",
  },
  {
    id: PlayerTraitId.SPEED_DEMON,
    name: "Speed Demon",
    description: "Blazing pace that leaves opponents in the dust.",
    unlockConditions: [{ type: 'attribute', attribute: 'speed', threshold: 85 }],
    effectDescription: "Grants a slight edge in pace-related situations during matches.",
  }
];

export const AVAILABLE_TACTICAL_INSTRUCTIONS: PlayerTacticalInstruction[] = [
  {
    id: PlayerTacticalInstructionId.NONE,
    name: "Balanced Approach",
    description: "No specific tactical emphasis. Play your natural game.",
    category: 'General',
    effectDescription: "Player will rely on their base attributes and traits without specific tactical adjustments."
  },
  {
    id: PlayerTacticalInstructionId.MAKE_FORWARD_RUNS,
    name: "Make Forward Runs",
    description: "Focus on getting into attacking positions more often.",
    category: 'Attacking',
    effectDescription: "Slightly increases chance of getting into scoring positions. May increase shots.",
    conflictsWith: [PlayerTacticalInstructionId.STAY_BACK_DEFENDING, PlayerTacticalInstructionId.HOLD_UP_PLAY]
  },
  {
    id: PlayerTacticalInstructionId.SHOOT_ON_SIGHT,
    name: "Shoot on Sight",
    description: "Take more shots when opportunities arise, even from distance.",
    category: 'Attacking',
    effectDescription: "Increases shot attempts. Shot accuracy might vary based on shooting skill.",
  },
  {
    id: PlayerTacticalInstructionId.DRIBBLE_MORE,
    name: "Dribble More",
    description: "Attempt to take on opponents with the ball more frequently.",
    category: 'Attacking',
    effectDescription: "Increases likelihood of attempting dribbles. Success depends on skill attribute.",
  },
  {
    id: PlayerTacticalInstructionId.LOOK_FOR_THROUGH_BALLS,
    name: "Look for Through Balls",
    description: "Prioritize trying to play incisive passes to create scoring chances.",
    category: 'Playmaking',
    effectDescription: "Increases attempts at key passes. Success depends on passing attribute.",
  },
  {
    id: PlayerTacticalInstructionId.HOLD_UP_PLAY,
    name: "Hold Up Play",
    description: "Focus on retaining possession high up the pitch, bringing teammates into play.",
    category: 'Playmaking',
    effectDescription: "May improve team possession slightly or create space for teammates. Less direct goal threat.",
    conflictsWith: [PlayerTacticalInstructionId.MAKE_FORWARD_RUNS]
  },
  {
    id: PlayerTacticalInstructionId.STAY_BACK_DEFENDING,
    name: "Stay Back Defending",
    description: "Prioritize defensive duties and maintain a cautious position.",
    category: 'Defensive',
    effectDescription: "Reduces attacking runs. Improves defensive positioning. May reduce interceptions/tackles if too deep.",
    conflictsWith: [PlayerTacticalInstructionId.MAKE_FORWARD_RUNS]
  },
  {
    id: PlayerTacticalInstructionId.AGGRESSIVE_TACKLING,
    name: "Aggressive Tackling",
    description: "Attempt more tackles and apply high pressure when defending.",
    category: 'Defensive',
    effectDescription: "Increases tackle attempts. May lead to more won tackles but also more missed tackles/fouls (fouls not simulated).",
  },
];


export const DIVISION_NAMES_ORDERED: DivisionName[] = [
  DivisionName.FIRST,
  DivisionName.SECOND,
  DivisionName.THIRD,
  DivisionName.FOURTH,
  DivisionName.FIFTH,
];

export const NPC_TEAM_NAMES_PREFIXES = ["United", "City", "Rovers", "Wanderers", "Albion", "Athletic", "Town", "County", "FC", "Sporting"];
export const NPC_TEAM_NAMES_SUFFIXES = ["North", "South", "East", "West", "Central", "Metropolitan", "Valley", "Hills", "River", "Coastal"];
export const NPC_PLAYER_FIRST_NAMES = ["Alex", "Ben", "Chris", "David", "Ethan", "Finn", "George", "Harry", "Ian", "Jack", "Kyle", "Liam", "Max", "Noah", "Oscar", "Paul", "Quinn", "Ryan", "Sam", "Tom"];
export const NPC_PLAYER_LAST_NAMES = ["Smith", "Jones", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson", "Clark"];

export const getWageByDivision = (division: DivisionName): number => {
  switch(division) {
    case DivisionName.FIRST: return 5000;
    case DivisionName.SECOND: return 2500;
    case DivisionName.THIRD: return 1200;
    case DivisionName.FOURTH: return 750;
    case DivisionName.FIFTH: return INITIAL_PLAYER_WAGE_FIFTH_DIV;
    default: return 300;
  }
};

export const getBaseReputationByDivision = (division: DivisionName): number => {
  switch(division) {
    case DivisionName.FIRST: return 75;  
    case DivisionName.SECOND: return 60; 
    case DivisionName.THIRD: return 45;  
    case DivisionName.FOURTH: return 30; 
    case DivisionName.FIFTH: return 15;  
    default: return 10;
  }
};

export const getBaseBudgetByDivision = (division: DivisionName): number => {
  switch(division) {
    case DivisionName.FIRST: return 50000000;
    case DivisionName.SECOND: return 10000000;
    case DivisionName.THIRD: return 2000000;
    case DivisionName.FOURTH: return 500000;
    case DivisionName.FIFTH: return 100000;
    default: return 50000;
  }
};
