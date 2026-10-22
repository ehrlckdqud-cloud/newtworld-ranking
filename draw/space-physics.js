// Displacement persists across reads; a moving rock carries explorers along its
// velocity until their collision circles are separated, then they drift home.
export function resolveMeteorPush(ships,rocks,position,radius,dt){
 for(const s of ships){if(s.dead)continue;let touched=false;
  for(const rock of rocks){if(rock.dead||rock.type!=='large'||!rock.previous)continue;const dx=rock.x-rock.previous.x,dy=rock.y-rock.previous.y,speed=Math.hypot(dx,dy);if(speed<.001||speed>100)continue;const nx=dx/speed,ny=dy/speed,p=position(s),ox=p.x-rock.x,oy=p.y-rock.y,R=rock.r*.86+radius;
   if(ox*ox+oy*oy>=R*R)continue;const dot=ox*nx+oy*ny,distance=-dot+Math.sqrt(Math.max(0,dot*dot+R*R-ox*ox-oy*oy))+1;s.pushX=(s.pushX||0)+nx*distance;s.pushY=(s.pushY||0)+ny*distance;touched=true;
  }
  if(!touched){const decay=Math.exp(-dt*.38);s.pushX=(s.pushX||0)*decay;s.pushY=(s.pushY||0)*decay;}
 }
}
