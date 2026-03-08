import express from 'express';
import { Calculator } from '../core/calculator';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('../web'));

// API endpoint for calculations
app.post('/api/calculate', (req, res) => {
  const { expression } = req.body;
  
  if (!expression) {
    return res.status(400).json({ error: 'Expression is required' });
  }
  
  const calc = new Calculator();
  
  try {
    const result = calc.calculate(expression);
    res.json({ result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Serve web calculator at root
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../web/index.html');
});

app.listen(port, () => {
  console.log(`Calculator server running at http://localhost:${port}`);
});