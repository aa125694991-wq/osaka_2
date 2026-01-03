import { db } from './services/firebase'; // 確保路徑正確
import { collection, doc, setDoc } from 'firebase/firestore';
import { INITIAL_EVENTS } from './data/scheduleData';

export const uploadItinerary = async () => {
  try {
    const eventsRef = collection(db, 'events'); // 假設你的集合名稱是 events
    
    // 使用 Promise.all 同步寫入所有事件
    await Promise.all(INITIAL_EVENTS.map(event => {
      // 使用事件的 id 作為 document ID，避免重複
      return setDoc(doc(eventsRef, event.id), event);
    }));

    console.log('所有行程已成功強制寫入 Firebase！');
  } catch (error) {
    console.error('寫入失敗：', error);
  }
};
