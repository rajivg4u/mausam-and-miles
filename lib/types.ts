
export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type WeatherDay = {
  date: string;
  max: number;
  min: number;
  rain: number;
  code: number;
};

export type WeatherHour = {
  time: string;
  temperature: number;
  rainProbability: number;
};

export type WeatherData = {
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    code: number;
    isDay: boolean;
  };
  hourly: WeatherHour[];
  daily: WeatherDay[];
};

export type Place = {
  id: number;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  distance: number;
  website?: string;
  fee?: string;
};

export interface City {
  name: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
};
