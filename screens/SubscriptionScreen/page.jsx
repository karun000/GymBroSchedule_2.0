import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, runTransaction } from 'firebase/firestore';

import { C } from './Theme';
import { auth, db } from '../../FireBase/firebase';
import {
  SUBSCRIPTION_COLLECTION,
  SUBSCRIPTION_DOC_ID,
  buildGymSubscription,
  formatDate,
  getSubscriptionState,
} from './components/subscriptionConfig';
import CurrentSubscriptionCard from './components/CurrentSubscriptionCard';
import GymSubscriptionEmptyState from './components/GymSubscriptionEmptyState';
import SubscriptionFormModal from './components/SubscriptionFormModal';

const getSubscriptionRef = (uid) => doc(db, 'users', uid, SUBSCRIPTION_COLLECTION, SUBSCRIPTION_DOC_ID);

export default function SubscriptionScreen({ navigation }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ visible: false, mode: 'create' });

  const subscriptionState = getSubscriptionState(subscription);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  // Track auth state reliably.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setSubscription(null);
      setLoading(!!user);
      setForm({ visible: false, mode: 'create' });
      setUserId(user?.uid ?? null);
      if (!user) {
        setSubscription(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Load the saved gym membership record.
  const loadSubscriptionData = useCallback(
    async ({ showSpinner = true } = {}) => {
      if (!userId) return;

      try {
        if (showSpinner) setLoading(true);
        setError(null);

        const docSnap = await getDoc(getSubscriptionRef(userId));
        if (auth.currentUser?.uid !== userId) return;
        setSubscription(docSnap.exists() ? docSnap.data() : null);
      } catch (loadError) {
        console.log('Failed to load subscription data:', loadError?.message ?? loadError);

        setError('Failed to load subscription data. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSubscriptionData({ showSpinner: false });
    } finally {
      setRefreshing(false);
    }
  }, [loadSubscriptionData]);

  // Real-time updates while the screen is focused.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return undefined;

      const unsubscribe = onSnapshot(
        getSubscriptionRef(userId),
        (docSnap) => {
          if (auth.currentUser?.uid !== userId) return;
          setSubscription(docSnap.exists() ? docSnap.data() : null);
          setError(null);
        },
        (snapshotError) => {
          console.log('Error listening to subscription updates:', snapshotError);
          setError('Failed to listen for subscription updates. Please check your connection.');
        }
      );

      return unsubscribe;
    }, [userId])
  );

  // ── Form open / close ────────────────────────────────────────────────────
  const openCreateForm = () => {
    if (error || loading) return;
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to create a subscription.');
      return;
    }
    // Existing subscriptions are renewed, including after expiry.
    if (subscriptionState.hasSubscription) {
      Alert.alert(
        'Subscription already exists',
        'Only one subscription is allowed. Renew your existing gym membership from the card above.'
      );
      return;
    }
    setForm({ visible: true, mode: 'create' });
  };

  const openRenewForm = () => {
    if (!subscriptionState.hasSubscription) return;
    setForm({ visible: true, mode: 'renew', subscription });
  };

  const closeForm = () => {
    if (!savingRef.current) setForm((prev) => ({ ...prev, visible: false }));
  };

  const handleSubmitSubscription = async (values) => {
    if (savingRef.current || !userId || auth.currentUser?.uid !== userId) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const result = await runTransaction(db, async (transaction) => {
        const ref = getSubscriptionRef(userId);
        const snapshot = await transaction.get(ref);
        const current = snapshot.exists() ? snapshot.data() : null;
        if (form.mode === 'renew' && current?.updatedAt !== form.subscription?.updatedAt) {
          throw new Error('Your subscription has changed. Close this form and try again.');
        }
        const resultData = buildGymSubscription({ current, mode: form.mode, ...values });
        transaction.set(ref, resultData);
        return resultData;
      });
      setSubscription(result);
      setForm((prev) => ({ ...prev, visible: false }));
      Alert.alert(form.mode === 'renew' ? 'Subscription renewed' : 'Subscription created',
        `Your gym membership ends on ${formatDate(result.endDate)}.`);
    } catch (saveError) {
      Alert.alert('Could not save subscription', saveError.code
        ? 'Check your connection and try again.' : saveError.message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MainTabs');
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton} onPress={handleBack}>
          <Icon name="arrow-left" size={24} color={C.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gym Subscription</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="refresh" size={18} color={C.purpleSoft} />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerShell}>
          <View style={styles.centerCard}>
            <Text style={styles.centerText}>Loading your subscription...</Text>
          </View>
        </View>
      ) : <>
      {error && (
        <View style={styles.errorBanner}>
          <Icon name="alert-circle-outline" size={16} color={C.error} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.purple}
            colors={[C.purple]}
          />
        }
      >
        {subscriptionState.hasSubscription ? (
          <CurrentSubscriptionCard subscription={subscription} onRenew={openRenewForm} />
        ) : (
          <GymSubscriptionEmptyState onCreate={openCreateForm} disabled={!!error || !userId} />
        )}
        <Text style={styles.activeHint}>Keep your gym payment and membership dates in one place.</Text>
      </ScrollView>
      </>}

      {/* Create / Renew modal */}
      <SubscriptionFormModal
        saving={saving}
        visible={form.visible}
        mode={form.mode}
        currentSubscription={form.subscription}
        onClose={closeForm}
        onSubmit={handleSubmitSubscription}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centerShell: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centerCard: {
    backgroundColor: C.card,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  centerText: {
    color: C.white,
    fontSize: 15,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    color: C.white,
    fontSize: 20,
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
  },
  refreshText: {
    color: C.purpleSoft,
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.error,
  },
  errorBannerText: {
    flex: 1,
    color: C.error,
    fontSize: 13,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: C.white,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  tiersContainer: {
    gap: 12,
  },
  activeHint: {
    color: C.gray,
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
});