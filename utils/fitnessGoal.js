export const GOALS = [
  { id: 'bulk', title: 'Bulk', description: 'Build muscle and increase strength', icon: 'arm-flex' },
  { id: 'cut', title: 'Cut', description: 'Reduce body fat while maintaining muscle', icon: 'trending-down' },
  { id: 'maintain', title: 'Maintain', description: 'Maintain your current weight and performance', icon: 'scale-balance' },
];
export const isFitnessGoal = goal => GOALS.some(item => item.id === goal);
export const getGoalTitle = goal => GOALS.find(item => item.id === goal)?.title ?? 'Select goal';

// These labels describe direction only; they do not infer muscle/fat changes.
export const getGoalTrend = ({ goal, metric = 'weight', delta, hasComparison = true }) => {
  const neutral = { color: '#9B99B5', label: 'Select a goal in AI Summary to interpret this trend.' };
  if (!isFitnessGoal(goal)) return neutral;
  if (!hasComparison || !Number.isFinite(delta)) return { ...neutral, label: `${getGoalTitle(goal)}: add comparable entries to see a trend.` };
  const stable = Math.abs(delta) < 0.1;
  let aligned;
  let label;
  if (metric === 'strength') {
    aligned = goal === 'bulk' ? delta > 0 : delta >= -0.1;
    label = delta > 0 ? 'Strength increased' : stable ? 'Strength held steady' : 'Strength decreased';
    label += goal === 'bulk' ? ' · Bulk focuses on strength progress.' : ` · ${getGoalTitle(goal)} focuses on retaining strength.`;
  } else {
    aligned = goal === 'bulk' ? delta > 0.1 : goal === 'cut' ? delta < -0.1 : stable;
    label = stable ? 'Weight held steady' : delta > 0 ? 'Weight increased' : 'Weight decreased';
    label += ` · ${aligned ? 'Direction aligns with' : 'Review the longer-term trend for'} ${getGoalTitle(goal)}.`;
  }
  return { color: aligned ? '#4CAF50' : '#FF9800', label };
};
