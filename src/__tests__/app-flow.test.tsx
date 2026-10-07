/**
 * Integration smoke test: real routes + mock backend.
 * Welcome → Sign in → Orders (Open) shows the seeded orders.
 */
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

jest.setTimeout(30_000);

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
  });
});
