"""Generate the HP-only 68000 wrapper, no original ROM bytes included."""
import json,re
from pathlib import Path
code=bytearray();labels={};fix=[]
def emit(h):code.extend(bytes.fromhex(h))
def label(n):labels[n]=len(code)
def branch(op,n):
 emit(op+'0000');fix.append((len(code)-2,n))
emit('2f08 4eb90000781e 0c060002') # save table; original read; random-pool tag
branch('6700','exit')
emit('48e77fe0 7400 143900104d8a 0c420001') # preserve d1-d7/a0-a2; count
branch('6500','restore') # count zero is boot/attract
emit('206f0028 4eb900c1c122 7400 143900104d8a 0c420001') # forced 1P reader
branch('6700','restore') # also correct when the only remaining player is P3/P4/P5
emit('3f00 206f002a 4eb900c1c522 321f b041') # forced 2P, recover H1
branch('6500','restore') # decrease: retain H2
emit('9041 7400 143900104d8a 5342 c0c2 d041') # H1+(N-1)*(H2-H1)
label('restore');emit('4cdf07fe')
label('exit');emit('588f 4e75')
for at,target in fix:code[at:at+2]=(labels[target]-at).to_bytes(2,'big',signed=True)
p=Path(__file__).resolve().parents[1]/'coop/native/hp-scaling.mjs'
s=p.read_text();s=re.sub(r'"wrapper": "[0-9a-f]+"','"wrapper": "'+code.hex()+'"',s);p.write_text(s)
print(code.hex())
