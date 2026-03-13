import fs from 'fs';
import path from 'path';

// The URL of our deployed Edge Function
const EDGE_FUNCTION_URL = 'https://chajwmoohmiugdgvqjyo.functions.supabase.co/process-sales-data';

async function testEdgeFunction() {
    console.log("Reading sample PDF...");
    const pdfPath = path.join(process.cwd(), 'app', 'sample-data', 'sales data', '031226.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const base64Pdf = pdfBuffer.toString('base64');

    // Simulate the Postmark Webhook Payload
    const payload = {
        "FromName": "Ryan Coffee",
        "From": "ryan@oldhawthorne.com",
        "Subject": "Fwd: Item Sales Report",
        "Attachments": [
            {
                "Name": "031226.pdf",
                "Content": base64Pdf,
                "ContentType": "application/pdf",
                "ContentLength": pdfBuffer.length
            }
        ]
    };

    console.log("Sending simulated webhook to Edge Function...");
    try {
        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log("✅ Success! Edge Function processed the PDF.");
            console.dir(data, { depth: null });
        } else {
            console.error("❌ Failed!");
            console.log("Status:", response.status);
            console.dir(data, { depth: null });
        }
    } catch (err) {
         console.error("❌ Request Error:", err);
    }
}

testEdgeFunction();
