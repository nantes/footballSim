
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, TrainingIcon, LeagueIcon, PlayerIcon, ArrowsRightLeftIcon, TrophyIcon } from '../constants'; 
import { ArrowPathIcon } from '@heroicons/react/24/outline'; // For New Game button

interface LayoutProps {
  children: React.ReactNode;
  isAdvancingWeek?: boolean; // Optional prop
  onNewGame: () => void; // Callback for starting a new game
}

const NavLink: React.FC<{ to: string; icon: React.ReactNode; label: string; currentPath: string, isDisabled?: boolean }> = ({ to, icon, label, currentPath, isDisabled }) => {
  const isActive = currentPath === to;
  const commonClasses = `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out`;
  
  if (isDisabled) {
    return (
      <span className={`${commonClasses} text-gray-400 cursor-not-allowed`}>
        {icon}
        <span className="ml-3">{label}</span>
      </span>
    );
  }

  return (
    <Link
      to={to}
      className={`${commonClasses} ${isActive ? 'bg-secondary text-white' : 'text-gray-100 hover:bg-primary hover:text-white'}`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </Link>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, isAdvancingWeek, onNewGame }) => {
  const location = useLocation();

  const handleNewGameClick = () => {
    if (window.confirm("Are you sure you want to start a new game? All current progress will be lost.")) {
      onNewGame();
    }
  };

  return (
    <div className="flex h-screen bg-neutral">
      <aside className="w-64 bg-primary text-white flex flex-col p-4 space-y-2">
        <div className="flex items-center mb-6 px-2">
          <PlayerIcon className="h-10 w-10 text-accent" />
          <h1 className="ml-2 text-2xl font-semibold">Football Sim</h1>
        </div>
        <nav className="flex-grow">
          <NavLink to="/" icon={<HomeIcon />} label="Dashboard" currentPath={location.pathname} isDisabled={isAdvancingWeek} />
          <NavLink to="/training" icon={<TrainingIcon />} label="Training" currentPath={location.pathname} isDisabled={isAdvancingWeek} />
          <NavLink to="/league" icon={<LeagueIcon />} label="League Table" currentPath={location.pathname} isDisabled={isAdvancingWeek} />
          <NavLink to="/transfers" icon={<ArrowsRightLeftIcon />} label="Transfers" currentPath={location.pathname} isDisabled={isAdvancingWeek} />
          <NavLink to="/achievements" icon={<TrophyIcon />} label="Achievements" currentPath={location.pathname} isDisabled={isAdvancingWeek} />
        </nav>
        {isAdvancingWeek && (
          <div className="p-2 text-center text-sm text-yellow-300">
            Advancing week...
          </div>
        )}
        <div className="mt-auto p-2 space-y-2">
           <button
            onClick={handleNewGameClick}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-red-200 bg-red-700 hover:bg-red-600 transition-colors duration-150 ease-in-out"
            title="Start a new game (erases current progress)"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            New Game
          </button>
          <div className="text-center text-xs text-gray-300">
              Football Career Sim v0.5
          </div>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;
