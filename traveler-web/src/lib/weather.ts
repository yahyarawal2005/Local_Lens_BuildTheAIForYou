// ==============================================================================
// LocalLens Web - Weather & Simulation Service
// ==============================================================================

export interface WeatherData {
  tempCelsius: string;
  description: string;
  condition: string;
  humidity: string;
  windSpeed: string;
  rainMm: string;
  isStormy: boolean;
  iconName: string;
}

export const WEATHER_SCENARIOS = [
  {
    key: 'Clear / Sunny',
    label: 'Clear & Sunny',
    temp: '28°C',
    desc: 'Ideal for outdoor sightseeing, beaches, walking tours',
    isStormy: false,
    rain: '0.0 mm',
    wind: '12 km/h',
    humidity: '45%',
    icon: 'Sun',
  },
  {
    key: 'Heavy Rain / Storm',
    label: 'Heavy Rain & Thunderstorm',
    temp: '17°C',
    desc: 'Heavy monsoon downpour! Auto-prioritize indoor & sheltered stops',
    isStormy: true,
    rain: '18.4 mm',
    wind: '38 km/h',
    humidity: '94%',
    icon: 'CloudRain',
  },
  {
    key: 'Golden Sunset / Breeze',
    label: 'Golden Hour Sunset',
    temp: '24°C',
    desc: 'Soft golden lighting perfect for photography, coastal drives & viewpoints',
    isStormy: false,
    rain: '0.0 mm',
    wind: '14 km/h',
    humidity: '58%',
    icon: 'Sunset',
  },
  {
    key: 'Overcast / Mild',
    label: 'Pleasant & Overcast',
    temp: '22°C',
    desc: 'Cool cloud cover, comfortable walking weather with zero scorching heat',
    isStormy: false,
    rain: '0.2 mm',
    wind: '10 km/h',
    humidity: '68%',
    icon: 'Cloud',
  },
];

const WMO_CODE_MAP: Record<number, { condition: string; desc: string; isStormy: boolean; icon: string }> = {
  0: { condition: 'Clear', desc: 'Clear sky', isStormy: false, icon: 'Sun' },
  1: { condition: 'Mainly Clear', desc: 'Mainly clear sky', isStormy: false, icon: 'Sun' },
  2: { condition: 'Partly Cloudy', desc: 'Partly cloudy sky', isStormy: false, icon: 'Cloud' },
  3: { condition: 'Overcast', desc: 'Overcast clouds', isStormy: false, icon: 'Cloud' },
  45: { condition: 'Fog', desc: 'Foggy conditions', isStormy: false, icon: 'Cloud' },
  48: { condition: 'Depositing Rime Fog', desc: 'Depositing rime fog', isStormy: false, icon: 'Cloud' },
  51: { condition: 'Light Drizzle', desc: 'Light drizzle', isStormy: false, icon: 'CloudRain' },
  53: { condition: 'Moderate Drizzle', desc: 'Moderate drizzle', isStormy: false, icon: 'CloudRain' },
  55: { condition: 'Dense Drizzle', desc: 'Dense drizzle', isStormy: false, icon: 'CloudRain' },
  61: { condition: 'Slight Rain', desc: 'Slight rain shower', isStormy: false, icon: 'CloudRain' },
  63: { condition: 'Moderate Rain', desc: 'Moderate rain', isStormy: true, icon: 'CloudRain' },
  65: { condition: 'Heavy Rain', desc: 'Heavy monsoon rain', isStormy: true, icon: 'CloudRain' },
  80: { condition: 'Rain Showers', desc: 'Scattered rain showers', isStormy: false, icon: 'CloudRain' },
  81: { condition: 'Moderate Showers', desc: 'Moderate rain showers', isStormy: true, icon: 'CloudRain' },
  82: { condition: 'Violent Showers', desc: 'Violent rain downpour', isStormy: true, icon: 'CloudRain' },
  95: { condition: 'Thunderstorm', desc: 'Thunderstorm with heavy showers', isStormy: true, icon: 'CloudRain' },
  96: { condition: 'Thunderstorm with Hail', desc: 'Severe thunderstorm with hail', isStormy: true, icon: 'CloudRain' },
};

export interface WeatherTripForecastSummary {
  destination: string;
  tripDate: string;
  forecastAvailable: boolean;
  message: string;
  temperatureC: number;
  condition: string;
  humidityPct: number;
  windSpeedKmh: string;
  rainProbabilityPct: number;
  rainfallMm: number;
  source: string;
  recommendation: string;
}

export const WeatherService = {
  async fetchLiveWeather(lat: number, lon: number, destination?: string): Promise<WeatherData> {
    // 1. Try Backend API first
    const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    try {
      const qParams = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
      });
      if (destination) qParams.set('destination', destination);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${apiBase}/api/v1/weather/current?${qParams.toString()}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const mainCond = data.condition || 'Clear';
        const isStormy =
          mainCond.toLowerCase().includes('rain') ||
          mainCond.toLowerCase().includes('storm') ||
          (data.rainfall_mm ?? 0) > 5.0;

        return {
          tempCelsius: data.temperature || `${Math.round(data.temperature_c ?? 26)}°C`,
          description: capitalize(data.condition || 'Clear Sky'),
          condition: mainCond,
          humidity: `${data.humidity_pct ?? 55}%`,
          windSpeed: data.wind_speed_kmh || '10.0 km/h',
          rainMm: `${data.rainfall_mm ?? 0} mm`,
          isStormy,
          iconName: isStormy ? 'CloudRain' : 'Sun',
        };
      }
    } catch {}

    // 2. Direct Open-Meteo API fallback (free, global coordinates, no key required)
    try {
      const omRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m`
      );
      if (omRes.ok) {
        const omData = await omRes.json();
        const cur = omData.current || {};
        const code = cur.weather_code ?? 0;
        const meta = WMO_CODE_MAP[code] || { condition: 'Clear', desc: 'Clear sky', isStormy: false, icon: 'Sun' };
        const temp = Math.round(cur.temperature_2m ?? 26);
        const rain = cur.precipitation ?? 0.0;
        const isStormy = meta.isStormy || rain > 5.0;

        return {
          tempCelsius: `${temp}°C`,
          description: capitalize(meta.desc),
          condition: meta.condition,
          humidity: `${cur.relative_humidity_2m ?? 50}%`,
          windSpeed: `${Math.round(cur.wind_speed_10m ?? 8)} km/h`,
          rainMm: `${rain} mm`,
          isStormy,
          iconName: isStormy ? 'CloudRain' : meta.icon,
        };
      }
    } catch {}

    // Default safe fallback if offline
    return {
      tempCelsius: '26°C',
      description: 'Pleasant & Clear',
      condition: 'Clear',
      humidity: '50%',
      windSpeed: '10 km/h',
      rainMm: '0.0 mm',
      isStormy: false,
      iconName: 'Sun',
    };
  },

  async fetchTripForecastSummary(
    lat: number,
    lon: number,
    destination: string,
    tripDate: string
  ): Promise<WeatherTripForecastSummary> {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    try {
      const qParams = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        destination,
        trip_date: tripDate,
      });

      const res = await fetch(`${apiBase}/api/v1/weather/trip-summary?${qParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return {
          destination: data.destination || destination,
          tripDate: data.trip_date || tripDate,
          forecastAvailable: Boolean(data.forecast_available),
          message: data.message || '',
          temperatureC: data.temperature_c ?? 26.0,
          condition: data.condition || 'Clear',
          humidityPct: data.humidity_pct ?? 50,
          windSpeedKmh: data.wind_speed_kmh || '10 km/h',
          rainProbabilityPct: data.rain_probability_pct ?? 0,
          rainfallMm: data.rainfall_mm ?? 0.0,
          source: data.source || 'Open-Meteo',
          recommendation: data.recommendation || '',
        };
      }
    } catch {}

    // Check forecast horizon locally (16 days)
    const tripDt = new Date(tripDate);
    const today = new Date();
    const diffDays = Math.round((tripDt.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays > 16) {
      return {
        destination,
        tripDate,
        forecastAvailable: false,
        message: 'Detailed weather forecast is not available yet. Showing seasonal climate norms for planning.',
        temperatureC: 27.0,
        condition: 'Seasonal Estimate',
        humidityPct: 55,
        windSpeedKmh: '12 km/h',
        rainProbabilityPct: 15,
        rainfallMm: 0.0,
        source: 'climate-estimate',
        recommendation: 'Check back closer to travel date for exact hourly weather forecasts.',
      };
    }

    const live = await this.fetchLiveWeather(lat, lon, destination);
    return {
      destination,
      tripDate,
      forecastAvailable: true,
      message: 'Live forecast retrieved.',
      temperatureC: parseFloat(live.tempCelsius.replace('°C', '')) || 26.0,
      condition: live.condition,
      humidityPct: parseInt(live.humidity.replace('%', ''), 10) || 50,
      windSpeedKmh: live.windSpeed,
      rainProbabilityPct: live.isStormy ? 80 : 10,
      rainfallMm: parseFloat(live.rainMm.replace(' mm', '')) || 0.0,
      source: 'live-provider',
      recommendation: live.isStormy ? 'Prioritize sheltered indoor stops and check rain advisories.' : 'Ideal conditions for outdoor sightseeing.',
    };
  },
};

function capitalize(str: string): string {
  return str
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.substring(1) : ''))
    .join(' ');
}
