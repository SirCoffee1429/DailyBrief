async function parseWithAI(recipeText) {
  // Parse with AI
  const parsed = await callClaudeAPI(recipeText);
  
  // Validate structure
  const validated = validateRecipe(parsed);
  
  // Return with confidence score
  return {
    ...validated,
    confidence: calculateConfidence(validated),
    needsReview: validated.confidence < 0.8
  };
}

function validateRecipe(parsed) {
  // Ensure required fields exist
  if (!parsed.name) parsed.name = 'Untitled Recipe';
  if (!parsed.ingredients) parsed.ingredients = [];
  if (!parsed.yield) parsed.yield = 1;
  
  // Normalize units
  parsed.ingredients = parsed.ingredients.map(ing => ({
    ...ing,
    unit: normalizeUnit(ing.unit)
  }));
  
  return parsed;
}