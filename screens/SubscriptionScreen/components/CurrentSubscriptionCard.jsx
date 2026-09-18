// ─── components/CurrentSubscriptionCard.jsx ───────────────────────────────

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { C } from '../Theme';
import { formatDate, formatAmount, getSubscriptionState } from './subscriptionConfig';

const CurrentSubscriptionCard = ({ subscription, onRenew }) => {
  const state = getSubscriptionState(subscription);

  if (!state.hasSubscription) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gym Subscription</Text>
        <View style={styles.emptyRow}>
          <Icon name="tag-off-outline" size={24} color={C.gray} />
          <View style={styles.emptyTextWrap}>
            <Text style={styles.emptyTitle}>No subscription yet</Text>
            <Text style={styles.emptyText}>Create a record to track your gym payments.</Text>
          </View>
        </View>
      </View>
    );
  }

  const renewals = Array.isArray(subscription.renewals) ? subscription.renewals : [];
  const lastRenewal = renewals.length > 0 ? renewals[renewals.length - 1] : null;

  return (
    <View style={[styles.card, state.isExpired && styles.cardExpired]}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Gym Subscription</Text>
        <View style={[styles.badge, state.isExpired ? styles.badgeExpired : styles.badgeActive]}>
          <Text style={[styles.badgeText, state.isExpired && styles.badgeTextExpired]}>
            {state.isExpired ? 'Expired' : subscription.status === 'cancelled' ? 'Cancelled' : state.isUpcoming ? 'Upcoming' : 'Active'}
          </Text>
        </View>
      </View>

      <Text style={styles.tierName}>Gym membership</Text>

      <Text style={styles.dateText}>Amount paid</Text>
      {subscription.amount != null && (
        <Text style={styles.amount}>
          {formatAmount(subscription.amount, subscription.currency ?? 'USD')}

        </Text>
      )}

      <View style={styles.dateRow}>
        <Icon name="cash-check" size={16} color={C.gray} />
        <Text style={styles.dateText}>Payment date: {formatDate(subscription.paymentDate ?? subscription.startDate)}</Text>
      </View>
      <View style={styles.dateRow}>
        <Icon name="calendar-start" size={16} color={C.gray} />
        <Text style={styles.dateText}>Starts: {formatDate(subscription.startDate)}</Text>
      </View>
      <View style={styles.dateRow}>
        <Icon name="calendar-end" size={16} color={C.gray} />
        <Text style={styles.dateText}>Ends: {formatDate(subscription.endDate)}</Text>
      </View>

      <Text style={[styles.statusLine, state.isExpired && styles.statusLineExpired]}>
        {state.isExpired
          ? 'This subscription has expired — record a renewal when you pay your gym.'
          : state.daysLeft != null
            ? `Expires in ${state.daysLeft} ${state.daysLeft === 1 ? 'day' : 'days'}`
            : 'No expiration date'}
      </Text>

      {lastRenewal && (
        <View style={styles.history}>
          <Text style={styles.cardTitle}>Renewal history</Text>
          {[...renewals].reverse().map((renewal, index) => (
            <View key={`${renewal.renewedAt}-${index}`} style={styles.historyRow}>
              <Text style={styles.dateText}>{formatAmount(renewal.amount, renewal.currency ?? subscription.currency ?? 'USD')}</Text>
              <Text style={styles.renewalNote}>Paid: {formatDate(renewal.paymentDate ?? renewal.renewedAt)}</Text>
              <Text style={styles.renewalNote}>Ends: {formatDate(renewal.newEndDate)}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.renewButton} onPress={onRenew}>
        <Icon name="refresh" size={18} color={C.white} />
        <Text style={styles.renewButtonText}>
          {state.isExpired ? 'Record renewal' : 'Renew membership'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  history: { marginTop: 18, gap: 10 },
  historyRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
  },
  cardExpired: {
    borderColor: C.error,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    color: C.white,
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: C.success,
  },
  badgeExpired: {
    backgroundColor: C.error,
  },
  badgeText: {
    color: C.white,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  badgeTextExpired: {
    color: C.white,
  },
  tierName: {
    color: C.purple,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  amount: {
    color: C.purpleSoft,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  amountCycle: {
    color: C.gray,
    fontSize: 13,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dateText: {
    color: C.gray,
    fontSize: 13,
  },
  statusLine: {
    color: C.success,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  statusLineExpired: {
    color: C.error,
  },
  renewalNote: {
    color: C.gray,
    fontSize: 12,
    marginTop: 4,
  },
  renewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.purple,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  renewButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyTextWrap: {
    flex: 1,
  },
  emptyTitle: {
    color: C.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: C.gray,
    fontSize: 13,
    marginTop: 2,
  },
});

export default CurrentSubscriptionCard;