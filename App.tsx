
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardScreen from './components/DashboardScreen';
import TrainingScreen from './components/TrainingScreen';
import LeagueTableScreen from './components/LeagueTableScreen';
import TransfersScreen from './components/TransfersScreen';
import AchievementsScreen from './components/AchievementsScreen';
import InteractionsModal from './components/InteractionsModal'; 
import PlayerCreationScreen from './components/PlayerCreationScreen'; // New Import
import { GameState, Player, TrainingOption, CustomPlayerData, PlayerTacticalInstructionId } from './types';
import { 
    initializeGame, 
    applyTraining, 
    advanceWeek, 
    handlePlayerTransferRequest as serviceTransferRequest, 
    handleRespondToTransferOffer as serviceRespondOffer,
    handleInteractionResponse as serviceInteractionResponse,
    setPlayerTacticalInstruction as serviceSetTacticalInstruction
} from './services/gameService';

const SAVE_KEY = 'footballCareerSimSave';
const PLAYER_CREATED_KEY = 'footballPlayerCreated';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdvancingWeek, setIsAdvancingWeek] = useState(false);
  const [showInteractionsModal, setShowInteractionsModal] = useState(false);
  const [isPlayerCreated, setIsPlayerCreated] = useState<boolean>(() => {
    const storedFlag = localStorage.getItem(PLAYER_CREATED_KEY);
    return storedFlag ? JSON.parse(storedFlag) : false;
  });


  useEffect(() => {
    const savedGame = localStorage.getItem(SAVE_KEY);
    const playerCreatedFlag = localStorage.getItem(PLAYER_CREATED_KEY);

    if (savedGame && playerCreatedFlag && JSON.parse(playerCreatedFlag)) {
      try {
        const loadedState = JSON.parse(savedGame);
        setGameState(loadedState);
        setIsPlayerCreated(true);
      } catch (error) {
        console.error("Failed to parse saved game state:", error);
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(PLAYER_CREATED_KEY);
        setIsPlayerCreated(false); // Force creation if save is corrupted
      }
    } else {
      // If not created or no save, ensure isPlayerCreated is false
      setIsPlayerCreated(false);
    }
    setIsLoading(false);
  }, []); // Run once on initial mount

  useEffect(() => {
    if (gameState && isPlayerCreated) { 
      localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    }
  }, [gameState, isPlayerCreated]);

  useEffect(() => {
    // Save the isPlayerCreated flag whenever it changes AFTER initial load.
    // This ensures that if it's set to true by handlePlayerCreationComplete, it's saved.
    // And if reset by handleNewGame, it's also saved as false.
    if (!isLoading) { // Avoid saving during initial load until flag is confirmed
        localStorage.setItem(PLAYER_CREATED_KEY, JSON.stringify(isPlayerCreated));
    }
  }, [isPlayerCreated, isLoading]);


  useEffect(() => {
    if (gameState && gameState.pendingInteractions && gameState.pendingInteractions.filter(i => i.status === 'PENDING').length > 0) {
        setShowInteractionsModal(true);
    } else {
        setShowInteractionsModal(false);
    }
  }, [gameState]);

  const handlePlayerCreationComplete = (customData: CustomPlayerData) => {
    const newGame = initializeGame(customData);
    setGameState(newGame);
    setIsPlayerCreated(true); 
    // isPlayerCreated change will trigger the useEffect above to save the flag
  };

  const handleNewGame = () => {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(PLAYER_CREATED_KEY); // Also remove the creation flag
    setGameState(null);
    setIsPlayerCreated(false); // This will trigger PlayerCreationScreen
    // No need for isLoading changes here, the effect for isPlayerCreated will handle saving it.
  };


  const handleAdvanceWeek = useCallback(async () => {
    if (!gameState || isAdvancingWeek || !isPlayerCreated) return;
    setIsAdvancingWeek(true);
    try {
        setShowInteractionsModal(false);
        const stateToAdvance = {
          ...gameState,
          pendingTransferOffers: gameState.pendingTransferOffers || [],
          pendingInteractions: gameState.pendingInteractions || [],
        };
        const newState = await advanceWeek(stateToAdvance);
        setGameState(newState);
        if (newState.pendingInteractions && newState.pendingInteractions.filter(i => i.status === 'PENDING').length > 0) {
            setShowInteractionsModal(true);
        }
    } catch (error) {
        console.error("Failed to advance week:", error);
    } finally {
        setIsAdvancingWeek(false);
    }
  }, [gameState, isAdvancingWeek, isPlayerCreated]);


  const handleTrainAttribute = useCallback((trainingId: TrainingOption['id']) => {
    if (!gameState || !gameState.userPlayerId || !isPlayerCreated) return;
    setGameState(prevState => {
      if (!prevState || !prevState.userPlayerId) return prevState;
      let oldPlayer: Player | undefined = prevState.teams.flatMap(t => t.players).find(p => p.id === prevState.userPlayerId);
      if (!oldPlayer) return prevState;
      const { updatedPlayer, newLogEntries } = applyTraining(oldPlayer, trainingId, prevState);
      let newTeams = prevState.teams.map(team => ({
        ...team,
        players: team.players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)
      }));
      const combinedLog = [...newLogEntries, ...prevState.gameLog].slice(0, 50); 
      return { ...prevState, teams: newTeams, gameLog: combinedLog };
    });
  }, [isPlayerCreated, gameState]); 

  const handlePlayerRequestTransfer = useCallback(() => {
    if (!gameState || !isPlayerCreated) return;
    setGameState(serviceTransferRequest(gameState));
  }, [gameState, isPlayerCreated]);

  const handleRespondToOffer = useCallback((offerId: string, response: 'accept' | 'reject') => {
    if (!gameState || !isPlayerCreated) return;
    setGameState(serviceRespondOffer(gameState, offerId, response));
  }, [gameState, isPlayerCreated]);

  const handlePlayerInteractionResponse = useCallback((interactionId: string, optionId: string) => {
    if (!gameState || !isPlayerCreated) return;
    const newState = serviceInteractionResponse(gameState, interactionId, optionId);
    setGameState(newState);
    if (newState.pendingInteractions.filter(i => i.status === 'PENDING').length === 0) {
        setShowInteractionsModal(false);
    }
  }, [gameState, isPlayerCreated]);

  const handleSetPlayerTacticalInstruction = useCallback((instructionId: PlayerTacticalInstructionId | null) => {
    if (!gameState || !gameState.userPlayerId || !isPlayerCreated) return;
    setGameState(prevState => {
      if (!prevState || !prevState.userPlayerId) return prevState;
      const player = prevState.teams.flatMap(t => t.players).find(p => p.id === prevState.userPlayerId);
      if (!player) return prevState;
      const { updatedPlayer, logEntry } = serviceSetTacticalInstruction(player, instructionId);
      const newTeams = prevState.teams.map(team => ({
        ...team,
        players: team.players.map(p => (p.id === updatedPlayer.id ? updatedPlayer : p)),
      }));
      return { ...prevState, teams: newTeams, gameLog: [logEntry, ...prevState.gameLog].slice(0, 50) };
    });
  }, [isPlayerCreated, gameState]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral">
        <div className="text-2xl font-semibold text-primary">Loading Football Career Sim...</div>
      </div>
    );
  }
  
  if (!isPlayerCreated) { // gameState might be null here if no save existed initially
    return <PlayerCreationScreen onPlayerCreated={handlePlayerCreationComplete} />;
  }
  
  if (!gameState) { // Should ideally not happen if isPlayerCreated is true, but as a fallback
     console.error("Error: Player is marked as created, but gameState is null. Resetting.");
     handleNewGame(); // Force reset
     return <PlayerCreationScreen onPlayerCreated={handlePlayerCreationComplete} />; // Show creation screen again
  }
  
  const userPlayer = gameState.teams.flatMap(t => t.players).find(p => p.id === gameState.userPlayerId);
  const currentPendingInteraction = gameState.pendingInteractions.find(i => i.status === 'PENDING');


  return (
    <HashRouter>
      <Layout isAdvancingWeek={isAdvancingWeek} onNewGame={handleNewGame}>
        <Routes>
           {/* If player is not created, all routes should effectively lead to creation or be blocked */}
          <Route 
            path="/" 
            element={isPlayerCreated && gameState ? <DashboardScreen 
                        gameState={gameState} 
                        onAdvanceWeek={handleAdvanceWeek} 
                        isAdvancingWeek={isAdvancingWeek}
                        onSetTacticalInstruction={handleSetPlayerTacticalInstruction}
                        /> : <Navigate to="/create-player" replace />} 
          />
           <Route 
            path="/create-player" 
            element={!isPlayerCreated ? <PlayerCreationScreen onPlayerCreated={handlePlayerCreationComplete} /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/training" 
            element={isPlayerCreated && gameState ? <TrainingScreen player={userPlayer || null} onTrainAttribute={handleTrainAttribute} /> : <Navigate to="/create-player" replace />} 
          />
          <Route 
            path="/league" 
            element={isPlayerCreated && gameState ? <LeagueTableScreen gameState={gameState} /> : <Navigate to="/create-player" replace />} 
          />
          <Route
            path="/transfers"
            element={isPlayerCreated && gameState ? <TransfersScreen 
                        gameState={gameState} 
                        onPlayerRequestTransfer={handlePlayerRequestTransfer}
                        onRespondToOffer={handleRespondToOffer} 
                      /> : <Navigate to="/create-player" replace />}
          />
          <Route
            path="/achievements"
            element={isPlayerCreated && gameState ? <AchievementsScreen gameState={gameState} /> : <Navigate to="/create-player" replace />}
          />
           {/* Fallback route if isPlayerCreated is true but no gameState somehow (should not happen) */}
          {!gameState && isPlayerCreated && <Route path="*" element={<Navigate to="/create-player" replace />} />}

        </Routes>
        {isPlayerCreated && gameState && showInteractionsModal && currentPendingInteraction && (
            <InteractionsModal
                interaction={currentPendingInteraction}
                onOptionSelected={handlePlayerInteractionResponse}
                onClose={() => setShowInteractionsModal(false)} 
            />
        )}
      </Layout>
    </HashRouter>
  );
};

export default App;
