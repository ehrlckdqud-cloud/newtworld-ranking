#import "EqualizerTap.h"
#include "EqualizerDSP.h"
#include <stdatomic.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>
static _Atomic(float) levels[5];
static atomic_bool on;
static atomic_uint revision;
void NWSetEqualizer(bool enabled,const float *gains){for(int i=0;i<5;i++)atomic_store(&levels[i],gains[i]);atomic_store(&on,enabled);atomic_fetch_add(&revision,1);}
typedef struct {NWEQ eq;double rate;unsigned revision;bool formatOK;bool enabled;} Context;
static void initialize(MTAudioProcessingTapRef tap,void *info,void **storage){*storage=calloc(1,sizeof(Context));}
static void finalize(MTAudioProcessingTapRef tap){free(MTAudioProcessingTapGetStorage(tap));}
static void prepare(MTAudioProcessingTapRef tap,CMItemCount frames,const AudioStreamBasicDescription *format){Context *c=MTAudioProcessingTapGetStorage(tap);c->rate=format->mSampleRate;c->revision=UINT_MAX;c->formatOK=format->mFormatID==kAudioFormatLinearPCM&&(format->mFormatFlags&kAudioFormatFlagIsFloat)&&format->mBitsPerChannel==32&&format->mChannelsPerFrame<=NW_EQ_CHANNELS;}
static void unprepare(MTAudioProcessingTapRef tap){}
static void process(MTAudioProcessingTapRef tap,CMItemCount frames,MTAudioProcessingTapFlags flags,AudioBufferList *buffers,CMItemCount *framesOut,MTAudioProcessingTapFlags *flagsOut){
 OSStatus error=MTAudioProcessingTapGetSourceAudio(tap,frames,buffers,flagsOut,NULL,framesOut);if(error!=noErr){*framesOut=0;return;}
 Context *c=MTAudioProcessingTapGetStorage(tap);if(!c||!c->formatOK)return;
 unsigned rev=atomic_load(&revision);if(rev!=c->revision){float gains[5];for(int i=0;i<5;i++)gains[i]=atomic_load(&levels[i]);NWConfigureEQ(&c->eq,c->rate,gains);c->enabled=atomic_load(&on);c->revision=rev;}
 if(!c->enabled)return;
 unsigned offset=0;for(unsigned b=0;b<buffers->mNumberBuffers;b++){
  AudioBuffer *buffer=&buffers->mBuffers[b];float *samples=buffer->mData;unsigned channels=buffer->mNumberChannels;
  if(!samples||!channels)continue;size_t count=buffer->mDataByteSize/sizeof(float);size_t expected=(size_t)*framesOut*channels;if(count>expected)count=expected;
  for(size_t i=0;i<count;i++)samples[i]=NWProcessEQ(&c->eq,samples[i],offset+(unsigned)(i%channels));offset+=channels;
 }
}
MTAudioProcessingTapRef NWCreateEqualizerTap(void){MTAudioProcessingTapCallbacks callbacks={kMTAudioProcessingTapCallbacksVersion_0,NULL,initialize,finalize,prepare,unprepare,process};MTAudioProcessingTapRef tap=NULL;if(MTAudioProcessingTapCreate(kCFAllocatorDefault,&callbacks,kMTAudioProcessingTapCreationFlag_PreEffects,&tap)!=noErr)return NULL;return tap;}
