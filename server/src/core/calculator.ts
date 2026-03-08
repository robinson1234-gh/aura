export class Calculator {
  private operators = ['+', '-', '*', '/'];
  
  /**
   * Calculates mathematical expression
   * @param expression Mathematical expression string (e.g., "2 + 3 * (4 - 1)")
   * @returns Result of the calculation
   * @throws Error if expression is invalid
   */
  calculate(expression: string): number {
    if (!expression || !expression.trim()) {
      throw new Error('Empty expression');
    }
    
    // Remove all spaces
    const cleanExpression = expression.replace(/\s+/g, '');
    
    // Validate characters - only allow digits, operators, parentheses, and decimal points
    if (!/^[0-9+\-*/.()]+$/.test(cleanExpression)) {
      throw new Error('Invalid characters in expression');
    }
    
    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of cleanExpression) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) throw new Error('Unbalanced parentheses');
    }
    if (parenCount !== 0) throw new Error('Unbalanced parentheses');
    
    try {
      const tokens = this.tokenize(cleanExpression);
      return this.evaluate(tokens);
    } catch (error) {
      throw new Error('Invalid expression syntax');
    }
  }

  /**
   * Tokenizes the expression into numbers and operators
   */
  private tokenize(expr: string): string[] {
    const tokens: string[] = [];
    let current = '';
    
    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      
      if (/\d|\./.test(char)) {
        current += char;
      } else {
        if (current) {
          // Validate number format
          if (!/^\d*\.?\d+$/.test(current)) {
            throw new Error('Invalid number format');
          }
          tokens.push(current);
          current = '';
        }
        
        // Handle negative numbers at start or after opening parenthesis
        if (char === '-' && (i === 0 || expr[i - 1] === '(')) {
          current = '-';
        } else {
          tokens.push(char);
        }
      }
    }
    
    if (current) {
      if (!/^-?\d*\.?\d+$/.test(current)) {
        throw new Error('Invalid number format');
      }
      tokens.push(current);
    }
    
    return tokens;
  }

  /**
   * Evaluates tokenized expression using recursive descent parser
   */
  private evaluate(tokens: string[]): number {
    let index = 0;
    
    const parseAtom = (): number => {
      if (index >= tokens.length) {
        throw new Error('Unexpected end of expression');
      }
      
      const token = tokens[index];
      
      if (token === '(') {
        index++; // skip '('
        const value = parseExpression();
        if (index >= tokens.length || tokens[index] !== ')') {
          throw new Error('Missing closing parenthesis');
        }
        index++; // skip ')'
        return value;
      }
      
      if (/^-?\d*\.?\d+$/.test(token)) {
        index++;
        return parseFloat(token);
      }
      
      throw new Error(`Unexpected token: ${token}`);
    };

    const parseTerm = (): number => {
      let left = parseAtom();
      
      while (index < tokens.length && (tokens[index] === '*' || tokens[index] === '/')) {
        const operator = tokens[index];
        index++;
        const right = parseAtom();
        
        if (operator === '*') {
          left *= right;
        } else {
          if (right === 0) {
            throw new Error('Division by zero');
          }
          left /= right;
        }
      }
      
      return left;
    };

    const parseExpression = (): number => {
      // Handle potential leading minus sign
      let left: number;
      if (index < tokens.length && tokens[index] === '-') {
        index++;
        left = -parseTerm();
      } else {
        left = parseTerm();
      }
      
      while (index < tokens.length && (tokens[index] === '+' || tokens[index] === '-')) {
        const operator = tokens[index];
        index++;
        const right = parseTerm();
        
        if (operator === '+') {
          left += right;
        } else {
          left -= right;
        }
      }
      
      return left;
    };

    const result = parseExpression();
    
    if (index !== tokens.length) {
      throw new Error('Invalid syntax: unexpected tokens remaining');
    }
    
    return result;
  }
}