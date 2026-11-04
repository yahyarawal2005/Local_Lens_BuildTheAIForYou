'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { WeatherData, WeatherService, WEATHER_SCENARIOS } from '@/lib/weather';

interface ThemeContextType {
  isStormy: boolean;
  weather: WeatherData;
  toggleStormDemo: () => void;
  applyWeatherScenario: (key: string) => void;
  updateWeatherForLocation: (lat: number, lon: number, destination?: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isStormy, setIsStormy] = useState(false);
  const [activeCoords, setActiveCoords] = useState<{ lat: number; lon: number; destination?: string } | null>(null);
  const [weather, setWeather] = useState<WeatherData>({
    tempCelsius: '26°C',
    description: 'Pleasant & Clear',
    condition: 'Clear',
    humidity: '50%',
    windSpeed: '10 km/h',
    rainMm: '0.0 mm',
    isStormy: false,
    iconName: 'Sun',
  });

  async function updateWeatherForLocation(lat: number, lon: number, destination?: string) {
    if (!lat || !lon) return;
    setActiveCoords({ lat, lon, destination });
    try {
      const live = await WeatherService.fetchLiveWeather(lat, lon, destination);
      setWeather(live);
      if (live.isStormy) {
        setIsStormy(true);
      } else {
        setIsStormy(false);
      }
    } catch {}
  }

  function toggleStormDemo() {
    setIsStormy((prev) => {
      const next = !prev;
      if (next) {
        setWeather({
          tempCelsius: '17°C',
          description: 'Heavy Rain & Thunderstorm',
          condition: 'Thunderstorm',
          humidity: '94%',
          windSpeed: '38 km/h',
          rainMm: '18.4 mm',
          isStormy: true,
          iconName: 'CloudRain',
        });
      } else if (activeCoords) {
        WeatherService.fetchLiveWeather(activeCoords.lat, activeCoords.lon, activeCoords.destination).then(setWeather);
      } else {
        setWeather({
          tempCelsius: '26°C',
          description: 'Clear Sky',
          condition: 'Clear',
          humidity: '50%',
          windSpeed: '10 km/h',
          rainMm: '0.0 mm',
          isStormy: false,
          iconName: 'Sun',
        });
      }
      return next;
    });
  }

  function applyWeatherScenario(key: string) {
    const sc = WEATHER_SCENARIOS.find((s) => s.key === key) || WEATHER_SCENARIOS[0];
    setIsStormy(sc.isStormy);
    setWeather({
      tempCelsius: sc.temp,
      description: sc.desc,
      condition: sc.label,
      humidity: sc.humidity,
      windSpeed: sc.wind,
      rainMm: sc.rain,
      isStormy: sc.isStormy,
      iconName: sc.icon,
    });
  }

  return (
    <ThemeContext.Provider value={{ isStormy, weather, toggleStormDemo, applyWeatherScenario, updateWeatherForLocation }}>
      <div className={isStormy ? 'dark' : ''}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
