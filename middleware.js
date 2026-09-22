import { NextResponse } from 'next/server';

// Site is temporarily closed. Every page and API route gets the notice below.
// To reopen, set CLOSED to false (or delete this file) and push.
const CLOSED = true;

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Closed for updates</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f7f3fb; color: #2b2233; font: 17px/1.55 system-ui, -apple-system, sans-serif; padding: 24px; box-sizing: border-box; }
  main { max-width: 440px; }
  h1 { color: #76509a; font-size: 26px; margin: 0 0 12px; }
  .help { margin-top: 24px; padding: 16px; border-radius: 12px; background: #fff; border: 1px solid #e4d9ee; }
  a { color: #76509a; }
</style>
</head>
<body>
<main>
  <h1>☂ Closed for updates</h1>
  <p>Haven is back soon.</p>
  <div class="help">
    <strong>If you need someone to talk to right now</strong><br>
    Call or text <a href="tel:988">988</a> anytime.<br>
    Kids Help Phone: text CONNECT to <a href="sms:686868">686868</a> or call <a href="tel:18006686868">1-800-668-6868</a>.<br>
    In an emergency, call 911.
  </div>
</main>
</body>
</html>`;

export function middleware() {
  if (!CLOSED) return NextResponse.next();
  return new NextResponse(PAGE, {
    status: 503,
    headers: { 'content-type': 'text/html; charset=utf-8', 'retry-after': '86400', 'cache-control': 'no-store' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
