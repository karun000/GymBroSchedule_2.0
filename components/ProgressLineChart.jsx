import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const DEFAULT_EMPTY_TITLE = 'Not enough data yet';
const DEFAULT_EMPTY_TEXT = 'Add at least two entries to see a progress line.';

const formatValueLabel = (value, unit) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '—';
  }

  const formattedValue = Number.isInteger(numericValue)
    ? `${numericValue}`
    : numericValue.toFixed(1);

  return unit ? `${formattedValue} ${unit}` : formattedValue;
};

const formatDelta = (deltaValue, unit) => {
  const numericDelta = Number(deltaValue);

  if (!Number.isFinite(numericDelta) || numericDelta === 0) {
    return `0 ${unit}`.trim();
  }

  const formattedDelta = Number.isInteger(numericDelta)
    ? `${numericDelta}`
    : numericDelta.toFixed(1);

  return `${numericDelta > 0 ? '+' : '-'}${Math.abs(Number(formattedDelta))} ${unit}`.trim();
};

const ProgressLineChart = ({
  theme,
  title,
  subtitle,
  data = [],
  emptyTitle = DEFAULT_EMPTY_TITLE,
  emptyText = DEFAULT_EMPTY_TEXT,
  valueFormatter = formatValueLabel,
  accentColor = theme?.colors?.primary ?? '#7C3AED',
}) => {
  const [chartWidth, setChartWidth] = useState(0);

  const chartPoints = useMemo(() => {
    return data
      .filter((item) => Number.isFinite(Number(item?.value)))
      .map((item) => ({
        ...item,
        value: Number(item.value),
      }));
  }, [data]);

  const hasTrend = chartPoints.length >= 2;
  const chartHeight = 152;
  const horizontalPadding = 14;
  const verticalPadding = 16;

  const chartMetrics = useMemo(() => {
    if (!hasTrend) {
      return null;
    }

    const values = chartPoints.map((point) => point.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    return chartPoints.map((point, index) => {
      const xPosition =
        chartPoints.length === 1
          ? horizontalPadding
          : horizontalPadding + ((chartWidth - horizontalPadding * 2) * index) / (chartPoints.length - 1);

      const scaledValue = (point.value - minValue) / valueRange;
      const yPosition =
        verticalPadding + (chartHeight - verticalPadding * 2) * (1 - scaledValue);

      return {
        ...point,
        x: xPosition,
        y: yPosition,
      };
    });
  }, [chartPoints, chartWidth, hasTrend]);

  const summary = useMemo(() => {
    if (!hasTrend) {
      return null;
    }

    const firstPoint = chartPoints[0];
    const latestPoint = chartPoints[chartPoints.length - 1];

    return {
      firstPoint,
      latestPoint,
      delta: latestPoint.value - firstPoint.value,
    };
  }, [chartPoints, hasTrend]);

  if (!hasTrend) {
    return (
      <View style={[styles.card, { borderColor: theme?.colors?.cardBorder ?? '#252240' }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: theme?.colors?.text ?? '#FFFFFF' }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: theme?.colors?.textSub ?? '#9B99B5' }]}>
              {subtitle}
            </Text>
          </View>

          <View style={[styles.iconWrap, { backgroundColor: theme?.colors?.primaryGlow ?? 'rgba(124, 58, 237, 0.25)' }]}>
            <Icon name="chart-timeline-variant" size={18} color={accentColor} />
          </View>
        </View>

        <View style={[styles.emptyState, { backgroundColor: theme?.colors?.surface ?? '#141228' }]}>
          <Text style={[styles.emptyTitle, { color: theme?.colors?.text ?? '#FFFFFF' }]}>{emptyTitle}</Text>
          <Text style={[styles.emptyText, { color: theme?.colors?.textSub ?? '#9B99B5' }]}>{emptyText}</Text>
        </View>
      </View>
    );
  }

  const lineWidth = 2.5;
  const axisLabelColor = theme?.colors?.textMuted ?? '#5A5878';

  return (
    <View style={[styles.card, { borderColor: theme?.colors?.cardBorder ?? '#252240' }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: theme?.colors?.text ?? '#FFFFFF' }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme?.colors?.textSub ?? '#9B99B5' }]}>
            {subtitle}
          </Text>
        </View>

        <View style={[styles.iconWrap, { backgroundColor: theme?.colors?.primaryGlow ?? 'rgba(124, 58, 237, 0.25)' }]}>
          <Icon name="chart-timeline-variant" size={18} color={accentColor} />
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryPill, { backgroundColor: theme?.colors?.background ?? '#0D0B1E', borderColor: theme?.colors?.cardBorder ?? '#252240' }]}>
          <Text style={[styles.summaryLabel, { color: theme?.colors?.textMuted ?? '#5A5878' }]}>START</Text>
          <Text style={[styles.summaryValue, { color: theme?.colors?.text ?? '#FFFFFF' }]}>
            {valueFormatter(summary.firstPoint.value, summary.firstPoint.unit)}
          </Text>
        </View>

        <View style={[styles.summaryPill, { backgroundColor: theme?.colors?.background ?? '#0D0B1E', borderColor: theme?.colors?.cardBorder ?? '#252240' }]}>
          <Text style={[styles.summaryLabel, { color: theme?.colors?.textMuted ?? '#5A5878' }]}>NOW</Text>
          <Text style={[styles.summaryValue, { color: theme?.colors?.text ?? '#FFFFFF' }]}>
            {valueFormatter(summary.latestPoint.value, summary.latestPoint.unit)}
          </Text>
        </View>

        <View style={[styles.summaryPill, { backgroundColor: theme?.colors?.background ?? '#0D0B1E', borderColor: theme?.colors?.cardBorder ?? '#252240' }]}>
          <Text style={[styles.summaryLabel, { color: theme?.colors?.textMuted ?? '#5A5878' }]}>CHANGE</Text>
          <Text style={[styles.summaryValue, { color: accentColor }]}>
            {formatDelta(summary.delta, summary.latestPoint.unit)}
          </Text>
        </View>
      </View>

      <View
        style={[styles.chartArea, { backgroundColor: theme?.colors?.surface ?? '#141228' }]}
        onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
      >
        <View style={styles.gridLayer} pointerEvents="none">
          {[0.25, 0.5, 0.75].map((position) => (
            <View
              key={position}
              style={[
                styles.gridLine,
                {
                  top: `${position * 100}%`,
                  borderBottomColor: theme?.colors?.divider ?? '#1F1D35',
                },
              ]}
            />
          ))}
        </View>

        {chartMetrics.map((point, index) => {
          const nextPoint = chartMetrics[index + 1];

          return (
            <React.Fragment key={`${point.label}-${index}`}>
              {nextPoint ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.lineSegment,
                    {
                      left: (point.x + nextPoint.x) / 2 - Math.hypot(nextPoint.x - point.x, nextPoint.y - point.y) / 2,
                      top: (point.y + nextPoint.y) / 2 - lineWidth / 2,
                      width: Math.hypot(nextPoint.x - point.x, nextPoint.y - point.y),
                      height: lineWidth,
                      backgroundColor: accentColor,
                      transform: [
                        {
                          rotateZ: `${(Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180) / Math.PI}deg`,
                        },
                      ],
                    },
                  ]}
                />
              ) : null}

              <View
                pointerEvents="none"
                style={[
                  styles.point,
                  {
                    left: point.x - 4,
                    top: point.y - 4,
                    borderColor: theme?.colors?.background ?? '#0D0B1E',
                    backgroundColor: accentColor,
                  },
                ]}
              />
            </React.Fragment>
          );
        })}
      </View>

      <View style={styles.axisRow}>
        <Text style={[styles.axisLabel, { color: axisLabelColor }]}>{chartMetrics[0]?.label}</Text>
        <Text style={[styles.axisLabel, { color: axisLabelColor }]}>{chartMetrics[Math.floor((chartMetrics.length - 1) / 2)]?.label}</Text>
        <Text style={[styles.axisLabel, { color: axisLabelColor }]}>{chartMetrics[chartMetrics.length - 1]?.label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#1A1730',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryPill: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  chartArea: {
    height: 152,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    overflow: 'hidden',
  },
  gridLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lineSegment: {
    position: 'absolute',
    borderRadius: 999,
  },
  point: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 999,
    borderWidth: 2,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  axisLabel: {
    fontSize: 10,
  },
  emptyState: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
  },
});

export default ProgressLineChart;