
export interface Task {
  id: string;
  text: string;
  done: boolean;
  color?: 'red' | 'blue' | 'yellow';
}

export interface DayData {
  tasks: Task[];
  note: string;
}

export interface WeeklyData {
  weekId: string; // ISO date string of the Monday of the week
  days: {
    mon: DayData;
    tue: DayData;
    wed: DayData;
    thu: DayData;
    fri: DayData;
    sat: DayData;
    sun: DayData;
  };
  todoList: Task[];
  memo: string;
}

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const DAYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const EMPTY_WEEK: WeeklyData = {
  weekId: '',
  days: {
    mon: { tasks: [], note: '' },
    tue: { tasks: [], note: '' },
    wed: { tasks: [], note: '' },
    thu: { tasks: [], note: '' },
    fri: { tasks: [], note: '' },
    sat: { tasks: [], note: '' },
    sun: { tasks: [], note: '' },
  },
  todoList: [],
  memo: '',
};
