import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import * as XLSX from 'xlsx'

export default function WorkbookUpload() {
    const [files, setFiles] = useState([])
    const [uploading, setUploading] = useState(false)
    const [dragging, setDragging] = useState(false)
    const inputRef = useRef(null)

    function handleFiles(fileList) {
        const xlsxFiles = Array.from(fileList).filter(f =>
            f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
        )
        setFiles(prev => [
            ...prev,
            ...xlsxFiles.map(f => ({ file: f, status: 'pending', name: f.name }))
        ])
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

    async function uploadAll() {
        if (files.length === 0) return
        setUploading(true)

        for (let i = 0; i < files.length; i++) {
            const item = files[i]
            try {
                // Update status to uploading
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f))

                // Upload to Supabase storage
                const timestamp = Date.now()
                const storagePath = `${timestamp}_${item.name}`
                const { error: uploadError } = await supabase.storage
                    .from('workbooks')
                    .upload(storagePath, item.file)

                if (uploadError) throw uploadError

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('workbooks')
                    .getPublicUrl(storagePath)

                // Parse the workbook client-side
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'parsing' } : f))

                const arrayBuffer = await item.file.arrayBuffer()
                const workbook = XLSX.read(arrayBuffer, { type: 'array' })

                // Insert workbook record
                const { data: wbData, error: wbError } = await supabase
                    .from('workbooks')
                    .insert({
                        file_name: item.name,
                        file_url: urlData.publicUrl,
                        file_size: item.file.size,
                        sheet_count: workbook.SheetNames.length,
                        status: 'parsed'
                    })
                    .select()
                    .single()

                if (wbError) throw wbError

                // Insert each sheet
                const sheetsToInsert = []
                const chunksToInsert = []

                workbook.SheetNames.forEach((sheetName, sheetIndex) => {
                    const worksheet = workbook.Sheets[sheetName]
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

                    if (jsonData.length === 0) return

                    // Find max columns to ensure we don't drop data like "Measure"
                    let maxCols = 0
                    jsonData.forEach(row => {
                        if (row.length > maxCols) maxCols = row.length
                    })

                    // Generate true column headers A, B, C to cover the max length
                    const headers = Array.from({ length: maxCols }, (_, i) => XLSX.utils.encode_col(i))
                    const rows = jsonData

                    sheetsToInsert.push({
                        workbook_id: wbData.id,
                        sheet_name: sheetName,
                        sheet_index: sheetIndex,
                        headers: headers,
                        rows: rows
                    })

                    // Create text chunks for AI (every 30 rows)
                    const chunkSize = 30
                    for (let r = 0; r < rows.length; r += chunkSize) {
                        const chunkRows = rows.slice(r, r + chunkSize)
                        const textLines = chunkRows.map((row, idx) => {
                            const cellVals = []
                            for (let i = 0; i < maxCols; i++) {
                                if (row[i] !== undefined && row[i] !== null && row[i] !== '') {
                                    cellVals.push(`Col ${headers[i]}: ${row[i]}`)
                                }
                            }
                            return `Row ${r + idx + 1} -> ` + cellVals.join(' | ')
                        })
                        chunksToInsert.push({
                            workbook_id: wbData.id,
                            sheet_name: sheetName,
                            content: `File: ${item.name}\nSheet: ${sheetName}\n${textLines.join('\n')}`,
                            row_start: r + 1,
                            row_end: Math.min(r + chunkSize, rows.length)
                        })
                    }
                })

                if (sheetsToInsert.length > 0) {
                    await supabase.from('workbook_sheets').insert(sheetsToInsert)
                }
                if (chunksToInsert.length > 0) {
                    await supabase.from('workbook_chunks').insert(chunksToInsert)
                }

                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done' } : f))
            } catch (err) {
                console.error('Upload error:', err)
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: err.message } : f))
            }
        }

        setUploading(false)
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Upload Recipes</h1>
                <p className="page-subtitle">Drag and drop .xlsx files to upload, parse, and store them.</p>
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
                    Drop .xlsx files here or click to browse
                </div>
                <div className="upload-zone-hint">
                    Supports multiple files at once
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls"
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
                                <span style={{ fontSize: '1.2rem' }}>📄</span>
                                <span className="upload-file-name">{f.name}</span>
                                <span className="upload-file-status">
                                    {f.status === 'pending' && '⏳ Ready'}
                                    {f.status === 'uploading' && <><span className="spinner" /> Uploading...</>}
                                    {f.status === 'parsing' && <><span className="spinner" /> Parsing...</>}
                                    {f.status === 'done' && <span className="badge badge-success">✓ Done</span>}
                                    {f.status === 'error' && <span className="badge badge-danger">✗ Error</span>}
                                </span>
                                {f.status === 'pending' && (
                                    <button className="btn btn-sm btn-danger" onClick={() => removeFile(i)}>✕</button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)' }}>
                        <button
                            className="btn btn-primary"
                            onClick={uploadAll}
                            disabled={uploading || files.every(f => f.status === 'done')}
                        >
                            {uploading ? 'Uploading...' : `Upload ${files.filter(f => f.status === 'pending').length} File(s)`}
                        </button>
                        {!uploading && (
                            <button className="btn btn-secondary" onClick={() => setFiles([])}>
                                Clear All
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
