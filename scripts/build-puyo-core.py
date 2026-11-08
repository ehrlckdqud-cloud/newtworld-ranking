"""Adapt the upstream Boxedwine 25R1.0 web build for the Puyo Puyo 2 cabinet.
Run with WABT wasm2wat and wat2wasm on PATH and the original wasm as argument.
"""
import hashlib
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory

original = Path(sys.argv[1])
if hashlib.sha256(original.read_bytes()).hexdigest() != 'f1588fdfa3aa5024620bf5b1688745061d48a3f5f63e2e8e84a91fbe84dbb3cd':
    raise ValueError('Expected the original Boxedwine 25R1.0 web binary')
target = Path(__file__).resolve().parents[1] / 'public/arcade-runtime/puyopuyo2/boxedwine.wasm'

def replace_once(text, before, after):
    if text.count(before) != 1:
        raise ValueError('Upstream function differs')
    return text.replace(before, after)

with TemporaryDirectory() as tmp:
    wat = Path(tmp) / 'core.wat'
    subprocess.run(['wasm2wat', '--enable-all', '--generate-names', original, '-o', wat], check=True)
    code = wat.read_text()
    first = code.index('  (import ')
    code = code[:first] + '  (import "env" "newtMidi" (func $newtMidi (param i32 i32)))\n' + code[first:]
    # KNativeAudioSDL::midiOutData returns success without producing sound upstream.
    signature = '  (func $f401 (type $t7) (param $p0 i32) (param $p1 i32) (param $p2 i32) (param $p3 i32) (result i32)\n'
    code = replace_once(code, signature + '    i32.const 0)', signature +
                        '    local.get $p2\n    local.get $p3\n    call $newtMidi\n    i32.const 0)')
    # StartUpArgs::apply mutes OSS until a mouse click. Keep the original sound setting
    # so Wine can open both the PCM device and the MIDI port during application boot.
    begin = code.index('      block $B137', code.index('i32.store8 offset=320908'))
    end = code.index('      end\n', begin) + len('      end\n')
    assert 'i32.store8 offset=6647280' in code[begin:end]
    code = code[:begin] + code[end:]
    # Keep roughly two output quanta available in OSS. Give the producer
    # extra headroom for four seconds after an actual PCM buffer shortfall.
    begin = code.index('  (func $f353 ')
    end = code.index('  (func ', begin + 1)
    padding = 'local.get $p1\n        local.get $l5\n        i32.load8_u offset=47\n        local.get $p2\n        memory.fill'
    callback = replace_once(code[begin:end], padding,
                            'call $f514\n        global.set $puyoAudioShortfall\n        ' + padding)
    code = code[:begin] + '  (global $puyoAudioShortfall (mut i32) (i32.const -10000))\n' + callback + code[end:]
    begin = code.index('  (func $f364 ')
    end = code.index('  (func ', begin + 1)
    shift = 'local.tee $l6\n    i32.const 3\n    i32.shr_u'
    limit = """local.tee $l6
    call $f514
    global.get $puyoAudioShortfall
    i32.sub
    i32.const 4000
    i32.lt_u
    if (result i32)
      i32.const 4
    else
      i32.const 3
    end
    i32.mul
    i32.const 6
    i32.shr_u"""
    queue = replace_once(code[begin:end], shift, limit)
    code = code[:begin] + queue + code[end:]
    # Set the Emscripten playback device quantum before SDL calculates its
    # byte size and allocates the callback buffer. Keep capture unchanged.
    begin = code.index('  (func $f6017 ')
    end = code.index('  (func ', begin + 1)
    before = 'local.get $l5\n      call $f5901'
    after = """local.get $l3
      i32.eqz
      if
        local.get $p0
        i32.const 1024
        i32.store16 offset=12
      end
      local.get $l5
      call $f5901"""
    device = replace_once(code[begin:end], before, after)
    code = code[:begin] + device + code[end:]
    # The upstream single-thread main loop can occupy the browser for 250 ms
    # while waiting for a present. Yield between guest slices for input, PCM
    # and browser painting. Guest timers and the presentation rate stay intact.
    begin = code.index('  (func $f350 ')
    end = code.index('  (func ', begin + 1)
    budget = 'i32.sub\n        i32.const 250\n        i32.gt_u'
    loop = replace_once(code[begin:end], budget, budget.replace('const 250', 'const 6'))
    code = code[:begin] + loop + code[end:]
    # In runSlice, service actual dirty windows on each slice. Keep Wine's
    # periodic full-desktop repair for a popup that misses an invalidation.
    i=code.index('  (func $f4029 ')
    end=code.index('  (func ',i+1)
    mark='local.get $l2\n        i32.const 1\n        i32.store8 offset=63'
    guarded="""call $f514
        global.get $puyoLastRepair
        i32.sub
        i32.const 120
        i32.ge_u
        if
          call $f514
          global.set $puyoLastRepair
          local.get $l2
          i32.const 1
          i32.store8 offset=63
        end"""
    guest_slice=replace_once(code[i:end],mark,guarded)
    code=code[:i]+'  (global $puyoLastRepair (mut i32) (i32.const 0))\n'+guest_slice+code[end:]
    # Gate the bulk Wine pixel operations at MOV r32,[mem]. The JS helper
    # verifies the complete guest loop and page permissions before grouping pixels.
    i=code.index('  (import ')
    code=code[:i]+'  (import "env" "newtWineSpan" (func $newtWineSpan (param i32)))\n'+code[i:]
    # Decode once per basic block. Most MOVs immediately resolve back to the
    # original handler and never enter JS, even on subsequent executions.
    code=replace_once(code, '(table $__indirect_function_table 4635 4635 funcref)',
                            '(table $__indirect_function_table 4637 4637 funcref)')
    begin=code.index('  (elem $e0 ')
    end=code.index(')\n',begin)
    table=replace_once(code[begin:end], ' $f1766 ', ' $puyoDecodeMov ')
    code=code[:begin]+table+' $f1766 $puyoPixelMov'+code[end:]
    i=code.index('  (func $f1766 ')
    code=code[:i]+"""  (func $puyoPixelMov (type $t5) (param $cpu i32) (param $op i32)
    local.get $cpu
    call $newtWineSpan
    local.get $cpu
    local.get $op
    call $f1766)
  (func $puyoDecodeMov (type $t5) (param $cpu i32) (param $op i32) (local $off i32)
    local.get $cpu
    i32.load offset=100
    i32.const 4095
    i32.and
    local.set $off
    local.get $op
    i32.const 4636
    i32.const 4635
    local.get $off
    i32.const 963
    i32.eq
    local.get $off
    i32.const 2295
    i32.eq
    i32.or
    local.get $off
    i32.const 548
    i32.eq
    i32.or
    select
    i32.store offset=8
    local.get $cpu
    local.get $op
    local.get $op
    i32.load offset=8
    call_indirect $__indirect_function_table (type $t5))
"""+code[i:]
    # DirectSound resampling uses ADD r32,imm in two long FIR loops. Specialize
    # their decoded instruction, keeping the unmodified ADD for every other IP.
    i=code.index('  (import ')
    code=code[:i]+'  (import "env" "newtAudioSpan" (func $newtAudioSpan (param i32)))\n'+code[i:]
    code=replace_once(code, '(table $__indirect_function_table 4637 4637 funcref)',
                      '(table $__indirect_function_table 4639 4639 funcref)')
    begin=code.index('  (elem $e0 ')
    end=code.index(')\n',begin)
    elem=replace_once(code[begin:end], ' $f555 ', ' $puyoDecodeAdd ')
    code=code[:begin]+elem+' $f555 $puyoAudioAdd'+code[end:]
    i=code.index('  (func $f555 ')
    code=code[:i]+"""  (func $puyoAudioAdd (type $t5) (param $cpu i32) (param $op i32)
    local.get $cpu
    call $newtAudioSpan
    local.get $cpu
    local.get $op
    call $f555)
  (func $puyoDecodeAdd (type $t5) (param $cpu i32) (param $op i32) (local $off i32)
    local.get $cpu
    i32.load offset=100
    i32.const 4095
    i32.and
    local.set $off
    local.get $op
    i32.const 4638
    i32.const 4637
    local.get $off
    i32.const 528
    i32.eq
    local.get $off
    i32.const 398
    i32.eq
    i32.or
    local.get $off
    i32.const 916
    i32.eq
    i32.or
    select
    i32.store offset=8
    local.get $cpu
    local.get $op
    local.get $op
    i32.load offset=8
    call_indirect $__indirect_function_table (type $t5))
"""+code[i:]
    # Prepare the browser PCM output from Wine's requested SDL format, and
    # allow unsupported formats to continue through the unmodified SDL device.
    i=code.index('  (import ')
    imports='  (import "env" "newtPcmOpen" (func $newtPcmOpen (param i32 i32 i32)))\n'
    imports+='  (import "env" "newtPcmWrite" (func $newtPcmWrite (param i32 i32) (result i32)))\n'
    code=code[:i]+imports+code[i:]
    begin=code.index('  (func $f359 ')
    end=code.index('  (func ',begin+1)
    setup="""local.get $p0
          i32.load offset=16
          local.get $p0
          i32.load16_u offset=20
          local.get $p0
          i32.load8_u offset=22
          call $newtPcmOpen
          call $f5891"""
    code=code[:begin]+replace_once(code[begin:end],'call $f5891',setup)+code[end:]
    i=code.index('    global.get',code.index('  (func $f364 '))
    code=code[:i]+"""    local.get $p1
    local.get $p2
    call $newtPcmWrite
    local.tee $l8
    i32.const -1
    i32.ne
    if
      local.get $l8
      return
    end
"""+code[i:]
    wat.write_text(code)
    subprocess.run(['wat2wasm', '--enable-all', wat, '-o', target], check=True)
