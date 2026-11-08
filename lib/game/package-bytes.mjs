import {arcadePackages} from './arcade-packages.mjs';

const origin = 'https://ehrlckdqud-cloud.github.io';
const metalSlug5Release = 'https://github.com/ehrlckdqud-cloud/newtworld-ranking/releases/download/arcade-mslug5-v1/';

// Only ciphertext is public. The decryption key stays behind member verification.
export async function packageBytes(request, env) {
  const url = new URL(request.url);
  const legacy = /^\/game-packages\/mslug5-v1\/part-(\d{2})\.bin$/.exec(url.pathname);
  const match = /^\/api\/package-bytes\/(?:([a-z0-9]+)\/)?(\d{2})$/.exec(url.pathname);
  const game = legacy ? 'mslug5' : match?.[1] || 'mslug3';
  const index = legacy?.[1] ?? match?.[2];
  const part = arcadePackages.get(game)?.manifest.parts[Number(index)];
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Content-Type': 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  };
  if (request.method !== 'GET' || !part) return new Response(null, {status: 404, headers});

  let asset;
  if (game === 'mslug5') {
    try {
      asset = await fetch(metalSlug5Release + part.path.split('/').pop(), {
        redirect: 'follow',
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      return new Response(null, {status: 502, headers});
    }
    if (asset.status !== 200) return new Response(null, {status: 502, headers});
  } else {
    if (!env.ASSETS) return new Response('Asset service unavailable', {status: 503, headers});
    asset = await env.ASSETS.fetch(new Request(new URL(part.path, url)));
  }
  if (asset.ok) headers['Cache-Control'] = 'public, max-age=86400';
  return new Response(asset.body, {status: asset.status, headers});
}
