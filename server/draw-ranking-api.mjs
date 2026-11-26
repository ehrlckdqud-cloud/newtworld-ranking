import { checkDrawGame } from '../draw/draw-ranking.mjs';
import { readDrawLeaderboard, recordDrawRound } from './draw-ranking-store.mjs';

const hubOrigin = 'https://ehrlckdqud-cloud.github.io';

// The host supplies the same verified game access used for entry and completion.
// authorize(request, game, action, payload) must explicitly grant this operation.
export async function drawRankingApi(request, db, authorize) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const headers = { 'Cache-Control':'no-store', Vary:'Origin' };
  const reply = (status,body) => Response.json(body,{status,headers});
  if (origin && origin !== hubOrigin && origin !== url.origin) return reply(403,{ok:false});
  if (origin === hubOrigin) Object.assign(headers,{
    'Access-Control-Allow-Origin':hubOrigin,'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type'
  });
  const match = /^\/api\/draw-rankings\/([^/]+)\/(board|finish)$/.exec(url.pathname);
  if (!match) return reply(404,{ok:false});
  const [,game,action]=match;
  try { checkDrawGame(game); } catch { return reply(404,{ok:false}); }
  if (request.method==='OPTIONS') return new Response(null,{status:204,headers});
  if (request.method!=='POST') return reply(405,{ok:false});
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply(415,{ok:false});
  let payload;
  try { payload=await request.json(); } catch { return reply(400,{ok:false}); }
  if (await authorize(request,game,action,payload)!==true) return reply(403,{ok:false});
  if (action==='board') return reply(200,{ok:true,rows:await readDrawLeaderboard(db,game)});
  const result=payload?.result;
  if (result?.round?.game!==game || !Array.isArray(result.round.roster) ||
      !Array.isArray(result.groups) || !Array.isArray(result.winnerIds)) return reply(400,{ok:false});
  const saved=await recordDrawRound(db,result.round,result.groups,result.finishedAt,result);
  return reply(200,{ok:true,recorded:saved.recorded});
}
