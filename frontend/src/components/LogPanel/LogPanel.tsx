import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { connectLogs, onLog, type LogEntry } from '../../services/logStreamService';

const LEVEL_COLORS: Record<string, string> = {
  log: '#6b7280',
  warn: '#d97706',
  error: '#dc2626',
  debug: '#2563eb',
  verbose: '#9ca3af',
};

const LEVEL_BG: Record<string, string> = {
  log: '#f9fafb',
  warn: '#fffbeb',
  error: '#fef2f2',
  debug: '#eff6ff',
  verbose: '#f9fafb',
};

export function LogPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    connectLogs();
    const unsub = onLog((entry) => {
      setLogs((prev) => {
        const next = [...prev, entry];
        return next.length > 100 ? next.slice(-100) : next;
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (expanded && logs.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [logs.length, expanded]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => setExpanded(!expanded)}>
        <View style={styles.headerLeft}>
          <View style={[styles.dot, { backgroundColor: logs.length > 0 ? '#22c55e' : '#9ca3af' }]} />
          <Text style={styles.headerTitle}>Logs del servidor</Text>
        </View>
        <Text style={styles.headerCount}>{logs.length}</Text>
        <Text style={styles.headerChevron}>{expanded ? '▾' : '▸'}</Text>
      </Pressable>

      {expanded && (
        <ScrollView
          ref={scrollRef}
          style={styles.list}
        >
          {logs.map((item, i) => (
            <View key={String(i)} style={[styles.row, { backgroundColor: LEVEL_BG[item.level] ?? '#f9fafb' }]}>
              <Text style={[styles.time]}>{formatTime(item.timestamp)}</Text>
              <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[item.level] ?? '#6b7280' }]}>
                <Text style={styles.levelText}>{item.level.toUpperCase()}</Text>
              </View>
              {item.context ? (
                <Text style={styles.context}>[{item.context}]</Text>
              ) : null}
              <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f3f4f6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  headerCount: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 8,
  },
  headerChevron: {
    fontSize: 12,
    color: '#6b7280',
  },
  list: {
    maxHeight: 200,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
    gap: 6,
  },
  time: {
    fontSize: 10,
    color: '#9ca3af',
    fontVariant: ['tabular-nums'],
  },
  levelBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  levelText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  context: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
  },
  message: {
    flex: 1,
    fontSize: 11,
    color: '#374151',
  },
});
