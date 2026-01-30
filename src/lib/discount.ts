// Helpers for discount period parsing / validation
// discount_period format: "MM/DD - MM/DD" (e.g., "12/01 - 12/14")

const getSeoulYMD = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
};

const toYmdKey = (y: number, m: number, d: number) => y * 10000 + m * 100 + d;

export const parseDiscountPeriod = (discountPeriod?: string): { start: Date; end: Date } | null => {
  if (!discountPeriod) return null;

  // Format 1: "YY.MM.DD ~ YY.MM.DD" (e.g., "26.01.05 ~ 26.01.19")
  const tildeFormatMatch = discountPeriod.match(/(\d{2})\.(\d{2})\.(\d{2})\s*~\s*(\d{2})\.(\d{2})\.(\d{2})/);
  if (tildeFormatMatch) {
    const startYear = 2000 + Number(tildeFormatMatch[1]);
    const startMonth = Number(tildeFormatMatch[2]);
    const startDay = Number(tildeFormatMatch[3]);
    const endYear = 2000 + Number(tildeFormatMatch[4]);
    const endMonth = Number(tildeFormatMatch[5]);
    const endDay = Number(tildeFormatMatch[6]);

    if (
      startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12 ||
      startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31
    ) {
      return null;
    }

    return {
      start: new Date(startYear, startMonth - 1, startDay),
      end: new Date(endYear, endMonth - 1, endDay)
    };
  }

  // Format 2: "YY.MM.DD - YY.MM.DD" (e.g., "25.12.01 - 25.12.14") - dash instead of tilde
  const dashDotFormatMatch = discountPeriod.match(/(\d{2})\.(\d{2})\.(\d{2})\s*-\s*(\d{2})\.(\d{2})\.(\d{2})/);
  if (dashDotFormatMatch) {
    const startYear = 2000 + Number(dashDotFormatMatch[1]);
    const startMonth = Number(dashDotFormatMatch[2]);
    const startDay = Number(dashDotFormatMatch[3]);
    const endYear = 2000 + Number(dashDotFormatMatch[4]);
    const endMonth = Number(dashDotFormatMatch[5]);
    const endDay = Number(dashDotFormatMatch[6]);

    if (
      startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12 ||
      startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31
    ) {
      return null;
    }

    return {
      start: new Date(startYear, startMonth - 1, startDay),
      end: new Date(endYear, endMonth - 1, endDay)
    };
  }

  // Format 3: "MM/DD - MM/DD" (e.g., "12/01 - 12/14") - legacy format
  const legacyMatch = discountPeriod.match(/(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})/);
  if (legacyMatch) {
    const startMonth = Number(legacyMatch[1]);
    const startDay = Number(legacyMatch[2]);
    const endMonth = Number(legacyMatch[3]);
    const endDay = Number(legacyMatch[4]);

    if (
      !startMonth || !startDay || !endMonth || !endDay ||
      startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12 ||
      startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31
    ) {
      return null;
    }

    const { year } = getSeoulYMD();
    
    const startMd = startMonth * 100 + startDay;
    const endMd = endMonth * 100 + endDay;

    let startYear = year;
    let endYear = year;

    // Handles wrap (e.g., "12/20 - 01/05")
    if (endMd < startMd) {
      const { month, day } = getSeoulYMD();
      const todayMd = month * 100 + day;
      if (todayMd >= startMd) {
        endYear = year + 1;
      } else {
        startYear = year - 1;
      }
    }

    return {
      start: new Date(startYear, startMonth - 1, startDay),
      end: new Date(endYear, endMonth - 1, endDay)
    };
  }

  return null;
};

export const isDiscountPeriodActiveKST = (discountPeriod?: string): boolean => {
  const parsed = parseDiscountPeriod(discountPeriod);
  if (!parsed) return false;

  const { year, month, day } = getSeoulYMD();
  const todayYmd = toYmdKey(year, month, day);
  
  const startYmd = toYmdKey(parsed.start.getFullYear(), parsed.start.getMonth() + 1, parsed.start.getDate());
  const endYmd = toYmdKey(parsed.end.getFullYear(), parsed.end.getMonth() + 1, parsed.end.getDate());

  return todayYmd >= startYmd && todayYmd <= endYmd;
};

// Format any discount_period to standardized "YY.MM.DD - YY.MM.DD" format
export const formatDiscountPeriod = (discountPeriod?: string | null): string | null => {
  if (!discountPeriod) return null;

  const parsed = parseDiscountPeriod(discountPeriod);
  if (!parsed) return discountPeriod; // Return original if can't parse

  const pad = (n: number) => String(n).padStart(2, '0');
  const startStr = `${String(parsed.start.getFullYear()).slice(-2)}.${pad(parsed.start.getMonth() + 1)}.${pad(parsed.start.getDate())}`;
  const endStr = `${String(parsed.end.getFullYear()).slice(-2)}.${pad(parsed.end.getMonth() + 1)}.${pad(parsed.end.getDate())}`;

  return `${startStr} - ${endStr}`;
};

// Get discount period start date as a sortable key (YYMMDD number)
export const getDiscountStartKey = (discountPeriod?: string | null): number | null => {
  if (!discountPeriod) return null;

  const parsed = parseDiscountPeriod(discountPeriod);
  if (!parsed) return null;

  const yy = parsed.start.getFullYear() % 100;
  const mm = parsed.start.getMonth() + 1;
  const dd = parsed.start.getDate();

  return yy * 10000 + mm * 100 + dd;
};

// Get discount period start date as display string "YY.MM.DD"
export const getDiscountStartDisplay = (discountPeriod?: string | null): string | null => {
  if (!discountPeriod) return null;

  const parsed = parseDiscountPeriod(discountPeriod);
  if (!parsed) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  const yy = String(parsed.start.getFullYear()).slice(-2);
  const mm = pad(parsed.start.getMonth() + 1);
  const dd = pad(parsed.start.getDate());

  return `${yy}.${mm}.${dd}`;
};
