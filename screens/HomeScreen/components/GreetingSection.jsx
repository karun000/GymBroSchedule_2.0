// ─── components/GreetingSection.jsx ──────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../FireBase/firebase';
import { fetchUserRecords } from '../../../FireBase/records';
import { C } from '../Theme';
import { BlurView } from '@react-native-community/blur';

const parseNumericValue = (value) => {
  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

export default function GreetingSection({
  name: propName = 'Karun',
  subtitle = 'Stay consistent and crush your goals.',
}) {
  const [name, setName]                 = useState(propName);
  const [latestWeight, setLatestWeight] = useState(null); // { value, unit, dateISO }
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadWeight = async () => {
      try {
        setLoading(true);

        // Cache-first: instant if cached, works offline, syncs to server only if cache empty
        const records = await fetchUserRecords('measurementRecords');

        // Sort newest-first by dateISO (fallback to createdAt), same as MeasurementsScreenPage
        const sorted = [...records].sort((a, b) => {
          const toMs = (v) =>
            typeof v === 'string'             ? new Date(v).getTime()
            : typeof v?.toDate === 'function' ? v.toDate().getTime()
            : 0;
          return toMs(b.dateISO ?? b.createdAt) - toMs(a.dateISO ?? a.createdAt);
        });

        const found = sorted.find((r) => parseNumericValue(r.weight) !== null);

        if (!cancelled) {
          setLatestWeight(
            found
              ? { value: found.weight, unit: found.weightUnit ?? 'kg', dateISO: found.dateISO ?? found.createdAt }
              : null
          );
        }
      } catch (err) {
        console.warn('[GreetingSection] weight fetch failed:', err);
        if (!cancelled) setLatestWeight(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!cancelled) {
        if (user) {
          const display = user.displayName || user.email?.split('@')[0] || propName;
          setName(display);
          loadWeight();
        } else {
          setName(propName);
          setLatestWeight(null);
          setLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [propName]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const weightDisplay = () => {
    if (!latestWeight || latestWeight.value == null || latestWeight.value === '') {
      return '—';
    }
    return `${latestWeight.value} ${latestWeight.unit}`.trim();
  };

  const dateDisplay = () => {
    if (!latestWeight?.dateISO) return null;
    const ms = new Date(latestWeight.dateISO).getTime();
    if (!ms || isNaN(ms)) return null;
    return new Date(ms).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  // ─── Card inner content (shared between iOS blur and Android fallback) ───────
  const CardContent = () => (
    <>
      <Text style={styles.cardLabel}>Latest Weight</Text>
      {loading ? (
        <ActivityIndicator size="small" color={C.purple} style={styles.spinner} />
      ) : (
        <>
          <Text style={styles.cardValue}>{weightDisplay()}</Text>
          {dateDisplay() && (
            <Text style={styles.cardDate}>{dateDisplay()}</Text>
          )}
        </>
      )}
    </>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.main}>
      {/* Greeting */}
      <View style={styles.greetingContainer}>
        <Text style={styles.title}>Hello, {name}!</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Weight card — BlurView on iOS, solid fallback on Android */}
      {Platform.OS === 'ios' ? (
        <BlurView
          style={styles.card}
          blurType="dark"
          blurAmount={24}
          reducedTransparencyFallbackColor="rgba(20,20,42,0.92)"
        >
          <CardContent />
        </BlurView>
      ) : (
        <View style={[styles.card, styles.cardAndroid]}>
          <CardContent />
        </View>
      )}
    </View>
  );
}

const CARD_BORDER = 'rgba(123, 92, 200, 0.35)';
const CARD_BG     = 'rgba(30, 24, 54, 0.88)';

const styles = StyleSheet.create({
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  greetingContainer: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: C.white,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    color: C.gray,
    lineHeight: 18,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: CARD_BORDER,
    minWidth: 130,
  },
  cardInner: {
    padding: 16,
    backgroundColor: 'rgba(20, 16, 40, 0.45)',
  },
  cardAndroid: {
    backgroundColor: CARD_BG,
    padding: 16,
    elevation: 8,
    shadowColor: '#7B5CC8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 26,
    fontWeight: '700',
    color: C.white,
    marginTop: 2,
  },
  cardDate: {
    fontSize: 11,
    color: C.gray,
    marginTop: 3,
  },
  spinner: {
    marginTop: 8,
    marginBottom: 4,
  },
});