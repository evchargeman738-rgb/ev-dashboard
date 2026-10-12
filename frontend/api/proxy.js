const BACKEND_ORIGIN = 'https://ev-dashboard-backend.onrender.com';

module.exports = async (request, response) => {
  const requestUrl = new URL(request.url || '/', 'https://vercel.invalid');
  const queryPath = request.query?.path ?? requestUrl.searchParams.get('path');
  const requestedPath = Array.isArray(queryPath) ? queryPath.join('/') : queryPath;
  const apiPath = typeof requestedPath === 'string'
    ? requestedPath.replace(/^\/?api\//, '')
    : '';

  if (!apiPath || apiPath === requestedPath) {
    response.statusCode = 400;
    response.end('Invalid API path');
    return;
  }

  const pathSegments = apiPath.split('/');
  if (!pathSegments.length || pathSegments.some(segment => !segment || segment === '.' || segment === '..')) {
    response.statusCode = 400;
    response.end('Invalid API path');
    return;
  }

  const backendUrl = new URL(
    `/api/${pathSegments.map(encodeURIComponent).join('/')}`,
    BACKEND_ORIGIN
  );
  for (const [name, value] of requestUrl.searchParams) {
    if (name !== 'path') {
      backendUrl.searchParams.append(name, value);
    }
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
    const backendResponse = await fetch(backendUrl, {
      method: request.method,
      headers,
      body
    });

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
