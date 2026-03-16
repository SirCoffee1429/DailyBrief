// Handle different file types
async function handleFileUpload(file) {
  const fileType = file.type;
  
  if (fileType === 'application/pdf') {
    return await parsePDF(file);
  } else if (fileType.includes('image')) {
    return await parseImage(file);
  } else if (fileType.includes('excel') || file.name.endsWith('.xlsx')) {
    return await parseExcel(file);
  } else if (fileType === 'text/plain' || file.name.endsWith('.txt')) {
    return await parseText(file);
  } else {
    // Default: try to extract text and use AI
    const text = await extractText(file);
    return await parseWithAI(text);
  }
}