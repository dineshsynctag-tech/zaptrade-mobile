import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { fonts, radius, spacing, TOUCH_TARGET, typography } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { Icon } from './icon';

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

/** Translucent search pill for use on the gradient header. */
export function SearchField({ value, onChangeText, placeholder = 'Search symbol' }: SearchFieldProps) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.field}>
      <Icon name="search" size={18} color={colors.textOnGradientMuted} />
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(t.toUpperCase())}
        placeholder={placeholder}
        placeholderTextColor={colors.textOnGradientMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search by symbol"
        style={[styles.input, { color: colors.textOnGradient }]}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChangeText('')}
          hitSlop={10}>
          <Icon name="close" size={18} color={colors.textOnGradientMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    // Neutral translucency works over any part of the brand gradient.
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  input: {
    flex: 1,
    ...typography.body,
    fontFamily: fonts.medium,
    paddingVertical: spacing.sm,
  },
});
