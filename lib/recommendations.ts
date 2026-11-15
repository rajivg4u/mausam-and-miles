
import type { WeatherData, Place } from "./types";

export type Recommendation = {
  title: string;
  description: string;
  suitability: string;
  type: "outdoor" | "indoor" | "family";
};

export function getWeatherDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 61, 63, 65].includes(code)) return "Rainy";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Variable weather";
}

export function getWeatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if ([1, 2, 3].includes(code)) return "⛅";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌤️";
}

export function getRecommendations(
  weather: WeatherData
): Recommendation[] {
  const { temperature, rainProbability } = weather.hourly[0] ?? {
    temperature: weather.current.temperature,
    rainProbability: 0
  };

  const rainy = rainProbability >= 50;
  const hot = temperature >= 35;
  const pleasant = temperature >= 20 && temperature <= 32;

  if (rainy) {
    return [
      {
        title: "Explore indoor attractions",
        description: "Consider museums, galleries, indoor experiences and shopping.",
        suitability: "Best option today",
        type: "indoor"
      },
      {
        title: "Plan a food trail",
        description: "Discover local restaurants and regional food experiences.",
        suitability: "Rain-friendly",
        type: "family"
      },
      {
        title: "Keep outdoor travel flexible",
        description: "Check local rainfall and road conditions before leaving.",
        suitability: "Use caution",
        type: "outdoor"
      }
    ];
  }

  if (hot) {
    return [
      {
        title: "Choose indoor experiences",
        description: "Museums, indoor attractions and air-conditioned venues are preferable.",
        suitability: "Recommended",
        type: "indoor"
      },
      {
        title: "Explore early morning",
        description: "Visit outdoor attractions before temperatures rise.",
        suitability: "Before 9 AM",
        type: "outdoor"
      },
      {
        title: "Plan a relaxed family outing",
        description: "Prefer shaded parks and places with refreshments.",
        suitability: "With precautions",
        type: "family"
      }
    ];
  }

  if (pleasant) {
    return [
      {
        title: "Explore nearby attractions",
        description: "Good conditions for sightseeing and outdoor exploration.",
        suitability: "Highly suitable",
        type: "outdoor"
      },
      {
        title: "Plan a family outing",
        description: "Consider parks, gardens and cultural attractions.",
        suitability: "Suitable",
        type: "family"
      },
      {
        title: "Discover local experiences",
        description: "Explore heritage areas, viewpoints and local markets.",
        suitability: "Suitable",
        type: "indoor"
      }
    ];
  }

  return [
    {
      title: "Explore local attractions",
      description: "Check the forecast for your chosen destination before travelling.",
      suitability: "Check conditions",
      type: "outdoor"
    },
    {
      title: "Consider indoor activities",
      description: "Museums, galleries and cultural venues are flexible options.",
      suitability: "Alternative",
      type: "indoor"
    },
    {
      title: "Plan a family experience",
      description: "Choose attractions that suit the day's weather.",
      suitability: "Flexible",
      type: "family"
    }
  ];
}

export function getPlaceCategory(place: Place): string {
  return place.category.toLowerCase();
}

export function estimateEntryCost(place: Place): number {
  const category = place.category.toLowerCase();

  if (category.includes("museum")) return 100;
  if (category.includes("theme")) return 700;
  if (category.includes("zoo")) return 150;
  if (category.includes("park")) return 30;
  if (category.includes("castle")) return 100;
  if (category.includes("monument")) return 50;

  return 0;
}
