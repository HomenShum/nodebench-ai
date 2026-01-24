'use client';

import { useState } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export function CalendarClient() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);
  const today = new Date();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Sample events
  const events = [
    { day: 5, title: 'Team Standup', time: '9:00 AM', color: 'blue' },
    { day: 12, title: 'Project Review', time: '2:00 PM', color: 'purple' },
    { day: 15, title: 'Client Meeting', time: '11:00 AM', color: 'green' },
    { day: 20, title: 'Sprint Planning', time: '10:00 AM', color: 'orange' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-600 mt-1">Manage your schedule and events</p>
          </div>
          <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Event
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Calendar Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <button type="button" onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button type="button" onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {days.map(day => (
              <div key={day} className="py-3 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 border-b border-r border-gray-100 bg-gray-50" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = today.getDate() === day &&
                             today.getMonth() === currentDate.getMonth() &&
                             today.getFullYear() === currentDate.getFullYear();
              const dayEvents = events.filter(e => e.day === day);

              return (
                <div
                  key={day}
                  className={`h-24 border-b border-r border-gray-100 p-2 hover:bg-gray-50 cursor-pointer ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <span className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full ${isToday ? 'bg-blue-600 text-white font-bold' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.map((event, idx) => (
                      <div
                        key={idx}
                        className={`text-xs px-1.5 py-0.5 rounded truncate bg-${event.color}-100 text-${event.color}-700`}
                        style={{
                          backgroundColor: event.color === 'blue' ? '#dbeafe' :
                                          event.color === 'purple' ? '#f3e8ff' :
                                          event.color === 'green' ? '#dcfce7' : '#ffedd5',
                          color: event.color === 'blue' ? '#1d4ed8' :
                                event.color === 'purple' ? '#7c3aed' :
                                event.color === 'green' ? '#15803d' : '#c2410c'
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
