import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { onlineManager } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { queryClient } from '@/api/query-client';
import { ensureOnline } from '@/hooks/use-network-status';

afterEach(() => {
  onlineManager.setOnline(true);
  jest.restoreAllMocks();
});

describe('offline order changes', () => {
  it('ensureOnline blocks and explains when offline', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    onlineManager.setOnline(false);
    expect(ensureOnline()).toBe(false);
    expect(alert).toHaveBeenCalledTimes(1);
  });

  it('ensureOnline passes when online', () => {
    expect(ensureOnline()).toBe(true);
  });

  it('mutations fail fast instead of queueing for later replay', () => {
    expect(queryClient.getDefaultOptions().mutations?.networkMode).toBe('always');
  });
});
