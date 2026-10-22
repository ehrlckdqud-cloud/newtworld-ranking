import {sharedDrawServices} from './space-shared.js';
const parse=sharedDrawServices(async()=>false).parseParticipants;
export function expandRoster(text){return parse(text,true).flatMap(row=>Array.from({length:row.count},()=>row.name));}
