export const WORKBOOK_CATEGORIES = ['All', 'Salad', 'Fry', 'Sauces', 'BBQ', 'Grill', 'Sautee', 'Add-Ons', 'Uncategorized']

export function formatFileSize(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
}
