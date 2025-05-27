
# Football Career Sim

Welcome to Football Career Sim! This is a browser-based simulation game where you manage a football player's career from their early days to potential stardom and retirement. Navigate through leagues, improve your player's attributes through training, make crucial career decisions, and experience the highs and lows of a professional footballer's life.

## Core Features

*   **Player Creation & Personalization:**
    *   Define your player's name, preferred position, nationality, preferred foot, kit number, skill moves (1-5 stars), and weak foot accuracy (1-5 stars) at the start of your career.
    *   These choices influence your initial attributes and play style.
*   **Detailed Player Attributes:** Manage and improve a wide range of skills (shooting, passing, tackling, etc.), physical attributes (stamina, speed), and mental attributes (morale, form).
*   **Realistic Training System:** Choose from various training drills to enhance specific attributes. Stamina management and injury risk are key considerations.
*   **Match Simulation & Performance Feedback:**
    *   Matches are simulated weekly, with your player's performance (goals, assists, rating, etc.) calculated based on their skills, form, tactical instructions, and opponent strength.
    *   Receive AI-generated narrative summaries of your player's contribution after each match (powered by Google Gemini API).
*   **League System with Promotion & Relegation:**
    *   Start in the lower divisions and work your way up.
    *   Teams are promoted and relegated based on their seasonal performance, creating a dynamic league environment.
*   **Transfers & Contracts:**
    *   Receive transfer offers from other clubs.
    *   Request transfers and negotiate contracts (wage, length).
    *   Build a club history as you move between teams.
*   **Player Development & Traits:**
    *   Unlock special traits (e.g., Clinical Finisher, Playmaker Vision) by achieving attribute milestones or specific in-game accomplishments. These traits provide passive bonuses or affect in-match performance.
*   **Seasonal Awards & Career Achievements:**
    *   Compete for seasonal awards like Top Scorer, Most Assists, and Player of the Season.
    *   Unlock career milestones for significant achievements (e.g., scoring 100 goals, winning a league title).
*   **Player Interactions (Manager & Media):**
    *   Engage in conversations with your manager about your form and role.
    *   Handle post-match media interviews with AI-generated questions.
    *   Your choices impact relationships, morale, fan support, and press relations.
*   **International Call-ups & National Team Play:**
    *   Perform well to earn a call-up to your national team.
    *   Participate in international friendly matches during designated breaks.
*   **Injury Management:**
    *   Players can get injured during matches or training.
    *   Manage recovery through rest and physio sessions. Injury duration and severity vary.
*   **Individual Tactical Instructions:**
    *   Set specific tactical instructions for your player before each match (e.g., "Shoot on Sight," "Aggressive Tackling") to influence their in-game behavior.
*   **NPC Player Development & Aging:**
    *   NPC players in the league develop, peak, and decline over time, creating a more realistic and evolving game world.
*   **Game Persistence:** Your career progress, including player stats, league standings, and achievements, is automatically saved in your browser's local storage, allowing you to resume anytime.

## Technologies Used

*   **Frontend:** React, TypeScript, Tailwind CSS
*   **AI Integration:** Google Gemini API (for match narratives and media interactions)
*   **Build/Dev:** Vite (implied by `index.html` structure and modern module usage)

## Getting Started

1.  **Clone the repository (if applicable) or download the files.**
2.  **API Key (Crucial):**
    *   This game uses the Google Gemini API for some features. You **must** have a valid API key for these features to work.
    *   The application expects the API key to be available as an environment variable named `API_KEY`.
    *   **Important:** For local development or if you are running this directly, you might need to set this up in your local environment or manually insert it where `process.env.API_KEY` is used in `services/gameService.ts`. **Never commit your API key directly into the codebase if you are pushing to a public repository.**
3.  **Open `index.html` in your web browser.**
    *   The game is designed to run directly in the browser using ES modules and import maps. No complex build step is strictly required for basic play if all dependencies are correctly mapped.

## How to Play

1.  **Create Your Player:** On your first launch (or after selecting "New Game"), you'll be prompted to create your player, defining their name, position, nationality, and key skills.
2.  **Dashboard:** The main hub where you can see your player's status, upcoming fixtures, game log, and advance to the next week.
3.  **Training:** Select training drills to improve your player's attributes. Manage stamina and injury risk.
4.  **League Table:** Track your team's progress and standings in the league.
5.  **Transfers:** Manage transfer offers, request moves, and view contract details.
6.  **Achievements:** View your seasonal awards and career milestones.
7.  **Advance Week:** Progress through the season, simulating matches and triggering game events.
8.  **Interactions:** Respond to manager talks and media interviews that pop up. Your choices matter!
9.  **Tactical Focus:** Set your player's individual tactical instruction for the upcoming match from the dashboard.

## Contributing

Contributions are welcome! If you'd like to contribute, please fork the repository and submit a pull request. For major changes, please open an issue first to discuss what you would like to change.

---
