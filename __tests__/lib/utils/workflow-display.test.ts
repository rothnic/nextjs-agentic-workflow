import {
  getStatusColor,
  getStatusIcon,
  formatDuration,
  getSuccessColor,
} from '@/lib/utils/workflow-display';

describe('Workflow Display Utilities', () => {
  describe('getStatusColor', () => {
    it('should return green for completed status', () => {
      expect(getStatusColor('completed')).toBe('text-green-600 dark:text-green-400');
    });

    it('should return blue for running status', () => {
      expect(getStatusColor('running')).toBe('text-blue-600 dark:text-blue-400');
    });

    it('should return red for failed status', () => {
      expect(getStatusColor('failed')).toBe('text-red-600 dark:text-red-400');
    });

    it('should return gray for pending status', () => {
      expect(getStatusColor('pending')).toBe('text-gray-600 dark:text-gray-400');
    });
  });

  describe('getStatusIcon', () => {
    it('should return checkmark for completed status', () => {
      expect(getStatusIcon('completed')).toBe('✓');
    });

    it('should return rotating arrow for running status', () => {
      expect(getStatusIcon('running')).toBe('⟳');
    });

    it('should return X for failed status', () => {
      expect(getStatusIcon('failed')).toBe('✗');
    });

    it('should return circle for pending status', () => {
      expect(getStatusIcon('pending')).toBe('○');
    });
  });

  describe('formatDuration', () => {
    it('should format duration in seconds with one decimal place', () => {
      const start = 1000;
      const end = 3500;

      expect(formatDuration(start, end)).toBe('2.5s');
    });

    it('should use current time if end is not provided', () => {
      const start = Date.now() - 1000; // 1 second ago

      const result = formatDuration(start);

      // Should be approximately 1.0s (allowing some variance)
      expect(result).toMatch(/^1\.\d+s$/);
    });

    it('should handle zero duration', () => {
      const time = 1000;

      expect(formatDuration(time, time)).toBe('0.0s');
    });

    it('should handle long durations', () => {
      const start = 1000;
      const end = 11000; // 10 seconds

      expect(formatDuration(start, end)).toBe('10.0s');
    });

    it('should round to one decimal place', () => {
      const start = 1000;
      const end = 1234; // 0.234 seconds

      expect(formatDuration(start, end)).toBe('0.2s');
    });
  });

  describe('getSuccessColor', () => {
    it('should return green for success', () => {
      expect(getSuccessColor(true)).toBe('text-green-600 dark:text-green-400');
    });

    it('should return red for failure', () => {
      expect(getSuccessColor(false)).toBe('text-red-600 dark:text-red-400');
    });
  });
});
