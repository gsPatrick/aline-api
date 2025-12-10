import fs from 'fs';

const filePath = '/Users/patricksiqueira/ALINE-CORNERPRO/aline-api/APIFUTEBOL.json';

try {
    const rawData = fs.readFileSync(filePath);
    const collection = JSON.parse(rawData);
    const includes = new Set();

    function traverse(item) {
        if (item.item) {
            item.item.forEach(traverse);
        }
        if (item.request && item.request.url) {
            let url = "";
            if (typeof item.request.url === 'string') {
                url = item.request.url;
            } else if (item.request.url.raw) {
                url = item.request.url.raw;
            }

            // Extract includes from URL query params
            // Pattern: include=...
            if (typeof url === 'string') {
                const match = url.match(/include=([^&]*)/);
                if (match && match[1]) {
                    const incs = match[1].split(/[;,]/); // SportMonks uses ; or , separator
                    incs.forEach(inc => includes.add(inc.trim()));
                }
            }

            // Check query parameters array
            if (item.request.url.query) {
                item.request.url.query.forEach(q => {
                    if (q.key === 'include') {
                        const incs = q.value.split(/[;,]/);
                        incs.forEach(inc => includes.add(inc.trim()));
                    }
                });
            }
        }
    }

    traverse(collection);

    console.log("=== UNIQUE INCLUDES FOUND IN DOCUMENTATION ===");
    const sortedIncludes = Array.from(includes).sort();
    sortedIncludes.forEach(inc => console.log(inc));

} catch (err) {
    console.error("Error reading or parsing file:", err);
}
