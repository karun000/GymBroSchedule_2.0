// ─── page.jsx (SubscriptionScreen) ────────────────────────────────────────────────────
// Entry point for the Subscription screen.
// All UI logic is delegated to focused components; this file only composes them.

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, Button, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { C }                from './Theme';
import { auth, db }         from '../../FireBase/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const SUBSCRIPTION_COLLECTION = 'userSubscriptions';

export default function SubscriptionScreen() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);

  // Get current user ID
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      setUserId(uid);
      loadSubscriptionData();
    }
  }, [auth.currentUser]);

  // Load subscription data from Firestore
  const loadSubscriptionData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null); // Clear any previous error
      const userSubRef = doc(db, 'users', userId, SUBSCRIPTION_COLLECTION, 'current');
      const docSnap = await getDoc(userSubRef);

      if (docSnap.exists()) {
        setSubscription(docSnap.data());
      } else {
        // No subscription found, set to null/free tier
        setSubscription({
          tier: 'free',
          status: 'active',
          startDate: null,
          endDate: null,
          features: ['basic_workout_planning', 'limited_exercises']
        });
      }
    } catch (error) {
      console.log('Failed to load subscription data:', error?.message ?? error);
      // Default to free tier on error
      setSubscription({
        tier: 'free',
        status: 'active',
        startDate: null,
        endDate: null,
        features: ['basic_workout_planning', 'limited_exercises']
      });
      setError('Failed to load subscription data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Refresh subscription data
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSubscriptionData();
    } finally {
      setRefreshing(false);
    }
  }, [loadSubscriptionData]);

  // Subscribe to real-time updates
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;

      const userSubRef = doc(db, 'users', userId, SUBSCRIPTION_COLLECTION, 'current');
      const unsubscribe = onSnapshot(
        userSubRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setSubscription(docSnap.data());
            setError(null); // Clear any previous error on successful update
          } else {
            setSubscription({
              tier: 'free',
              status: 'active',
              startDate: null,
              endDate: null,
              features: ['basic_workout_planning', 'limited_exercises']
            });
            setError(null); // Clear any previous error
          }
        },
        (error) => {
          console.log('Error listening to subscription updates:', error);
          setError('Failed to listen for subscription updates. Please check your connection.');
          // Don't update subscription state on error to avoid overriding existing data
        }
      );

      return () => unsubscribe();
    }, [userId])
  );

  // Handle subscription creation/upgrade
  const handleSubscribe = async (tier) => {
    if (!userId) {
      Alert.alert('Please sign in to subscribe');
      return;
    }

    try {
      const userSubRef = doc(db, 'users', userId, SUBSCRIPTION_COLLECTION, 'current');
      const now = new Date();
      const oneMonthLater = new Date(now);
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

      let subscriptionData = {
        tier: tier,
        status: 'active',
        startDate: now.toISOString(),
        endDate: oneMonthLater.toISOString(),
        updatedAt: now.toISOString()
      };

      // Define features based on tier
      switch (tier) {
        case 'basic':
          subscriptionData.features = [
            'basic_workout_planning',
            'unlimited_exercises',
            'progress_tracking',
            'workout_reminders'
          ];
          break;
        case 'premium':
          subscriptionData.features = [
            'basic_workout_planning',
            'unlimited_exercises',
            'progress_tracking',
            'workout_reminders',
            'ai_workout_generator',
            'exercise_library',
            'custom_workout_plans',
            'advanced_analytics'
          ];
          break;
        case 'free':
        default:
          subscriptionData.features = ['basic_workout_planning', 'limited_exercises'];
          break;
      }

      await setDoc(userSubRef, subscriptionData, { merge: true });
      Alert.alert('Subscription Updated', `You have successfully subscribed to the ${tier} plan!`);
    } catch (error) {
      console.log('Failed to update subscription:', error?.message ?? error);
      Alert.alert('Subscription Failed', 'Failed to update subscription. Please try again.');
    }
  };

  // Render subscription tiers
  const renderSubscriptionTiers = () => {
    return [
      {
        id: 'free',
        title: 'Free',
        price: '$0',
        features: ['Basic workout planning', 'Limited exercises (5 per day)'],
        isPopular: false,
        color: C.gray
      },
      {
        id: 'basic',
        title: 'Basic',
        price: '$4.99/month',
        features: [
          'Basic workout planning',
          'Unlimited exercises',
          'Progress tracking',
          'Workout reminders'
        ],
        isPopular: true,
        color: C.purple
      },
      {
        id: 'premium',
        title: 'Premium',
        price: '$9.99/month',
        features: [
          'Basic workout planning',
          'Unlimited exercises',
          'Progress tracking',
          'Workout reminders',
          'AI workout generator',
          'Exercise library',
          'Custom workout plans',
          'Advanced analytics'
        ],
        isPopular: false,
        color: C.purpleSoft
      }
    ];
  };

  // Check if user has access to a feature
  const hasFeatureAccess = (feature) => {
    return subscription?.features?.includes(feature) ?? false;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingShell}>
        <View style={styles.loadingContent}>
          <Text style={styles.loadingText}>Loading your subscription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorShell}>
        <View style={styles.errorContent}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Subscription</Text>
        {!loading && (
          <View style={styles.refreshContainer}>
            <Text style={styles.refreshText} onPress={handleRefresh}>
              Refresh
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.purple}
            colors={[C.purple]}
          />
        )}
      >
        {/* Current Subscription Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Current Plan</Text>
          {subscription ? (
            <View style={styles.statusDetails}>
              <Text style={styles.statusTier}>
                {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} {subscription.status === 'active' ? '(Active)' : ''}
              </Text>
              {subscription.endDate && (
                <Text style={styles.statusDate}>
                  Valid until: {new Date(subscription.endDate).toLocaleDateString()}
                </Text>
              )}
              {!subscription.endDate && (
                <Text style={styles.statusDate}>
                  No expiration date
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.statusText}>Unable to load subscription</Text>
          )}
        </View>

        {/* Subscription Tiers */}
        <View style={styles.tiersSection}>
          <Text style={styles.tiersTitle}>Choose Your Plan</Text>
          <View style={styles.tiersContainer}>
            {renderSubscriptionTiers().map((tier) => (
              <View key={tier.id} style={[styles.tierCard, tier.id === subscription?.tier && styles.tierCardActive]}>
                <View style={styles.tierHeader}>
                  <Text style={styles.tierTitle}>{tier.title}</Text>
                  {tier.isPopular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>Popular</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.tierPrice}>{tier.price}</Text>
                <View style={styles.tierFeatures}>
                  {tier.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                {!loading && (
                  <Button
                    title="Select"
                    color={tier.color}
                    onPress={() => handleSubscribe(tier.id)}
                    disabled={subscription?.tier === tier.id}
                  />
                )}
                {loading && (
                  <View style={styles.loadingButton}>
                    <Text style={styles.loadingButtonText}>Loading...</Text>
                  </View>
                )}
                {subscription?.tier === tier.id && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedText}>Current Plan</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Features Overview */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Feature Overview</Text>
          <View style={styles.featuresGrid}>
            {/* Workout Planning */}
            <View style={styles.featureCard}>
              <Text style={styles.featureCardTitle}>Workout Planning</Text>
              <Text style={styles.featureCardDescription}>
                Create and customize your workout routines
              </Text>
              <View style={styles.featureStatus}>
                {hasFeatureAccess('basic_workout_planning') ? (
                  <Text style={styles.featureStatusActive}>Included</Text>
                ) : (
                  <Text style={styles.featureStatusInactive}>Not Available</Text>
                )}
              </View>
            </View>

            {/* Exercise Library */}
            <View style={styles.featureCard}>
              <Text style={styles.featureCardTitle}>Exercise Library</Text>
              <Text style={styles.featureCardDescription}>
                Access to thousands of exercises with proper form guides
              </Text>
              <View style={styles.featureStatus}>
                {hasFeatureAccess('exercise_library') ? (
                  <Text style={styles.featureStatusActive}>Included</Text>
                ) : (
                  <Text style={styles.featureStatusInactive}>Premium Only</Text>
                )}
              </View>
            </View>

            {/* Progress Tracking */}
            <View style={styles.featureCard}>
              <Text style={styles.featureCardTitle}>Progress Tracking</Text>
              <Text style={styles.featureCardDescription}>
                Monitor your strength, measurements, and achievements
              </Text>
              <View style={styles.featureStatus}>
                {hasFeatureAccess('progress_tracking') ? (
                  <Text style={styles.featureStatusActive}>Included</Text>
                ) : (
                  <Text style={styles.featureStatusInactive}>Basic Only</Text>
                )}
              </View>
            </View>

            {/* AI Generator */}
            <View style={styles.featureCard}>
              <Text style={styles.featureCardTitle}>AI Workout Generator</Text>
              <Text style={styles.featureCardDescription}>
                Let AI create personalized workout plans for you
              </Text>
              <View style={styles.featureStatus}>
                {hasFeatureAccess('ai_workout_generator') ? (
                  <Text style={styles.featureStatusActive}>Included</Text>
                ) : (
                  <Text style={styles.featureStatusInactive}>Premium Only</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingShell: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: C.card,
    padding: 20,
    borderRadius: 10,
  },
  loadingText: {
    color: C.white,
    fontSize: 16,
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
  headerTitle: {
    color: C.white,
    fontSize: 20,
    fontWeight: '600',
  },
  refreshContainer: {
    padding: 4,
  },
  refreshText: {
    color: C.purple,
    fontSize: 14,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },
  statusCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  statusTitle: {
    color: C.white,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  statusDetails: {
    gap: 8,
  },
  statusTier: {
    color: C.purple,
    fontSize: 16,
    fontWeight: '600',
  },
  statusDate: {
    color: C.gray,
    fontSize: 14,
  },
  statusText: {
    color: C.gray,
    fontSize: 14,
    textAlign: 'center',
  },
  tiersSection: {
    marginBottom: 24,
  },
  tiersTitle: {
    color: C.white,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  tiersContainer: {
    gap: 12,
  },
  tierCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  tierCardActive: {
    borderColor: C.purple,
    backgroundColor: `${C.purpleDim}`,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tierTitle: {
    color: C.white,
    fontSize: 18,
    fontWeight: '600',
  },
  popularBadge: {
    backgroundColor: C.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  popularText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tierPrice: {
    color: C.purpleSoft,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  tierFeatures: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    color: C.white,
    fontSize: 14,
    flex: 1,
  },
  featuresSection: {
    marginBottom: 24,
  },
  featuresTitle: {
    color: C.white,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  featureCardTitle: {
    color: C.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  featureCardDescription: {
    color: C.gray,
    fontSize: 14,
    marginBottom: 12,
  },
  featureStatus: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureStatusActive: {
    color: C.success,
    fontSize: 12,
    fontWeight: '600',
  },
  featureStatusInactive: {
    color: C.error,
    fontSize: 12,
    fontWeight: '600',
  },
  loadingButton: {
    padding: 8,
    backgroundColor: C.purpleDim,
    borderRadius: 6,
  },
  loadingButtonText: {
    color: C.white,
    fontSize: 14,
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: C.purple,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  selectedText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  errorShell: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContent: {
    backgroundColor: C.card,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  errorText: {
    color: C.error,
    fontSize: 16,
    textAlign: 'center',
  },
});