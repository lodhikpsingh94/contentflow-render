/**
 * PrayerTimeService
 * ─────────────────
 * Self-contained prayer time calculator using the Umm al-Qura / Islamic Society
 * of North America (ISNA) astronomical algorithm — no external dependencies.
 *
 * Saudi Arabia uses the Umm al-Qura calculation method:
 *   Fajr:  Sun angle 18.5° below horizon
 *   Isha:  Fixed 90 minutes after Maghrib (official Saudi practice)
 *
 * Returns UTC times so they can be compared against any system clock.
 */

import { logger } from '../utils/logger';

export interface PrayerWindow {
  name: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  startUtc: Date;
  endUtc: Date;
  durationMinutes: number;
}

export interface DailyPrayerTimes {
  date: string;          // "YYYY-MM-DD"
  city: string;
  timezone: string;      // "Asia/Riyadh" — UTC+3
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;         // = sunset
  isha: Date;
  windows: PrayerWindow[];
}

// ─── Saudi city coordinates ───────────────────────────────────────────────────
const SAUDI_CITIES: Record<string, { lat: number; lng: number; tz: number }> = {
  riyadh:  { lat: 24.6877,  lng: 46.7219,  tz: 3 },
  jeddah:  { lat: 21.5433,  lng: 39.1728,  tz: 3 },
  mecca:   { lat: 21.3891,  lng: 39.8579,  tz: 3 },
  medina:  { lat: 24.5247,  lng: 39.5692,  tz: 3 },
  dammam:  { lat: 26.4207,  lng: 50.0888,  tz: 3 },
  khobar:  { lat: 26.2172,  lng: 50.1971,  tz: 3 },
  tabuk:   { lat: 28.3838,  lng: 36.5550,  tz: 3 },
  abha:    { lat: 18.2164,  lng: 42.5053,  tz: 3 },
  taif:    { lat: 21.2703,  lng: 40.4158,  tz: 3 },
};

// Prayer window duration in minutes (used for end-time calculation)
const PRAYER_DURATIONS: Record<string, number> = {
  fajr:    25,
  dhuhr:   20,
  asr:     20,
  maghrib: 20,
  isha:    25,
};

export class PrayerTimeService {

  /**
   * Get prayer times for a city on a specific date (defaults to today).
   * Returns times as UTC Date objects.
   */
  getPrayerTimes(city: string, date: Date = new Date()): DailyPrayerTimes {
    const key = city.toLowerCase().trim();
    const cityData = SAUDI_CITIES[key] ?? SAUDI_CITIES['riyadh'];
    const { lat, lng, tz } = cityData;

    const { fajr, sunrise, dhuhr, asr, maghrib, isha } =
      this.computeTimes(lat, lng, tz, date);

    const windows: PrayerWindow[] = [
      { name: 'fajr',    startUtc: fajr,    endUtc: this.addMinutes(fajr,    PRAYER_DURATIONS.fajr),    durationMinutes: PRAYER_DURATIONS.fajr },
      { name: 'dhuhr',   startUtc: dhuhr,   endUtc: this.addMinutes(dhuhr,   PRAYER_DURATIONS.dhuhr),   durationMinutes: PRAYER_DURATIONS.dhuhr },
      { name: 'asr',     startUtc: asr,     endUtc: this.addMinutes(asr,     PRAYER_DURATIONS.asr),     durationMinutes: PRAYER_DURATIONS.asr },
      { name: 'maghrib', startUtc: maghrib, endUtc: this.addMinutes(maghrib, PRAYER_DURATIONS.maghrib), durationMinutes: PRAYER_DURATIONS.maghrib },
      { name: 'isha',    startUtc: isha,    endUtc: this.addMinutes(isha,    PRAYER_DURATIONS.isha),    durationMinutes: PRAYER_DURATIONS.isha },
    ];

    return {
      date: this.formatDate(date),
      city: key,
      timezone: 'Asia/Riyadh',
      fajr, sunrise, dhuhr, asr, maghrib, isha,
      windows,
    };
  }

  /**
   * Returns true if `checkTime` (UTC, defaults to now) falls within any prayer window
   * for the given city.
   */
  isCurrentlyPrayerTime(city: string, checkTime: Date = new Date()): boolean {
    const times = this.getPrayerTimes(city, checkTime);
    return times.windows.some(
      w => checkTime >= w.startUtc && checkTime <= w.endUtc
    );
  }

  /**
   * Returns which prayer window is active right now (or null if none).
   */
  getActivePrayerWindow(city: string, checkTime: Date = new Date()): PrayerWindow | null {
    const times = this.getPrayerTimes(city, checkTime);
    return times.windows.find(w => checkTime >= w.startUtc && checkTime <= w.endUtc) ?? null;
  }

  /**
   * Returns all prayer windows for today for API exposure.
   */
  getTodayWindows(city: string): PrayerWindow[] {
    return this.getPrayerTimes(city).windows;
  }

  // ── Core astronomical calculation ────────────────────────────────────────

  private computeTimes(
    lat: number, lng: number, tzOffset: number, date: Date
  ): { fajr: Date; sunrise: Date; dhuhr: Date; asr: Date; maghrib: Date; isha: Date } {

    const jd = this.julianDay(date);
    const D  = jd - 2451545.0;     // Days since J2000.0

    // Sun mean longitude and mean anomaly (degrees)
    const g = 357.529 + 0.98560028 * D;
    const q = 280.459 + 0.98564736 * D;
    const L = q + 1.915 * this.sin(g) + 0.020 * this.sin(2 * g);

    // Sun declination and right ascension
    const e  = 23.439 - 0.00000036 * D;
    const RA = this.atan2(this.cos(e) * this.sin(L), this.cos(L)) / 15;
    const decl = this.asin(this.sin(e) * this.sin(L));

    // Equation of time (minutes)
    const EqT = q / 15 - this.fixHour(RA);

    // Solar noon (local time in fractional hours)
    const Dhuhr = 12 - lng / 15 - EqT;

    // Hour angle for a given elevation
    const hourAngle = (elev: number) => {
      const cosH = (this.sin(elev) - this.sin(lat) * this.sin(decl))
                 / (this.cos(lat) * this.cos(decl));
      if (cosH < -1) return 180;
      if (cosH > 1)  return 0;
      return this.acos(cosH);
    };

    // ── Prayer times (fractional UTC hours on the day) ───────────────────
    const sunriseAngle  = -0.8333;   // Standard sunrise/sunset (refraction correction)
    const fajrAngle     = -18.5;     // Umm al-Qura Fajr angle
    const asrShadowRatio = 1;        // Shafi'i school (shadow = 1× object length)

    const Fajr    = Dhuhr - hourAngle(fajrAngle) / 15;
    const Sunrise = Dhuhr - hourAngle(sunriseAngle) / 15;
    const Asr     = Dhuhr + this.asrHourAngle(asrShadowRatio, lat, decl) / 15;
    const Sunset  = Dhuhr + hourAngle(sunriseAngle) / 15;   // Maghrib = Sunset
    const Isha    = Sunset + 90 / 60;   // Umm al-Qura: 90 minutes after Maghrib

    // Convert fractional hours → UTC Date
    const toDate = (h: number) => this.fracHoursToUtcDate(date, h, tzOffset);

    return {
      fajr:    toDate(Fajr),
      sunrise: toDate(Sunrise),
      dhuhr:   toDate(Dhuhr),
      asr:     toDate(Asr),
      maghrib: toDate(Sunset),
      isha:    toDate(Isha),
    };
  }

  /** Asr hour angle based on shadow ratio (Shafi'i = 1, Hanafi = 2) */
  private asrHourAngle(shadowRatio: number, lat: number, decl: number): number {
    const x = shadowRatio + Math.tan(Math.abs(lat - decl) * Math.PI / 180);
    const cosH = 1 / x;
    return this.acos(cosH);
  }

  // ── Julian Day Number ────────────────────────────────────────────────────

  private julianDay(date: Date): number {
    const Y = date.getUTCFullYear();
    const M = date.getUTCMonth() + 1;
    const D = date.getUTCDate();
    if (M <= 2) { /* Y -= 1; M += 12; */ }
    const A = Math.floor(Y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private sin(d: number)  { return Math.sin(d * Math.PI / 180); }
  private cos(d: number)  { return Math.cos(d * Math.PI / 180); }
  private asin(x: number) { return Math.asin(x)  * 180 / Math.PI; }
  private acos(x: number) { return Math.acos(x)  * 180 / Math.PI; }
  private atan2(y: number, x: number) { return Math.atan2(y, x) * 180 / Math.PI; }

  private fixHour(h: number): number {
    h = h - 24 * Math.floor(h / 24);
    return h < 0 ? h + 24 : h;
  }

  /** Convert fractional local hours to UTC Date */
  private fracHoursToUtcDate(baseDate: Date, fracLocalHours: number, tzOffset: number): Date {
    const fixedLocal = this.fixHour(fracLocalHours);
    const utcHours   = fixedLocal - tzOffset;
    const ms = Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      0, 0, 0, 0
    ) + utcHours * 3_600_000;
    return new Date(ms);
  }

  private addMinutes(d: Date, mins: number): Date {
    return new Date(d.getTime() + mins * 60_000);
  }

  private formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}

export const prayerTimeService = new PrayerTimeService();
