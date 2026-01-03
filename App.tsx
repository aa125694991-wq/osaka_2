import React, { useState, useEffect } from 'react';
import { ViewTab } from './types';
import TabNavigation from './components/TabNavigation';
import ScheduleView from './views/ScheduleView';
import ExpenseView from './views/ExpenseView';
import PlanningView from './views/PlanningView';

// Firebase Auth
import { auth } from './services/firebase';
import * as firebaseAuth from 'firebase/auth';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ViewTab>('schedule');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 初始化：自動進行匿名登入
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("User is signed in:", user.uid);
        setIsAuthenticated(true);
      } else {
        console.log("Signing in anonymously...");
        firebaseAuth.signInAnonymously(auth).catch((error) => {
          console.error("Anonymous auth failed:", error);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const renderView = () => {
    // 雖然目前權限是公開的，但未來如果要鎖權限，可以利用 isAuthenticated 來決定是否顯示內容
    // 目前我們先直接顯示，讓體驗無縫接軌
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