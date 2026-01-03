import React, { useState, useEffect } from 'react';
import { ViewTab } from './types';
import TabNavigation from './components/TabNavigation';
import ScheduleView from './views/ScheduleView';
import ExpenseView from './views/ExpenseView';
import PlanningView from './views/PlanningView';

// Firebase Auth
import { auth, onAuthStateChanged, signInAnonymously } from './services/firebase';
// 匯入上傳功能
import { forceUploadToFirebase } from './forceUpload';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ViewTab>('schedule');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        signInAnonymously(auth).catch((error: any) => {
          console.warn("Auth status:", error.message);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="h-[100dvh] w-full max-w-md mx-auto bg-white relative shadow-2xl overflow-hidden flex flex-col">
      
      {/* 🟢 按鈕要放在這裡 (return 裡面) 才會出現 */}
      <button 
        onClick={() => forceUploadToFirebase()}
        style={{ 
          position: 'absolute', 
          top: '10px', 
          left: '10px', 
          zIndex: 9999, 
          padding: '12px', 
          background: 'red', 
          color: 'white',
          borderRadius: '8px',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
        }}
      >
        點我：強制同步行程
      </button>

      <div className="flex-1 overflow-hidden relative bg-ios-bg">
        <div className={`h-full w-full ${currentTab === 'schedule' ? 'block' : 'hidden'}`}>
          <ScheduleView />
        </div>

        <div className={`h-full w-full ${currentTab === 'expense' ? 'block' : 'hidden'}`}>
          <ExpenseView />
        </div>

        <div className={`h-full w-full ${currentTab === 'planning' ? 'block' : 'hidden'}`}>
          <PlanningView />
        </div>
      </div>
      
      <TabNavigation currentTab={currentTab} onTabChange={setCurrentTab} />
    </div>
  );
};

export default App;
