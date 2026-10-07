import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme/use-app-theme';

/** Soft background circles — auth screens only. */
export function DecorCircles() {
  const { colors } = useAppTheme();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.circle, styles.big, { backgroundColor: colors.decorPrimary }]} />
      <View style={[styles.circle, styles.small, { backgroundColor: colors.decorSecondary }]} />
      <View style={[styles.circle, styles.tiny, { backgroundColor: colors.decorPrimary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  big: {
    width: 260,
    height: 260,
    top: -90,
    right: -100,
  },
  small: {
    width: 180,
    height: 180,
    bottom: 80,
    left: -90,
  },
  tiny: {
    width: 70,
    height: 70,
    bottom: 40,
    right: 30,
  },
});
