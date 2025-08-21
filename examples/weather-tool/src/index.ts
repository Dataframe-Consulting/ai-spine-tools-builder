import { createTool, stringField, numberField, booleanField, apiKeyField } from '@ai-spine/tools';
import axios from 'axios';

// Define the input interface for type safety
interface WeatherInput {
  location: string;
  units?: 'metric' | 'imperial' | 'kelvin';
  includeHourly?: boolean;
  includeForecast?: boolean;
  forecastDays?: number;
}

// Define the configuration interface
interface WeatherConfig {
  openweather_api_key: string;
  default_units?: string;
  cache_duration?: number;
}

// Create the weather tool
const weatherTool = createTool<WeatherInput, WeatherConfig>({
  metadata: {
    name: 'weather-tool',
    version: '1.0.0',
    description: 'Get current weather conditions and forecasts for any location',
    capabilities: ['weather-data', 'location-services', 'forecasting'],
    author: 'AI Spine Team',
    license: 'MIT',
    homepage: 'https://github.com/ai-spine/weather-tool',
  },

  schema: {
    input: {
      location: stringField({
        required: true,
        description: 'City name, coordinates (lat,lon), or location string',
        minLength: 2,
        maxLength: 100,
      }),
      units: stringField({
        required: false,
        description: 'Temperature units',
        enum: ['metric', 'imperial', 'kelvin'],
        default: 'metric',
      }),
      includeHourly: booleanField({
        required: false,
        description: 'Include hourly forecast data',
        default: false,
      }),
      includeForecast: booleanField({
        required: false,
        description: 'Include multi-day forecast',
        default: false,
      }),
      forecastDays: numberField({
        required: false,
        description: 'Number of forecast days (1-7)',
        min: 1,
        max: 7,
        default: 3,
      }),
    },

    config: {
      openweather_api_key: apiKeyField({
        required: true,
        description: 'OpenWeatherMap API key (get from https://openweathermap.org/api)',
      }),
      default_units: {
        type: 'string',
        required: false,
        description: 'Default temperature units',
        default: 'metric',
        validation: {
          enum: ['metric', 'imperial', 'kelvin'],
        },
      },
      cache_duration: {
        type: 'number',
        required: false,
        description: 'Cache duration in seconds',
        default: 300,
        validation: {
          min: 60,
          max: 3600,
        },
      },
    },
  },

  async execute(input, config, context) {
    console.log(`Fetching weather data for: ${input.location}`);

    try {
      const units = input.units || config.default_units || 'metric';
      const baseURL = 'https://api.openweathermap.org/data/2.5';

      // Create axios instance with API key
      const client = axios.create({
        baseURL,
        timeout: 10000,
        params: {
          appid: config.openweather_api_key,
          units,
        },
      });

      // Prepare the result object
      const result: any = {
        location: input.location,
        units,
        timestamp: new Date().toISOString(),
      };

      // Get current weather
      console.log('Fetching current weather...');
      const currentWeather = await client.get('/weather', {
        params: { q: input.location },
      });

      result.current = {
        temperature: currentWeather.data.main.temp,
        feels_like: currentWeather.data.main.feels_like,
        humidity: currentWeather.data.main.humidity,
        pressure: currentWeather.data.main.pressure,
        visibility: currentWeather.data.visibility,
        description: currentWeather.data.weather[0].description,
        icon: currentWeather.data.weather[0].icon,
        wind: {
          speed: currentWeather.data.wind?.speed || 0,
          direction: currentWeather.data.wind?.deg || 0,
        },
        clouds: currentWeather.data.clouds?.all || 0,
        sunrise: new Date(currentWeather.data.sys.sunrise * 1000).toISOString(),
        sunset: new Date(currentWeather.data.sys.sunset * 1000).toISOString(),
      };

      // Get location info
      result.location_info = {
        name: currentWeather.data.name,
        country: currentWeather.data.sys.country,
        coordinates: {
          lat: currentWeather.data.coord.lat,
          lon: currentWeather.data.coord.lon,
        },
        timezone: currentWeather.data.timezone,
      };

      // Get hourly forecast if requested
      if (input.includeHourly) {
        console.log('Fetching hourly forecast...');
        const hourlyForecast = await client.get('/forecast', {
          params: { q: input.location },
        });

        result.hourly = hourlyForecast.data.list.slice(0, 24).map((item: any) => ({
          time: item.dt_txt,
          temperature: item.main.temp,
          feels_like: item.main.feels_like,
          humidity: item.main.humidity,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          wind_speed: item.wind?.speed || 0,
          precipitation_probability: (item.pop || 0) * 100,
        }));
      }

      // Get multi-day forecast if requested
      if (input.includeForecast) {
        console.log('Fetching daily forecast...');
        const { lat, lon } = result.location_info.coordinates;
        
        const dailyForecast = await client.get('/onecall', {
          params: {
            lat,
            lon,
            exclude: 'minutely,alerts',
          },
        });

        const forecastDays = Math.min(input.forecastDays || 3, 7);
        result.forecast = dailyForecast.data.daily.slice(0, forecastDays).map((day: any) => ({
          date: new Date(day.dt * 1000).toISOString().split('T')[0],
          temperature: {
            min: day.temp.min,
            max: day.temp.max,
            morning: day.temp.morn,
            day: day.temp.day,
            evening: day.temp.eve,
            night: day.temp.night,
          },
          humidity: day.humidity,
          description: day.weather[0].description,
          icon: day.weather[0].icon,
          wind_speed: day.wind_speed,
          precipitation_probability: (day.pop || 0) * 100,
          uv_index: day.uvi,
        }));
      }

      // Add metadata
      result.metadata = {
        execution_id: context.execution_id,
        provider: 'OpenWeatherMap',
        units_explanation: getUnitsExplanation(units),
        cache_duration: config.cache_duration,
        request_count: Object.keys(result).length - 2, // Exclude location and timestamp
      };

      console.log(`Weather data fetched successfully for ${result.location_info.name}, ${result.location_info.country}`);

      return result;
    } catch (error) {
      console.error('Error fetching weather data:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please check your OpenWeatherMap API key.');
        } else if (error.response?.status === 404) {
          throw new Error(`Location '${input.location}' not found. Please check the location name and try again.`);
        } else if (error.response?.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. The weather service is currently slow or unavailable.');
        }
      }

      throw new Error(`Failed to fetch weather data: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

/**
 * Get explanation for temperature units
 */
function getUnitsExplanation(units: string): string {
  switch (units) {
    case 'metric':
      return 'Temperature in Celsius, wind speed in m/s';
    case 'imperial':
      return 'Temperature in Fahrenheit, wind speed in mph';
    case 'kelvin':
      return 'Temperature in Kelvin, wind speed in m/s';
    default:
      return 'Standard units';
  }
}

// Start the tool server
async function main() {
  try {
    await weatherTool.serve({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
      host: process.env.HOST || '0.0.0.0',
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      apiKeyAuth: process.env.API_KEY_AUTH === 'true',
      validApiKeys: process.env.VALID_API_KEYS?.split(','),
    });
  } catch (error) {
    console.error('Failed to start weather tool server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down weather tool gracefully...');
  await weatherTool.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down weather tool gracefully...');
  await weatherTool.stop();
  process.exit(0);
});

// Start the server if this file is run directly
if (require.main === module) {
  main();
}

export default weatherTool;