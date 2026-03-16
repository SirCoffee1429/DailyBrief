// Unit conversion map for standardizing recipe measurements
export const unitConversions = {
    // Weight
    'oz': { to: 'oz', factor: 1 },
    'ounce': { to: 'oz', factor: 1 },
    'ounces': { to: 'oz', factor: 1 },
    'lb': { to: 'lb', factor: 1 },
    'lbs': { to: 'lb', factor: 1 },
    'pound': { to: 'lb', factor: 1 },
    'pounds': { to: 'lb', factor: 1 },
    'g': { to: 'g', factor: 1 },
    'gram': { to: 'g', factor: 1 },
    'grams': { to: 'g', factor: 1 },
    'kg': { to: 'kg', factor: 1 },
    'kilogram': { to: 'kg', factor: 1 },

    // Volume
    'cup': { to: 'cup', factor: 1 },
    'cups': { to: 'cup', factor: 1 },
    'tbsp': { to: 'tbsp', factor: 1 },
    'tablespoon': { to: 'tbsp', factor: 1 },
    'tablespoons': { to: 'tbsp', factor: 1 },
    'tsp': { to: 'tsp', factor: 1 },
    'teaspoon': { to: 'tsp', factor: 1 },
    'teaspoons': { to: 'tsp', factor: 1 },
    'ml': { to: 'ml', factor: 1 },
    'milliliter': { to: 'ml', factor: 1 },
    'milliliters': { to: 'ml', factor: 1 },
    'l': { to: 'L', factor: 1 },
    'liter': { to: 'L', factor: 1 },
    'liters': { to: 'L', factor: 1 },
    'fl oz': { to: 'fl oz', factor: 1 },
    'fluid ounce': { to: 'fl oz', factor: 1 },
    'quart': { to: 'quart', factor: 1 },
    'quarts': { to: 'quart', factor: 1 },
    'qt': { to: 'quart', factor: 1 },
    'gallon': { to: 'gallon', factor: 1 },
    'gallons': { to: 'gallon', factor: 1 },
    'gal': { to: 'gallon', factor: 1 },
    'pint': { to: 'pint', factor: 1 },
    'pints': { to: 'pint', factor: 1 },
    'pt': { to: 'pint', factor: 1 },

    // Count
    'each': { to: 'each', factor: 1 },
    'ea': { to: 'each', factor: 1 },
    'piece': { to: 'each', factor: 1 },
    'pieces': { to: 'each', factor: 1 },
    'pc': { to: 'each', factor: 1 },
    'pcs': { to: 'each', factor: 1 },
    'portion': { to: 'each', factor: 1 },
    'portions': { to: 'each', factor: 1 },
    'slice': { to: 'slice', factor: 1 },
    'slices': { to: 'slice', factor: 1 },

    // Pinch / dash
    'pinch': { to: 'pinch', factor: 1 },
    'dash': { to: 'dash', factor: 1 },
    'bunch': { to: 'bunch', factor: 1 },
    'sprig': { to: 'sprig', factor: 1 },
    'sprigs': { to: 'sprig', factor: 1 },
    'clove': { to: 'clove', factor: 1 },
    'cloves': { to: 'clove', factor: 1 },
    'can': { to: 'can', factor: 1 },
    'cans': { to: 'can', factor: 1 },
}

export function normalizeUnit(unit) {
    if (!unit) return ''
    const normalized = unitConversions[unit.toLowerCase().trim()]
    return normalized ? normalized.to : unit
}
