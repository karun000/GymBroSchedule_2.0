import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GOALS, isFitnessGoal } from '../utils/fitnessGoal';

const FitnessGoalContext = createContext(null);
const LEGACY_KEY = '@gymbro_fitness_goal';

export default function FitnessGoalProvider({ userId, children }) {
  const [goal, setGoal] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const storageKey = `${LEGACY_KEY}:${userId}`;

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        let saved = await AsyncStorage.getItem(storageKey);
        if (!saved) {
          const legacy = await AsyncStorage.getItem(LEGACY_KEY);
          if (isFitnessGoal(legacy)) {
            await AsyncStorage.setItem(storageKey, legacy);
            await AsyncStorage.removeItem(LEGACY_KEY);
            saved = legacy;
          }
        }
        if (active) setGoal(isFitnessGoal(saved) ? saved : null);
      } catch {
        if (active) setGoal(null);
      } finally {
        if (active) setLoaded(true);
      }
    };
    load();
    return () => { active = false; };
  }, [storageKey]);

  const saveGoal = async nextGoal => {
    if (!isFitnessGoal(nextGoal)) throw new Error('Choose Bulk, Cut, or Maintain.');
    await AsyncStorage.setItem(storageKey, nextGoal);
    setGoal(nextGoal);
  };

  return <FitnessGoalContext.Provider value={{ goal, loaded, saveGoal, goals: GOALS }}>{children}</FitnessGoalContext.Provider>;
}

export const useFitnessGoal = () => {
  const context = useContext(FitnessGoalContext);
  if (!context) throw new Error('FitnessGoalProvider is required.');
  return context;
};
