export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('receipt');

    if (!file || typeof file === 'string') {
      return new Response('No valid image file shared.', { status: 400 });
    }

    // Convert file to Base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Str = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Str}`;

    // Return HTML page that saves the Base64 to sessionStorage and redirects
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Processing Receipt...</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f3f4f6; color: #374151; }
            .loader { border: 4px solid #e5e7eb; border-top: 4px solid #6200ee; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 16px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .container { text-align: center; }
          </style>
          <script>
            try {
              sessionStorage.setItem('pendingSharedReceipt', '${dataUrl}');
              window.location.href = '/dashboard';
            } catch (e) {
              document.body.innerHTML = '<h2>Error saving receipt</h2><p>The image might be too large.</p><a href="/dashboard">Go to Dashboard</a>';
            }
          </script>
        </head>
        <body>
          <div class="container">
            <div class="loader"></div>
            <h3>Processing Receipt...</h3>
            <p>You will be redirected shortly.</p>
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Share Target Error:', error);
    return new Response('Failed to process shared file', { status: 500 });
  }
}
