import React, { useState, useEffect } from 'react';
import { ScheduleEvent, WeatherInfo, Category, HourlyForecast } from '../types';

// 更新為 2026 年 1 月的日期
const INITIAL_DATES = [
  '2026-01-08', // Thu
  '2026-01-09', // Fri
  '2026-01-10', // Sat
  '2026-01-11', // Sun
  '2026-01-12', // Mon
  '2026-01-13', // Tue
  '2026-01-14', // Wed
  '2026-01-15'  // Thu
];

const INITIAL_EVENTS: ScheduleEvent[] = [
  { id: '1', date: '2026-01-08', time: '10:00', title: '抵達關西機場 (KIX)', location: { name: 'Kansai Airport' }, category: 'transport', notes: '搭乘 Haruka前往京都', reservationNumber: 'RES-998877' },
  { id: '2', date: '2026-01-08', time: '13:00', title: '京都車站拉麵小路', location: { name: 'Kyoto Station' }, category: 'food' },
  { id: '3', date: '2026-01-08', time: '15:00', title: 'Check-in 飯店', location: { name: 'Piece Hostel Sanjo' }, category: 'accommodation', reservationNumber: 'BK-2026-XYZ' },
  { id: '4', date: '2026-01-08', time: '16:30', title: '清水寺夕陽', location: { name: 'Kiyomizu-dera' }, category: 'sightseeing', photos: ['https://picsum.photos/400/300'] },
  { id: '5', date: '2026-01-09', time: '09:00', title: '伏見稻荷大社', location: { name: 'Fushimi Inari' }, category: 'sightseeing' },
  { id: '6', date: '2026-01-09', time: '12:00', title: '錦市場午餐', location: { name: 'Nishiki Market' }, category: 'food', reservationNumber: 'Lunch-001' },
];

const CATEGORY_COLORS: Record<Category, string> = {
  sightseeing: 'bg-ios-indigo text-white',
  food: 'bg-ios-orange text-white',
  transport: 'bg-ios-green text-white',
  accommodation: 'bg-ios-pink text-white',
  shopping: 'bg-ios-blue text-white'
};

const CATEGORY_LABELS: Record<Category, string> = {
  sightseeing: '觀光',
  food: '美食',
  transport: '交通',
  accommodation: '住宿',
  shopping: '購物'
};

const CATEGORY_ICONS: Record<Category, string> = {
  sightseeing: 'fa-camera',
  food: 'fa-utensils',
  transport: 'fa-train-subway',
  accommodation: 'fa-bed',
  shopping: 'fa-bag-shopping'
};

// 離線預設資料 (萬一 API 完全掛掉時使用 - 冬季數據)
const OFFLINE_WEATHER_DATA: Record<string, WeatherInfo> = {};
INITIAL_DATES.forEach(date => {
  OFFLINE_WEATHER_DATA[date] = {
    date,
    condition: 'sunny',
    conditionCode: 1, // Clear sky
    tempMax: 8,  // Winter temp
    tempMin: 2,
    apparentTempMax: 6,
    apparentTempMin: 0,
    currentTemp: 5,
    precipitationProb: 10,
    hourly: Array(24).fill(0).map((_, i) => ({
      time: `${String(i).padStart(2, '0')}:00`,
      temp: 5,
      conditionCode: 1,
      precipitationProb: 0
    }))
  };
});


// Helper functions for Weather Icons and Colors
const getWeatherIconClass = (code?: number) => {
  if (code === undefined) return 'fa-sun';
  if (code <= 1) return 'fa-sun'; // Clear
  if (code <= 3) return 'fa-cloud-sun'; // Partly cloudy
  if (code <= 48) return 'fa-smog'; // Fog
  if (code <= 67) return 'fa-cloud-rain'; // Rain
  if (code <= 77) return 'fa-snowflake'; // Snow
  if (code <= 82) return 'fa-cloud-showers-heavy'; // Showers
  if (code <= 99) return 'fa-bolt'; // Thunderstorm
  return 'fa-cloud';
};

const getWeatherColorClass = (code?: number) => {
  if (code === undefined) return 'text-gray-400';
  if (code <= 1) return 'text-yellow-400'; // Sunny - Bright Yellow
  if (code <= 3) return 'text-orange-400'; // Partly cloudy - Orange
  if (code <= 48) return 'text-gray-400'; // Fog - Gray
  if (code <= 67) return 'text-blue-400'; // Rain - Light Blue
  if (code <= 77) return 'text-cyan-400'; // Snow - Cyan
  if (code <= 82) return 'text-blue-600'; // Showers - Darker Blue
  if (code <= 99) return 'text-purple-500'; // Thunder - Purple
  return 'text-gray-400';
};

const getWeatherGradientClass = (code?: number) => {
   if (code === undefined) return 'from-blue-500 to-blue-600';
   if (code <= 1) return 'from-blue-400 to-blue-600'; // Sunny - Bright Blue Sky
   if (code <= 3) return 'from-blue-400 to-slate-400'; // Cloudy - Blue to Grey
   if (code <= 48) return 'from-gray-400 to-gray-600'; // Fog - Grey
   if (code <= 67) return 'from-slate-600 to-blue-800'; // Rain - Dark Blue Grey
   if (code <= 77) return 'from-blue-300 to-cyan-100'; // Snow - Icy Blue (Warning: text might need to be dark if bg is light, but let's stick to darker gradients for text-white) -> Let's try Blue to Cyan but dark enough. from-blue-400 to-cyan-600
   if (code <= 77) return 'from-blue-400 to-cyan-600';
   if (code <= 82) return 'from-blue-700 to-indigo-900'; // Heavy Rain - Deep Blue
   if (code <= 99) return 'from-indigo-800 to-purple-900'; // Thunder - Deep Purple
   return 'from-gray-500 to-gray-700';
};

const getWeatherDescription = (code?: number) => {
  if (code === undefined) return '晴天';
  if (code <= 1) return '晴朗';
  if (code <= 3) return '多雲';
  if (code <= 48) return '霧';
  if (code <= 67) return '有雨';
  if (code <= 77) return '下雪';
  if (code <= 82) return '陣雨';
  if (code <= 99) return '雷雨';
  return '陰天';
};

const ScheduleView: React.FC = () => {
  const [dates, setDates] = useState<string[]>(INITIAL_DATES);
  const [events, setEvents] = useState<ScheduleEvent[]>(INITIAL_EVENTS);
  const [selectedDate, setSelectedDate] = useState<string>(dates[0]);
  
  // Weather State
  const [weatherData, setWeatherData] = useState<Record<string, WeatherInfo>>({});
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [weatherError, setWeatherError] = useState<string>(''); 
  const [city, setCity] = useState<string>('載入中...'); // Default loading state
  
  // Modal State
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ScheduleEvent>>({});

  const currentEvents = events.filter(e => e.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const currentWeather = weatherData[selectedDate];

  // --- Weather Logic ---
  useEffect(() => {
    fetchWeather(dates);
  }, []);

  // Helper: Reverse Geocoding to get City Name
  const fetchCityName = async (lat: number, lng: number): Promise<string> => {
    try {
      // 使用 BigDataCloud 免費 API (Client-side friendly)
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=zh`);
      const data = await res.json();
      // 優先順序：城市 > 行政區 > 地名
      return data.city || data.locality || data.principalSubdivision || "未知地點";
    } catch (e) {
      console.warn("City fetch failed", e);
      return "未知地點";
    }
  };

  // API 請求邏輯
  const fetchWeatherFromApi = async (lat: number, lng: number, targetDates: string[]): Promise<Record<string, WeatherInfo>> => {
    const startDate = targetDates[0];
    const endDate = targetDates[targetDates.length - 1];

    console.log(`[Weather] Requesting REAL forecast for range: ${startDate} to ${endDate}`);

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      // 強制指定日期範圍
      start_date: startDate,
      end_date: endDate,
      current: 'temperature_2m,weather_code,apparent_temperature,precipitation',
      hourly: 'temperature_2m,weather_code,precipitation_probability',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max',
      timezone: 'auto'
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      // 如果因為日期太遠導致 400 錯誤，這裡會拋出異常
      const errorText = await response.text();
      console.error('[Weather API Error Response]:', errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[Weather API Data Received]:', data); // ---> 檢查這裡！
    
    const newWeatherMap: Record<string, WeatherInfo> = {};
    
    // 嚴格日期匹配模式 (Strict Matching)
    // 我們只填入 API 真實回傳的日期，絕不進行映射或補位
    if (data.daily && data.daily.time) {
      data.daily.time.forEach((apiDate: string, index: number) => {
         // 只有當 API 回傳的日期存在於我們的行程表中，才處理
         if (targetDates.includes(apiDate)) {
             newWeatherMap[apiDate] = {
                date: apiDate,
                condition: 'sunny', 
                conditionCode: data.daily.weather_code[index],
                tempMax: Math.round(data.daily.temperature_2m_max[index]),
                tempMin: Math.round(data.daily.temperature_2m_min[index]),
                apparentTempMax: Math.round(data.daily.apparent_temperature_max[index]),
                apparentTempMin: Math.round(data.daily.apparent_temperature_min[index]),
                precipitationProb: data.daily.precipitation_probability_max[index],
                hourly: [] // 初始化 hourly
             };
         }
      });
    }

    // 處理 Hourly Data (因為 API 回傳的是所有天數的大陣列，需要依日期切分)
    if (data.hourly && data.hourly.time) {
        data.hourly.time.forEach((timeStr: string, index: number) => {
            const datePart = timeStr.split('T')[0];
            const timePart = timeStr.split('T')[1].slice(0, 5); // HH:mm
            
            // 如果這一天有在我們的 map 中，就加入小時預報
            if (newWeatherMap[datePart]) {
                newWeatherMap[datePart].hourly?.push({
                    time: timePart,
                    temp: Math.round(data.hourly.temperature_2m[index]),
                    conditionCode: data.hourly.weather_code[index],
                    precipitationProb: data.hourly.precipitation_probability[index]
                });
            }
        });
    }

    // 處理 Current Data
    // 注意：API 的 "current" 是指發送請求當下 (2026/1/3) 的天氣，而非未來的 1/8
    // 但為了介面不報錯，我們還是可以存一下，或者如果我們在 1/8 當天查看，它就會是準的
    if (data.current) {
        // 這裡我們暫時把它綁定到 "今天" (如果今天在行程範圍內的話)
        // 或者保留給 UI 做參考
    }

    return newWeatherMap;
  };

  const fetchWeather = async (targetDates: string[]) => {
    setWeatherError('');
    setIsWeatherLoading(true);

    // Kyoto Coordinates (Default)
    const DEFAULT_LAT = 35.0116;
    const DEFAULT_LNG = 135.7681;

    try {
      // Try Geolocation
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error("Timeout")), 4000);

        if (!navigator.geolocation) {
          clearTimeout(timeoutId);
          reject(new Error("Not Supported"));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve(pos);
          },
          (err) => {
            clearTimeout(timeoutId);
            reject(err);
          },
          { maximumAge: 60000, timeout: 5000, enableHighAccuracy: false } 
        );
      });

      // GPS Success
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      // 1. 取得真實天氣
      const data = await fetchWeatherFromApi(lat, lng, targetDates);
      setWeatherData(data);
      
      // 2. 取得真實城市名稱
      const cityName = await fetchCityName(lat, lng);
      setCity(cityName);

    } catch (gpsError) {
      // Fallback to Kyoto
      console.warn("GPS failed, using Kyoto default.");
      setCity('京都 (Kyoto)'); // 定位失敗，直接顯示京都
      try {
        const data = await fetchWeatherFromApi(DEFAULT_LAT, DEFAULT_LNG, targetDates);
        setWeatherData(data);
      } catch (apiError: any) {
        console.error("API failed completely", apiError);
        setWeatherData(OFFLINE_WEATHER_DATA);
        setWeatherError('(離線模式)');
      }
    } finally {
      setIsWeatherLoading(false);
    }
  };

  const handleAddDate = () => {
    const lastDate = dates[dates.length - 1];
    const newDateObj = new Date(lastDate);
    newDateObj.setDate(newDateObj.getDate() + 1);
    const newDateStr = newDateObj.toISOString().split('T')[0];
    setDates([...dates, newDateStr]);
  };

  const handleEventClick = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    setEditForm(event);
    setIsEditing(false);
  };

  const handleAddNewEvent = () => {
    const newEvent: ScheduleEvent = {
      id: Date.now().toString(),
      date: selectedDate,
      time: '12:00',
      title: '新行程',
      location: { name: '' },
      category: 'sightseeing',
      notes: '',
      reservationNumber: ''
    };
    setSelectedEvent(newEvent);
    setEditForm(newEvent);
    setIsEditing(true);
  };

  const handleSaveEvent = () => {
    if (!editForm.title || !selectedEvent) return;
    
    const updatedEvent = {
       ...selectedEvent,
       ...editForm,
       location: { ...selectedEvent.location, name: editForm.location?.name || '' }
    } as ScheduleEvent;

    setEvents(prev => {
      const exists = prev.find(e => e.id === updatedEvent.id);
      if (exists) {
        return prev.map(e => e.id === updatedEvent.id ? updatedEvent : e);
      }
      return [...prev, updatedEvent];
    });

    setSelectedEvent(null);
    setIsEditing(false);
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
    setSelectedEvent(null);
  };

  const handleOpenMaps = () => {
    if (!selectedEvent?.location) return;
    const { name, lat, lng } = selectedEvent.location;
    
    let query = '';
    if (lat && lng) {
      query = `${lat},${lng}`;
    } else if (name) {
      query = name;
    } else {
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-ios-bg">
      {/* Header & Date Picker */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200 shadow-sm">
        <div className="px-6 pt-5 pb-3 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">行程 Schedule</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium flex items-center">
              <i className="fa-solid fa-location-dot mr-1 text-ios-red"></i> {city}
            </p>
          </div>
          <button 
            onClick={handleAddNewEvent} 
            className="w-10 h-10 rounded-full bg-ios-blue text-white flex items-center justify-center shadow-lg shadow-blue-200 active:scale-90 transition-transform"
          >
            <i className="fa-solid fa-plus text-xl"></i>
          </button>
        </div>
        
        {/* Date Scroller */}
        <div className="flex overflow-x-auto no-scrollbar px-6 pb-4 gap-4 snap-x w-full">
          {dates.map((date) => {
            const dateObj = new Date(date);
            const day = dateObj.getDate();
            const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            const monthStr = monthNames[dateObj.getMonth()];
            const w = weatherData[date];
            const isSelected = date === selectedDate;
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 snap-start flex flex-col items-center justify-center w-[4.5rem] h-20 rounded-2xl border transition-all duration-300 active:scale-95 ${
                  isSelected 
                    ? 'bg-ios-blue border-ios-blue text-white shadow-ios-md ring-2 ring-blue-100 ring-offset-1' 
                    : 'bg-white border-gray-100 text-gray-600'
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'opacity-90' : 'opacity-60'}`}>{monthStr}</span>
                <span className="text-2xl font-bold leading-none my-0.5">{day}</span>
                {/* 這裡使用條件式：未選中時顯示彩色圖示，選中時顯示白色圖示 */}
                <i className={`fa-solid ${getWeatherIconClass(w?.conditionCode)} text-xs mt-1 ${isSelected ? 'text-white' : getWeatherColorClass(w?.conditionCode)}`}></i>
              </button>
            );
          })}
          
          {/* Add Date Button */}
          <button 
             onClick={handleAddDate}
             className="flex-shrink-0 flex flex-col items-center justify-center w-[4.5rem] h-20 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 bg-gray-50/50 hover:bg-gray-100 active:scale-95 transition-all"
          >
             <i className="fa-solid fa-plus text-xl mb-1"></i>
             <span className="text-[10px] font-medium">Add</span>
          </button>
          <div className="w-2 flex-shrink-0"></div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24 space-y-6">
        
        {/* Weather Summary Card - Updated UI */}
        <button 
           onClick={() => currentWeather && setShowWeatherModal(true)}
           className="w-full bg-white rounded-2xl p-5 shadow-ios-sm flex items-center justify-between border border-gray-100 active:scale-[0.98] transition-transform text-left"
        >
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gray-50 text-2xl shadow-inner`}>
                 {isWeatherLoading ? (
                    <i className="fa-solid fa-spinner fa-spin text-gray-400"></i>
                 ) : (
                    // 這裡顯示彩色的天氣圖示
                    <i className={`fa-solid ${getWeatherIconClass(currentWeather?.conditionCode)} ${getWeatherColorClass(currentWeather?.conditionCode)}`}></i>
                 )}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg flex items-center gap-2">
                   {city}
                </p>
                <div className="flex items-center text-xs text-gray-500 font-medium mt-1 gap-2">
                   {/* 顯示選中的日期 (例如 01/08) */}
                   <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-bold">
                     {selectedDate.split('-')[1]}/{selectedDate.split('-')[2]}
                   </span>
                   <span>
                      {isWeatherLoading ? '更新中...' : (currentWeather ? getWeatherDescription(currentWeather.conditionCode) : '無此日預報')}
                   </span>
                </div>
              </div>
           </div>
           
           <div className="text-right">
              {currentWeather ? (
                <>
                  <span className="text-3xl font-bold text-gray-900 tracking-tight">
                    {currentWeather.currentTemp ?? Math.round((currentWeather.tempMax + currentWeather.tempMin) / 2)}°
                  </span>
                  <div className="text-xs text-gray-500 font-semibold mt-1">
                     體感 {currentWeather.currentApparentTemp ?? Math.round(((currentWeather.apparentTempMax || 0) + (currentWeather.apparentTempMin || 0)) / 2)}°
                  </div>
                </>
              ) : (
                <span className="text-sm text-gray-400">--</span>
              )}
           </div>
        </button>

        {/* Timeline */}
        <div className="relative pl-4 border-l-2 border-gray-200 ml-4 space-y-8">
          {currentEvents.map((event) => (
            <div key={event.id} className="relative group cursor-pointer" onClick={() => handleEventClick(event)}>
              {/* Dot */}
              <div className={`absolute -left-[25px] w-4 h-4 rounded-full border-2 border-white ring-2 ring-gray-100 ${CATEGORY_COLORS[event.category].split(' ')[0]}`}></div>
              
              {/* Card */}
              <div className="bg-white rounded-xl p-4 shadow-ios-sm border border-gray-100 transition-transform active:scale-[0.98]">
                <div className="flex justify-between items-start mb-2">
                   <span className="text-sm font-semibold text-gray-400 font-mono tracking-tight">{event.time}</span>
                   <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[event.category]}`}>
                      <i className={`fa-solid ${CATEGORY_ICONS[event.category]} mr-1`}></i>
                      {CATEGORY_LABELS[event.category]}
                   </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h3>
                
                {event.reservationNumber && (
                   <div className="inline-flex items-center bg-gray-50 border border-gray-200 rounded px-2 py-0.5 mb-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase mr-1">No.</span>
                      <span className="text-xs font-mono font-medium text-gray-800">{event.reservationNumber}</span>
                   </div>
                )}

                <div className="flex items-center text-gray-500 text-sm">
                   <i className="fa-solid fa-location-dot mr-1.5 text-ios-red w-4 text-center"></i>
                   <span className="truncate">{event.location.name || '未設定地點'}</span>
                </div>
              </div>
            </div>
          ))}
          
          {currentEvents.length === 0 && (
             <div className="text-center py-10 text-gray-400">
                <i className="fa-regular fa-calendar-xmark text-3xl mb-2"></i>
                <p>這一天沒有安排行程</p>
                <button onClick={handleAddNewEvent} className="mt-4 text-ios-blue text-sm font-semibold">
                  + 新增行程
                </button>
             </div>
          )}
        </div>
      </div>

      {/* WEATHER MODAL */}
      {showWeatherModal && currentWeather && (
         <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-0 sm:p-4">
            {/* 動態背景漸層 */}
            <div className={`bg-gradient-to-br ${getWeatherGradientClass(currentWeather.conditionCode)} w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out] text-white`}>
               {/* Header */}
               <div className="p-6 pb-2 flex justify-between items-start">
                  <div>
                     <h2 className="text-2xl font-bold flex items-center gap-2">
                        <i className="fa-solid fa-location-arrow text-sm"></i> {city}
                     </h2>
                     {/* 顯示詳細的日期 */}
                     <p className="text-blue-100 text-sm opacity-80">{currentWeather.date}</p>
                  </div>
                  <button 
                     onClick={() => setShowWeatherModal(false)}
                     className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30 backdrop-blur-sm"
                  >
                     <i className="fa-solid fa-xmark"></i>
                  </button>
               </div>

               {/* Current Status */}
               <div className="flex flex-col items-center justify-center py-6">
                  {/* Modal 中的大圖示使用白色使其在深色背景上凸顯 */}
                  <i className={`fa-solid ${getWeatherIconClass(currentWeather.conditionCode)} text-6xl mb-4 drop-shadow-lg text-white`}></i>
                  <div className="text-6xl font-bold tracking-tighter mb-2">
                     {currentWeather.currentTemp ?? Math.round((currentWeather.tempMax + currentWeather.tempMin) / 2)}°
                  </div>
                  <div className="text-lg font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm mb-1">
                     {getWeatherDescription(currentWeather.conditionCode)}
                  </div>
                  <div className="text-sm text-blue-100 font-medium">
                     體感 {currentWeather.currentApparentTemp ?? Math.round(((currentWeather.apparentTempMax || 0) + (currentWeather.apparentTempMin || 0)) / 2)}°
                  </div>

                  <div className="flex gap-4 mt-8 w-full px-6">
                     <div className="flex-1 text-center bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                        <div className="text-xs text-blue-100 opacity-70 mb-1">降雨機率</div>
                        <div className="text-xl font-bold"><i className="fa-solid fa-umbrella text-sm mr-1"></i>{currentWeather.precipitationProb ?? 0}%</div>
                     </div>
                     <div className="flex-1 text-center bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                        <div className="text-xs text-blue-100 opacity-70 mb-1">氣溫範圍</div>
                        <div className="text-xl font-bold">{currentWeather.tempMax}° / {currentWeather.tempMin}°</div>
                     </div>
                     <div className="flex-1 text-center bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                        <div className="text-xs text-blue-100 opacity-70 mb-1">體感範圍</div>
                        <div className="text-xl font-bold">{currentWeather.apparentTempMax}° / {currentWeather.apparentTempMin}°</div>
                     </div>
                  </div>
               </div>

               {/* Hourly Forecast */}
               <div className="bg-white/90 backdrop-blur-xl text-gray-900 rounded-t-3xl p-6 pb-12">
                  <h3 className="text-sm font-bold text-gray-500 uppercase mb-4">未來 24 小時預報</h3>
                  <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
                     {currentWeather.hourly?.map((hour, idx) => (
                        <div key={idx} className="flex-shrink-0 flex flex-col items-center gap-2 w-14">
                           <span className="text-xs font-bold text-gray-400">{hour.time}</span>
                           {/* 小時預報使用彩色圖示 */}
                           <i className={`fa-solid ${getWeatherIconClass(hour.conditionCode)} text-xl ${getWeatherColorClass(hour.conditionCode)}`}></i>
                           <span className="text-lg font-bold">{hour.temp}°</span>
                           <div className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                              {hour.precipitationProb}% <i className="fa-solid fa-droplet text-[8px]"></i>
                           </div>
                        </div>
                     )) || <p className="text-sm text-gray-400">暫無詳細數據</p>}
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* EVENT MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full max-w-md h-[85vh] sm:h-auto sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-[slideUp_0.3s_ease-out]">
            
            <div className="p-6 flex-1 overflow-y-auto">
               {isEditing ? (
                 /* 增加 pb-20 確保底部按鈕不會被擋住 */
                 <div className="space-y-4 pb-20">
                    <div className="flex justify-between items-center mb-2">
                       <h2 className="text-xl font-bold">編輯行程</h2>
                       <button onClick={() => setIsEditing(false)} className="text-gray-400">取消</button>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">標題</label>
                      <input 
                        className="w-full border-b border-gray-200 py-2 text-lg font-bold outline-none focus:border-ios-blue"
                        value={editForm.title}
                        onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">日期</label>
                        <select 
                          className="w-full border-b border-gray-200 py-2 bg-transparent outline-none"
                          value={editForm.date}
                          onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                        >
                           {dates.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">時間</label>
                        <input 
                          type="time"
                          className="w-full border-b border-gray-200 py-2 outline-none"
                          value={editForm.time}
                          onChange={(e) => setEditForm({...editForm, time: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">類別</label>
                      <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar py-1">
                        {Object.keys(CATEGORY_COLORS).map((cat) => (
                           <button
                             key={cat}
                             onClick={() => setEditForm({...editForm, category: cat as Category})}
                             className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-colors ${
                               editForm.category === cat 
                               ? CATEGORY_COLORS[cat as Category] 
                               : 'bg-gray-100 text-gray-500'
                             }`}
                           >
                             {CATEGORY_LABELS[cat as Category]}
                           </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">地點</label>
                      <input 
                        className="w-full border-b border-gray-200 py-2 outline-none"
                        value={editForm.location?.name}
                        onChange={(e) => setEditForm({...editForm, location: {name: e.target.value}})}
                        placeholder="輸入地點名稱"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">預約編號</label>
                      <input 
                        className="w-full bg-gray-50 rounded-lg px-3 py-2 mt-1 outline-none border border-transparent focus:border-ios-blue focus:bg-white transition-colors"
                        value={editForm.reservationNumber || ''}
                        onChange={(e) => setEditForm({...editForm, reservationNumber: e.target.value})}
                        placeholder="例如: BK-2024-888"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">備註</label>
                      <textarea 
                        className="w-full bg-gray-50 rounded-lg px-3 py-2 mt-1 outline-none border border-transparent focus:border-ios-blue focus:bg-white transition-colors h-24 resize-none"
                        value={editForm.notes || ''}
                        onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                      />
                    </div>

                    <div className="pt-4 flex gap-3">
                       {selectedEvent.id && (
                          <button onClick={handleDeleteEvent} className="flex-1 bg-red-100 text-red-600 py-3 rounded-xl font-bold text-sm">
                             刪除
                          </button>
                       )}
                       <button onClick={handleSaveEvent} className="flex-[2] bg-ios-blue text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-200">
                          儲存
                       </button>
                    </div>
                 </div>
               ) : (
                  <>
                   {/* Header Section: Category & Close Button */}
                   <div className="flex justify-between items-start mb-2">
                     <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                       CATEGORY_COLORS[selectedEvent.category].includes('bg-ios-indigo') ? 'text-ios-indigo border-ios-indigo/20 bg-indigo-50' :
                       CATEGORY_COLORS[selectedEvent.category].includes('bg-ios-orange') ? 'text-ios-orange border-ios-orange/20 bg-orange-50' :
                       CATEGORY_COLORS[selectedEvent.category].includes('bg-ios-green') ? 'text-ios-green border-ios-green/20 bg-green-50' :
                       CATEGORY_COLORS[selectedEvent.category].includes('bg-ios-pink') ? 'text-ios-pink border-ios-pink/20 bg-pink-50' :
                       'text-ios-blue border-ios-blue/20 bg-blue-50'
                     }`}>
                       {CATEGORY_LABELS[selectedEvent.category]}
                     </span>
                     
                     <button 
                        onClick={() => setSelectedEvent(null)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 active:scale-90 transition-transform"
                     >
                       <i className="fa-solid fa-xmark"></i>
                     </button>
                   </div>
                   
                   <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-4">{selectedEvent.title}</h2>

                   {/* Action Buttons */}
                   <div className="flex gap-3 mb-6">
                      <button 
                        onClick={() => { setIsEditing(true); setEditForm(selectedEvent); }}
                        className="flex-1 bg-ios-blue text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
                      >
                        <i className="fa-solid fa-pen"></i> 編輯行程
                      </button>
                      <button className="flex-none w-14 bg-gray-100 text-gray-900 rounded-xl font-bold text-sm active:scale-95 transition-transform flex items-center justify-center">
                          <i className="fa-solid fa-camera text-lg"></i>
                      </button>
                   </div>
                   
                   <div className="space-y-5">
                      {/* Reservation Number Card */}
                      {selectedEvent.reservationNumber && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative overflow-hidden flex flex-col justify-center">
                           <div className="flex justify-between items-center z-10">
                             <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">預約編號 (Booking No.)</p>
                                <p className="font-mono font-bold text-xl text-slate-800 tracking-wider">
                                  {selectedEvent.reservationNumber}
                                </p>
                             </div>
                             <div className="h-8 w-px bg-slate-200 mx-4"></div>
                             <button 
                               onClick={() => navigator.clipboard.writeText(selectedEvent.reservationNumber || '')}
                               className="text-slate-400 hover:text-ios-blue active:scale-95 transition-transform"
                             >
                                <i className="fa-regular fa-copy text-xl"></i>
                             </button>
                           </div>
                           {/* Decoration */}
                           <div className="absolute -right-6 -bottom-6 text-slate-100/50 text-8xl">
                              <i className="fa-solid fa-ticket"></i>
                           </div>
                        </div>
                      )}

                      {/* Time Row */}
                      <div className="flex items-start gap-4">
                        <div className="w-8 flex justify-center pt-1">
                           <i className="fa-regular fa-clock text-gray-400 text-lg"></i>
                        </div>
                        <div className="flex-1 border-b border-gray-100 pb-4">
                          <p className="text-gray-900 font-medium text-lg">{selectedEvent.time}</p>
                          <p className="text-gray-500 text-sm">{selectedEvent.date}</p>
                        </div>
                      </div>
                      
                      {/* Location Row */}
                      <div className="flex items-start gap-4">
                         <div className="w-8 flex justify-center pt-1">
                           <i className="fa-solid fa-location-dot text-gray-400 text-lg"></i>
                         </div>
                         <div className="flex-1 border-b border-gray-100 pb-4">
                          <p className="text-gray-900 font-medium text-lg">{selectedEvent.location.name}</p>
                          <button 
                            onClick={handleOpenMaps}
                            className="text-ios-blue text-sm font-medium mt-1 inline-flex items-center gap-1 active:opacity-60"
                          >
                             <i className="fa-solid fa-map-location-dot"></i> 在 Google Maps 開啟
                          </button>
                        </div>
                      </div>

                      {/* Notes Row */}
                      {selectedEvent.notes && (
                        <div className="mt-2 pt-2">
                           <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                              <i className="fa-solid fa-align-left"></i> 備註
                           </h4>
                           <div className="bg-gray-50 rounded-xl p-4 text-gray-700 text-sm leading-relaxed whitespace-pre-wrap border border-gray-100">
                              {selectedEvent.notes}
                           </div>
                        </div>
                      )}
                   </div>
                  </>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;