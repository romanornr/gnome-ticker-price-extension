export function assertEqual(actual, expected, message = 'Expected values to be equal') {
    if (actual !== expected)
        throw new Error(`${message}. Expected ${formatValue(expected)}, got ${formatValue(actual)}.`);
}

export function assertDeepEqual(actual, expected, message = 'Expected values to be deeply equal') {
    const actualText = JSON.stringify(actual);
    const expectedText = JSON.stringify(expected);
    if (actualText !== expectedText)
        throw new Error(`${message}. Expected ${expectedText}, got ${actualText}.`);
}

export function assertTruthy(value, message = 'Expected value to be truthy') {
    if (!value)
        throw new Error(message);
}

export function assertFalse(value, message = 'Expected value to be false') {
    if (value !== false)
        throw new Error(`${message}. Expected false, got ${formatValue(value)}.`);
}

function formatValue(value) {
    return typeof value === 'string' ? `"${value}"` : `${value}`;
}
