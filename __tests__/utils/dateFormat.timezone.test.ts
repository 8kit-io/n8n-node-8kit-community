import { formatDateWithFormat } from '../../nodes/EightKit/utils/dateFormat';

describe('formatDateWithFormat - Timezone Conversion', () => {
  describe('UTC Mode (useUtcTimezone = true)', () => {
    it('formats date in UTC timezone regardless of n8nTomezone', () => {
      const testDate = new Date('2024-10-14T20:30:45.123Z'); // 8:30 PM UTC

      // Should always use UTC (+00:00) regardless of n8nTomezone parameter
      const result1 = formatDateWithFormat(
        testDate,
        'iso8601-tz',
        undefined,
        true,
        'America/New_York'
      );
      const result2 = formatDateWithFormat(testDate, 'iso8601-tz', undefined, true, 'America/Lima');
      const result3 = formatDateWithFormat(testDate, 'iso8601-tz', undefined, true, 'Asia/Tokyo');

      expect(result1).toBe('2024-10-14T20:30:45.123+00:00');
      expect(result2).toBe('2024-10-14T20:30:45.123+00:00');
      expect(result3).toBe('2024-10-14T20:30:45.123+00:00');
    });

    it('formats custom pattern in UTC timezone', () => {
      const testDate = new Date('2024-10-14T20:30:45.123Z'); // 8:30 PM UTC

      const result = formatDateWithFormat(
        testDate,
        'custom',
        'yyyy-MM-dd HH:mm:ss',
        true, // useUtcTimezone
        'America/New_York'
      );

      expect(result).toBe('2024-10-14 20:30:45');
    });

    it('formats built-in pattern in UTC timezone', () => {
      const testDate = new Date('2024-10-14T20:30:45.123Z');

      const result = formatDateWithFormat(
        testDate,
        'yyyy-MM-dd',
        undefined,
        true, // useUtcTimezone
        'America/Lima'
      );

      expect(result).toBe('2024-10-14');
    });
  });

  describe('N8N Timezone Mode (useUtcTimezone = false)', () => {
    it('formats date in America/New_York timezone (UTC-4 during DST)', () => {
      const testDate = new Date('2024-10-14T20:30:45.123Z'); // 8:30 PM UTC

      const result = formatDateWithFormat(
        testDate,
        'iso8601-tz',
        undefined,
        false, // use n8n timezone
        'America/New_York' // EDT = UTC-4
      );

      // October is DST, so UTC-4
      expect(result).toBe('2024-10-14T16:30:45.123-04:00');
    });

    it('formats date in America/Lima timezone (UTC-5, no DST)', () => {
      const testDate = new Date('2024-10-14T20:30:45.123Z'); // 8:30 PM UTC

      const result = formatDateWithFormat(
        testDate,
        'iso8601-tz',
        undefined,
        false, // use n8n timezone
        'America/Lima' // PET = UTC-5
      );

      // Lima has no DST, always UTC-5
      expect(result).toBe('2024-10-14T15:30:45.123-05:00');
    });

    it('formats date in Asia/Tokyo timezone (UTC+9)', () => {
      const testDate = new Date('2024-10-14T20:30:45.123Z'); // 8:30 PM UTC

      const result = formatDateWithFormat(
        testDate,
        'iso8601-tz',
        undefined,
        false, // use n8n timezone
        'Asia/Tokyo' // JST = UTC+9
      );

      // Tokyo is UTC+9, no DST
      expect(result).toBe('2024-10-15T05:30:45.123+09:00');
    });

    it('formats date in Europe/London timezone (UTC+1 during BST)', () => {
      const testDate = new Date('2024-10-14T20:30:45.123Z'); // 8:30 PM UTC

      const result = formatDateWithFormat(
        testDate,
        'iso8601-tz',
        undefined,
        false, // use n8n timezone
        'Europe/London' // BST = UTC+1
      );

      // October is still BST (until late October), so UTC+1
      expect(result).toBe('2024-10-14T21:30:45.123+01:00');
    });

    it('formats custom pattern in n8n timezone', () => {
      const testDate = new Date('2024-10-14T20:30:45.123Z'); // 8:30 PM UTC

      const result = formatDateWithFormat(
        testDate,
        'custom',
        'yyyy-MM-dd HH:mm:ss',
        false, // use n8n timezone
        'America/Lima' // UTC-5
      );

      // 8:30 PM UTC = 3:30 PM in Lima
      expect(result).toBe('2024-10-14 15:30:45');
    });

    it('handles date crossing day boundary', () => {
      const testDate = new Date('2024-10-14T23:30:45.123Z'); // 11:30 PM UTC

      const result = formatDateWithFormat(
        testDate,
        'iso8601-tz',
        undefined,
        false, // use n8n timezone
        'Asia/Tokyo' // UTC+9
      );

      // 11:30 PM UTC + 9 hours = 8:30 AM next day
      expect(result).toBe('2024-10-15T08:30:45.123+09:00');
    });

    it('handles date crossing day boundary backwards', () => {
      const testDate = new Date('2024-10-15T02:30:45.123Z'); // 2:30 AM UTC

      const result = formatDateWithFormat(
        testDate,
        'iso8601-tz',
        undefined,
        false, // use n8n timezone
        'America/Los_Angeles' // PDT = UTC-7
      );

      // 2:30 AM UTC - 7 hours = 7:30 PM previous day
      expect(result).toBe('2024-10-14T19:30:45.123-07:00');
    });

    it('defaults to UTC when n8nTomezone is not provided', () => {
      const testDate = new Date('2024-10-14T20:30:45.123Z');

      const result = formatDateWithFormat(
        testDate,
        'iso8601-tz',
        undefined,
        false, // use n8n timezone
        undefined // no timezone provided
      );

      // Should default to UTC
      expect(result).toBe('2024-10-14T20:30:45.123+00:00');
    });
  });

  describe('DST (Daylight Saving Time) Handling', () => {
    it('handles DST transition in America/New_York (spring forward)', () => {
      // March 10, 2024 - DST starts in NY (UTC-5 -> UTC-4)
      const beforeDST = new Date('2024-03-10T06:30:00.000Z'); // Before DST
      const afterDST = new Date('2024-03-10T07:30:00.000Z'); // After DST

      const result1 = formatDateWithFormat(
        beforeDST,
        'iso8601-tz',
        undefined,
        false,
        'America/New_York'
      );
      const result2 = formatDateWithFormat(
        afterDST,
        'iso8601-tz',
        undefined,
        false,
        'America/New_York'
      );

      // Should show correct offset for each
      expect(result1).toBe('2024-03-10T01:30:00.000-05:00');
      expect(result2).toBe('2024-03-10T03:30:00.000-04:00');
    });

    it('handles DST transition in Europe/London (spring forward)', () => {
      // March 31, 2024 - BST starts in London (UTC+0 -> UTC+1)
      const beforeDST = new Date('2024-03-31T00:30:00.000Z'); // Before DST
      const afterDST = new Date('2024-03-31T01:30:00.000Z'); // After DST

      const result1 = formatDateWithFormat(
        beforeDST,
        'iso8601-tz',
        undefined,
        false,
        'Europe/London'
      );
      const result2 = formatDateWithFormat(
        afterDST,
        'iso8601-tz',
        undefined,
        false,
        'Europe/London'
      );

      // Should show correct offset for each
      expect(result1).toBe('2024-03-31T00:30:00.000+00:00');
      expect(result2).toBe('2024-03-31T02:30:00.000+01:00');
    });

    it('handles timezone with no DST (America/Lima)', () => {
      const winterDate = new Date('2024-01-15T12:00:00.000Z');
      const summerDate = new Date('2024-07-15T12:00:00.000Z');

      const result1 = formatDateWithFormat(
        winterDate,
        'iso8601-tz',
        undefined,
        false,
        'America/Lima'
      );
      const result2 = formatDateWithFormat(
        summerDate,
        'iso8601-tz',
        undefined,
        false,
        'America/Lima'
      );

      // Lima always UTC-5, no DST
      expect(result1).toBe('2024-01-15T07:00:00.000-05:00');
      expect(result2).toBe('2024-07-15T07:00:00.000-05:00');
    });
  });

  describe('Different Output Formats with Timezones', () => {
    const testDate = new Date('2024-10-14T20:30:45.123Z');

    it('formats iso8601-utc (always UTC)', () => {
      const result1 = formatDateWithFormat(
        testDate,
        'iso8601-utc',
        undefined,
        false,
        'America/Lima'
      );
      const result2 = formatDateWithFormat(
        testDate,
        'iso8601-utc',
        undefined,
        true,
        'America/Lima'
      );

      // iso8601-utc always uses UTC regardless of settings
      expect(result1).toBe('2024-10-14T20:30:45Z');
      expect(result2).toBe('2024-10-14T20:30:45Z');
    });

    it('formats unix-ms (always UTC)', () => {
      const result1 = formatDateWithFormat(testDate, 'unix-ms', undefined, false, 'America/Lima');
      const result2 = formatDateWithFormat(testDate, 'unix-ms', undefined, true, 'America/Lima');

      // Unix timestamps are always UTC
      const expectedTimestamp = testDate.getTime().toString();
      expect(result1).toBe(expectedTimestamp);
      expect(result2).toBe(expectedTimestamp);
    });

    it('formats unix-s (always UTC)', () => {
      const result1 = formatDateWithFormat(testDate, 'unix-s', undefined, false, 'America/Lima');
      const result2 = formatDateWithFormat(testDate, 'unix-s', undefined, true, 'America/Lima');

      // Unix timestamps are always UTC
      const expectedTimestamp = Math.floor(testDate.getTime() / 1000).toString();
      expect(result1).toBe(expectedTimestamp);
      expect(result2).toBe(expectedTimestamp);
    });
  });

  describe('Error Handling', () => {
    it('falls back to UTC when invalid timezone is provided', () => {
      const testDate = new Date('2024-10-14T20:30:45.123Z');

      const result = formatDateWithFormat(
        testDate,
        'iso8601-tz',
        undefined,
        false,
        'Invalid/Timezone'
      );

      // Should fall back to UTC
      expect(result).toBe('2024-10-14T20:30:45.123+00:00');
    });

    it('falls back to UTC for custom format with invalid timezone', () => {
      const testDate = new Date('2024-10-14T20:30:45.123Z');

      const result = formatDateWithFormat(
        testDate,
        'custom',
        'yyyy-MM-dd HH:mm:ss',
        false,
        'BadTimezone'
      );

      // Should fall back to UTC
      expect(result).toBe('2024-10-14 20:30:45');
    });
  });

  describe('Milliseconds Precision', () => {
    it('preserves milliseconds in all timezone modes', () => {
      const testDate = new Date('2024-10-14T20:30:45.123Z');

      const utcResult = formatDateWithFormat(testDate, 'iso8601-tz', undefined, true, 'UTC');
      const nyResult = formatDateWithFormat(
        testDate,
        'iso8601-tz',
        undefined,
        false,
        'America/New_York'
      );
      const tokyoResult = formatDateWithFormat(
        testDate,
        'iso8601-tz',
        undefined,
        false,
        'Asia/Tokyo'
      );

      expect(utcResult).toContain('.123');
      expect(nyResult).toContain('.123');
      expect(tokyoResult).toContain('.123');
    });

    it('handles zero milliseconds', () => {
      const testDate = new Date('2024-10-14T20:30:45.000Z');

      const result = formatDateWithFormat(testDate, 'iso8601-tz', undefined, false, 'America/Lima');

      expect(result).toContain('.000');
    });
  });
});
