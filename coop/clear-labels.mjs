export const DISPLAY_SCALE=4;
export function wrapBubble(ctx,text,maxWidth,maxLines=5){
 const chars=Array.from(text),lines=[];let line='';
 for(let i=0;i<chars.length;i++){
  const ch=chars[i];if(ctx.measureText(line+ch).width>maxWidth&&line){lines.push(line);line='';if(lines.length===maxLines){let last=lines.pop();while(last&&ctx.measureText(last+'…').width>maxWidth)last=Array.from(last).slice(0,-1).join('');lines.push(last+'…');return lines;}}
  line+=ch;
 }
 if(line)lines.push(line);return lines;
}
export function drawClearLabels(ctx,{width,height,players,bubbles,colors,now}){
 ctx.save();ctx.textAlign='center';ctx.textBaseline='alphabetic';
 for(const p of players){
  const x=p.x*DISPLAY_SCALE,y=p.y*DISPLAY_SCALE;if(x<0||x>width||y<0||y>height)continue;
  ctx.font='600 28px system-ui, sans-serif';ctx.lineJoin='round';ctx.lineWidth=5;ctx.strokeStyle='#000';ctx.fillStyle=colors[p.slot-1];ctx.strokeText(p.name,x,y+46);ctx.fillText(p.name,x,y+46);
  const bubble=bubbles.get(p.slot);if(!bubble||bubble.until<=now)continue;
  ctx.font='600 30px system-ui, sans-serif';const maxWidth=Math.min(400,width-32),lines=wrapBubble(ctx,bubble.text,maxWidth-32),boxWidth=Math.max(64,...lines.map(s=>ctx.measureText(s).width+32)),boxHeight=lines.length*39+24;
  const center=Math.max(boxWidth/2+8,Math.min(width-boxWidth/2-8,x)),bottom=Math.max(boxHeight+8,y-(p.mounted?26:40)*DISPLAY_SCALE),top=bottom-boxHeight;
  ctx.fillStyle='#fff';ctx.strokeStyle='#20252b';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(center-boxWidth/2,top,boxWidth,boxHeight,20);ctx.fill();ctx.stroke();
  const tailX=Math.max(center-boxWidth/2+22,Math.min(center+boxWidth/2-22,x));ctx.beginPath();ctx.moveTo(tailX-12,bottom-2);ctx.quadraticCurveTo(tailX-4,bottom+13,tailX,bottom+23);ctx.quadraticCurveTo(tailX+5,bottom+13,tailX+12,bottom-2);ctx.fill();ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(tailX-10,bottom-1);ctx.lineTo(tailX+10,bottom-1);ctx.stroke();
  ctx.fillStyle='#14181c';for(let j=0;j<lines.length;j++)ctx.fillText(lines[j],center,top+35+j*39);
 }
 ctx.restore();
}
