import { Alert } from 'react-native';

/** Native two-button confirm dialog as a promise. */
export function confirmAsync(
  title: string,
  message: string,
  confirmLabel: string,
  opts: { destructive?: boolean; cancelLabel?: string } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: opts.cancelLabel ?? 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: opts.destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
