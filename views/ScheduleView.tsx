import React, { useState, useEffect } from 'react';
import { ScheduleEvent, WeatherInfo } from '../types';
import { INITIAL_DATES, INITIAL_EVENTS } from '../data/scheduleData';
import { getWeatherIconClass, getWeatherColorClass, getWeatherDescription } from '../utils/weatherUtils';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from '../utils/categoryConstants';

// Firebase Imports
import { db } from '../services/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

// Components
import WeatherDetailModal from '../components/WeatherDetailModal';
import EventEditModal from '../components/EventEditModal';

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

const ScheduleView: React.FC = () => {
  // --- Firebase Data State ---
  const [dates, setDates] = useState<string[]>([]); 
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  // --- View State ---
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  // Weather State
  const [weatherData, setWeatherData] = useState<Record<string, WeatherInfo>>({});
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [weatherError, setWeatherError] = useState<string>(''); 
  const [city, setCity] = useState<string>('載入中...');
  
  // Modal State
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [isNewEvent, setIsNewEvent] = useState(false);

  // --- Firebase Real-time Sync Logic ---
  useEffect(() => {
    // 1. Sync Dates (Collection: schedule_meta, Doc: dates)
    const datesRef = doc(db, 'schedule_meta', 'dates');
    const unsubDates = onSnapshot(datesRef, 
      (docSnap) => {
        setPermissionError(false);
        if (docSnap.exists()) {
          const loadedDates = docSnap.data().values as string[];
          setDates(loadedDates);
          // 如果還沒有選中日期（剛載入），預設選第一天
          if (!selectedDate && loadedDates.length > 0) {
              setSelectedDate(loadedDates[0]);
          }
        } else {
          // [First Run Initialization]
          console.log("Initializing Firebase Data...");
          const batch = writeBatch(db);
          batch.set(datesRef, { values: INITIAL_DATES });
          INITIAL_EVENTS.forEach(ev => {
              const evRef = doc(db, 'schedule_events', ev.id);
              batch.set(evRef, ev);
          });
          batch.commit().catch(err => console.error("Initialization failed:", err));
          
          setDates(INITIAL_DATES);
          setSelectedDate(INITIAL_DATES[0]);
        }
      },
      (error) => {
        console.error("Firestore Dates Error:", error);
        if (error.code === 'permission-denied') setPermissionError(true);
      }
    );

    // 2. Sync Events (Collection: schedule_events)
    const eventsRef = collection(db, 'schedule_events');
    const unsubEvents = onSnapshot(eventsRef, 
      (snapshot) => {
         const loadedEvents = snapshot.docs.map(d => d.data() as ScheduleEvent);
         setEvents(loadedEvents);
         setIsDataLoaded(true);
      },
      (error) => {
        console.error("Firestore Events Error:", error);
        // Usually handled by the dates listener error state, but safe to log here
      }
    );

    return () => {
      unsubDates();
      unsubEvents();
    };
  }, []); // Only run on mount

  // 當日期資料更新後，確保 selectedDate 有效
  useEffect(() => {
    if (dates.length > 0 && (!selectedDate || !dates.includes(selectedDate))) {
        setSelectedDate(dates[0]);
    }
  }, [dates]);

  const currentEvents = events.filter(e => e.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const currentWeather = weatherData[selectedDate];

  // --- Weather Logic ---
  useEffect(() => {
    // 當 dates 載入完成後才抓天氣
    if (dates.length > 0) {
        fetchWeather(dates);
    }
  }, [dates.length]);

  const fetchCityName = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=zh`);
      const data = await res.json();
      return data.city || data.locality || data.principalSubdivision || "未知地點";
    } catch (e) {
      console.warn("City fetch failed", e);
      return "未知地點";
    }
  };

  const fetchWeatherFromApi = async (lat: number, lng: number, targetDates: string[]): Promise<Record<string, WeatherInfo>> => {
    const startDate = targetDates[0];
    const endDate = targetDates[targetDates.length - 1];

    console.log(`[Weather] Requesting REAL forecast for range: ${startDate} to ${endDate}`);

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
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
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    const newWeatherMap: Record<string, WeatherInfo> = {};
    
    if (data.daily && data.daily.time) {
      data.daily.time.forEach((apiDate: string, index: number) => {
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
                hourly: []
             };
         }
      });
    }

    if (data.hourly && data.hourly.time) {
        data.hourly.time.forEach((timeStr: string, index: number) => {
            const datePart = timeStr.split('T')[0];
            const timePart = timeStr.split('T')[1].slice(0, 5); // HH:mm
            
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

    return newWeatherMap;
  };

  const fetchWeather = async (targetDates: string[]) => {
    setWeatherError('');
    setIsWeatherLoading(true);

    const DEFAULT_LAT = 35.0116;
    const DEFAULT_LNG = 135.7681;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error("Timeout")), 4000);
        if (!navigator.geolocation) {
          clearTimeout(timeoutId);
          reject(new Error("Not Supported"));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => { clearTimeout(timeoutId); resolve(pos); },
          (err) => { clearTimeout(timeoutId); reject(err); },
          { maximumAge: 60000, timeout: 5000, enableHighAccuracy: false } 
        );
      });

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      const data = await fetchWeatherFromApi(lat, lng, targetDates);
      setWeatherData(data);
      const cityName = await fetchCityName(lat, lng);
      setCity(cityName);

    } catch (gpsError) {
      console.warn("GPS failed, using Kyoto default.");
      setCity('京都 (Kyoto)');
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

  // --- Handlers using Firebase ---

  const handleAddDate = async () => {
    if (dates.length === 0) return;
    const lastDate = dates[dates.length - 1];
    const newDateObj = new Date(lastDate);
    newDateObj.setDate(newDateObj.getDate() + 1);
    const newDateStr = newDateObj.toISOString().split('T')[0];
    const newDates = [...dates, newDateStr];
    
    // Update Firebase
    try {
        await setDoc(doc(db, 'schedule_meta', 'dates'), { values: newDates });
        // Local update handled by snapshot listener
    } catch (e) {
        console.error("Failed to add date", e);
        alert("新增日期失敗，請檢查網路連線");
    }
  };

  const handleEventClick = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    setIsNewEvent(false);
  };

  const handleAddNewEvent = () => {
    const newEvent: ScheduleEvent = {
      id: Date.now().toString(), // Use timestamp as ID
      date: selectedDate || dates[0],
      time: '12:00',
      title: '新行程',
      location: { name: '' },
      category: 'sightseeing',
      notes: '',
      reservationNumber: ''
    };
    setSelectedEvent(newEvent);
    setIsNewEvent(true);
  };

  const handleSaveEvent = async (updatedEvent: ScheduleEvent) => {
    try {
        // Update Firebase (Insert or Update)
        await setDoc(doc(db, 'schedule_events', updatedEvent.id), updatedEvent);
        setSelectedEvent(null);
    } catch (e) {
        console.error("Failed to save event", e);
        alert("儲存失敗，請檢查網路連線");
    }
  };

  const handleDeleteEvent = async (eventToDelete: ScheduleEvent) => {
    const confirm = window.confirm("確定要刪除這個行程嗎？");
    if (!confirm) return;

    try {
        // Delete from Firebase
        await deleteDoc(doc(db, 'schedule_events', eventToDelete.id));
        setSelectedEvent(null);
    } catch (e) {
        console.error("Failed to delete event", e);
        alert("刪除失敗");
    }
  };

  if (permissionError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 text-2xl">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">資料庫權限不足</h2>
        <p className="text-gray-500 mb-6 text-sm">
          請至 Firebase Console {'>'} Firestore Database {'>'} Rules <br/>
          將規則改為 allow read, write: if true;
        </p>
        <button onClick={() => window.location.reload()} className="bg-ios-blue text-white px-6 py-2 rounded-xl font-bold">
          重試
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-ios-bg">
      {/* Header & Date Picker */}
      {/* UPDATE: Added pt-safe to handle iPhone notch area */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200 shadow-sm pt-safe">
        <div className="px-6 pt-2 pb-3 flex justify-between items-center">
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
        <div className="flex overflow-x-auto no-scrollbar px-6 pb-4 gap-4 snap-x w-full min-h-[100px]">
          {dates.length === 0 ? (
             // Loading Skeleton for Dates
             [1,2,3,4].map(i => (
                <div key={i} className="flex-shrink-0 w-[4.5rem] h-20 rounded-2xl bg-gray-100 animate-pulse"></div>
             ))
          ) : (
             dates.map((date) => {
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
                    <i className={`fa-solid ${getWeatherIconClass(w?.conditionCode)} text-xs mt-1 ${isSelected ? 'text-white' : getWeatherColorClass(w?.conditionCode)}`}></i>
                  </button>
                );
             })
          )}
          
          {dates.length > 0 && (
              <button 
                 onClick={handleAddDate}
                 className="flex-shrink-0 flex flex-col items-center justify-center w-[4.5rem] h-20 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 bg-gray-50/50 hover:bg-gray-100 active:scale-95 transition-all"
              >
                 <i className="fa-solid fa-plus text-xl mb-1"></i>
                 <span className="text-[10px] font-medium">Add</span>
              </button>
          )}
          <div className="w-2 flex-shrink-0"></div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24 space-y-6">
        
        {/* Weather Summary Card */}
        <button 
           onClick={() => currentWeather && setShowWeatherModal(true)}
           className="w-full bg-white rounded-2xl p-5 shadow-ios-sm flex items-center justify-between border border-gray-100 active:scale-[0.98] transition-transform text-left"
        >
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gray-50 text-2xl shadow-inner`}>
                 {isWeatherLoading ? (
                    <i className="fa-solid fa-spinner fa-spin text-gray-400"></i>
                 ) : (
                    <i className={`fa-solid ${getWeatherIconClass(currentWeather?.conditionCode)} ${getWeatherColorClass(currentWeather?.conditionCode)}`}></i>
                 )}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg flex items-center gap-2">
                   {city}
                </p>
                <div className="flex items-center text-xs text-gray-500 font-medium mt-1 gap-2">
                   <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-bold">
                     {selectedDate ? `${selectedDate.split('-')[1]}/${selectedDate.split('-')[2]}` : '--'}
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
          {!isDataLoaded ? (
             // Loading Skeleton for Events
             [1,2].map(i => (
                 <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 h-24 animate-pulse"></div>
             ))
          ) : (
             currentEvents.map((event) => (
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
             ))
          )}
          
          {isDataLoaded && currentEvents.length === 0 && (
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
        <WeatherDetailModal 
           weather={currentWeather} 
           city={city} 
           onClose={() => setShowWeatherModal(false)} 
        />
      )}

      {/* EVENT MODAL */}
      {selectedEvent && (
        <EventEditModal 
          event={selectedEvent}
          isNew={isNewEvent}
          dates={dates}
          onClose={() => setSelectedEvent(null)}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
};

export default ScheduleView;