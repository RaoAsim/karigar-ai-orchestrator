import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';

// Keywords that cycle during the thinking animation — mimics Gemini's live indicator
const THINKING_KEYWORDS = [
  'Reading request...',
  'Extracting intent...',
  'Checking location...',
  'Inferring city...',
  'Validating category...',
  'Querying providers...',
  'Ranking matches...',
  'Preparing response...',
];

function ThinkingAnimation() {
  const [keywordIndex, setKeywordIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const cycle = () => {
      // Fade out → change word → fade in
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setKeywordIndex((prev) => (prev + 1) % THINKING_KEYWORDS.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    };

    const interval = setInterval(cycle, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.thinkingRow}>
      <View style={styles.pulseDot} />
      <Animated.Text style={[styles.keywordText, { opacity: fadeAnim }]}>
        {THINKING_KEYWORDS[keywordIndex]}
      </Animated.Text>
    </View>
  );
}

export default function CollapsibleLog({
  logs,
  isThinking,
}: {
  logs?: string[];
  isThinking?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (isThinking) {
    return (
      <View style={styles.container}>
        <ThinkingAnimation />
      </View>
    );
  }

  if (!logs || logs.length === 0) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.toggle}>
        <View style={styles.headerRow}>
          <View style={[styles.pulseDot, { backgroundColor: '#31A24C' }]} />
          <Text style={styles.toggleText}>
            {expanded ? '▲ HIDE AI TRACE' : '▼ VIEW AI REASONING'}
          </Text>
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.logsContainer}>
          {logs.map((log, i) => (
            <Text key={i} style={styles.logText}>
              {log}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E7F3FF',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#C5DFFC',
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1877F2',
  },
  keywordText: {
    color: '#1877F2',
    fontSize: 12,
    fontWeight: '600',
  },
  toggle: {
    paddingVertical: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleText: {
    color: '#1877F2',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 0.8,
  },
  logsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#C5DFFC',
  },
  logText: {
    fontSize: 11,
    color: '#0D3B66',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginBottom: 6,
    lineHeight: 15,
  },
});

