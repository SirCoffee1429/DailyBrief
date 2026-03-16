// This example uses Claude API to parse a recipe into structured JSON format. Use Gemini API instead with model 3 Flash
async function parseRecipe(recipeText) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307', // Cheapest option
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Parse this recipe into structured JSON format:
        
        RECIPE:
        ${recipeText}
        
        Return ONLY valid JSON with this structure:
        {
          "name": "recipe name",
          "yield": number,
          "yield_unit": "portions",
          "ingredients": [
            {"name": "ingredient", "quantity": number, "unit": "unit"}
          ],
          "instructions": ["step 1", "step 2"],
          "categories": ["category1"],
          "prep_time": "30 minutes",
          "cook_time": "45 minutes"
        }`
      }]
    })
  });
  
  const data = await response.json();
  return JSON.parse(data.content[0].text);
}