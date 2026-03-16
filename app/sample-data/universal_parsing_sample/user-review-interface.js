function RecipeReviewModal({ parsedRecipe, onConfirm, onEdit }) {
  return (
    <div className="review-modal">
      <h2>Review Parsed Recipe</h2>
      <p>Confidence: {parsedRecipe.confidence * 100}%</p>
      
      {parsedRecipe.needsReview && (
        <div className="warning">
          ⚠️ Please review - AI wasn't confident
        </div>
      )}
      
      <div className="parsed-content">
        <h3>{parsedRecipe.name}</h3>
        <p>Yield: {parsedRecipe.yield} portions</p>
        
        <h4>Ingredients:</h4>
        <ul>
          {parsedRecipe.ingredients.map((ing, i) => (
            <li key={i}>
              {ing.quantity} {ing.unit} {ing.name}
              <button onClick={() => onEdit(i)}>Edit</button>
            </li>
          ))}
        </ul>
      </div>
      
      <button onClick={onConfirm}>✓ Looks Good</button>
      <button onClick={() => onEdit()}>✏️ Edit</button>
    </div>
  );
}