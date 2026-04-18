/**
 * HijriConverter
 * ──────────────
 * Self-contained Gregorian ↔ Hijri calendar conversion.
 * Uses the Kuwaiti Algorithm (widely adopted, matches Umm al-Qura for most dates).
 * No external dependencies required.
 */

export interface HijriDate {
  year: number;
  month: number;   // 1–12
  day: number;
  monthName: string;
  monthNameAr: string;
}

export interface GregorianDate {
  year: number;
  month: number;   // 1–12
  day: number;
}

export type SeasonalTag =
  | 'ramadan' | 'eid_fitr' | 'eid_adha'
  | 'national_day' | 'founding_day' | 'hajj_season' | 'custom';

interface HijriSeasonRange {
  hijriMonth: number;
  startDay: number;
  endDay: number;
  endMonth?: number;  // if season spans month boundary
}

const HIJRI_MONTH_NAMES_EN = [
  '', 'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

const HIJRI_MONTH_NAMES_AR = [
  '', 'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

/** Seasonal tag → Hijri month/day ranges */
const SEASONAL_RANGES: Record<Exclude<SeasonalTag, 'custom'>, HijriSeasonRange> = {
  ramadan:       { hijriMonth: 9,  startDay: 1,  endDay: 29 },
  eid_fitr:      { hijriMonth: 10, startDay: 1,  endDay: 3  },
  hajj_season:   { hijriMonth: 12, startDay: 1,  endDay: 13 },
  eid_adha:      { hijriMonth: 12, startDay: 10, endDay: 13 },
  // Fixed Gregorian dates — returned as Gregorian ranges directly
  national_day:  { hijriMonth: 0,  startDay: 0,  endDay: 0  },  // Sep 23 every year
  founding_day:  { hijriMonth: 0,  startDay: 0,  endDay: 0  },  // Feb 22 every year
};

export class HijriConverter {

  // ── Gregorian → Hijri ───────────────────────────────────────────────────

  gregorianToHijri(year: number, month: number, day: number): HijriDate {
    // Convert Gregorian date to Julian Day Number
    const jd = this.gregorianToJdn(year, month, day);
    return this.jdnToHijri(jd);
  }

  gregorianDateToHijri(date: Date): HijriDate {
    return this.gregorianToHijri(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate()
    );
  }

  // ── Hijri → Gregorian ───────────────────────────────────────────────────

  hijriToGregorian(hYear: number, hMonth: number, hDay: number): GregorianDate {
    const jd = this.hijriToJdn(hYear, hMonth, hDay);
    return this.jdnToGregorian(jd);
  }

  /** Return the Gregorian start and end dates for a seasonal campaign tag. */
  getSeasonGregorianRange(tag: SeasonalTag, gregorianYear: number): { start: GregorianDate; end: GregorianDate } {
    if (tag === 'national_day') {
      return {
        start: { year: gregorianYear, month: 9,  day: 23 },
        end:   { year: gregorianYear, month: 9,  day: 24 },
      };
    }
    if (tag === 'founding_day') {
      return {
        start: { year: gregorianYear, month: 2,  day: 22 },
        end:   { year: gregorianYear, month: 2,  day: 23 },
      };
    }
    if (tag === 'custom') {
      throw new Error('Custom seasons must supply explicit hijriStart/hijriEnd');
    }

    const range = SEASONAL_RANGES[tag];
    // Find the approximate Hijri year for the given Gregorian year
    // (approx: Hijri year ≈ Gregorian year - 622 + Gregorian year/32)
    const approxHijriYear = Math.round(gregorianYear - 622 + (gregorianYear - 622) / 32);

    const startG = this.hijriToGregorian(approxHijriYear, range.hijriMonth, range.startDay);
    const endG   = this.hijriToGregorian(approxHijriYear, range.endMonth ?? range.hijriMonth, range.endDay);

    return { start: startG, end: endG };
  }

  /** Check if a Gregorian date falls within a Hijri date range. */
  isWithinHijriRange(
    date: Date,
    hijriStart: { year: number; month: number; day: number },
    hijriEnd:   { year: number; month: number; day: number }
  ): boolean {
    const jdDate  = this.gregorianToJdn(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    const jdStart = this.hijriToJdn(hijriStart.year, hijriStart.month, hijriStart.day);
    const jdEnd   = this.hijriToJdn(hijriEnd.year, hijriEnd.month, hijriEnd.day);
    return jdDate >= jdStart && jdDate <= jdEnd;
  }

  // ── Month name helpers ──────────────────────────────────────────────────

  getMonthNameEn(month: number): string { return HIJRI_MONTH_NAMES_EN[month] ?? ''; }
  getMonthNameAr(month: number): string { return HIJRI_MONTH_NAMES_AR[month] ?? ''; }

  // ── Core JDN algorithms ─────────────────────────────────────────────────

  private gregorianToJdn(y: number, m: number, d: number): number {
    const a = Math.floor((14 - m) / 12);
    const yr = y + 4800 - a;
    const mo = m + 12 * a - 3;
    return d + Math.floor((153 * mo + 2) / 5) + 365 * yr +
           Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
  }

  private jdnToGregorian(jd: number): GregorianDate {
    const a = jd + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor((146097 * b) / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor((1461 * d) / 4);
    const m = Math.floor((5 * e + 2) / 153);
    return {
      day:   e - Math.floor((153 * m + 2) / 5) + 1,
      month: m + 3 - 12 * Math.floor(m / 10),
      year:  100 * b + d - 4800 + Math.floor(m / 10),
    };
  }

  private hijriToJdn(hY: number, hM: number, hD: number): number {
    return hD + Math.ceil(29.5 * (hM - 1)) + (hY - 1) * 354 +
           Math.floor((3 + 11 * hY) / 30) + 1948439 - 385;
  }

  private jdnToHijri(jd: number): HijriDate {
    const l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    const l1 = l - 10631 * n + 354;
    const j =
      Math.floor((10985 - l1) / 5316) * Math.floor((50 * l1) / 17719) +
      Math.floor(l1 / 5670) * Math.floor((43 * l1) / 15238);
    const l2 =
      l1 -
      Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
      29;
    const month = Math.floor((24 * l2) / 709);
    const day   = l2 - Math.floor((709 * month) / 24);
    const year  = 30 * n + j - 30;
    return {
      year,
      month,
      day,
      monthName:   HIJRI_MONTH_NAMES_EN[month] ?? '',
      monthNameAr: HIJRI_MONTH_NAMES_AR[month] ?? '',
    };
  }
}

export const hijriConverter = new HijriConverter();
