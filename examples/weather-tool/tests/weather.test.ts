/**
 * Weather Tool Tests
 * 
 * Comprehensive tests for weather tool functionality including:
 * - Input validation
 * - API integration
 * - Error handling
 * - Retry logic
 * - Response formatting
 */

import { testTool, createMockExecutionContext } from '@ai-spine/tools-testing';
import axios from 'axios';
import weatherTool from '../src/index';

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Weather Tool', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.resetAllMocks();
    
    // Default mock implementation for successful API response
    const mockWeatherResponse = {
      data: {
        name: 'Madrid',
        sys: {
          country: 'ES',
          sunrise: 1703746800,
          sunset: 1703779200,
        },
        main: {
          temp: 15.5,
          feels_like: 14.2,
          temp_min: 13.1,
          temp_max: 17.8,
          pressure: 1013,
          humidity: 65,
        },
        weather: [{
          id: 800,
          main: 'Clear',
          description: 'clear sky',
          icon: '01d',
        }],
        visibility: 10000,
        wind: {
          speed: 2.5,
          deg: 180,
          gust: 4.1,
        },
        clouds: {
          all: 0,
        },
        coord: {
          lon: -3.7026,
          lat: 40.4165,
        },
        dt: 1703760000,
        timezone: 3600,
      },
    };
    
    mockedAxios.get.mockResolvedValue(mockWeatherResponse);
  });

  describe('Input Validation', () => {
    it('should validate required city field', async () => {
      const result = await testTool(weatherTool, {
        input: {},
        config: {
          apiKey: 'test-key',
        },
      });

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('validation_error');
      expect(result.error?.message).toContain('city');
    });

    it('should validate city length constraints', async () => {
      const result = await testTool(weatherTool, {
        input: {
          city: 'a', // Too short
        },
        config: {
          apiKey: 'test-key',
        },
      });

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('validation_error');
    });

    it('should validate country code format', async () => {
      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
          country: 'ESP', // Should be 2 characters
        },
        config: {
          apiKey: 'test-key',
        },
      });

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('validation_error');
    });

    it('should validate units enum', async () => {
      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
          units: 'celsius' as any, // Invalid unit
        },
        config: {
          apiKey: 'test-key',
        },
      });

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('validation_error');
    });

    it('should require API key in config', async () => {
      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
        },
        config: {},
      });

      expect(result.status).toBe('error');
      expect(result.error?.type).toBe('validation_error');
      expect(result.error?.message).toContain('apiKey');
    });
  });

  describe('Successful Weather Requests', () => {
    it('should fetch basic weather data', async () => {
      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
        },
        config: {
          apiKey: 'test-key',
        },
      });

      expect(result.status).toBe('success');
      expect(result.data?.weather).toMatchObject({
        location: {
          city: 'Madrid',
          country: 'ES',
          coordinates: expect.any(Object),
        },
        current: {
          temperature: expect.stringContaining('°C'),
          condition: 'Clear',
          description: 'clear sky',
        },
        units: 'metric',
      });

      // Verify API was called with correct parameters
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('q=Madrid'),
        expect.objectContaining({
          timeout: expect.any(Number),
          headers: expect.any(Object),
        })
      );
    });

    it('should handle country code in query', async () => {
      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
          country: 'ES',
        },
        config: {
          apiKey: 'test-key',
        },
      });

      expect(result.status).toBe('success');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('q=Madrid,ES'),
        expect.any(Object)
      );
    });

    it('should handle different units', async () => {
      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
          units: 'imperial',
        },
        config: {
          apiKey: 'test-key',
        },
      });

      expect(result.status).toBe('success');
      expect(result.data?.weather.units).toBe('imperial');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('units=imperial'),
        expect.any(Object)
      );
    });

    it('should include detailed information when requested', async () => {
      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
          includeDetails: true,
        },
        config: {
          apiKey: 'test-key',
        },
      });

      expect(result.status).toBe('success');
      expect(result.data?.weather.details).toMatchObject({
        temperature: expect.any(Object),
        wind: expect.any(Object),
        visibility: expect.any(String),
        cloudiness: expect.any(String),
        sun: expect.any(Object),
      });
    });

    it('should include proper metadata', async () => {
      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
        },
        config: {
          apiKey: 'test-key',
        },
      });

      expect(result.status).toBe('success');
      expect(result.data?.metadata).toMatchObject({
        executionId: expect.any(String),
        timestamp: expect.any(String),
        toolVersion: '1.0.0',
        apiProvider: 'OpenWeatherMap',
        requestAttempts: 1,
      });

      expect(result.timing).toMatchObject({
        executionTimeMs: expect.any(Number),
        startedAt: expect.any(String),
        completedAt: expect.any(String),
      });
    });
  });

  describe('API Error Handling', () => {
    it('should handle invalid API key error', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { cod: 401, message: 'Invalid API key' },
        },
        message: 'Request failed with status code 401',
      };
      
      mockedAxios.get.mockRejectedValueOnce(mockError);

      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
        },
        config: {
          apiKey: 'invalid-key',
        },
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('INVALID_API_KEY');
      expect(result.error?.type).toBe('authentication_error');
      expect(result.error?.message).toContain('Invalid OpenWeatherMap API key');
    });

    it('should handle city not found error', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { cod: '404', message: 'city not found' },
        },
        message: 'Request failed with status code 404',
      };
      
      mockedAxios.get.mockRejectedValueOnce(mockError);

      const result = await testTool(weatherTool, {
        input: {
          city: 'NonexistentCity',
        },
        config: {
          apiKey: 'test-key',
        },
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('CITY_NOT_FOUND');
      expect(result.error?.type).toBe('validation_error');
      expect(result.error?.message).toContain('NonexistentCity');
    });

    it('should handle rate limit error', async () => {
      const mockError = {
        response: {
          status: 429,
          headers: { 'retry-after': '3600' },
          data: { cod: 429, message: 'Your API key has exceeded the rate limit' },
        },
        message: 'Request failed with status code 429',
      };
      
      mockedAxios.get.mockRejectedValueOnce(mockError);

      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
        },
        config: {
          apiKey: 'test-key',
        },
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.error?.type).toBe('rate_limit_error');
    });

    it('should handle network timeout', async () => {
      const mockError = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      };
      
      mockedAxios.get.mockRejectedValueOnce(mockError);

      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
        },
        config: {
          apiKey: 'test-key',
          timeout: 1000,
          retryAttempts: 1, // Reduce retries for faster test
        },
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('API_REQUEST_FAILED');
      expect(result.error?.type).toBe('execution_error');
      expect(result.error?.details?.isNetworkError).toBe(true);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on temporary failures and eventually succeed', async () => {
      // First two calls fail, third succeeds
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: {
            name: 'Madrid',
            sys: { country: 'ES', sunrise: 1703746800, sunset: 1703779200 },
            main: { temp: 15, feels_like: 14, temp_min: 13, temp_max: 17, pressure: 1013, humidity: 65 },
            weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
            visibility: 10000,
            wind: { speed: 2.5, deg: 180 },
            clouds: { all: 0 },
            coord: { lon: -3.7026, lat: 40.4165 },
            dt: 1703760000,
            timezone: 3600,
          },
        });

      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
        },
        config: {
          apiKey: 'test-key',
          retryAttempts: 3,
        },
      });

      expect(result.status).toBe('success');
      expect(result.data?.metadata.requestAttempts).toBe(3);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should fail after exhausting retry attempts', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Persistent network error'));

      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
        },
        config: {
          apiKey: 'test-key',
          retryAttempts: 2,
        },
      });

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe('API_REQUEST_FAILED');
      expect(result.error?.details?.totalAttempts).toBe(2);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Configuration Options', () => {
    it('should use custom timeout setting', async () => {
      await testTool(weatherTool, {
        input: {
          city: 'Madrid',
        },
        config: {
          apiKey: 'test-key',
          timeout: 10000,
        },
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: 10000,
        })
      );
    });

    it('should use custom base URL', async () => {
      await testTool(weatherTool, {
        input: {
          city: 'Madrid',
        },
        config: {
          apiKey: 'test-key',
          baseUrl: 'https://api.custom-weather.com/v2.5',
        },
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('api.custom-weather.com'),
        expect.any(Object)
      );
    });
  });

  describe('Data Formatting', () => {
    it('should format temperatures correctly for metric units', async () => {
      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
          units: 'metric',
        },
        config: {
          apiKey: 'test-key',
        },
      });

      expect(result.status).toBe('success');
      expect(result.data?.weather.current.temperature).toContain('°C');
    });

    it('should format temperatures correctly for imperial units', async () => {
      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
          units: 'imperial',
        },
        config: {
          apiKey: 'test-key',
        },
      });

      expect(result.status).toBe('success');
      expect(result.data?.weather.current.temperature).toContain('°F');
    });

    it('should format temperatures correctly for kelvin units', async () => {
      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
          units: 'kelvin',
        },
        config: {
          apiKey: 'test-key',
        },
      });

      expect(result.status).toBe('success');
      expect(result.data?.weather.current.temperature).toContain('K');
    });

    it('should generate proper summary text', async () => {
      const result = await testTool(weatherTool, {
        input: {
          city: 'Madrid',
        },
        config: {
          apiKey: 'test-key',
        },
      });

      expect(result.status).toBe('success');
      expect(result.data?.summary).toContain('Madrid, ES');
      expect(result.data?.summary).toContain('clear sky');
      expect(result.data?.summary).toContain('°C');
    });
  });
});