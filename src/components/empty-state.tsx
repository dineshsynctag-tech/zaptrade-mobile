import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/theme';
import { AppText } from './app-text';

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <View style={styles.container}>
      <AppText variant="heading" weight="semibold">
        {title}
      </AppText>
      {message ? (
        <AppText variant="label" tone="muted" style={styles.message}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
  },
  message: {
    textAlign: 'center',
  },
});
