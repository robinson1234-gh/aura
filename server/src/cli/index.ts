#!/usr/bin/env node

import { Calculator } from '../core/calculator';

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: calculator "<expression>"');
    console.log('Example: calculator "2 + 3 * (4 - 1)"');
    process.exit(1);
  }
  
  const expression = args.join(' ');
  const calculator = new Calculator();
  
  try {
    const result = calculator.calculate(expression);
    console.log(result);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}