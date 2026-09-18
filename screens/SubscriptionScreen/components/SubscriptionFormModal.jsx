import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { C } from '../Theme';
import { DURATION_OPTIONS, DEFAULT_CURRENCY, CURRENCIES, addMonths, dateInputValue, parseDateInput, getRenewalStart, formatDate, formatAmount, buildGymSubscription } from './subscriptionConfig';
import CurrencySelector from './CurrencySelector';
import MembershipDateField from './MembershipDateField';

const SubscriptionFormModal = ({ visible, mode, currentSubscription, onClose, onSubmit, saving }) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [paymentDate, setPaymentDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [durationMonths, setDurationMonths] = useState(1);
  const [error, setError] = useState(null);
  const isRenew = mode === 'renew';

  useEffect(() => {
    if (!visible) return;
    const today = new Date();
    const start = isRenew ? getRenewalStart(currentSubscription, today) : today;
    const duration = currentSubscription?.durationMonths ?? 1;
    setAmount(isRenew ? String(currentSubscription?.amount ?? '') : '');
    setCurrency(CURRENCIES.includes(currentSubscription?.currency) ? currentSubscription.currency : DEFAULT_CURRENCY);
    setPaymentDate(dateInputValue(today));
    setStartDate(dateInputValue(start));
    setDurationMonths(duration);
    setError(null);
  }, [visible, isRenew, currentSubscription]);

  const parsedStartDate = parseDateInput(startDate);
  const endDate = parsedStartDate ? addMonths(parsedStartDate, durationMonths) : null;

  const submit = () => {
    if (saving) return;
    const decimals = currency === 'JPY' ? /^\d+$/ : /^\d+(\.\d{1,2})?$/;
    if (!decimals.test(amount.trim())) { setError(currency === 'JPY' ? 'Enter an amount in whole yen.' : 'Enter an amount with up to two decimal places.'); return; }
    const values = { amount: Number(amount), currency, paymentDate: parseDateInput(paymentDate), startDate: parsedStartDate, endDate, durationMonths };
    try {
      buildGymSubscription({ current: currentSubscription, mode, ...values });
      setError(null);
      onSubmit(values);
    } catch (validationError) { setError(validationError.message); }
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.grabber} />
            <Text style={styles.title}>{isRenew ? 'Renew gym subscription' : 'Create gym subscription'}</Text>
            <Text style={styles.fieldLabel}>Currency</Text>
            <CurrencySelector value={currency} onChange={setCurrency} disabled={saving} />
            <Text style={styles.fieldLabel}>Amount paid</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>{currency}</Text>
              <TextInput accessibilityLabel="Amount paid" value={amount} onChangeText={setAmount} editable={!saving} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={C.gray} style={styles.amountInput} />
            </View>
            <MembershipDateField label="Payment date" value={paymentDate} onChange={setPaymentDate} disabled={saving} />
            <MembershipDateField label="Membership start date" value={startDate} onChange={setStartDate} disabled={saving} />
            <Text style={styles.fieldLabel}>Membership duration</Text>
            <View style={styles.chipRow}>{DURATION_OPTIONS.map(months => (
              <TouchableOpacity key={months} disabled={saving} onPress={() => setDurationMonths(months)} style={[styles.chip, durationMonths === months && styles.chipActive]}>
                <Text style={[styles.chipText, durationMonths === months && styles.chipTextActive]}>{months} {months === 1 ? 'month' : 'months'}</Text>
              </TouchableOpacity>
            ))}</View>
            <Text style={styles.fieldLabel}>End date (automatic)</Text>
            <View style={styles.summary}>
              <Text accessibilityLiveRegion="polite" style={styles.summaryValue}>{endDate ? formatDate(endDate) : 'Select a valid start date'}</Text>
              <Text style={styles.summaryLabel}>Calculated from your start date and membership duration.</Text>
            </View>
            <View style={styles.summary}><Text style={styles.summaryValue}>Payment: {formatAmount(amount, currency)}</Text></View>
            {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity disabled={saving} style={styles.ghostButton} onPress={onClose}><Text style={styles.ghostText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={saving} style={styles.solidButton} onPress={submit}><Text style={styles.solidText}>{saving ? 'Saving…' : isRenew ? 'Save renewal' : 'Save subscription'}</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    marginBottom: 12,
  },
  title: {
    color: C.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  fieldLabel: {
    color: C.gray,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  amountRowDisabled: {
    opacity: 0.6,
  },
  fieldError: {
    borderColor: C.error,
  },
  currency: {
    color: C.purpleSoft,
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: C.white,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 12,
  },
  amountFixed: {
    flex: 1,
    color: C.white,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 12,
  },
  errorText: {
    color: C.error,
    fontSize: 12,
    marginBottom: 6,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  dateValue: {
    flex: 1,
    color: C.white,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  todayChip: {
    backgroundColor: C.purpleDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  todayChipText: {
    color: C.purpleSoft,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  chipActive: {
    backgroundColor: C.purple,
    borderColor: C.purple,
  },
  chipText: {
    color: C.gray,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: C.white,
  },
  summary: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: C.gray,
    fontSize: 13,
  },
  summaryValue: {
    color: C.white,
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  ghostButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  ghostText: {
    color: C.gray,
    fontSize: 15,
    fontWeight: '600',
  },
  solidButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: C.purple,
  },
  solidText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default SubscriptionFormModal;