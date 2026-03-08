# Calculator

A simple calculator application that supports basic arithmetic operations with proper operator precedence and parentheses.

## Features

- **Basic Operations**: Addition (+), Subtraction (-), Multiplication (*), Division (/)
- **Operator Precedence**: Multiplication and division are evaluated before addition and subtraction
- **Parentheses**: Full support for nested parentheses to override precedence
- **Decimal Numbers**: Support for floating-point numbers
- **Negative Numbers**: Support for negative values
- **Multiple Interfaces**: CLI, Web, and core library

## Installation

```bash
npm install
npm run build
```

## Usage

### CLI Interface

```bash
# Calculate an expression
npm run dev "2 + 3 * (4 - 1)"

# Or after building
npm start "10 / 2 + 3"

# Install globally (optional)
npm link
calculator "5 * 6"
```

### Web Interface

1. Start the web server:
   ```bash
   npm run serve
   ```
2. Open your browser to `http://localhost:3000`
3. Use the calculator interface or type expressions directly

### Core Library

You can also use the calculator as a library in your TypeScript/JavaScript projects:

```typescript
import { Calculator } from './src/core/calculator';

const calc = new Calculator();
const result = calc.calculate('2 + 3 * 4'); // Returns 14
```

## Testing

Run the unit tests:

```bash
npm test
```

## Examples

- `2 + 3 * 4` → `14`
- `(2 + 3) * 4` → `20`
- `10 - 2 * 3` → `4`
- `-5 + 3` → `-2`
- `3.5 + 2.1` → `5.6`
- `((10 - 2) * 3 + 4) / 2` → `14`

## Error Handling

The calculator will throw appropriate errors for:
- Division by zero
- Invalid characters
- Unbalanced parentheses
- Empty expressions
- Invalid syntax

## License

MIT