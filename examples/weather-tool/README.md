# Weather Tool Example

A comprehensive weather tool built with the AI Spine Tools SDK that provides current weather, hourly forecasts, and multi-day forecasts using the OpenWeatherMap API.

## Features

- **Current Weather**: Get real-time weather conditions
- **Hourly Forecast**: 24-hour detailed forecast
- **Multi-day Forecast**: Up to 7-day weather forecast
- **Multiple Units**: Support for metric, imperial, and Kelvin units
- **Location Flexibility**: Accept city names, coordinates, or location strings
- **Comprehensive Data**: Temperature, humidity, wind, precipitation, UV index, and more

## Quick Start

1. **Get API Key**: Sign up at [OpenWeatherMap](https://openweathermap.org/api) and get your free API key

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenWeatherMap API key
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Test the Tool**:
   ```bash
   curl -X POST http://localhost:3000/execute \
     -H "Content-Type: application/json" \
     -d '{
       "input_data": {
         "location": "New York",
         "units": "metric",
         "includeForecast": true,
         "forecastDays": 3
       },
       "config": {
         "openweather_api_key": "your-api-key-here"
       }
     }'
   ```

## API Usage

### Input Parameters

- **location** (required): City name, coordinates (lat,lon), or location string
- **units** (optional): Temperature units - "metric", "imperial", or "kelvin" (default: metric)
- **includeHourly** (optional): Include 24-hour forecast (default: false)
- **includeForecast** (optional): Include multi-day forecast (default: false)
- **forecastDays** (optional): Number of forecast days 1-7 (default: 3)

### Configuration

- **openweather_api_key** (required): Your OpenWeatherMap API key
- **default_units** (optional): Default temperature units
- **cache_duration** (optional): Cache duration in seconds (60-3600)

### Example Response

```json
{
  "execution_id": "exec_12345",
  "status": "success",
  "output_data": {
    "location": "New York",
    "units": "metric",
    "timestamp": "2024-01-01T12:00:00Z",
    "current": {
      "temperature": 15.5,
      "feels_like": 14.2,
      "humidity": 65,
      "pressure": 1013,
      "description": "partly cloudy",
      "wind": {
        "speed": 3.2,
        "direction": 180
      }
    },
    "location_info": {
      "name": "New York",
      "country": "US",
      "coordinates": {
        "lat": 40.7128,
        "lon": -74.0060
      }
    },
    "forecast": [
      {
        "date": "2024-01-02",
        "temperature": {
          "min": 8.1,
          "max": 18.3
        },
        "description": "light rain"
      }
    ]
  }
}
```

## Deployment

### Docker

```bash
# Build image
docker build -t weather-tool .

# Run container
docker run -p 3000:3000 -e OPENWEATHER_API_KEY=your-key weather-tool
```

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Error Handling

The tool provides detailed error messages for common issues:

- **Invalid API Key**: Check your OpenWeatherMap API key
- **Location Not Found**: Verify the location name or coordinates
- **Rate Limit**: API usage limit exceeded, try again later
- **Network Timeout**: Weather service is slow or unavailable

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `OPENWEATHER_API_KEY` - Your OpenWeatherMap API key

## License

MIT License - see LICENSE file for details.