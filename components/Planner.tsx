
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { WeeklyData, DAYS, DayKey, EMPTY_WEEK, Task } from '../types';
import { generateSmartPlan } from '../services/geminiService';

const ROWS_PER_DAY = 14;
const TODO_ROWS = 10;

const KOREAN_DAYS = ['월', '화', '수', '목', '금', '토', '일'];

const FALLBACK_TASK: Task = { id: 'fallback', text: '', done: false, color: undefined };

// Helper to get Monday of current week
const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const formatDate = (date: Date) => {
  return date.toISOString().split('T')[0];
};

const formatDateKorean = (d: Date) => {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};

const getWeekDays = (startStr: string) => {
  const start = new Date(startStr);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
};

const DisplayDateRange = ({ startStr }: { startStr: string }) => {
  const start = new Date(startStr);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  return (
    <span className="font-sans text-ink/90 text-lg">
      {formatDateKorean(start)} ~ {formatDateKorean(end)}
    </span>
  );
};

// Color helpers for the vertical bar
const getColorBarClass = (color?: string) => {
  switch (color) {
    case 'red': return 'bg-rose-500 hover:bg-rose-600';
    case 'blue': return 'bg-blue-500 hover:bg-blue-600';
    case 'yellow': return 'bg-yellow-400 hover:bg-yellow-500';
    default: return 'bg-stone-200 hover:bg-stone-300'; // Visible default state for interaction
  }
};

const nextColor = (current?: string): 'red' | 'blue' | 'yellow' | undefined => {
    if (!current) return 'red';
    if (current === 'red') return 'blue';
    if (current === 'blue') return 'yellow';
    return undefined;
};

export const Planner: React.FC = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(formatDate(getMonday(new Date())));
  const [data, setData] = useState<WeeklyData>({ ...EMPTY_WEEK, weekId: currentWeekStart });
  const [loading, setLoading] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [geminiPrompt, setGeminiPrompt] = useState('');
  
  const weekDays = getWeekDays(currentWeekStart);

  // Load data from local storage on mount or week change
  useEffect(() => {
    const saved = localStorage.getItem(`planner_${currentWeekStart}`);
    if (saved) {
      setData(JSON.parse(saved));
    } else {
      setData({ ...EMPTY_WEEK, weekId: currentWeekStart });
    }
  }, [currentWeekStart]);

  // Save data debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      localStorage.setItem(`planner_${currentWeekStart}`, JSON.stringify(data));
    }, 500);
    return () => clearTimeout(handler);
  }, [data, currentWeekStart]);

  const handleTaskChange = (day: DayKey, index: number, field: 'text' | 'done' | 'color', value: any) => {
    setData(prev => {
      const newDays = { ...prev.days };
      const tasks = [...(newDays[day].tasks || [])];
      
      while (tasks.length <= index) {
        tasks.push({ id: Math.random().toString(), text: '', done: false });
      }

      tasks[index] = { ...tasks[index], [field]: value };
      newDays[day] = { ...newDays[day], tasks };
      return { ...prev, days: newDays };
    });
  };

  const handleNoteChange = (day: DayKey, value: string) => {
    setData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: { ...prev.days[day], note: value }
      }
    }));
  };

  const handleTodoChange = (index: number, field: 'text' | 'done' | 'color', value: any) => {
    setData(prev => {
      const tasks = [...prev.todoList];
      while (tasks.length <= index) {
        tasks.push({ id: Math.random().toString(), text: '', done: false });
      }
      tasks[index] = { ...tasks[index], [field]: value };
      return { ...prev, todoList: tasks };
    });
  };

  const handleMemoChange = (value: string) => {
    setData(prev => ({ ...prev, memo: value }));
  };

  const changeWeek = (offset: number) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + (offset * 7));
    setCurrentWeekStart(formatDate(date));
  };

  const handleSmartPlan = async () => {
    setLoading(true);
    try {
      const plan = await generateSmartPlan(geminiPrompt, currentWeekStart);
      setData(prev => ({
        ...prev,
        days: plan.days as any,
        todoList: plan.todoList || [],
        memo: plan.memo || ''
      }));
      setShowGeminiModal(false);
    } catch (error) {
      alert("Failed to generate plan. Please check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const datePickerRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-full max-w-[1400px] h-[95vh] bg-paper shadow-2xl rounded-sm flex flex-col overflow-hidden border border-stone-300 relative">
      
      {/* Header Toolbar */}
      <header className="px-10 py-8 flex items-end justify-between bg-paper z-10">
        <div className="flex items-end gap-6 w-full max-w-2xl">
          {/* Date Field Design */}
          <div 
            className="flex items-end border-b-2 border-stone-800 pb-1 cursor-pointer relative group flex-grow max-w-[400px]"
            onClick={() => datePickerRef.current?.showPicker()}
          >
            <span className="text-2xl tracking-widest text-ink font-light mr-4">DATE</span>
            <div className="flex-1 text-center text-xl text-ink/80 font-handwriting">
              <DisplayDateRange startStr={currentWeekStart} />
            </div>
            
            {/* Hidden Date Input */}
            <input 
              type="date" 
              ref={datePickerRef}
              className="absolute opacity-0 inset-0 cursor-pointer"
              value={currentWeekStart}
              onChange={(e) => {
                if(e.target.value) setCurrentWeekStart(formatDate(getMonday(new Date(e.target.value))));
              }}
            />
          </div>

          <div className="flex gap-2 text-ink/40 mb-1">
            <button onClick={() => changeWeek(-1)} className="hover:text-ink hover:bg-black/5 rounded p-1"><ChevronLeft size={20}/></button>
            <button onClick={() => changeWeek(1)} className="hover:text-ink hover:bg-black/5 rounded p-1"><ChevronRight size={20}/></button>
          </div>
        </div>

        <button 
          onClick={() => setShowGeminiModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-ink/70 text-sm font-medium rounded-full transition-colors border border-stone-200 mb-1"
        >
          <Sparkles size={16} className="text-amber-500" />
          <span>Smart Auto-Fill</span>
        </button>
      </header>

      {/* Main Grid Content */}
      <div className="flex-1 overflow-auto no-scrollbar flex flex-col px-10 pb-10">
        <div className="border-2 border-stone-400 flex-1 flex flex-col min-h-[800px]">
          
          {/* Top Grid: Days */}
          <div className="grid grid-cols-7 divide-x-2 divide-stone-300 border-b-2 border-stone-400 flex-grow">
            {DAYS.map((day, dayIndex) => {
              const currentDate = weekDays[dayIndex];
              const dateDisplay = `${currentDate.getMonth() + 1}.${currentDate.getDate()}`;
              const isSat = day === 'sat';
              const isSun = day === 'sun';
              
              return (
                <div key={day} className="flex flex-col h-full bg-paper">
                  {/* Header */}
                  <div className={`h-12 flex flex-col items-center justify-center border-b border-stone-300 text-sm font-medium
                    ${isSat ? 'text-blue-600' : ''} 
                    ${isSun ? 'text-red-500' : 'text-stone-600'}
                  `}>
                    <span className="uppercase text-xs tracking-widest">{day}</span>
                    <span className="text-sm font-semibold">{dateDisplay} ({KOREAN_DAYS[dayIndex]})</span>
                  </div>

                  {/* Tasks List */}
                  <div className="flex-1 flex flex-col">
                    {Array.from({ length: ROWS_PER_DAY }).map((_, rowIndex) => {
                      const task = data.days[day].tasks[rowIndex] || FALLBACK_TASK;
                      return (
                        <div key={rowIndex} className="flex h-10 border-b border-stone-200/60 group hover:bg-stone-50 transition-colors relative">
                          
                          {/* Checkbox Column */}
                          <div className="w-8 border-r border-stone-300/60 flex items-center justify-center shrink-0">
                            <input 
                              type="checkbox" 
                              checked={task.done}
                              onChange={(e) => handleTaskChange(day, rowIndex, 'done', e.target.checked)}
                              className="cursor-pointer"
                            />
                          </div>
                          
                          {/* Task Text Input */}
                          <input 
                            type="text" 
                            value={task.text}
                            onChange={(e) => handleTaskChange(day, rowIndex, 'text', e.target.value)}
                            className="flex-1 bg-transparent pl-2 pr-5 text-sm text-ink outline-none placeholder:text-stone-300 min-w-0"
                          />

                          {/* Color Bar Tab (Right) */}
                          <div 
                            className={`absolute right-0 top-0 bottom-0 w-3 cursor-pointer transition-colors ${getColorBarClass(task.color)}`}
                            onClick={() => handleTaskChange(day, rowIndex, 'color', nextColor(task.color))}
                            title="Click to toggle priority color"
                          />
                        </div>
                      );
                    })}
                    
                    {/* Note/Extra space */}
                    <div className="flex-1 p-2 border-t border-stone-200/60">
                       <textarea 
                        value={data.days[day].note}
                        onChange={(e) => handleNoteChange(day, e.target.value)}
                        className="w-full h-full bg-transparent resize-none outline-none text-xs text-ink/60"
                        placeholder="..." 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Grid: Todo & Memo - 5:2 Split */}
          <div className="h-[250px] grid grid-cols-7 divide-x-2 divide-stone-300">
            
            {/* TO DO LIST - Spans 5 columns (Mon-Fri) */}
            <div className="col-span-5 flex flex-col">
              <div className="h-10 flex items-center justify-center border-b border-stone-300 text-sm tracking-[0.2em] text-ink/80 font-semibold bg-stone-100/30">
                TO DO LIST
              </div>
              <div className="flex-1 flex flex-col">
                 <div className="grid grid-cols-2 h-full">
                    {/* Left Column of Todo */}
                    <div className="border-r border-stone-200">
                        {Array.from({ length: TODO_ROWS }).map((_, idx) => {
                            // Only first half
                            if(idx >= 5) return null;
                            const task = data.todoList[idx] || FALLBACK_TASK;
                            return (
                                <div key={idx} className="flex h-10 border-b border-stone-200 group hover:bg-stone-50 transition-colors relative">
                                    <div className="w-10 border-r border-stone-200 flex items-center justify-center shrink-0">
                                        <input type="checkbox" checked={task.done} onChange={(e) => handleTodoChange(idx, 'done', e.target.checked)} />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={task.text} 
                                        onChange={(e) => handleTodoChange(idx, 'text', e.target.value)} 
                                        className="flex-1 bg-transparent px-3 pr-5 text-sm outline-none min-w-0"
                                    />
                                    {/* Color Bar Tab (Right) */}
                                    <div 
                                      className={`absolute right-0 top-0 bottom-0 w-3 cursor-pointer transition-colors ${getColorBarClass(task.color)}`}
                                      onClick={() => handleTodoChange(idx, 'color', nextColor(task.color))}
                                      title="Click to toggle priority color"
                                    />
                                </div>
                            )
                        })}
                        {/* Fill rest */}
                        <div className="flex-1"></div>
                    </div>
                    {/* Right Column of Todo */}
                    <div>
                        {Array.from({ length: TODO_ROWS }).map((_, idx) => {
                            // Only second half
                            if(idx < 5) return null;
                            const task = data.todoList[idx] || FALLBACK_TASK;
                             return (
                                <div key={idx} className="flex h-10 border-b border-stone-200 group hover:bg-stone-50 transition-colors relative">
                                    <div className="w-10 border-r border-stone-200 flex items-center justify-center shrink-0">
                                        <input type="checkbox" checked={task.done} onChange={(e) => handleTodoChange(idx, 'done', e.target.checked)} />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={task.text} 
                                        onChange={(e) => handleTodoChange(idx, 'text', e.target.value)} 
                                        className="flex-1 bg-transparent px-3 pr-5 text-sm outline-none min-w-0"
                                    />
                                    {/* Color Bar Tab (Right) */}
                                    <div 
                                      className={`absolute right-0 top-0 bottom-0 w-3 cursor-pointer transition-colors ${getColorBarClass(task.color)}`}
                                      onClick={() => handleTodoChange(idx, 'color', nextColor(task.color))}
                                      title="Click to toggle priority color"
                                    />
                                </div>
                            )
                        })}
                         <div className="flex-1"></div>
                    </div>
                 </div>
              </div>
            </div>

            {/* MEMO - Spans 2 columns (Sat-Sun) */}
            <div className="col-span-2 flex flex-col">
              <div className="h-10 flex items-center justify-center border-b border-stone-300 text-sm tracking-[0.2em] text-ink/80 font-semibold bg-stone-100/30">
                MEMO
              </div>
              <div className="flex-1 relative">
                 {/* Lined Background */}
                 <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_39px,#e5e5e5_40px)] bg-[length:100%_40px]"></div>
                 <textarea 
                    value={data.memo}
                    onChange={(e) => handleMemoChange(e.target.value)}
                    className="w-full h-full bg-transparent resize-none outline-none text-sm text-ink leading-[40px] px-4 py-0"
                    style={{ lineHeight: '40px' }}
                  />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Gemini Modal */}
      {showGeminiModal && (
        <div className="absolute inset-0 z-50 bg-stone-900/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper border border-stone-200 shadow-xl rounded-lg w-full max-w-lg p-6 flex flex-col gap-4">
            <h2 className="text-xl font-medium text-ink flex items-center gap-2">
              <Sparkles className="text-amber-500" size={24}/> 
              Smart Planner
            </h2>
            <p className="text-sm text-ink/60">
              이번 주의 목표를 알려주세요. (예: "리액트 공부하기, 주 3회 운동")
            </p>
            <textarea 
              value={geminiPrompt}
              onChange={(e) => setGeminiPrompt(e.target.value)}
              className="w-full h-32 p-3 bg-white border border-stone-200 rounded-md outline-none focus:border-amber-400 text-sm resize-none"
              placeholder="목표를 입력하세요..."
            />
            <div className="flex justify-end gap-3 mt-2">
              <button 
                onClick={() => setShowGeminiModal(false)}
                className="px-4 py-2 text-sm text-ink/60 hover:text-ink hover:bg-stone-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSmartPlan}
                disabled={loading || !geminiPrompt.trim()}
                className="px-4 py-2 text-sm bg-amber-500 text-white font-medium rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={16}/> : 'Generate Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
