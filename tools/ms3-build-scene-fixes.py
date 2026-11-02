import struct,json,pathlib,re
root=pathlib.Path(__file__).resolve().parents[1]
class Asm:
 def __init__(self):self.b=bytearray();self.labels={};self.fix=[]
 def put(self,v):self.b+=bytes.fromhex(v) if isinstance(v,str) else v
 def branch(self,op,label):self.put(w(op)+b'\0\0');self.fix.append((len(self.b)-2,label))
 def label(self,n):self.labels[n]=len(self.b)
 def done(self):
  for p,n in self.fix:self.b[p:p+2]=w(self.labels[n]-p)
  return bytes(self.b)
w=lambda v:struct.pack('>H',v&65535)
l=lambda v:struct.pack('>I',v)
jmp=lambda v:bytes.fromhex('4ef9')+l(v)
def call(a,n):a.put('4eb9');a.put(l(n))
actors=[0x1004fc,0x1005ac,0x1051fc,0x104fec,0x104ddc]
expected={0x2c65a:'4ef9000fbfce',0x669a4:'70004eb90002',0x66fbc:'206e006a0c28',0x67058:'4a6e0084',0x6708a:'4a6e0084',0x66a82:'7000323c0600',0x42cae:'4ef9000fc4de'}
cursor=0xc1d000;blocks=[];hooks=[]
def hook(at,a):
 global cursor
 code=a.done();blocks.append([cursor-0xc00000,code.hex()]);hooks.append([at,expected[at],jmp(cursor).hex()]);cursor+=len(code)
# Filter EVERY eligible player through native rectangle geometry before selecting.
a=Asm();a.put('2248');call(a,0x2c50a)
for i,actor in enumerate(actors):
 a.put('0800');a.put(w(i));a.branch(0x6700,'next'+str(i));a.put('41f9');a.put(l(actor));call(a,0x2c5b8);a.branch(0x6400,'next'+str(i));a.put('0a00');a.put(w(1<<i));a.label('next'+str(i))
a.put(jmp(0x2c5fc));hook(0x2c65a,a)
# Abduction uses the original two roles: one captive and all other players as
# witnesses. The old three-player count skipped the native witness role entirely.
a=Asm();a.put('422e00913d7cffff00a0')
for i in range(5):
 a.put(w(0x7000+i));call(a,0x2c52c);a.branch(0x6400,'next'+str(i));a.put('522e00910c6effff00a0');a.branch(0x6600,'next'+str(i));a.put('3d7c');a.put(w(i));a.put('00a0');a.label('next'+str(i))
# Reserve enough native objects before creating any children (single-threaded).
a.put('7200122e0091');a.branch(0x6700,'retry');a.put('0641000f303900105410b041');a.branch(0x6500,'retry')
a.put('0c2e00020091');a.branch(0x6500,'countdone');a.put('1d7c00020091');a.label('countdone')
a.put('207c00066aa6700e');call(a,0x5814);a.branch(0x6400,'retry');a.put('70007200');call(a,0x2c8a2)
for i in range(5):
 a.put(w(0x7000+i));call(a,0x2c52c);a.branch(0x6400,'skip'+str(i))
 a.put('207c00066fb2700e');call(a,0x5814);a.branch(0x6400,'retry');a.put('70007200');call(a,0x2c8a2);a.put('317c');a.put(w(i));a.put('0084');a.label('skip'+str(i))
a.put('2cbc00066a3e');a.label('retry');a.put('4e75');hook(0x669a4,a)
# +A0 is a root-local captive owner, not shared global state; original root
# blinking fields +95/+96 remain untouched.
a=Asm();a.put('206e006a302e0084b06800a056c01d400092');a.put(jmp(0x66fd8));hook(0x66fbc,a)
# Pair synchronization branches on the assigned role, not slot zero.
for at in [0x67058,0x6708a]:
 # Original TST.W +84 followed by Bcc.W; retain branch opcode/displacement.
 hooks.append([at,expected[at],'4a2e0092'])
# Explicitly move all surviving seats out of the scene. The legacy pair
# broadcaster requires BOTH original actors, so a lone P4/P5 never exits.
a=Asm()
for i in range(5):
 a.put(w(0x7000+i));call(a,0x2c52c);a.branch(0x6400,'exit_next'+str(i))
 a.put(w(0x7000+i));a.put('323c0600343c0100');call(a,0x67dea);a.label('exit_next'+str(i))
a.put(jmp(0x5966));hook(0x66a82,a)
# The director's active-status mask also stopped at P3. A lone P4/P5
# completed the exit rectangle, but 42CAE returned zero and blocked transition.
a=Asm();call(a,0xfc4de)
for i in [3,4]:
 a.put('0c39');a.put(w(2));a.put(l(0x10532e-(i-2)*0x210));a.branch(0x6600,'status_next'+str(i))
 a.put('4a39');a.put(l(0x1053e0-(i-2)*0x210));a.branch(0x6700,'status_next'+str(i))
 a.put('0040');a.put(w(1<<i));a.label('status_next'+str(i))
a.put('4e75');hook(0x42cae,a)
assert cursor<0xc1e000,hex(cursor)
target=root/'coop/native/scene-fixes.mjs'
data=json.dumps({'blocks':blocks,'hooks':hooks},separators=(',',':'))
target.write_text(re.sub(r'const data = .*?;', 'const data = '+data+';',target.read_text(),count=1))
print('scene cave end',hex(cursor))
