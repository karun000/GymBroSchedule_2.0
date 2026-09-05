/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import App from '../App';
import ExerciseRow from '../screens/ScheduleScreen/components/Exerciserow';

test('renders correctly', async () => {
  await act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test('exercise row shows equipment in the list', () => {
  const component = ReactTestRenderer.create(
    <ExerciseRow
      item={{
        id: '1',
        name: 'Bench Press',
        sets: 4,
        reps: 8,
        equipment: 'Barbell',
        icon: 'dumbbell',
      }}
      last
      showMoreIcon={false}
    />
  );

  const textValues = component.root.findAllByType(Text).map((node) => node.props.children).flat();
  const renderedText = textValues.join(' ');

  expect(renderedText).toContain('Bench Press');
  expect(renderedText).toContain('Barbell');
});
