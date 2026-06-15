import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
  Pressable,
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Theme from './Theme';
import NavHeader from '../../components/NavHeader';
import ProgressLineChart from '../../components/ProgressLineChart';
import DateSelector from './components/DateSelector';
import AddMeasurementForm from './components/AddMeasurementForm';
import { fetchUserRecords } from '../../FireBase/records';
import {
  deleteMeasurementRecord,
  saveMeasurementRecord,
  updateMeasurementRecord,
} from '../../FireBase/records';

const formatDateLabel = (dateISO, fallbackLabel = 'No date') => {
  if (!dateISO) {
    return fallbackLabel;
  }

  const parsedDate = new Date(dateISO);

  if (Number.isNaN(parsedDate.getTime())) {
    return fallbackLabel;
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatMeasurementValue = (measurement) => {
  if (!measurement || measurement.value === '' || measurement.value == null) {
    return '—';
  }

  return `${measurement.value} ${measurement.unit ?? ''}`.trim();
};

const getSelectedDate = (dateISO) => {
  if (!dateISO) {
    return new Date();
  }

  const parsedDate = new Date(dateISO);

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date();
  }

  return parsedDate;
};

const parseNumericValue = (value) => {
  const parsedValue = Number.parseFloat(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const convertWeightValue = (value, fromUnit, toUnit) => {
  if (!Number.isFinite(value) || !fromUnit || !toUnit || fromUnit === toUnit) {
    return value;
  }

  if (fromUnit === 'lbs' && toUnit === 'kg') {
    return value * 0.45359237;
  }

  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return value * 2.2046226218;
  }

  return value;
};

const MeasurementsScreenPage = ({ navigation, route }) => {
  const tabBarHeight = useBottomTabBarHeight();
  const [measurementHistory, setMeasurementHistory] = useState([]);
  const [expandedRecordId, setExpandedRecordId] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [activeMeasurement, setActiveMeasurement] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const reloadMeasurements = async (forceRefresh = false, isActiveRef = { current: true }) => {
    const storedMeasurements = await fetchUserRecords('measurementRecords', { forceRefresh });

    if (!isActiveRef.current) {
      return;
    }

    const sortedMeasurements = storedMeasurements
      .map((record) => ({
        id: record.id,
        dateISO: record.dateISO,
        dateLabel: record.dateLabel,
        height: record.height,
        heightUnit: record.heightUnit,
        weight: record.weight,
        weightUnit: record.weightUnit,
        bodyParts: record.bodyParts ?? {},
      }))
      .sort((left, right) => {
        const leftTime = left.dateISO ? new Date(left.dateISO).getTime() : 0;
        const rightTime = right.dateISO ? new Date(right.dateISO).getTime() : 0;
        return rightTime - leftTime;
      });

    setMeasurementHistory(sortedMeasurements);
  };

  useEffect(() => {
    const isActiveRef = { current: true };

    reloadMeasurements(false, isActiveRef).catch((error) => {
      console.log('Failed to load saved measurements:', error?.message ?? error);
    });

    return () => {
      isActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (route?.params?.openMeasurementModal) {
      openAddForm();
      navigation?.setParams?.({ openMeasurementModal: false });
    }
  }, [navigation, route?.params?.openMeasurementModal]);

  const handleMenu = () => {
    if (navigation && typeof navigation.openDrawer === 'function') {
      navigation.openDrawer();
    } else {
      console.log('Menu pressed');
    }
  };

  const openAddForm = () => {
    setFormMode('add');
    setActiveMeasurement(null);
    setSelectedDate(new Date());
    setIsFormVisible(true);
  };

  const openEditForm = (measurement) => {
    setFormMode('edit');
    setActiveMeasurement(measurement);
    setSelectedDate(getSelectedDate(measurement.dateISO));
    setIsFormVisible(true);
  };

  const closeForm = () => {
    setIsFormVisible(false);
    setActiveMeasurement(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await reloadMeasurements(true);
    } catch (error) {
      console.log('Failed to refresh measurements:', error?.message ?? error);
    } finally {
      setRefreshing(false);
    }
  };

  const weightTrendData = (() => {
    const latestWeightRecord = measurementHistory.find((record) => parseNumericValue(record.weight) !== null);
    const targetUnit = latestWeightRecord?.weightUnit ?? 'kg';

    return measurementHistory
      .slice()
      .sort((left, right) => {
        const leftTime = left.dateISO ? new Date(left.dateISO).getTime() : 0;
        const rightTime = right.dateISO ? new Date(right.dateISO).getTime() : 0;
        return leftTime - rightTime;
      })
      .map((record) => {
        const numericWeight = parseNumericValue(record.weight);

        if (numericWeight === null) {
          return null;
        }

        return {
          label: formatDateLabel(record.dateISO, record.dateLabel ?? 'Recent'),
          value: convertWeightValue(numericWeight, record.weightUnit, targetUnit),
          unit: targetUnit,
        };
      })
      .filter(Boolean);
  })();

  const handleSaveMeasurement = async (measurement) => {
    const payload = {
      ...measurement,
      dateISO: selectedDate.toISOString(),
      dateLabel: formatDateLabel(selectedDate.toISOString()),
    };

    if (formMode === 'edit' && activeMeasurement?.id) {
      await updateMeasurementRecord(activeMeasurement.id, payload);
    } else {
      await saveMeasurementRecord(payload);
    }

    await reloadMeasurements();
    closeForm();
  };

  const confirmDeleteMeasurement = (measurement) => {
    Alert.alert(
      'Delete measurement?',
      `Remove ${formatDateLabel(measurement.dateISO, measurement.dateLabel ?? 'this measurement')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMeasurementRecord(measurement.id);
            setExpandedRecordId((currentExpandedId) => (
              currentExpandedId === measurement.id ? null : currentExpandedId
            ));
            await reloadMeasurements();
          },
        },
      ]
    );
  };

  const toggleRecord = (recordId) => {
    setExpandedRecordId((currentExpandedId) => (
      currentExpandedId === recordId ? null : recordId
    ));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />

      <NavHeader
        title="MEASUREMENTS & VITALS"
        leftIcon="menu"
        onLeftPress={handleMenu}
        onRightPress={openAddForm}
        rightIcon="plus"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Theme.colors.primary}
            colors={[Theme.colors.primary]}
          />
        )}
      >
        <ProgressLineChart
          theme={Theme}
          title="WEIGHT PROGRESS"
          subtitle="Body weight trend from saved measurements"
          data={weightTrendData}
          emptyTitle="Add a few weigh-ins"
          emptyText="Save at least two measurements with weight values to draw your progress line."
          valueFormatter={(value, unit) => `${Number.isInteger(value) ? value : value.toFixed(1)} ${unit}`}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MEASUREMENT HISTORY</Text>

          {measurementHistory.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No measurements yet</Text>
              <Text style={styles.emptyText}>
                Saved measurements will show up here once they are added from the other screen.
              </Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {measurementHistory.map((item, index) => {
                const bodyPartEntries = Object.entries(item.bodyParts ?? {});
                const isExpanded = expandedRecordId === item.id;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.recordItem,
                      index !== measurementHistory.length - 1 && styles.recordItemBorder,
                      isExpanded && styles.recordItemExpanded,
                    ]}
                  >
                    <TouchableOpacity activeOpacity={0.85} onPress={() => toggleRecord(item.id)}>
                      <View style={styles.recordHeader}>
                        <View style={styles.recordHeaderText}>
                          <Text style={styles.recordDate}>
                            {formatDateLabel(item.dateISO, item.dateLabel ?? 'Recent measurement')}
                          </Text>
                          <Text style={styles.recordSummary}>
                            Wt {formatMeasurementValue({ value: item.weight, unit: item.weightUnit })}
                          </Text>
                        </View>

                        <View style={styles.expandIconWrap}>
                          <Icon
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={22}
                            color={Theme.colors.text}
                          />
                        </View>
                      </View>

                      <View style={styles.summaryRow}>
                        <View style={styles.summaryPill}>
                          <Text style={styles.summaryLabel}>Height</Text>
                          <Text style={styles.summaryValue}>
                            {formatMeasurementValue({ value: item.height, unit: item.heightUnit })}
                          </Text>
                        </View>

                        <View style={styles.summaryPill}>
                          <Text style={styles.summaryLabel}>Weight</Text>
                          <Text style={styles.summaryValue}>
                            {formatMeasurementValue({ value: item.weight, unit: item.weightUnit })}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.expandedBody}>
                        {bodyPartEntries.length > 0 && (
                          <View style={styles.bodyPartGrid}>
                            {bodyPartEntries.map(([key, measurement]) => (
                              <View key={key} style={styles.bodyPartChip}>
                                <Text style={styles.bodyPartLabel}>{key}</Text>
                                <Text style={styles.bodyPartValue}>
                                  {formatMeasurementValue(measurement)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => openEditForm(item)}
                            activeOpacity={0.8}
                          >
                            <Icon name="pencil" size={16} color={Theme.colors.text} />
                            <Text style={styles.actionBtnText}>Edit</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, styles.deleteBtn]}
                            onPress={() => confirmDeleteMeasurement(item)}
                            activeOpacity={0.8}
                          >
                            <Icon name="trash-can-outline" size={16} color={Theme.colors.text} />
                            <Text style={styles.actionBtnText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isFormVisible}
        transparent
        animationType="fade"
        onRequestClose={closeForm}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeForm}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {formMode === 'edit' ? 'EDIT MEASUREMENT' : 'ADD MEASUREMENT'}
              </Text>
              <TouchableOpacity onPress={closeForm} style={styles.modalClose} activeOpacity={0.8}>
                <Icon name="close" size={20} color={Theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <DateSelector selectedDate={selectedDate} onSelect={setSelectedDate} />
              <AddMeasurementForm
                key={`${formMode}-${activeMeasurement?.id ?? (formMode === 'add' ? (measurementHistory[0]?.id ?? 'new') : 'new')}`}
                selectedDateLabel={formatDateLabel(selectedDate.toISOString())}
                initialMeasurements={
                  formMode === 'edit' && activeMeasurement
                    ? {
                        height: activeMeasurement.height,
                        heightUnit: activeMeasurement.heightUnit,
                        weight: activeMeasurement.weight,
                        weightUnit: activeMeasurement.weightUnit,
                        bodyParts: activeMeasurement.bodyParts,
                      }
                    : formMode === 'add' && measurementHistory.length > 0
                    ? {
                        height: measurementHistory[0].height,
                        heightUnit: measurementHistory[0].heightUnit,
                        weight: measurementHistory[0].weight,
                        weightUnit: measurementHistory[0].weightUnit,
                        bodyParts: measurementHistory[0].bodyParts,
                      }
                    : null
                }
                onSave={handleSaveMeasurement}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  section: {
    marginHorizontal: Theme.spacing.lg,
  },
  sectionTitle: {
    color: Theme.colors.text,
    fontSize: Theme.font.base,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: Theme.spacing.md,
  },
  listCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    overflow: 'hidden',
  },
  recordItem: {
    padding: Theme.spacing.md,
    gap: 10,
  },
  recordItemExpanded: {
    backgroundColor: Theme.colors.surface,
  },
  recordItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.cardBorder,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  recordHeaderText: {
    flex: 1,
    gap: 2,
  },
  expandIconWrap: {
    width: 28,
    height: 28,
    borderRadius: Theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primaryGlow,
  },
  recordDate: {
    color: Theme.colors.text,
    fontSize: Theme.font.base,
    fontWeight: '700',
  },
  recordSummary: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.sm,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  summaryLabel: {
    color: Theme.colors.textMuted,
    fontSize: Theme.font.xs,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: Theme.colors.text,
    fontSize: Theme.font.base,
    fontWeight: '700',
  },
  bodyPartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bodyPartChip: {
    minWidth: '47%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  bodyPartLabel: {
    color: Theme.colors.textSub,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  bodyPartValue: {
    color: Theme.colors.text,
    fontSize: Theme.font.sm,
    fontWeight: '700',
    marginTop: 4,
  },
  expandedBody: {
    gap: Theme.spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.primary,
  },
  deleteBtn: {
    backgroundColor: '#8A2E4E',
  },
  actionBtnText: {
    color: Theme.colors.text,
    fontSize: Theme.font.sm,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    padding: Theme.spacing.lg,
  },
  emptyTitle: {
    color: Theme.colors.text,
    fontSize: Theme.font.base,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.sm,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    padding: Theme.spacing.lg,
  },
  modalCard: {
    maxHeight: '92%',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
  },
  modalTitle: {
    color: Theme.colors.text,
    fontSize: Theme.font.title,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: Theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
});

export default MeasurementsScreenPage;
