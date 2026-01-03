import { ScheduleEvent } from '../types';

// 您之後可以在這裡直接貼上 2026/1/8 ~ 2026/1/15 的完整日期陣列
export const INITIAL_DATES = [
  '2026-01-08', // Thu
  '2026-01-09', // Fri
  '2026-01-10', // Sat
  '2026-01-11', // Sun
  '2026-01-12', // Mon
  '2026-01-13', // Tue
  '2026-01-14', // Wed
  '2026-01-15'  // Thu
];

// 您之後可以在這裡直接貼上完整的行程物件陣列
export const INITIAL_EVENTS: ScheduleEvent[] = [
  { id: '1', date: '2026-01-08', time: '10:00', title: '抵達關西機場 (KIX)', location: { name: 'Kansai Airport' }, category: 'transport', notes: '搭乘 Haruka前往京都', reservationNumber: 'RES-998877' },
  { id: '2', date: '2026-01-08', time: '13:00', title: '京都車站拉麵小路', location: { name: 'Kyoto Station' }, category: 'food' },
  { id: '3', date: '2026-01-08', time: '15:00', title: 'Check-in 飯店', location: { name: 'Piece Hostel Sanjo' }, category: 'accommodation', reservationNumber: 'BK-2026-XYZ' },
  { id: '4', date: '2026-01-08', time: '16:30', title: '清水寺夕陽', location: { name: 'Kiyomizu-dera' }, category: 'sightseeing', photos: ['https://picsum.photos/400/300'] },
  { id: '5', date: '2026-01-09', time: '09:00', title: '伏見稻荷大社', location: { name: 'Fushimi Inari' }, category: 'sightseeing' },
  { id: '6', date: '2026-01-09', time: '12:00', title: '錦市場午餐', location: { name: 'Nishiki Market' }, category: 'food', reservationNumber: 'Lunch-001' },
];
