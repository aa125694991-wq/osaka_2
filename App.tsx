import { useEffect } from 'react';
import { uploadItinerary } from './utils/uploadScript'; // 假設你把剛才的 script 存成這個檔案

function App() {
  useEffect(() => {
    // 只有在開發環境執行，或執行一次後就手動刪除這行
    uploadItinerary();
  }, []);

  return (
    <div>
      <h1>我的京都行程表</h1>
      {/* 你的其他組件 */}
    </div>
  );
}
