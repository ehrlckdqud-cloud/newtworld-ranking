#include "../ios/NewtWorld/EqualizerDSP.h"
#include <assert.h>
#include <math.h>
#include <stdio.h>
static double rms(float gains[5],double frequency) {
 NWEQ eq;NWConfigureEQ(&eq,48000,gains);double energy=0;
 for(int i=0;i<96000;i++){float x=.1*sin(2*3.141592653589793*frequency*i/48000);float y=NWProcessEQ(&eq,x,0);assert(isfinite(y));assert(fabs(y)<=1);if(i>=48000)energy+=y*y;}
 return sqrt(energy/48000);
}
int main(void){
 float flat[5]={0},cut[5]={0,0,-12,0,0},boost[5]={12,12,12,12,12};
 double baseline=rms(flat,910);assert(fabs(baseline-.1/sqrt(2))<.00001);
 assert(rms(cut,910)<baseline*.3);assert(rms(cut,60)>baseline*.9);
 for(int f=20;f<20000;f+=137)assert(isfinite(rms(boost,f)));
 NWEQ stereo;NWConfigureEQ(&stereo,44100,cut);NWProcessEQ(&stereo,1,0);assert(NWProcessEQ(&stereo,0,1)==0);
 puts("EQ: flat response, selected-band attenuation, stable full-range output and channel isolation passed.");
}
