import { db } from './services/firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { INITIAL_EVENTS } from './data/scheduleData';

export const forceUploadToFirebase = async () => {
  try {
    console.log("🚀 開始強制同步行程至 Firebase...");
    
    // 使用 Batch (批次寫入) 效率最高且節省額度
    const batch = writeBatch(db);
    
    INITIAL_EVENTS.forEach((event) => {
      // 以 id (如 d1-1) 作為文件名稱，確保不會重複
      const docRef = doc(collection(db, 'events'), event.id);
      batch.set(docRef, event);
    });

    await batch.commit();
    console.log("✅ 成功！所有行程（包含預約編號）已寫入資料庫。");
    alert("Firebase 資料同步成功！");
  } catch (error) {
    console.error("❌ 寫入失敗:", error);
    alert("寫入失敗，請檢查 Console 報錯。");
  }
};
