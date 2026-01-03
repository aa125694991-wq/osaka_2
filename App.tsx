import React, { useState, useEffect } from 'react';
import { ViewTab } from './types';
import TabNavigation from './components/TabNavigation';
import ScheduleView from './views/ScheduleView';
import ExpenseView from './views/ExpenseView';
import PlanningView from './views/PlanningView';

// Firebase Auth
// Updated import to use the exports from services/firebase to avoid direct import errors
import { auth, onAuthStateChanged, signInAnonymously } from './services/firebase';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ViewTab>('schedule');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 初始化：自動進行匿名登入
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (user) {
        console.log("User is signed in:", user.uid);
        setIsAuthenticated(true);
      } else {
        console.log("Attempting to sign in anonymously...");
        signInAnonymously(auth).catch((error: any) => {
          // 如果是 "admin-restricted-operation"，代表 Firebase Console 沒開匿名登入
          // 但如果使用者的 Firestore Rules 設為 public，這其實不影響運作，所以改用 warn 提示即可
          if (error.code === 'auth/admin-restricted-operation') {
             console.warn(">> 注意: Firebase 匿名登入功能未啟用 (auth/admin-restricted-operation)。");
             console.warn(">> 如果您已將 Firestore Rules 設為 public (allow read, write: if true;)，可忽略此警告。");
             console.warn(">> 若需啟用: 請至 Firebase Console > Authentication > Sign-in method 開啟 Anonymous。");
          } else {
             console.error("Anonymous auth failed:", error);
          }
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