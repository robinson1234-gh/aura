// Simple calculator logic for web interface
// Since we can't use the TypeScript class directly in browser,
// we'll implement a simplified version

function calculateExpression(expression) {
    try {
        // Basic validation
        if (!expression.trim()) {
            throw new Error('Empty expression');
        }
        
        // Remove spaces
        expression = expression.replace(/\s+/g, '');
        
        // Validate characters
        if (!/^[0-9+\-*/.()]+$/.test(expression)) {
            throw new Error('Invalid characters');
        }
        
        // Check balanced parentheses
        let parenCount = 0;
        for (const char of expression) {
            if (char === '(') parenCount++;
            if (char === ')') parenCount--;
            if (parenCount < 0) throw new Error('Unbalanced parentheses');
        }
        if (parenCount !== 0) throw new Error('Unbalanced parentheses');
        
        // Use Function constructor for safe evaluation (avoiding eval)
        // This is acceptable for a simple calculator demo
        const result = Function('"use strict"; return (' + expression + ')')();
        
        if (!isFinite(result)) {
            throw new Error('Invalid result');
        }
        
        return result;
    } catch (error) {
        throw new Error('Invalid expression');
    }
}

function appendToExpression(value) {
    const input = document.getElementById('expression');
    input.value += value;
    updateResult();
}

function clearDisplay() {
    document.getElementById('expression').value = '';
    document.getElementById('result').textContent = '= 0';
}

function calculate() {
    const expression = document.getElementById('expression').value;
    try {
        const result = calculateExpression(expression);
        document.getElementById('result').textContent = '= ' + result;
    } catch (error) {
        document.getElementById('result').textContent = '= Error';
    }
}

function updateResult() {
    const expression = document.getElementById('expression').value;
    if (expression.trim()) {
        try {
            const result = calculateExpression(expression);
            document.getElementById('result').textContent = '= ' + result;
        } catch (error) {
            // Don't show error during typing
            document.getElementById('result').textContent = '';
        }
    } else {
        document.getElementById('result').textContent = '= 0';
    }
}

// Add keyboard support
document.getElementById('expression').addEventListener('input', updateResult);
document.getElementById('expression').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        calculate();
    }
});