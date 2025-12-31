
const apiKey = 'AIzaSyDsOq2fJCdWRRKNlP87D_yf02LRYxfNAyE';

async function check() {
    console.log('Fetching models list direct via HTTP...');
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        console.log(`Status: ${res.status} ${res.statusText}`);
        const data = await res.json();
        console.log('Body:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

check();
