import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

const data = new Uint8Array(fs.readFileSync('sample-data/test_beos/Event-documents (8).pdf'));
pdfjsLib.getDocument(data).promise.then(async doc => {
    let text = '';
    for(let i=1; i<=Math.min(doc.numPages, 3); i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(s => s.str).join(' ');
    }
    console.log(text.substring(0, 3000));
}).catch(console.error);
