// Simple calculator logic for web interface
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
    if (!expression.trim()) {
        document.getElementById('result').textContent = '= 0';
        return;
    }
    
    try {
        // Use JavaScript's eval for simplicity in web version
        // In production, you'd want to use the same logic as the core calculator
        const result = eval(expression);
        if (!isFinite(result)) {
            throw new Error('Invalid operation');
        }
        document.getElementById('result').textContent = '= ' + result;
    } catch (error) {
        document.getElementById('result').textContent = '= Error';
    }
}

function updateResult() {
    const expression = document.getElementById('expression').value;
    if (!expression.trim()) {
        document.getElementById('result').textContent = '= 0';
        return;
    }
    
    try {
        const result = eval(expression);
        if (!isFinite(result)) {
            return;
        }
        document.getElementById('result').textContent = '= ' + result;
    } catch (error) {
        // Don't show error during typing
    }
}

// Keyboard support
document.addEventListener('keydown', function(event) {
    const key = event.key;
    
    if (key >= '0' && key <= '9' || key === '.' || key === '+' || key === '-' || key === '*' || key === '/' || key === '(' || key === ')') {
        appendToExpression(key);
    } else if (key === 'Enter') {
        calculate();
    } else if (key === 'Escape' || key === 'c' || key === 'C') {
        clearDisplay();
    } else if (key === 'Backspace') {
        const input = document.getElementById('expression');
        input.value = input.value.slice(0, -1);
        updateResult();
    }
});