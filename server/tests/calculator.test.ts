import { Calculator } from '../src/core/calculator';

describe('Calculator', () => {
  const calc = new Calculator();

  test('should handle basic arithmetic operations', () => {
    expect(calc.calculate('2 + 3')).toBe(5);
    expect(calc.calculate('10 - 4')).toBe(6);
    expect(calc.calculate('3 * 7')).toBe(21);
    expect(calc.calculate('8 / 2')).toBe(4);
  });

  test('should handle operator precedence correctly', () => {
    expect(calc.calculate('2 + 3 * 4')).toBe(14);
    expect(calc.calculate('10 - 2 * 3')).toBe(4);
    expect(calc.calculate('2 * 3 + 4')).toBe(10);
  });

  test('should handle parentheses', () => {
    expect(calc.calculate('(2 + 3) * 4')).toBe(20);
    expect(calc.calculate('2 * (3 + 4)')).toBe(14);
    expect(calc.calculate('(10 - 2) / (2 + 2)')).toBe(2);
    expect(calc.calculate('((2 + 3) * 4) - 1')).toBe(19);
  });

  test('should handle decimal numbers', () => {
    expect(calc.calculate('3.5 + 2.1')).toBeCloseTo(5.6);
    expect(calc.calculate('10.5 / 2')).toBe(5.25);
    expect(calc.calculate('0.1 + 0.2')).toBeCloseTo(0.3);
  });

  test('should handle negative numbers', () => {
    expect(calc.calculate('-5 + 3')).toBe(-2);
    expect(calc.calculate('5 + (-3)')).toBe(2);
    expect(calc.calculate('-2 * 3')).toBe(-6);
  });

  test('should throw error for division by zero', () => {
    expect(() => calc.calculate('5 / 0')).toThrow('Division by zero');
  });

  test('should throw error for empty expression', () => {
    expect(() => calc.calculate('')).toThrow('Empty expression');
    expect(() => calc.calculate('   ')).toThrow('Empty expression');
  });

  test('should throw error for invalid characters', () => {
    expect(() => calc.calculate('2 + a')).toThrow('Invalid characters');
    expect(() => calc.calculate('2 @ 3')).toThrow('Invalid characters');
  });

  test('should throw error for unbalanced parentheses', () => {
    expect(() => calc.calculate('(2 + 3')).toThrow('Unbalanced parentheses');
    expect(() => calc.calculate('2 + 3)')).toThrow('Unbalanced parentheses');
  });

  test('should throw error for invalid syntax', () => {
    expect(() => calc.calculate('2 + + 3')).toThrow('Invalid expression syntax');
    expect(() => calc.calculate('2 *')).toThrow('Invalid expression syntax');
  });

  test('should handle complex expressions', () => {
    expect(calc.calculate('2 + 3 * (4 - 1) / 2')).toBe(6.5);
    expect(calc.calculate('((10 - 2) * 3 + 4) / 2')).toBe(14);
  });
});