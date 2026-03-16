import { useState } from 'react'
import { normalizeUnit } from '../lib/unitConversions.js'

export default function RecipeReviewModal({ recipes, onConfirm, onCancel, onReparse }) {
    const [editedRecipes, setEditedRecipes] = useState(
        recipes.map(r => ({
            ...r,
            ingredients: r.ingredients.map(ing => ({
                ...ing,
                unit: normalizeUnit(ing.unit)
            }))
        }))
    )
    const [activeRecipeIndex, setActiveRecipeIndex] = useState(0)

    function updateRecipe(index, field, value) {
        setEditedRecipes(prev => prev.map((r, i) =>
            i === index ? { ...r, [field]: value } : r
        ))
    }

    function updateIngredient(recipeIndex, ingIndex, field, value) {
        setEditedRecipes(prev => prev.map((r, ri) => {
            if (ri !== recipeIndex) return r
            return {
                ...r,
                ingredients: r.ingredients.map((ing, ii) =>
                    ii === ingIndex ? { ...ing, [field]: value } : ing
                )
            }
        }))
    }

    function removeIngredient(recipeIndex, ingIndex) {
        setEditedRecipes(prev => prev.map((r, ri) => {
            if (ri !== recipeIndex) return r
            return {
                ...r,
                ingredients: r.ingredients.filter((_, ii) => ii !== ingIndex)
            }
        }))
    }

    function addIngredient(recipeIndex) {
        setEditedRecipes(prev => prev.map((r, ri) => {
            if (ri !== recipeIndex) return r
            return {
                ...r,
                ingredients: [...r.ingredients, { name: '', quantity: null, unit: '' }]
            }
        }))
    }

    function updateInstruction(recipeIndex, instrIndex, value) {
        setEditedRecipes(prev => prev.map((r, ri) => {
            if (ri !== recipeIndex) return r
            return {
                ...r,
                instructions: r.instructions.map((inst, ii) =>
                    ii === instrIndex ? value : inst
                )
            }
        }))
    }

    function removeInstruction(recipeIndex, instrIndex) {
        setEditedRecipes(prev => prev.map((r, ri) => {
            if (ri !== recipeIndex) return r
            return {
                ...r,
                instructions: r.instructions.filter((_, ii) => ii !== instrIndex)
            }
        }))
    }

    function addInstruction(recipeIndex) {
        setEditedRecipes(prev => prev.map((r, ri) => {
            if (ri !== recipeIndex) return r
            return {
                ...r,
                instructions: [...r.instructions, '']
            }
        }))
    }

    const recipe = editedRecipes[activeRecipeIndex]
    if (!recipe) return null

    const confidencePercent = Math.round((recipe.confidence || 0) * 100)
    const isLowConfidence = confidencePercent < 80

    return (
        <div className="review-overlay" onClick={onCancel}>
            <div className="review-modal" onClick={e => e.stopPropagation()}>
                <div className="review-modal-header">
                    <h2>Review Parsed Recipe{editedRecipes.length > 1 ? 's' : ''}</h2>
                    <button className="btn btn-sm btn-secondary" onClick={onCancel}>✕</button>
                </div>

                {editedRecipes.length > 1 && (
                    <div className="review-recipe-tabs">
                        {editedRecipes.map((r, i) => (
                            <button
                                key={i}
                                className={`btn btn-sm ${i === activeRecipeIndex ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setActiveRecipeIndex(i)}
                            >
                                {r.name || `Recipe ${i + 1}`}
                            </button>
                        ))}
                    </div>
                )}

                <div className="review-confidence">
                    <div className="confidence-label">
                        AI Confidence: <strong>{confidencePercent}%</strong>
                    </div>
                    <div className="confidence-bar-track">
                        <div
                            className={`confidence-bar-fill ${isLowConfidence ? 'low' : 'high'}`}
                            style={{ width: `${confidencePercent}%` }}
                        />
                    </div>
                </div>

                {isLowConfidence && (
                    <div className="review-warning">
                        ⚠️ AI wasn't very confident in this parse — please review carefully and correct any errors.
                    </div>
                )}

                <div className="review-body">
                    {/* Recipe Name */}
                    <div className="review-field">
                        <label>Recipe Name</label>
                        <input
                            className="input"
                            value={recipe.name}
                            onChange={e => updateRecipe(activeRecipeIndex, 'name', e.target.value)}
                        />
                    </div>

                    {/* Yield */}
                    <div className="review-field-row">
                        <div className="review-field">
                            <label>Yield</label>
                            <input
                                className="input"
                                type="number"
                                value={recipe.yield || ''}
                                onChange={e => updateRecipe(activeRecipeIndex, 'yield', e.target.value ? Number(e.target.value) : null)}
                            />
                        </div>
                        <div className="review-field">
                            <label>Yield Unit</label>
                            <input
                                className="input"
                                value={recipe.yield_unit || ''}
                                onChange={e => updateRecipe(activeRecipeIndex, 'yield_unit', e.target.value)}
                            />
                        </div>
                        <div className="review-field">
                            <label>Prep Time</label>
                            <input
                                className="input"
                                value={recipe.prep_time || ''}
                                onChange={e => updateRecipe(activeRecipeIndex, 'prep_time', e.target.value)}
                            />
                        </div>
                        <div className="review-field">
                            <label>Cook Time</label>
                            <input
                                className="input"
                                value={recipe.cook_time || ''}
                                onChange={e => updateRecipe(activeRecipeIndex, 'cook_time', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Ingredients */}
                    <div className="review-section">
                        <div className="review-section-header">
                            <h3>Ingredients ({recipe.ingredients.length})</h3>
                            <button className="btn btn-sm btn-primary" onClick={() => addIngredient(activeRecipeIndex)}>+ Add</button>
                        </div>
                        <div className="review-ingredients">
                            {recipe.ingredients.map((ing, i) => (
                                <div key={i} className="review-ingredient-row">
                                    <input
                                        className="input review-ing-qty"
                                        type="number"
                                        step="any"
                                        placeholder="Qty"
                                        value={ing.quantity ?? ''}
                                        onChange={e => updateIngredient(activeRecipeIndex, i, 'quantity', e.target.value ? Number(e.target.value) : null)}
                                    />
                                    <input
                                        className="input review-ing-unit"
                                        placeholder="Unit"
                                        value={ing.unit || ''}
                                        onChange={e => updateIngredient(activeRecipeIndex, i, 'unit', e.target.value)}
                                    />
                                    <input
                                        className="input review-ing-name"
                                        placeholder="Ingredient name"
                                        value={ing.name}
                                        onChange={e => updateIngredient(activeRecipeIndex, i, 'name', e.target.value)}
                                    />
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => removeIngredient(activeRecipeIndex, i)}
                                        title="Remove ingredient"
                                    >✕</button>
                                </div>
                            ))}
                            {recipe.ingredients.length === 0 && (
                                <div className="text-muted" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                                    No ingredients parsed — click "+ Add" to add manually.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="review-section">
                        <div className="review-section-header">
                            <h3>Instructions ({recipe.instructions.length})</h3>
                            <button className="btn btn-sm btn-primary" onClick={() => addInstruction(activeRecipeIndex)}>+ Add Step</button>
                        </div>
                        <div className="review-instructions">
                            {recipe.instructions.map((inst, i) => (
                                <div key={i} className="review-instruction-row">
                                    <span className="review-step-num">{i + 1}.</span>
                                    <textarea
                                        className="input review-instruction-text"
                                        value={inst}
                                        rows={2}
                                        onChange={e => updateInstruction(activeRecipeIndex, i, e.target.value)}
                                    />
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => removeInstruction(activeRecipeIndex, i)}
                                        title="Remove step"
                                    >✕</button>
                                </div>
                            ))}
                            {recipe.instructions.length === 0 && (
                                <div className="text-muted" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                                    No instructions parsed — click "+ Add Step" to add manually.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="review-modal-footer">
                    <button className="btn btn-secondary" onClick={onReparse}>🔄 Re-parse</button>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                        <button className="btn btn-primary" onClick={() => onConfirm(editedRecipes)}>
                            ✓ Confirm & Save {editedRecipes.length > 1 ? `(${editedRecipes.length} recipes)` : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
