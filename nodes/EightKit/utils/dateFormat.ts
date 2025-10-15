const TOKEN_DEFINITIONS = [
  {
    token: 'yyyy',
    regex: '(\\d{4})',
    apply: (value: string, state: ParsingState) => {
      state.year = Number.parseInt(value, 10);
    },
  },
  {
    token: 'MM',
    regex: '(\\d{2})',
    apply: (value: string, state: ParsingState) => {
      state.month = Number.parseInt(value, 10);
    },
  },
  {
    token: 'dd',
    regex: '(\\d{2})',
    apply: (value: string, state: ParsingState) => {
      state.day = Number.parseInt(value, 10);
    },
  },
  {
    token: 'HH',
    regex: '(\\d{2})',
    apply: (value: string, state: ParsingState) => {
      state.hours = Number.parseInt(value, 10);
    },
  },
  {
    token: 'mm',
    regex: '(\\d{2})',
    apply: (value: string, state: ParsingState) => {
      state.minutes = Number.parseInt(value, 10);
    },
  },
  {
    token: 'ss',
    regex: '(\\d{2})',
    apply: (value: string, state: ParsingState) => {
      state.seconds = Number.parseInt(value, 10);
    },
  },
] as const;

type TokenDefinition = (typeof TOKEN_DEFINITIONS)[number];

interface ParsingState {
  year?: number;
  month?: number;
  day?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

function ensureCustomFormat(format?: string): string {
  if (!format || !format.trim()) {
    throw new Error('Custom format must not be empty.');
  }
  return format.trim();
}

function escapeRegexCharacter(char: string): string {
  return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPatternMatcher(pattern: string): {
  regex: RegExp;
  tokens: TokenDefinition[];
} {
  let regexBuffer = '^';
  const tokensUsed: TokenDefinition[] = [];
  let index = 0;

  while (index < pattern.length) {
    const remaining = pattern.slice(index);
    const matchedToken = TOKEN_DEFINITIONS.find((tokenDef) => remaining.startsWith(tokenDef.token));

    if (matchedToken) {
      regexBuffer += matchedToken.regex;
      tokensUsed.push(matchedToken);
      index += matchedToken.token.length;
      continue;
    }

    regexBuffer += escapeRegexCharacter(pattern[index]);
    index += 1;
  }

  regexBuffer += '$';
  return { regex: new RegExp(regexBuffer), tokens: tokensUsed };
}

function parseWithPattern(dateString: string, pattern: string): Date {
  const { regex, tokens } = buildPatternMatcher(pattern);
  const match = dateString.match(regex);

  if (!match) {
    throw new Error(`Date string "${dateString}" does not match format "${pattern}".`);
  }

  const state: ParsingState = {};

  tokens.forEach((tokenDef, index) => {
    const value = match[index + 1];
    tokenDef.apply(value, state);
  });

  const { year, month, day } = state;

  if (year === undefined || month === undefined || day === undefined) {
    throw new Error('Format must include tokens for year (yyyy), month (MM), and day (dd).');
  }

  if (month < 1 || month > 12) {
    throw new Error(`Month value "${month}" is out of range. Expected 01-12.`);
  }

  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > maxDay) {
    throw new Error(`Day value "${day}" is out of range for month ${month}.`);
  }

  const hours = state.hours ?? 0;
  const minutes = state.minutes ?? 0;
  const seconds = state.seconds ?? 0;

  if (hours < 0 || hours > 23) {
    throw new Error(`Hour value "${hours}" is out of range. Expected 00-23.`);
  }
  if (minutes < 0 || minutes > 59) {
    throw new Error(`Minute value "${minutes}" is out of range. Expected 00-59.`);
  }
  if (seconds < 0 || seconds > 59) {
    throw new Error(`Second value "${seconds}" is out of range. Expected 00-59.`);
  }

  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
}

function formatWithPattern(date: Date, pattern: string): string {
  const replacements: Record<string, string> = {
    yyyy: String(date.getUTCFullYear()).padStart(4, '0'),
    MM: String(date.getUTCMonth() + 1).padStart(2, '0'),
    dd: String(date.getUTCDate()).padStart(2, '0'),
    HH: String(date.getUTCHours()).padStart(2, '0'),
    mm: String(date.getUTCMinutes()).padStart(2, '0'),
    ss: String(date.getUTCSeconds()).padStart(2, '0'),
  };

  return Object.keys(replacements)
    .sort((a, b) => b.length - a.length)
    .reduce((acc, token) => acc.replace(new RegExp(token, 'g'), replacements[token]), pattern);
}

export function parseDateWithFormat(
  dateString: string,
  format: string,
  customFormat?: string
): Date {
  const trimmed = dateString.trim();

  if (format === 'unix-ms') {
    return new Date(Number.parseInt(trimmed, 10));
  }

  if (format === 'unix-s') {
    return new Date(Number.parseInt(trimmed, 10) * 1000);
  }

  if (format === 'iso8601-tz' || format === 'iso8601-utc') {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Date string "${dateString}" is not a valid ISO-8601 value.`);
    }
    return parsed;
  }

  const pattern = format === 'custom' ? ensureCustomFormat(customFormat) : format;
  return parseWithPattern(trimmed, pattern);
}

/**
 * Helper function to get date components in a specific timezone using Intl.DateTimeFormat
 */
function getDateComponentsInTimezone(
  date: Date,
  timezone: string
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    fractionalSecondDigits: 3,
  });

  const parts = formatter.formatToParts(date);
  const getValue = (type: string) => {
    const part = parts.find((p) => p.type === type);
    return part ? part.value : '0';
  };

  return {
    year: parseInt(getValue('year'), 10),
    month: parseInt(getValue('month'), 10),
    day: parseInt(getValue('day'), 10),
    hour: parseInt(getValue('hour'), 10),
    minute: parseInt(getValue('minute'), 10),
    second: parseInt(getValue('second'), 10),
    ms: parseInt(getValue('fractionalSecond') || '0', 10),
  };
}

/**
 * Helper function to calculate timezone offset for a specific timezone at a given date
 * Returns offset in minutes (positive for east of UTC, negative for west)
 */
function getTimezoneOffset(date: Date, timezone: string): number {
  // Format the date in both UTC and target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const tzParts = formatter.formatToParts(date);
  const utcParts = utcFormatter.formatToParts(date);

  const getValue = (parts: Intl.DateTimeFormatPart[], type: string) => {
    const part = parts.find((p) => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };

  const tzYear = getValue(tzParts, 'year');
  const tzMonth = getValue(tzParts, 'month');
  const tzDay = getValue(tzParts, 'day');
  const tzHour = getValue(tzParts, 'hour');
  const tzMinute = getValue(tzParts, 'minute');

  const utcYear = getValue(utcParts, 'year');
  const utcMonth = getValue(utcParts, 'month');
  const utcDay = getValue(utcParts, 'day');
  const utcHour = getValue(utcParts, 'hour');
  const utcMinute = getValue(utcParts, 'minute');

  // Create dates from components and calculate difference
  const tzTime = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute);
  const utcTime = Date.UTC(utcYear, utcMonth - 1, utcDay, utcHour, utcMinute);

  // Offset in minutes (timezone is ahead of UTC = positive offset)
  return Math.round((tzTime - utcTime) / (1000 * 60));
}

/**
 * Formats a Date object according to the specified format and timezone settings
 *
 * @param date - The Date object to format
 * @param format - The output format ('iso8601-tz', 'iso8601-utc', 'unix-ms', 'unix-s', 'custom', or a pattern like 'yyyy-MM-dd')
 * @param customFormat - Custom format pattern (required when format is 'custom')
 * @param useUtcTimezone - If true, use UTC timezone (+00:00); if false, use n8n timezone
 * @param n8nTomezone - IANA timezone string (e.g., 'America/Lima', 'Europe/London') - used when useUtcTimezone is false
 * @returns Formatted date string
 *
 * Behavior:
 * - When useUtcTimezone=true: Always outputs in UTC (+00:00), ignoring n8nTomezone
 * - When useUtcTimezone=false: Outputs in the timezone specified by n8nTomezone (e.g., 'America/Lima' → -05:00)
 */
export function formatDateWithFormat(
  date: Date,
  format: string,
  customFormat?: string,
  useUtcTimezone?: boolean,
  n8nTomezone?: string
): string {
  if (format === 'iso8601-tz') {
    // Determine timezone offset and date components based on useUtcTimezone flag
    let tzOffset: number; // in minutes
    let year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
      ms: number;

    if (useUtcTimezone) {
      // Use UTC timezone (+00:00)
      tzOffset = 0;
      year = date.getUTCFullYear();
      month = date.getUTCMonth() + 1;
      day = date.getUTCDate();
      hour = date.getUTCHours();
      minute = date.getUTCMinutes();
      second = date.getUTCSeconds();
      ms = date.getUTCMilliseconds();
    } else {
      // Use n8n timezone (from n8nTomezone parameter)
      const timezone = n8nTomezone || 'UTC';

      try {
        const components = getDateComponentsInTimezone(date, timezone);
        year = components.year;
        month = components.month;
        day = components.day;
        hour = components.hour;
        minute = components.minute;
        second = components.second;
        ms = components.ms;

        tzOffset = getTimezoneOffset(date, timezone);
      } catch (error: any) {
        console.error('Error getting date components in timezone', error);
        // Fallback to UTC if timezone is invalid
        tzOffset = 0;
        year = date.getUTCFullYear();
        month = date.getUTCMonth() + 1;
        day = date.getUTCDate();
        hour = date.getUTCHours();
        minute = date.getUTCMinutes();
        second = date.getUTCSeconds();
        ms = date.getUTCMilliseconds();
      }
    }

    const diff = tzOffset >= 0 ? '+' : '-';
    const pad = (n: number) => `${Math.floor(Math.abs(n) / 10) ? '' : '0'}${Math.abs(n)}`;
    const hours = pad(Math.floor(Math.abs(tzOffset) / 60));
    const minutes = pad(Math.abs(tzOffset) % 60);

    return (
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T` +
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.` +
      `${String(ms).padStart(3, '0')}${diff}${hours}:${minutes}`
    );
  }

  if (format === 'iso8601-utc') {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  if (format === 'unix-ms') {
    return date.getTime().toString();
  }

  if (format === 'unix-s') {
    return Math.floor(date.getTime() / 1000).toString();
  }

  const pattern = format === 'custom' ? ensureCustomFormat(customFormat) : format;

  // formatWithPattern uses UTC methods, so for local timezone we need to use local methods
  if (useUtcTimezone) {
    // Use UTC (formatWithPattern already uses UTC methods)
    return formatWithPattern(date, pattern);
  } else {
    // Use n8n timezone (from n8nTomezone parameter)
    const timezone = n8nTomezone || 'UTC';

    try {
      const components = getDateComponentsInTimezone(date, timezone);

      const replacements: Record<string, string> = {
        yyyy: String(components.year).padStart(4, '0'),
        MM: String(components.month).padStart(2, '0'),
        dd: String(components.day).padStart(2, '0'),
        HH: String(components.hour).padStart(2, '0'),
        mm: String(components.minute).padStart(2, '0'),
        ss: String(components.second).padStart(2, '0'),
      };

      return Object.keys(replacements)
        .sort((a, b) => b.length - a.length)
        .reduce((acc, token) => acc.replace(new RegExp(token, 'g'), replacements[token]), pattern);
    } catch (error: any) {
      console.error('Error getting date components in timezone', error);
      // Fallback to UTC if timezone is invalid
      return formatWithPattern(date, pattern);
    }
  }
}
