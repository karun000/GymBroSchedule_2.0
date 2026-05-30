// ─── data/homeData.js ─────────────────────────────────────────────────────────
// All static data for the Home screen in one place.
// Swap these out for API calls / state as your app grows.

import { C } from './Theme';

export const SCHEDULE = [
  { day: 'MON', date: '19 May', title: 'Push',                 subtitle: 'Chest • Shoulders • Triceps',      icon: 'dumbbell',      done: true,  active: true  },
  { day: 'TUE', date: '20 May', title: 'Pull',                 subtitle: 'Back • Biceps • Rear Delts',       icon: 'human-handsup', done: true,  active: true  },
  { day: 'WED', date: '21 May', title: 'Legs',                 subtitle: 'Quads • Hamstrings • Calves',      icon: 'run-fast',      done: true,  active: true  },
  { day: 'THU', date: '22 May', title: 'Rest / Active Recovery', subtitle: 'Mobility • Stretching • Cardio', icon: 'yoga',          done: false, active: false },
  { day: 'FRI', date: '23 May', title: 'Push',                 subtitle: 'Chest • Shoulders • Triceps',      icon: 'dumbbell',      done: false, active: true  },
  { day: 'SAT', date: '24 May', title: 'Pull',                 subtitle: 'Back • Biceps • Rear Delts',       icon: 'human-handsup', done: false, active: true  },
  { day: 'SUN', date: '25 May', title: 'Rest',                 subtitle: 'Full Rest',                        icon: 'sleep',         done: false, active: false },
];

export const WEIGHTS = [
  { title: 'Bench Press', equipment: 'Barbell', sets: '4 x 8', weight: '80 kg',  icon: 'weight-lifter', setsColor: C.purpleSoft },
  { title: 'Squat',       equipment: 'Barbell', sets: '4 x 6', weight: '100 kg', icon: 'weight-lifter', setsColor: C.purpleSoft },
  { title: 'Deadlift',    equipment: 'Barbell', sets: '3 x 5', weight: '120 kg', icon: 'weight-lifter', setsColor: C.purple     },
];