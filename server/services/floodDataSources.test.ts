import { describe, it, expect, vi } from 'vitest';
import {
  calculateRiskLevel,
  getMockFloodData,
} from './floodDataSources';

describe('floodDataSources', () => {
  describe('calculateRiskLevel', () => {
    it('should return low for water level below baseline', () => {
      const result = calculateRiskLevel(1.5, 2.0);
      expect(result).toBe('low');
    });

    it('should return medium for water level 1.0-1.3x baseline', () => {
      const result = calculateRiskLevel(2.2, 2.0);
      expect(result).toBe('medium');
    });

    it('should return high for water level 1.3-1.6x baseline', () => {
      const result = calculateRiskLevel(2.8, 2.0);
      expect(result).toBe('high');
    });

    it('should return critical for water level above 1.6x baseline', () => {
      const result = calculateRiskLevel(3.5, 2.0);
      expect(result).toBe('critical');
    });

    it('should use custom thresholds', () => {
      const result = calculateRiskLevel(3.0, 2.0, 3.5);
      expect(result).toBe('high');
    });
  });

  describe('getMockFloodData', () => {
    it('should return valid mock flood data', () => {
      const result = getMockFloodData(52.52, 13.41, 'Berlin', 'berlin');

      expect(result).toBeDefined();
      expect(result.regionId).toBe('berlin');
      expect(result.regionName).toBe('Berlin');
      expect(result.latitude).toBe(52.52);
      expect(result.longitude).toBe(13.41);
      expect(result.currentWaterLevel).toBeGreaterThan(0);
      expect(result.forecastedWaterLevel).toBeGreaterThan(0);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
      expect(result.source).toBe('mock');
      expect(result.confidence).toBe(0.5);
      expect(result.forecastHours).toBe(24);
    });

    it('should be deterministic for same coordinates', () => {
      const result1 = getMockFloodData(52.52, 13.41, 'Berlin', 'berlin');
      const result2 = getMockFloodData(52.52, 13.41, 'Berlin', 'berlin');

      expect(result1.currentWaterLevel).toBe(result2.currentWaterLevel);
      expect(result1.forecastedWaterLevel).toBe(result2.forecastedWaterLevel);
    });

    it('should vary for different coordinates', () => {
      const result1 = getMockFloodData(52.52, 13.41, 'Berlin', 'berlin');
      const result2 = getMockFloodData(48.8566, 2.3522, 'Paris', 'paris');

      expect(result1.currentWaterLevel).not.toBe(result2.currentWaterLevel);
    });

    it('should have valid metadata', () => {
      const result = getMockFloodData(52.52, 13.41, 'Berlin', 'berlin');

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.note).toBe('Mock data - all sources failed');
    });

    it('should handle extreme coordinates', () => {
      const result = getMockFloodData(90, 180, 'North Pole', 'north-pole');

      expect(result).toBeDefined();
      expect(result.currentWaterLevel).toBeGreaterThan(0);
    });

    it('should handle negative coordinates', () => {
      const result = getMockFloodData(-33.8688, 151.2093, 'Sydney', 'sydney');

      expect(result).toBeDefined();
      expect(result.currentWaterLevel).toBeGreaterThan(0);
    });

    it('should handle zero coordinates', () => {
      const result = getMockFloodData(0, 0, 'Equator', 'equator');

      expect(result).toBeDefined();
      expect(result.currentWaterLevel).toBeGreaterThan(0);
    });

    it('should have consistent timestamp format', () => {
      const result = getMockFloodData(52.52, 13.41, 'Berlin', 'berlin');

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should have valid risk level', () => {
      const result = getMockFloodData(52.52, 13.41, 'Berlin', 'berlin');

      expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
    });

    it('should maintain coordinate precision', () => {
      const lat = 52.52345;
      const lon = 13.41234;
      const result = getMockFloodData(lat, lon, 'Berlin', 'berlin');

      expect(result.latitude).toBe(lat);
      expect(result.longitude).toBe(lon);
    });

    it('should handle long region names', () => {
      const longName = 'A'.repeat(100);
      const result = getMockFloodData(52.52, 13.41, longName, 'test');

      expect(result.regionName).toBe(longName);
    });

    it('should handle special characters in region names', () => {
      const specialName = 'Region-123_@#$%';
      const result = getMockFloodData(52.52, 13.41, specialName, 'test');

      expect(result.regionName).toBe(specialName);
    });

    it('forecasted level should be reasonable relative to current', () => {
      const result = getMockFloodData(52.52, 13.41, 'Berlin', 'berlin');

      if (result.forecastedWaterLevel) {
        const diff = Math.abs(result.forecastedWaterLevel - result.currentWaterLevel);
        expect(diff).toBeLessThan(2); // Reasonable change
      }
    });

    it('should have reasonable confidence levels', () => {
      const result = getMockFloodData(52.52, 13.41, 'Berlin', 'berlin');

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include forecast hours', () => {
      const result = getMockFloodData(52.52, 13.41, 'Berlin', 'berlin');

      expect(result.forecastHours).toBeGreaterThanOrEqual(0);
    });
  });
});
