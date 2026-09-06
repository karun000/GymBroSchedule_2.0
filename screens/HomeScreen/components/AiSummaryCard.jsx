import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { generateFitnessSummary } from '../../../FireBase/ai';
// NOTE: adjust this path to wherever Theme.js actually lives relative to this
// file — matched to SavedWeightsCard's `../Theme` import, same depth as the
// FireBase import above.
import { C } from '../Theme';

const GOAL_STORAGE_KEY = '@gymbro_fitness_goal';

const GOALS = [
  { id: 'bulk', title: 'Bulk', description: 'Build muscle and increase strength', icon: 'arm-flex' },
  { id: 'cut', title: 'Cut', description: 'Reduce body fat while maintaining muscle', icon: 'trending-down' },
  { id: 'maintain', title: 'Maintain', description: 'Maintain your current weight and performance', icon: 'scale-balance' },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const formatNumber = (value) => {
  if (value === null || value === undefined) return '0';
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
};

const getTrendText = (weightChange) => {
  if (!weightChange) return 'No change from your previous measurement';
  if (weightChange.trend === 'up') return `↑ ${formatNumber(Math.abs(weightChange.value))} ${weightChange.unit} up from your last measurement`;
  if (weightChange.trend === 'down') return `↓ ${formatNumber(Math.abs(weightChange.value))} ${weightChange.unit} down from your last measurement`;
  return '→ Your weight is stable compared with your last measurement';
};

const getTrendIcon = (trend) => {
  if (trend === 'up') return 'trending-up';
  if (trend === 'down') return 'trending-down';
  return 'minus';
};

// Trend color still needs a semantic (green/orange/gray) meaning, independent
// of the purple brand accent used elsewhere in the card.
const getTrendColor = (trend) => {
  if (trend === 'up') return '#4CAF50';
  if (trend === 'down') return '#FF9800';
  return C.gray;
};

const getGoalTitle = (goal) => GOALS.find((item) => item.id === goal)?.title || 'Maintain';

const AiSummaryCard = ({ refreshTrigger = 0 }) => {
  const [goal, setGoal] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGoal = async () => {
      try {
        const savedGoal = await AsyncStorage.getItem(GOAL_STORAGE_KEY);
        if (savedGoal) {
          setGoal(savedGoal);
          setSelectedGoal(savedGoal);
        } else {
          setSelectedGoal('maintain');
          setShowGoalModal(true);
        }
      } catch (err) {
        console.error('[AI Summary] Failed to load goal:', err);
        setSelectedGoal('maintain');
        setShowGoalModal(true);
      }
    };
    loadGoal();
  }, []);

  const loadSummary = async (selectedGoalValue, forceRefresh = false) => {
    if (!selectedGoalValue) return;
    try {
      setLoading(true);
      setError('');
      const result = await generateFitnessSummary({ goal: selectedGoalValue, forceRefresh });
      setSummary(result);
    } catch (err) {
      console.error('[AI Summary] Failed:', err);
      setError(err?.message || 'Unable to generate your fitness summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!goal) return;
    loadSummary(goal, refreshTrigger > 0);
  }, [goal, refreshTrigger]);

  const openGoalModal = () => {
    setSelectedGoal(goal || 'maintain');
    setShowGoalModal(true);
  };

  const continueWithGoal = async () => {
    const nextGoal = selectedGoal || 'maintain';
    try {
      await AsyncStorage.setItem(GOAL_STORAGE_KEY, nextGoal);
      setShowGoalModal(false);
      if (nextGoal !== goal) {
        setGoal(nextGoal);
      } else {
        await loadSummary(nextGoal, true);
      }
    } catch (err) {
      console.error('[AI Summary] Failed to save goal:', err);
      setError('Unable to save your goal.');
      setShowGoalModal(false);
    }
  };

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((current) => !current);
  };

  if (!goal && !showGoalModal) return null;

  const trend = summary?.weightChange?.trend || 'stable';

  return (
    <>
      <View style={styles.card}>
        {/* Header — mirrors SavedWeightsCard's cardHeader layout */}
        <TouchableOpacity activeOpacity={0.8} onPress={toggleExpanded} style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.cardIconBubble}>
              <Icon name="auto-fix" size={20} color={C.purple} />
            </View>
            <View style={{ marginLeft: 10, flexShrink: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>AI Summary</Text>
                <TouchableOpacity activeOpacity={0.75} onPress={openGoalModal} style={styles.pill}>
                  <Text style={styles.pillText}>{getGoalTitle(goal)}</Text>
                  <Icon name="chevron-down" size={14} color={C.purple} style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              </View>
              <Text style={styles.cardDesc} numberOfLines={expanded ? undefined : 1}>
                {loading
                  ? 'Analyzing your progress...'
                  : summary?.progressSummary || 'Your AI fitness summary will appear here.'}
              </Text>
            </View>
          </View>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={C.gray} />
        </TouchableOpacity>

        {/* Collapsed trend line */}
        {!expanded && summary && !loading && (
          <View style={styles.trendRow}>
            <Icon name={getTrendIcon(trend)} size={16} color={getTrendColor(trend)} />
            <Text style={[styles.trendText, { color: getTrendColor(trend) }]}>
              {getTrendText(summary.weightChange)}
            </Text>
          </View>
        )}
        {!expanded && loading && (
          <View style={styles.trendRow}>
            <ActivityIndicator size="small" color={C.purple} />
          </View>
        )}
        {!expanded && error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Expanded content — rows separated like WeightRow, no boxed sections */}
        {expanded && (
          <View style={styles.expandedContent}>
            {loading ? (
              <View style={styles.expandedLoading}>
                <ActivityIndicator size="small" color={C.purple} />
                <Text style={styles.loadingText}>Analyzing your progress...</Text>
              </View>
            ) : summary ? (
              <>
                <View style={[styles.row, styles.rowBorder]}>
                  <View style={styles.iconBubble}>
                    <Icon name="scale-bathroom" size={20} color={C.grayMid} />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.title}>Latest Weight</Text>
                    <Text style={styles.equip}>
                      {summary.latestWeight?.dateLabel || 'No date recorded'}
                    </Text>
                  </View>
                  <View style={styles.meta}>
                    <Text style={styles.metaValue}>
                      {summary.latestWeight ? formatNumber(summary.latestWeight.value) : '--'}{' '}
                      <Text style={styles.metaUnit}>{summary.latestWeight?.unit || 'kg'}</Text>
                    </Text>
                  </View>
                </View>

                <View style={[styles.row, styles.rowBorder]}>
                  <View style={styles.iconBubble}>
                    <Icon name={getTrendIcon(trend)} size={20} color={getTrendColor(trend)} />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.title}>Weight Change</Text>
                    <Text style={styles.equip}>
                      {summary.weightChange?.periodLabel || 'No previous measurement'}
                    </Text>
                  </View>
                  <View style={styles.meta}>
                    <Text style={[styles.metaValue, { color: getTrendColor(trend) }]}>
                      {summary.weightChange?.value > 0 ? '+' : ''}
                      {formatNumber(summary.weightChange?.value)} {summary.weightChange?.unit || 'kg'}
                    </Text>
                  </View>
                </View>

                {summary.prProgress?.exerciseName ? (
                  <View style={[styles.row, styles.rowBorder]}>
                    <View style={styles.iconBubble}>
                      <Icon name="trophy-outline" size={20} color={C.grayMid} />
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.title}>{summary.prProgress.exerciseName}</Text>
                      <Text style={styles.equip}>Strength progress</Text>
                    </View>
                    <View style={styles.meta}>
                      <Text style={styles.metaValue}>
                        {formatNumber(summary.prProgress.startValue)} → {formatNumber(summary.prProgress.currentValue)}{' '}
                        <Text style={styles.metaUnit}>{summary.prProgress.unit}</Text>
                      </Text>
                    </View>
                  </View>
                ) : null}

                {summary.insights?.length > 0 && (
                  <View style={styles.insightsSection}>
                    <Text style={styles.insightsHeading}>Insights</Text>
                    {summary.insights.map((insight, index) => (
                      <View key={`${index}-${insight}`} style={styles.insightRow}>
                        <View style={styles.insightDot} />
                        <Text style={styles.insightText}>{insight}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity activeOpacity={0.75} onPress={toggleExpanded} style={styles.collapseButton}>
                  <Text style={styles.pillText}>Show less</Text>
                  <Icon name="chevron-up" size={15} color={C.purple} style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.emptyText}>No summary available yet.</Text>
            )}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        )}
      </View>

      {/* Goal Modal */}
      <Modal
        visible={showGoalModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (goal) setShowGoalModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Your Goal</Text>
            <Text style={styles.modalSubtitle}>
              Choose your current fitness goal so the AI can personalize your progress summary.
            </Text>

            <View style={styles.goalList}>
              {GOALS.map((item) => {
                const selected = selectedGoal === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedGoal(item.id)}
                    style={[styles.goalOption, selected && styles.goalOptionSelected]}
                  >
                    <View style={[styles.goalIcon, selected && styles.goalIconSelected]}>
                      <Icon name={item.icon} size={23} color={selected ? C.purple : C.gray} />
                    </View>
                    <View style={styles.goalOptionText}>
                      <Text style={styles.goalOptionTitle}>{item.title}</Text>
                      <Text style={styles.goalOptionDescription}>{item.description}</Text>
                    </View>
                    {selected && <Icon name="check-circle" size={22} color={C.purple} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity activeOpacity={0.85} onPress={continueWithGoal} style={styles.continueButton}>
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default AiSummaryCard;

const styles = StyleSheet.create({
  // Card shell — matches SavedWeightsCard.card
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },

  // Header — matches SavedWeightsCard.cardHeader / headerLeft
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.purpleDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.white, marginRight: 8 },
  cardDesc: { fontSize: 12, color: C.gray, marginTop: 2 },

  // "Goal" pill — matches SavedWeightsCard.pill
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.purpleDim,
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { color: C.purple, fontSize: 12, fontWeight: '600' },

  trendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingLeft: 2 },
  trendText: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
  loadingText: { color: C.gray, fontSize: 13, marginLeft: 8 },
  expandedLoading: { flexDirection: 'row', paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  expandedContent: { marginTop: 8 },
  emptyText: { color: C.gray, fontSize: 13, paddingVertical: 15 },
  errorText: { color: '#D98C8C', fontSize: 11, marginTop: 8 },

  // Rows — same shape as WeightRow in SavedWeightsCard
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.purpleDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: C.whiteOff },
  equip: { fontSize: 12, color: C.gray, marginTop: 2 },
  meta: { alignItems: 'flex-end' },
  metaValue: { fontSize: 14, fontWeight: '700', color: C.white },
  metaUnit: { fontSize: 12, fontWeight: '500', color: C.gray },

  insightsSection: { paddingTop: 12 },
  insightsHeading: { fontSize: 12, fontWeight: '700', color: C.gray, marginBottom: 8, textTransform: 'uppercase' },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 9 },
  insightDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.purple, marginTop: 6, marginRight: 9 },
  insightText: { flex: 1, color: C.whiteOff, fontSize: 12, lineHeight: 18 },

  collapseButton: {
    marginTop: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  // Goal modal — kept dark/overlay styling since it's a separate surface,
  // but pulls its accent colors from the theme.
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalTitle: { color: C.white, fontSize: 22, fontWeight: '800' },
  modalSubtitle: { color: C.gray, fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 18 },
  goalList: { gap: 10 },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  goalOptionSelected: { borderColor: C.purple, backgroundColor: C.purpleDim },
  goalIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.purpleDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconSelected: { backgroundColor: C.card },
  goalOptionText: { flex: 1, marginLeft: 11 },
  goalOptionTitle: { color: C.white, fontSize: 14, fontWeight: '700' },
  goalOptionDescription: { color: C.gray, fontSize: 11, marginTop: 3 },
  continueButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  continueText: { color: C.white, fontSize: 14, fontWeight: '800' },
});