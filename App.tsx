import React, { useState, useEffect } from 'react';
import { ViewTab } from './types';
import TabNavigation from './components/TabNavigation';
import ScheduleView from './views/ScheduleView';
import ExpenseView from './views/ExpenseView';
import PlanningView from './views/PlanningView';

// Firebase 服務與資料
import { auth, db, onAuthStateChanged, signInAnonymously } from './services/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { INITIAL_EVENTS } from './data/scheduleData';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ViewTab>('schedule');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // --- 強制寫入邏輯 (執行完後可刪除) ---
  const uploadItinerary = async () => {
    try {
      console.log('正在強制上傳行程至 Firebase...');
      const eventsRef = collection(db, 'events');
      await Promise.all(INITIAL_EVENTS.map(event => {
        return setDoc(doc(eventsRef, event.id), event);
      }));
      console.log('✅ 所有行程已成功強制寫入 Firebase！');
    } catch (error) {
      console.error('❌ 寫入失敗：', error);
    }
  };

  useEffect(() => {
    // 初始化時執行一次寫入
    uploadItinerary();

    // 匿名登入邏輯
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        signInAnonymously(auth).catch((error) => {
          console.warn("登入提示:", error.message);
        });
      }
    });

    return () => unsubscribe();
  }, []);
  // --------------------------------

  return (
    <div className="h-[100dvh] w-full max-w-md mx-auto bg-white relative shadow-2xl overflow-hidden flex flex-col">
      <div className="flex-1 overflow-hidden relative bg-gray-50">
        
        {/* 使用 hidden 控制切換，保留各分頁狀態 */}
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
