import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fonts, spacing, TOUCH_TARGET, typography } from '@/theme/theme';
import { useAppTheme } from '@/theme/use-app-theme';
import { AppText } from './app-text';
import { Icon } from './icon';

interface UnderlineInputProps extends TextInputProps {
  label: string;
  /** Show a check mark when the value is valid. */
  valid?: boolean;
  error?: string | null;
  /** Adds a show/hide toggle and masks the value. */
  secureToggle?: boolean;
}

export const UnderlineInput = forwardRef<TextInput, UnderlineInputProps>(function UnderlineInput(
  { label, valid, error, secureToggle, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const lineColor = error ? colors.danger : focused ? colors.accent : colors.border;

  return (
    <View style={styles.container}>
      <AppText variant="caption" weight="semibold" tone="accent">
        {label}
      </AppText>
      <View style={[styles.row, { borderBottomColor: lineColor }]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          {...rest}
          secureTextEntry={secureToggle ? hidden : rest.secureTextEntry}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: colors.text }, style]}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
            onPress={() => setHidden((h) => !h)}
            style={styles.trailing}>
            <Icon name={hidden ? 'eye' : 'eyeOff'} color={colors.textMuted} />
          </Pressable>
        ) : valid ? (
          <View style={styles.trailing}>
            <Icon name="check" color={colors.accent} />
          </View>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.xxs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    minHeight: TOUCH_TARGET,
  },
  input: {
    flex: 1,
    ...typography.body,
    fontFamily: fonts.medium,
    paddingVertical: spacing.sm,
  },
  trailing: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
