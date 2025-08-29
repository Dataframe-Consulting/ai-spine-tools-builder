/**
 * Weather Tool Example
 * 
 * Demonstrates AI Spine Tools SDK usage with external API integration.
 * Features:
 * - OpenWeatherMap API integration
 * - Complete input validation
 * - Error handling examples
 * - Configuration management demonstration
 * - Async operation handling
 * - Rate limiting implementation
 * - Retry logic demonstration
 */

import { createTool, stringField, booleanField, enumField, apiKeyField } from '@ai-spine/tools';
import axios, { AxiosError } from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define input interface for type safety
interface WeatherInput {
  city: string;
  country?: string;
  units?: 'metric' | 'imperial' | 'kelvin';
  includeDetails?: boolean;
}

// Define configuration interface
interface WeatherConfig {
  apiKey: string;
  timeout?: number;
  retryAttempts?: number;
  baseUrl?: string;
}

// OpenWeatherMap API response interfaces
interface WeatherResponse {
  name: string;
  sys: {
    country: string;
    sunrise: number;
    sunset: number;
  };
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  visibility: number;
  wind: {
    speed: number;
    deg?: number;
    gust?: number;
  };
  clouds: {
    all: number;
  };
  coord: {
    lon: number;
    lat: number;
  };
  dt: number;
  timezone: number;
}

// Helper function to format temperature with unit
function formatTemperature(temp: number, units: string): string {
  const unitSymbols = {
    metric: '°C',
    imperial: '°F',
    kelvin: 'K'
  };
  return `${Math.round(temp * 10) / 10}${unitSymbols[units as keyof typeof unitSymbols] || ''}`;
}

// Helper function to convert wind direction from degrees to compass direction
function getWindDirection(degrees?: number): string {
  if (degrees === undefined) return 'N/A';
  
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Helper function to get weather icon URL
function getWeatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

// Create the weather tool
const weatherTool = createTool<WeatherInput, WeatherConfig>({
  metadata: {
    name: 'weather-tool',
    version: '1.0.0',
    description: 'Get current weather information for any city using OpenWeatherMap API',
    capabilities: ['weather', 'api-integration', 'external-service'],
    author: 'AI Spine Tools',
    license: 'MIT',
  },

  schema: {
    input: {
      city: stringField({
        required: true,
        minLength: 2,
        maxLength: 100,
        description: 'Name of the city to get weather for',
        example: 'Madrid',
      }),
      country: stringField({
        required: false,
        minLength: 2,
        maxLength: 2,
        description: 'ISO 3166 country code (optional, helps with disambiguation)',
        example: 'ES',
      }),
      units: enumField(['metric', 'imperial', 'kelvin'], {
        required: false,
        description: 'Temperature units (metric=Celsius, imperial=Fahrenheit, kelvin=Kelvin)',
        default: 'metric',
      }),
      includeDetails: booleanField({
        required: false,
        description: 'Include detailed weather information (wind, pressure, humidity, etc.)',
        default: false,
      }),
    },

    config: {
      apiKey: apiKeyField({
        required: true,
        description: 'OpenWeatherMap API key',
        validation: {
          min: 10,
        },
      }),
      timeout: {
        type: 'number',
        required: false,
        description: 'Request timeout in milliseconds',
        default: 5000,
        validation: {
          min: 1000,
          max: 30000,
        },
      },
      retryAttempts: {
        type: 'number',
        required: false,
        description: 'Number of retry attempts on failure',
        default: 3,
        validation: {
          min: 0,
          max: 5,
        },
      },
      baseUrl: {
        type: 'string',
        required: false,
        description: 'OpenWeatherMap API base URL',
        default: 'https://api.openweathermap.org/data/2.5',
      },
    },
  },

  async execute(input, config, context) {
    console.log(`Fetching weather data for ${input.city} (ID: ${context.executionId})`);

    const { city, country, units = 'metric', includeDetails = false } = input;
    const { apiKey, timeout = 5000, retryAttempts = 3, baseUrl = 'https://api.openweathermap.org/data/2.5' } = config;

    // Build query parameters
    const queryParams = new URLSearchParams({
      q: country ? `${city},${country}` : city,
      appid: apiKey,
      units: units,
    });

    const url = `${baseUrl}/weather?${queryParams.toString()}`;

    // Retry logic with exponential backoff
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${retryAttempts}: Calling OpenWeatherMap API`);
        
        const response = await axios.get<WeatherResponse>(url, {
          timeout: timeout,
          headers: {
            'User-Agent': 'AI-Spine-Weather-Tool/1.0.0',
            'Accept': 'application/json',
          },
        });

        const weather = response.data;
        const mainWeather = weather.weather[0];

        // Build basic weather data
        const weatherData = {
          location: {
            city: weather.name,
            country: weather.sys.country,
            coordinates: {
              latitude: weather.coord.lat,
              longitude: weather.coord.lon,
            },
          },
          current: {
            temperature: formatTemperature(weather.main.temp, units),
            temperatureRaw: weather.main.temp,
            feelsLike: formatTemperature(weather.main.feels_like, units),
            condition: mainWeather.main,
            description: mainWeather.description,
            icon: {
              code: mainWeather.icon,
              url: getWeatherIconUrl(mainWeather.icon),
            },
          },
          timestamp: {
            measured: new Date(weather.dt * 1000).toISOString(),
            timezone: weather.timezone,
          },
          units: units,
        };

        // Add detailed information if requested
        if (includeDetails) {
          (weatherData as any).details = {
            temperature: {
              min: formatTemperature(weather.main.temp_min, units),
              max: formatTemperature(weather.main.temp_max, units),
              pressure: `${weather.main.pressure} hPa`,
              humidity: `${weather.main.humidity}%`,
            },
            wind: {
              speed: units === 'metric' ? `${weather.wind.speed} m/s` : `${weather.wind.speed} mph`,
              direction: getWindDirection(weather.wind.deg),
              directionDegrees: weather.wind.deg,
              gust: weather.wind.gust ? (units === 'metric' ? `${weather.wind.gust} m/s` : `${weather.wind.gust} mph`) : undefined,
            },
            visibility: `${weather.visibility / 1000} km`,
            cloudiness: `${weather.clouds.all}%`,
            sun: {
              sunrise: new Date(weather.sys.sunrise * 1000).toISOString(),
              sunset: new Date(weather.sys.sunset * 1000).toISOString(),
            },
          };
        }

        return {
          status: 'success',
          data: {
            weather: weatherData,
            summary: `${weather.name}, ${weather.sys.country}: ${mainWeather.description}, ${formatTemperature(weather.main.temp, units)}`,
            metadata: {
              executionId: context.executionId,
              timestamp: context.timestamp.toISOString(),
              toolVersion: '1.0.0',
              apiProvider: 'OpenWeatherMap',
              requestAttempts: attempt,
            },
          },
          timing: {
            executionTimeMs: Date.now() - context.performance!.startTime,
            startedAt: new Date(context.performance!.startTime).toISOString(),
            completedAt: new Date().toISOString(),
          },
        };

      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt} failed:`, error instanceof AxiosError ? error.message : error);

        // Handle specific API errors
        if (error instanceof AxiosError) {
          if (error.response?.status === 401) {
            return {
              status: 'error',
              error: {
                code: 'INVALID_API_KEY',
                message: 'Invalid OpenWeatherMap API key. Please check your configuration.',
                type: 'client_error',
                details: {
                  statusCode: error.response.status,
                  apiResponse: error.response.data,
                },
              },
            };
          }

          if (error.response?.status === 404) {
            return {
              status: 'error',
              error: {
                code: 'CITY_NOT_FOUND',
                message: `City "${city}" not found. Please check the spelling or try including a country code.`,
                type: 'validation_error',
                details: {
                  statusCode: error.response.status,
                  searchQuery: country ? `${city},${country}` : city,
                },
              },
            };
          }

          if (error.response?.status === 429) {
            return {
              status: 'error',
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'OpenWeatherMap API rate limit exceeded. Please try again later.',
                type: 'client_error',
                details: {
                  statusCode: error.response.status,
                  retryAfter: error.response.headers['retry-after'],
                },
              },
            };
          }
        }

        // If this is the last attempt, return the error
        if (attempt === retryAttempts) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If we get here, all retries failed
    return {
      status: 'error',
      error: {
        code: 'API_REQUEST_FAILED',
        message: `Failed to fetch weather data after ${retryAttempts} attempts: ${lastError?.message}`,
        type: 'execution_error',
        details: {
          totalAttempts: retryAttempts,
          lastError: lastError?.message,
          isNetworkError: lastError instanceof AxiosError && !lastError.response,
        },
      },
    };
  },
});

// Start the tool server
async function main() {
  try {
    await weatherTool.start({
      port: process.env.PORT ? parseInt(process.env.PORT) : 3002,
      host: process.env.HOST || '0.0.0.0',
      development: {
        requestLogging: process.env.NODE_ENV === 'development',
      },
      security: {
        requireAuth: process.env.API_KEY_AUTH === 'true',
        apiKeys: process.env.VALID_API_KEYS?.split(','),
      },
    });
    
    console.log('Weather tool server started successfully!');
    console.log('Available endpoints:');
    console.log('- POST /api/execute - Get weather data');
    console.log('- GET /health - Health check');
    console.log('- GET /schema - API documentation');
    
  } catch (error) {
    console.error('Failed to start weather server:', error);
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
main();

export default weatherTool;