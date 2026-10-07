/**
 * Integration smoke test: real routes + mock backend.
 * Welcome → Sign in → Orders (Open) shows the seeded orders → add an order.
 */
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';
import { renderRouter } from 'expo-router/testing-library';

jest.setTimeout(30_000);

// No native notifications module under Jest: permission denied, no taps.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: '' })),
  scheduleNotificationAsync: jest.fn(async () => ''),
  useLastNotificationResponse: () => null,
  AndroidImportance: { HIGH: 4 },
}));

describe('app flow (mock mode)', () => {
  it('signs in and lists open orders with server-computed sell prices', async () => {
    renderRouter('./src/app', { initialUrl: '/' });

    // Signed out → guarded to the welcome screen.
    fireEvent.press(await screen.findByText('SIGN IN', {}, { timeout: 10_000 }));

    // Mock mode pre-fills the demo email.
    expect(await screen.findByDisplayValue('demo@zaptrade.ai')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Password'), 'demo1234');
    fireEvent.press(screen.getByText('SIGN IN'));

    expect(await screen.findByText('Manual Bot', {}, { timeout: 10_000 })).toBeTruthy();
    expect(await screen.findByText('AXON', {}, { timeout: 10_000 })).toBeTruthy();
    // AXON filled at 468.00 with 0.25% → 469.17
    expect(screen.getByText('$469.17')).toBeTruthy();
    // Gap-down: TSLA planned 250.00, filled 247.30
    expect(screen.getByText('Filled below plan by $2.70')).toBeTruthy();
    expect(screen.getAllByText('Awaiting buy fill').length).toBeGreaterThan(0);
    // (Open/history split is covered in mock-api.test.ts — NativeTabs mounts
    // every tab in tests, so History's rows are rendered here too.)

    // --- Add an order through the form ---
    // Auto-confirm native dialogs, recording their text.
    const dialogs: string[] = [];
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons?: AlertButton[]) => {
      dialogs.push(`${title}\n${message}`);
      buttons?.[buttons.length - 1]?.onPress?.();
    });

    fireEvent.press(screen.getByLabelText('Add order'));
    fireEvent.changeText(await screen.findByLabelText('Symbol', {}, { timeout: 10_000 }), 'msft');
    fireEvent.changeText(screen.getByLabelText('Qty'), '3');
    fireEvent.changeText(screen.getByLabelText('Buy Price ($)'), '400');
    // Live preview from the planned buy at the default 0.25%.
    expect(screen.getByText('$401.00')).toBeTruthy();
    expect(screen.getByText('$1,200.00')).toBeTruthy();

    fireEvent.press(screen.getByText('REVIEW ORDER'));
    expect(await screen.findByText('MSFT', {}, { timeout: 10_000 })).toBeTruthy();
    expect(dialogs[0]).toContain('Place MSFT order?');
    expect(dialogs[0]).toContain('Buy limit: $400.00 (day order)');
    expect(dialogs[0]).toContain('est. sell $401.00');
  });
});
