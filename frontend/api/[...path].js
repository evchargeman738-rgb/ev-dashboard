const BACKEND_ORIGIN = 'https://ev-dashboard-backend.onrender.com';

module.exports = async (request, response) => {
  const requestUrl = new URL(request.url || '/', 'https://vercel.invalid');
  if (!requestUrl.pathname.startsWith('/api/')) {
    response.statusCode = 404;
    response.end('Not found');
    return;
  }

  const headers = new Headers();
  for (const name of ['accept', 'authorization', 'content-type']) {
    const value = request.headers[name];
    if (typeof value === 'string') {
      headers.set(name, value);
    }
  }

  let body;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (typeof request.body === 'string' || Buffer.isBuffer(request.body)) {
      body = request.body;
    } else if (request.body !== undefined) {
      body = JSON.stringify(request.body);
    }
  }

  try {
    const backendResponse = await fetch(
      `${BACKEND_ORIGIN}${requestUrl.pathname}${requestUrl.search}`,
      {
        method: request.method,
        headers,
        body
      }
    );

    response.statusCode = backendResponse.status;
    backendResponse.headers.forEach((value, name) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(name.toLowerCase())) {
        response.setHeader(name, value);
      }
    });

    response.end(Buffer.from(await backendResponse.arrayBuffer()));
  } catch (error) {
    console.error('Dashboard API proxy failed:', error);
    response.statusCode = 502;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({
      success: false,
      message: 'The dashboard API could not be reached.'
    }));
  }
};
