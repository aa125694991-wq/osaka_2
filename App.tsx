import React, { useState } from 'react';
import { ViewTab } from './types';
import TabNavigation from './components/TabNavigation';
import ScheduleView from './views/ScheduleView';
import ExpenseView from './views/ExpenseView';
import PlanningView from './views/PlanningView';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ViewTab>('schedule');

  // Simple animation logic for page transitions could be added here
  // For now, we render conditionally

  const renderView = () => {
    switch (currentTab) {
      case 'schedule':
        return <ScheduleView />;
      case 'expense':
        return <ExpenseView />;
      case 'planning':
        return <PlanningView />;
      default:
        return <ScheduleView />;
    }
  };

  return (
    <div className="h-[100dvh] w-full max-w-md mx-auto bg-white relative shadow-2xl overflow-hidden flex flex-col">
      <div className="flex-1 overflow-hidden relative">
        {renderView()}
      </div>
      <TabNavigation currentTab={currentTab} onTabChange={setCurrentTab} />
    </div>
  );
};

export default App;