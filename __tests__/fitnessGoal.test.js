import { getGoalTrend } from '../utils/fitnessGoal';

test('weight loss is aligned with cut and not bulk', () => {
  expect(getGoalTrend({ goal: 'cut', delta: -1 }).color).toBe('#4CAF50');
  expect(getGoalTrend({ goal: 'bulk', delta: -1 }).color).toBe('#FF9800');
});
test('maintain treats stable weight as aligned', () => {
  expect(getGoalTrend({ goal: 'maintain', delta: 0 }).color).toBe('#4CAF50');
  expect(getGoalTrend({ goal: 'maintain', delta: 2 }).color).toBe('#FF9800');
});
test('cut still favors maintained or improved strength, never decreasing strength', () => {
  expect(getGoalTrend({ goal: 'cut', metric: 'strength', delta: 0 }).color).toBe('#4CAF50');
  expect(getGoalTrend({ goal: 'cut', metric: 'strength', delta: 5 }).color).toBe('#4CAF50');
  expect(getGoalTrend({ goal: 'cut', metric: 'strength', delta: -5 }).color).toBe('#FF9800');
});
test('bulk distinguishes strength maintenance from growth', () => {
  expect(getGoalTrend({ goal: 'bulk', metric: 'strength', delta: 0 }).color).toBe('#FF9800');
  expect(getGoalTrend({ goal: 'bulk', metric: 'strength', delta: 5 }).color).toBe('#4CAF50');
});
test('missing data or goal does not label progress as aligned', () => {
  expect(getGoalTrend({ goal: 'cut', delta: -1, hasComparison: false }).color).toBe('#9B99B5');
  expect(getGoalTrend({ goal: null, delta: -1 }).color).toBe('#9B99B5');
});
