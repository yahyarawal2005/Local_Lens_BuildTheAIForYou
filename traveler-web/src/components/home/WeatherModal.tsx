'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useItinerary } from '@/context/ItineraryContext';
import { WEATHER_SCENARIOS } from '@/lib/weather';
import { X, Sun, CloudRain, Sunset, Cloud, Zap, Check } from 'lucide-react';

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WeatherModal({ isOpen, onClose }: WeatherModalProps) {
  const { isStormy, weather, applyWeatherScenario, toggleStormDemo } = useTheme();
  const { setWeatherCondition } = useItinerary();

  if (!isOpen) return null;

  const icons: Record<string, any> = {
    Sun,
    CloudRain,
    Sunset,
    Cloud,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#FAF9F6] dark:bg-[#1E293B] rounded-3xl p-6 shadow-floating border border-[#EAE8E3] dark:border-slate-700 text-[#1A1A1A] dark:text-white max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE8E3] dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-soft dark:bg-primary/20 flex items-center justify-center text-primary">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Weather & Simulation Center</h3>
              <p className="text-xs text-ink-secondary dark:text-slate-400">
                Live OpenWeather & Realtime Route Adaptation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-ink-secondary dark:text-slate-400" />
          </button>
        </div>

        {/* Current Live Weather Hero Card */}
        <div
          className={`mt-5 p-5 rounded-2xl border transition-all ${
            isStormy
              ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-sky-500/40 text-white'
              : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 text-[#1A1A1A]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider">
                Active Condition
              </span>
              <span className="text-xs font-semibold text-ink-secondary dark:text-slate-300">
                {weather.condition}
              </span>
            </div>
            <div className="text-3xl font-black">{weather.tempCelsius}</div>
          </div>

          <p className="text-sm font-semibold mt-2">{weather.description}</p>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-black/10 dark:border-white/10 text-xs text-ink-secondary dark:text-slate-300">
            <div>
              <span className="block opacity-75">Humidity</span>
              <span className="font-bold text-sm text-[#1A1A1A] dark:text-white">{weather.humidity}</span>
            </div>
            <div>
              <span className="block opacity-75">Wind</span>
              <span className="font-bold text-sm text-[#1A1A1A] dark:text-white">{weather.windSpeed}</span>
            </div>
            <div>
              <span className="block opacity-75">Precipitation</span>
              <span className="font-bold text-sm text-[#1A1A1A] dark:text-white">{weather.rainMm}</span>
            </div>
          </div>
        </div>

        {/* Interactive Scenario Presets */}
        <div className="mt-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary dark:text-slate-400 mb-3">
            Simulate Weather Scenarios
          </h4>

          <div className="space-y-2.5">
            {WEATHER_SCENARIOS.map((sc) => {
              const Icon = icons[sc.icon] || Sun;
              const isSelected = weather.condition === sc.label;

              return (
                <button
                  key={sc.key}
                  onClick={() => {
                    applyWeatherScenario(sc.key);
                    setWeatherCondition(sc.label);
                  }}
                  className={`w-full p-3.5 rounded-2xl flex items-center justify-between text-left transition-all border ${
                    isSelected
                      ? 'border-primary bg-primary-soft/50 dark:bg-primary/10 shadow-sm'
                      : 'border-[#EAE8E3] dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        sc.isStormy
                          ? 'bg-sky-500/10 text-sky-500'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{sc.label}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10">
                          {sc.temp}
                        </span>
                      </div>
                      <p className="text-xs text-ink-secondary dark:text-slate-400 mt-0.5 max-w-[260px] sm:max-w-xs truncate">
                        {sc.desc}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Adaptation Action Button */}
        <div className="mt-6 pt-4 border-t border-[#EAE8E3] dark:border-slate-700 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              toggleStormDemo();
            }}
            className="flex-1 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 text-[#1A1A1A] dark:text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 transition-all"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            Toggle Storm Atmosphere
          </button>

          <button
            onClick={() => {
              onClose();
            }}
            className="flex-1 h-12 rounded-xl bg-primary text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-primary-dark active:scale-95 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
