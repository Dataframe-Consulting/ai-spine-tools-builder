# Weather Tool Example

A comprehensive weather tool example demonstrating the AI Spine Tools SDK with external API integration.

## Features

- **OpenWeatherMap Integration**: Real-time weather data from a reliable external API
- **Complete Input Validation**: Comprehensive validation with helpful error messages
- **Error Handling**: Graceful handling of API errors, network issues, and invalid inputs
- **Retry Logic**: Automatic retries with exponential backoff for resilient operation
- **Flexible Configuration**: Customizable timeout, retry attempts, and API endpoints
- **Multiple Units**: Support for metric (Celsius), imperial (Fahrenheit), and Kelvin
- **Detailed Information**: Optional detailed weather data including wind, pressure, humidity
- **Production Ready**: Security features, proper logging, and graceful shutdown

## Prerequisites

1. **Node.js 18+**: Required for running the tool
2. **OpenWeatherMap API Key**: Get your free API key from [OpenWeatherMap](https://openweathermap.org/api)

## Quick Start

### 1. Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### 2. Configuration

Edit the `.env` file with your OpenWeatherMap API key:

```env
OPENWEATHER_API_KEY=your_actual_api_key_here
PORT=3002
NODE_ENV=development
```

### 3. Run the Tool

```bash
# Build and start
npm run build
npm start

# Or run in development mode with hot reload
npm run dev
```

The weather tool will be available at:
- **API Endpoint**: `http://localhost:3002/api/execute`
- **Health Check**: `http://localhost:3002/health`
- **Schema Documentation**: `http://localhost:3002/schema`

## Usage Examples

### Basic Weather Request

```bash
curl -X POST http://localhost:3002/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input_data": {
      "city": "Madrid"
    },
    "config": {
      "apiKey": "your_api_key_here"
    }
  }'
```

### With Country Code and Imperial Units

```bash
curl -X POST http://localhost:3002/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input_data": {
      "city": "Paris",
      "country": "FR",
      "units": "imperial"
    },
    "config": {
      "apiKey": "your_api_key_here"
    }
  }'
```

### Detailed Weather Information

```bash
curl -X POST http://localhost:3002/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input_data": {
      "city": "Tokyo",
      "country": "JP",
      "includeDetails": true
    },
    "config": {
      "apiKey": "your_api_key_here"
    }
  }'
```

## Response Format

### Success Response

```json
{
  "status": "success",
  "data": {
    "weather": {
      "location": {
        "city": "Madrid",
        "country": "ES",
        "coordinates": {
          "latitude": 40.4165,
          "longitude": -3.7026
        }
      },
      "current": {
        "temperature": "15.5°C",
        "temperatureRaw": 15.5,
        "feelsLike": "14.2°C",
        "condition": "Clear",
        "description": "clear sky",
        "icon": {
          "code": "01d",
          "url": "https://openweathermap.org/img/wn/01d@2x.png"
        }
      },
      "timestamp": {
        "measured": "2023-12-28T10:00:00.000Z",
        "timezone": 3600
      },
      "units": "metric"
    },
    "summary": "Madrid, ES: clear sky, 15.5°C",
    "metadata": {
      "executionId": "exec_123456",
      "timestamp": "2023-12-28T10:00:00.000Z",
      "toolVersion": "1.0.0",
      "apiProvider": "OpenWeatherMap",
      "requestAttempts": 1
    }
  },
  "timing": {
    "executionTimeMs": 245,
    "startedAt": "2023-12-28T10:00:00.000Z",
    "completedAt": "2023-12-28T10:00:00.245Z"
  }
}
```

### Detailed Response (when `includeDetails: true`)

The response includes additional information:

```json
{
  "details": {
    "temperature": {
      "min": "13.1°C",
      "max": "17.8°C",
      "pressure": "1013 hPa",
      "humidity": "65%"
    },
    "wind": {
      "speed": "2.5 m/s",
      "direction": "S",
      "directionDegrees": 180,
      "gust": "4.1 m/s"
    },
    "visibility": "10 km",
    "cloudiness": "0%",
    "sun": {
      "sunrise": "2023-12-28T07:00:00.000Z",
      "sunset": "2023-12-28T16:00:00.000Z"
    }
  }
}
```

### Error Response

```json
{
  "status": "error",
  "error": {
    "code": "CITY_NOT_FOUND",
    "message": "City \"NonexistentCity\" not found. Please check the spelling or try including a country code.",
    "type": "validation_error",
    "details": {
      "statusCode": 404,
      "searchQuery": "NonexistentCity"
    }
  }
}
```

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `city` | string | Yes | - | Name of the city (2-100 characters) |
| `country` | string | No | - | ISO 3166 country code (2 characters) |
| `units` | enum | No | `"metric"` | Temperature units: `metric`, `imperial`, `kelvin` |
| `includeDetails` | boolean | No | `false` | Include detailed weather information |

## Configuration Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `apiKey` | string | Yes | - | OpenWeatherMap API key |
| `timeout` | number | No | `5000` | Request timeout in milliseconds (1000-30000) |
| `retryAttempts` | number | No | `3` | Number of retry attempts (0-5) |
| `baseUrl` | string | No | `"https://api.openweathermap.org/data/2.5"` | API base URL |

## Error Handling

The tool handles various error scenarios gracefully:

### Authentication Errors
- **INVALID_API_KEY**: Invalid or missing OpenWeatherMap API key
- Returns HTTP 401 equivalent information

### Validation Errors  
- **CITY_NOT_FOUND**: City name not found in OpenWeatherMap database
- Invalid input parameters (city length, country code format, etc.)

### Rate Limiting
- **RATE_LIMIT_EXCEEDED**: OpenWeatherMap API rate limit exceeded
- Includes retry-after information when available

### Network Errors
- **API_REQUEST_FAILED**: Network timeouts, connection issues
- Automatic retry with exponential backoff
- Detailed error information for debugging

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

The test suite includes:

- **Input Validation Tests**: All parameter validation scenarios
- **API Integration Tests**: Successful and failed API calls
- **Error Handling Tests**: All error scenarios and edge cases
- **Retry Logic Tests**: Retry behavior and backoff logic
- **Data Formatting Tests**: Temperature units and response formatting
- **Configuration Tests**: Custom timeout, retry, and URL settings

## Development

### Project Structure

```
weather-tool/
├── src/
│   └── index.ts          # Main weather tool implementation
├── tests/
│   ├── setup.ts          # Jest test configuration
│   └── weather.test.ts   # Comprehensive test suite
├── .env.example          # Environment configuration template
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── jest.config.js        # Jest testing configuration
└── README.md            # This documentation
```

### Development Commands

```bash
# Install dependencies
npm install

# Build the tool
npm run build

# Start in development mode (with hot reload)
npm run dev

# Start production server
npm start

# Run tests
npm test

# Clean build artifacts
npm run clean
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key | Required |
| `PORT` | Server port | `3002` |
| `HOST` | Server host | `0.0.0.0` |
| `NODE_ENV` | Environment mode | `development` |
| `API_KEY_AUTH` | Enable API key authentication | `false` |
| `VALID_API_KEYS` | Comma-separated list of valid API keys | - |

## Production Deployment

### Docker Deployment

The tool includes a Dockerfile for containerized deployment:

```bash
# Build the container
docker build -t weather-tool .

# Run the container
docker run -p 3002:3002 \
  -e OPENWEATHER_API_KEY=your_api_key \
  weather-tool
```

### Environment Configuration

For production deployment:

1. **Set NODE_ENV=production**
2. **Configure proper logging**
3. **Set up monitoring and health checks**
4. **Configure rate limiting and security**
5. **Use HTTPS in production**

### Security Considerations

- **API Key Protection**: Store API keys securely (environment variables, secrets management)
- **Input Sanitization**: All inputs are validated and sanitized
- **Rate Limiting**: Consider implementing additional rate limiting
- **CORS Configuration**: Configure CORS for your specific use case
- **Authentication**: Enable API key authentication for production use

## API Integration Details

### OpenWeatherMap API

This tool uses the OpenWeatherMap Current Weather Data API:

- **Endpoint**: `https://api.openweathermap.org/data/2.5/weather`
- **Documentation**: [OpenWeatherMap API Docs](https://openweathermap.org/current)
- **Rate Limits**: 1,000 calls/day for free tier, 60 calls/minute
- **Response Time**: Typically < 200ms

### Supported Weather Data

- Current temperature and "feels like" temperature
- Weather conditions (clear, cloudy, rain, etc.)
- Humidity and atmospheric pressure  
- Wind speed, direction, and gusts
- Visibility distance
- Sunrise and sunset times
- Cloud coverage percentage

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Verify your OpenWeatherMap API key is correct
   - Check that the API key is active (may take a few hours after signup)

2. **City Not Found**
   - Try including the country code: `"city": "London", "country": "GB"`
   - Check spelling and use English city names
   - Some small cities may not be in the database

3. **Network Timeouts**
   - Increase the timeout setting in configuration
   - Check internet connectivity
   - OpenWeatherMap API might be experiencing issues

4. **Rate Limiting**
   - Free tier has limits (1,000 calls/day, 60/minute)
   - Consider upgrading to paid tier for higher limits
   - Implement client-side caching to reduce API calls

### Debug Mode

Enable debug logging by setting environment variables:

```bash
NODE_ENV=development
DEBUG=weather-tool:*
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests for any new functionality
4. Ensure all tests pass: `npm test`
5. Update documentation as needed
6. Submit a pull request

## License

MIT License - see the main project LICENSE file for details.