import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import * as XLSX from 'xlsx'
import { useCategories } from '../lib/useCategories.js'
import RecipeReviewModal from '../components/RecipeReviewModal.jsx'

// Supported file extensions and their MIME types
const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.gif,.webp,.xlsx,.xls,.csv,.txt,.doc,.docx'
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

export default function WorkbookUpload() {
    const { categories } = useCategories()
    const [files, setFiles] = useState([])
    const [uploading, setUploading] = useState(false)
    const [dragging, setDragging] = useState(false)
    const [reviewState, setReviewState] = useState(null) // { fileIndex, recipes, rawText }
    const inputRef = useRef(null)

    function handleFiles(fileList) {
        const newFiles = Array.from(fileList).map(f => ({
            file: f,
            status: 'pending',
            name: f.name
        }))
        setFiles(prev => [...prev, ...newFiles])
    }

    function handleDrop(e) {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
    }

    function handleDragOver(e) {
        e.preventDefault()
        setDragging(true)
    }

    function removeFile(index) {
        setFiles(prev => prev.filter((_, i) => i !== index))
    }

    // Extract text content from different file types
    async function extractContent(file) {
        const fileType = file.type
        const fileName = file.name.toLowerCase()

        // Excel files
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const arrayBuffer = await file.arrayBuffer()
            const workbook = XLSX.read(arrayBuffer, { type: 'array' })
            let allText = ''
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName]
                const csv = XLSX.utils.sheet_to_csv(worksheet)
                allText += `\n--- Sheet: ${sheetName} ---\n${csv}`
            })
            return { text: allText, mimeType: null, base64Data: null, workbook }
        }

        // CSV files
        if (fileName.endsWith('.csv') || fileType === 'text/csv') {
            const text = await file.text()
            return { text, mimeType: null, base64Data: null, workbook: null }
        }

        // Plain text files
        if (fileName.endsWith('.txt') || fileType === 'text/plain') {
            const text = await file.text()
            return { text, mimeType: null, base64Data: null, workbook: null }
        }

        // Images — send as base64 to Gemini vision
        if (IMAGE_TYPES.includes(fileType) || fileName.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
            const arrayBuffer = await file.arrayBuffer()
            const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            )
            return { text: null, mimeType: fileType || 'image/jpeg', base64Data: base64, workbook: null }
        }

        // PDF files — send as base64 to Gemini (it supports PDF natively)
        if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer()
            const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            )
            return { text: null, mimeType: 'application/pdf', base64Data: base64, workbook: null }
        }

        // Default: try to read as text
        try {
            const text = await file.text()
            return { text, mimeType: null, base64Data: null, workbook: null }
        } catch {
            throw new Error('Unsupported file type: ' + fileType)
        }
    }

    async function uploadAll() {
        if (files.length === 0) return
        setUploading(true)

        for (let i = 0; i < files.length; i++) {
            const item = files[i]
            if (item.status !== 'pending') continue

            try {
                // Check for duplicates
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'checking' } : f))

                const { data: existing } = await supabase
                    .from('workbooks')
                    .select('id')
                    .eq('file_name', item.name)
                    .maybeSingle()

                if (existing) {
                    setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'duplicate', error: 'File already exists' } : f))
                    continue
                }

                // Extract content
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'extracting' } : f))
                const { text, mimeType, base64Data, workbook } = await extractContent(item.file)

                // Send to AI for parsing
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'ai-parsing' } : f))

                const { data: parseResult, error: parseError } = await supabase.functions.invoke('parse-recipe', {
                    body: { text, mimeType, base64Data }
                })

                if (parseError) throw new Error('AI parsing failed: ' + parseError.message)

                const parsedRecipes = parseResult?.recipes || []

                if (parsedRecipes.length === 0) {
                    setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: 'No recipes found in file' } : f))
                    continue
                }

                // Show review modal and wait for user confirmation
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'review' } : f))
                setUploading(false)

                // Store review state — the upload loop pauses here
                setReviewState({
                    fileIndex: i,
                    recipes: parsedRecipes,
                    rawText: text,
                    mimeType,
                    base64Data,
                    workbook,
                    originalFile: item.file
                })
                return // Exit the loop; the review modal handles the rest

            } catch (err) {
                console.error('Upload error:', err)
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: err.message } : f))
            }
        }

        setUploading(false)
    }

    async function handleReviewConfirm(confirmedRecipes) {
        if (!reviewState) return
        const { fileIndex, rawText, workbook, originalFile } = reviewState

        setReviewState(null)
        setUploading(true)

        try {
            setFiles(prev => prev.map((f, idx) => idx === fileIndex ? { ...f, status: 'uploading' } : f))

            const item = files[fileIndex]

            // Upload to Supabase storage
            const timestamp = Date.now()
            const storagePath = `${timestamp}_${item.name}`
            const { error: uploadError } = await supabase.storage
                .from('workbooks')
                .upload(storagePath, originalFile)

            if (uploadError) throw uploadError

            const { data: urlData } = supabase.storage
                .from('workbooks')
                .getPublicUrl(storagePath)

            // Build sheets and chunks from the confirmed recipes
            const sheetsToInsert = []
            const chunksToInsert = []

            if (workbook) {
                // If it was an Excel file, keep the original sheet data  
                workbook.SheetNames.forEach((sheetName, sheetIndex) => {
                    const worksheet = workbook.Sheets[sheetName]
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
                    if (jsonData.length === 0) return

                    const headers = jsonData[0] ? jsonData[0].map((h, idx) => h || `Col ${idx + 1}`) : ['A']
                    sheetsToInsert.push({
                        sheet_name: sheetName,
                        sheet_index: sheetIndex,
                        headers: headers,
                        rows: jsonData
                    })
                })
            }

            // Build a text representation from the parsed recipes for chunks
            confirmedRecipes.forEach((recipe, idx) => {
                const ingredientText = recipe.ingredients
                    .map(ing => `${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim())
                    .join('\n')
                const instructionText = recipe.instructions.join('\n')

                const recipeText = [
                    `Recipe: ${recipe.name}`,
                    recipe.yield ? `Yield: ${recipe.yield} ${recipe.yield_unit || 'portions'}` : '',
                    recipe.prep_time ? `Prep Time: ${recipe.prep_time}` : '',
                    recipe.cook_time ? `Cook Time: ${recipe.cook_time}` : '',
                    '\nIngredients:',
                    ingredientText,
                    '\nInstructions:',
                    instructionText
                ].filter(Boolean).join('\n')

                chunksToInsert.push({
                    sheet_name: recipe.name || `Recipe ${idx + 1}`,
                    content: `File: ${item.name}\n${recipeText}`,
                    row_start: 1,
                    row_end: recipe.ingredients.length + recipe.instructions.length + 5
                })

                // If no workbook sheets, create a structured sheet from the parsed data
                if (!workbook) {
                    const headers = ['Qty', 'Unit', 'Ingredient']
                    const rows = recipe.ingredients.map(ing => [
                        ing.quantity || '', ing.unit || '', ing.name
                    ])
                    // Add instructions as additional rows
                    if (recipe.instructions.length > 0) {
                        rows.push([]) // empty separator row
                        rows.push(['Instructions', '', ''])
                        recipe.instructions.forEach((inst, ii) => {
                            rows.push([`${ii + 1}.`, inst, ''])
                        })
                    }
                    sheetsToInsert.push({
                        sheet_name: recipe.name || `Recipe ${idx + 1}`,
                        sheet_index: idx,
                        headers: headers,
                        rows: rows
                    })
                }
            })

            // Categorize using the first recipe's text
            let category = ['Uncategorized']
            if (chunksToInsert.length > 0) {
                try {
                    const { data, error } = await supabase.functions.invoke('categorize-recipe', {
                        body: {
                            text: chunksToInsert[0].content,
                            categories: categories.map(c => c.name)
                        }
                    })
                    if (!error && data?.category && Array.isArray(data.category)) {
                        category = data.category
                    }
                } catch (catErr) {
                    console.error('Categorization error:', catErr)
                }
            }

            // Insert workbook record
            const { data: wbData, error: wbError } = await supabase
                .from('workbooks')
                .insert({
                    file_name: confirmedRecipes.length === 1 ? confirmedRecipes[0].name : item.name,
                    file_url: urlData.publicUrl,
                    file_size: originalFile.size,
                    sheet_count: sheetsToInsert.length || 1,
                    status: 'parsed',
                    category: category
                })
                .select()
                .single()

            if (wbError) throw wbError

            sheetsToInsert.forEach(s => s.workbook_id = wbData.id)
            chunksToInsert.forEach(c => c.workbook_id = wbData.id)

            if (sheetsToInsert.length > 0) {
                await supabase.from('workbook_sheets').insert(sheetsToInsert)
            }
            if (chunksToInsert.length > 0) {
                await supabase.from('workbook_chunks').insert(chunksToInsert)
            }

            setFiles(prev => prev.map((f, idx) => idx === fileIndex ? { ...f, status: 'done', category: category, workbookId: wbData.id } : f))

        } catch (err) {
            console.error('Save error:', err)
            setFiles(prev => prev.map((f, idx) => idx === fileIndex ? { ...f, status: 'error', error: err.message } : f))
        }

        // Continue uploading remaining pending files
        setUploading(false)
        // Check if there are more pending files and auto-continue
        const hasMorePending = files.some((f, idx) => idx > fileIndex && f.status === 'pending')
        if (hasMorePending) {
            setTimeout(() => uploadAll(), 100)
        }
    }

    async function handleReparse() {
        if (!reviewState) return
        const { fileIndex, rawText, mimeType, base64Data } = reviewState

        setReviewState(null)
        setFiles(prev => prev.map((f, idx) => idx === fileIndex ? { ...f, status: 'ai-parsing' } : f))
        setUploading(true)

        try {
            const { data: parseResult, error: parseError } = await supabase.functions.invoke('parse-recipe', {
                body: { text: rawText, mimeType, base64Data }
            })

            if (parseError) throw new Error('Re-parse failed: ' + parseError.message)

            const parsedRecipes = parseResult?.recipes || []

            if (parsedRecipes.length === 0) {
                setFiles(prev => prev.map((f, idx) => idx === fileIndex ? { ...f, status: 'error', error: 'No recipes found on re-parse' } : f))
                setUploading(false)
                return
            }

            setFiles(prev => prev.map((f, idx) => idx === fileIndex ? { ...f, status: 'review' } : f))
            setReviewState(prev => ({ ...prev, recipes: parsedRecipes }))
            setUploading(false)

        } catch (err) {
            console.error('Re-parse error:', err)
            setFiles(prev => prev.map((f, idx) => idx === fileIndex ? { ...f, status: 'error', error: err.message } : f))
            setUploading(false)
        }
    }

    function handleReviewCancel() {
        if (!reviewState) return
        const { fileIndex } = reviewState
        setFiles(prev => prev.map((f, idx) => idx === fileIndex ? { ...f, status: 'pending' } : f))
        setReviewState(null)
    }

    async function toggleCategory(index, categoryName) {
        let fileItem = files[index]
        let targetId = fileItem.workbookId

        let currentCategories = Array.isArray(fileItem.category) ? [...fileItem.category] : [fileItem.category || 'Uncategorized']

        if (currentCategories.includes(categoryName)) {
            currentCategories = currentCategories.filter(c => c !== categoryName)
            if (currentCategories.length === 0) currentCategories = ['Uncategorized']
        } else {
            currentCategories.push(categoryName)
            currentCategories = currentCategories.filter(c => c !== 'Uncategorized')
        }

        if (!targetId) {
            const { data } = await supabase
                .from('workbooks')
                .select('id')
                .eq('file_name', fileItem.name)
                .maybeSingle()

            if (data?.id) {
                targetId = data.id
            } else {
                console.error('Could not determine workbook ID for', fileItem.name)
                return
            }
        }

        setFiles(prev => prev.map((f, idx) => idx === index ? { ...f, category: currentCategories, workbookId: targetId } : f))

        try {
            const { error } = await supabase
                .from('workbooks')
                .update({ category: currentCategories })
                .eq('id', targetId)

            if (error) {
                console.error('Failed to update categories:', error)
            }
        } catch (err) {
            console.error('Error changing categories:', err)
        }
    }

    function getFileIcon(fileName) {
        const ext = fileName.split('.').pop()?.toLowerCase()
        switch (ext) {
            case 'pdf': return '📕'
            case 'xlsx': case 'xls': case 'csv': return '📊'
            case 'png': case 'jpg': case 'jpeg': case 'gif': case 'webp': return '🖼️'
            case 'txt': return '📝'
            case 'doc': case 'docx': return '📄'
            default: return '📎'
        }
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Upload Recipes</h1>
                <p className="page-subtitle">Upload recipes in any format — AI will parse and structure them for you.</p>
            </div>

            <div
                className={`upload-zone ${dragging ? 'dragging' : ''}`}
                onClick={() => inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={() => setDragging(false)}
            >
                <div className="upload-zone-icon">📤</div>
                <div className="upload-zone-text">
                    Drop files here or click to browse
                </div>
                <div className="upload-zone-hint">
                    Supports PDF, images, Excel, CSV, text files, and more
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => handleFiles(e.target.files)}
                />
            </div>

            {files.length > 0 && (
                <>
                    <div className="upload-file-list">
                        {files.map((f, i) => (
                            <div key={i} className="upload-file-item">
                                <span style={{ fontSize: '1.2rem' }}>{getFileIcon(f.name)}</span>
                                <span className="upload-file-name">{f.name}</span>
                                <span className="upload-file-status">
                                    {f.status === 'pending' && '⏳ Ready'}
                                    {f.status === 'checking' && <><span className="spinner" /> Checking...</>}
                                    {f.status === 'extracting' && <><span className="spinner" /> Extracting text...</>}
                                    {f.status === 'ai-parsing' && <><span className="spinner" /> AI parsing...</>}
                                    {f.status === 'uploading' && <><span className="spinner" /> Saving...</>}
                                    {f.status === 'review' && <span className="badge badge-info" style={{ backgroundColor: 'var(--bg-accent)', color: 'var(--text-accent)' }}>👁️ Reviewing...</span>}
                                    {f.status === 'done' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                            <span className="badge badge-success">✓ Done</span>

                                            {Array.isArray(f.category) && f.category.map((cat, idx) => (
                                                <span key={idx} className="badge badge-primary">{cat}</span>
                                            ))}
                                            {!Array.isArray(f.category) && f.category && (
                                                <span className="badge badge-primary">{f.category}</span>
                                            )}

                                            <select
                                                className="input"
                                                style={{ padding: '0.1rem 0.5rem', fontSize: '0.85rem', width: 'auto', minWidth: '150px' }}
                                                value="Add/Remove..."
                                                onChange={(e) => {
                                                    if (e.target.value && e.target.value !== "Add/Remove...") {
                                                        toggleCategory(i, e.target.value)
                                                    }
                                                }}
                                            >
                                                <option disabled>Add/Remove...</option>
                                                {categories.map(c => {
                                                    const isSelected = Array.isArray(f.category) ? f.category.includes(c.name) : f.category === c.name;
                                                    return (
                                                        <option key={c.id} value={c.name}>
                                                            {isSelected ? `✓ Remove ${c.name}` : `+ Add ${c.name}`}
                                                        </option>
                                                    )
                                                })}
                                            </select>
                                        </div>
                                    )}
                                    {f.status === 'error' && <span className="badge badge-danger">✗ {f.error || 'Error'}</span>}
                                    {f.status === 'duplicate' && <span className="badge badge-warning" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>⚠️ Duplicate</span>}
                                </span>
                                {(f.status === 'pending' || f.status === 'duplicate' || f.status === 'error') && (
                                    <button className="btn btn-sm btn-danger" onClick={() => removeFile(i)}>✕</button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)' }}>
                        <button
                            className="btn btn-primary"
                            onClick={uploadAll}
                            disabled={uploading || files.every(f => f.status !== 'pending')}
                        >
                            {uploading ? 'Processing...' : `Upload & Parse ${files.filter(f => f.status === 'pending').length} File(s)`}
                        </button>
                        {!uploading && (
                            <button className="btn btn-secondary" onClick={() => setFiles([])}>
                                Clear All
                            </button>
                        )}
                    </div>
                </>
            )}

            {reviewState && (
                <RecipeReviewModal
                    recipes={reviewState.recipes}
                    onConfirm={handleReviewConfirm}
                    onCancel={handleReviewCancel}
                    onReparse={handleReparse}
                />
            )}
        </div>
    )
}
