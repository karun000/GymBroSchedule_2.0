import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  Pressable,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Theme from './Theme';
import NewPRForm from './components/NewPRForm';
import PRHistoryItem from './components/PRHistoryItem';
import PREditorModal from './components/PREditorModal';
import NavHeader from '../../components/NavHeader';
import ProgressLineChart from '../../components/ProgressLineChart';
import { deletePrRecord, fetchUserRecords, savePrRecord, updatePrRecord } from '../../FireBase/records';

const PRScreenPage = ({ navigation, route }) => {
  const tabBarHeight = useBottomTabBarHeight();
  const [prHistory, setPrHistory] = useState([]);
  const [editingPr, setEditingPr] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadPrHistory = async () => {
      try {
        const storedPrs = await fetchUserRecords('prRecords');

        if (!isActive || storedPrs.length === 0) {
          return;
        }

        const sortedPrs = storedPrs
          .map((record) => ({
            id: record.id,
            name: record.name,
            weight: record.weight,
            unit: record.unit,
            repMax: record.repMax,
            muscleGroup: record.muscleGroup,
            dateRange: record.dateRange,
            dateISO: record.dateISO,
            icon: record.icon ?? 'dumbbell',
          }))
          .sort((left, right) => {
            const leftTime = left.dateISO ? new Date(left.dateISO).getTime() : 0;
            const rightTime = right.dateISO ? new Date(right.dateISO).getTime() : 0;
            return rightTime - leftTime;
          });

        setPrHistory(sortedPrs);
      } catch (error) {
        console.log('Failed to load saved PRs:', error?.message ?? error);
      }
    };

    loadPrHistory();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (route?.params?.openPrModal) {
      setIsFormVisible(true);
      navigation?.setParams?.({ openPrModal: false });
    }
  }, [navigation, route?.params?.openPrModal]);

  const openAddForm = () => setIsFormVisible(true);

  const closeAddForm = () => setIsFormVisible(false);

  const handleLog = async (newPR) => {
    const savedPR = await savePrRecord(newPR);

    setPrHistory((prev) => [
      {
        id: savedPR.id,
        ...newPR,
      },
      ...prev,
    ]);
  };

  const handleMenuPress = (pr) => {
    setEditingPr(pr);
  };

  const handleSavePrEdit = async (updatedPr) => {
    await updatePrRecord(updatedPr.id, {
      name: updatedPr.name,
      weight: updatedPr.weight,
      unit: updatedPr.unit,
      repMax: updatedPr.repMax,
      muscleGroup: updatedPr.muscleGroup,
      dateRange: updatedPr.dateRange,
      dateISO: updatedPr.dateISO,
      icon: updatedPr.icon || 'dumbbell',
    });

    setPrHistory((prev) =>
      prev.map((item) => (item.id === updatedPr.id ? { ...item, ...updatedPr } : item))
    );
  };

  const handleDeletePr = async (prId) => {
    await deletePrRecord(prId);

    setPrHistory((prev) => prev.filter((item) => item.id !== prId));
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

  const prTrendData = (() => {
    const latestPrRecord = prHistory.find((record) => parseNumericValue(record.weight) !== null);
    const targetUnit = latestPrRecord?.unit ?? 'kg';

    return prHistory
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
          label: record.dateRange ?? 'Recent',
          value: convertWeightValue(numericWeight, record.unit, targetUnit),
          unit: targetUnit,
        };
      })
      .filter(Boolean);
  })();
  const handleMenu = () => console.log('Menu pressed');


  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />

      {/* Header */}
      <NavHeader
        title="My PR"
        onLeftPress={handleMenu}
        rightIcon="plus"
        onRightPress={openAddForm}
      />


      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ProgressLineChart
          theme={Theme}
          title="PR PROGRESS"
          subtitle="Weight trend across your saved PR entries"
          data={prTrendData}
          emptyTitle="Add a couple of PRs"
          emptyText="Save at least two PR entries to see the line graph update over time."
          valueFormatter={(value, unit) => `${Number.isInteger(value) ? value : value.toFixed(1)} ${unit}`}
        />

        {/* PR History */}
        {prHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PR HISTORY</Text>
            <View style={styles.listCard}>
              {prHistory.map((pr, i) => (
                <PRHistoryItem
                  key={pr.id}
                  pr={pr}
                  index={i}
                  isLast={i === prHistory.length - 1}
                  onMenuPress={handleMenuPress}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={isFormVisible}
        transparent
        animationType="fade"
        onRequestClose={closeAddForm}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeAddForm}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ADD PR</Text>
              <TouchableOpacity onPress={closeAddForm} style={styles.modalClose} activeOpacity={0.8}>
                <Icon name="close" size={20} color={Theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <NewPRForm onLog={handleLog} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <PREditorModal
        visible={!!editingPr}
        pr={editingPr}
        onClose={() => setEditingPr(null)}
        onSave={handleSavePrEdit}
        onDelete={handleDeletePr}
      />
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

export default PRScreenPage;
