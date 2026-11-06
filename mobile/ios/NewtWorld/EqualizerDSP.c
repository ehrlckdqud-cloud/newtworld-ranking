#include "EqualizerDSP.h"
#include <math.h>
#include <string.h>
void NWConfigureEQ(NWEQ *eq,double rate,const float gains[NW_EQ_BANDS]) {
 const double centers[5]={60,230,910,3600,14000};double boost=0;
 memset(eq,0,sizeof(*eq));
 for(int i=0;i<5;i++) {
  double gain=fmax(-12,fmin(12,gains[i]));if(gain>boost)boost=gain;
  double A=pow(10,gain/40),w=2*3.141592653589793*fmin(centers[i],rate*0.45)/rate;
  double alpha=sin(w)/(2*1.0),a0=1+alpha/A;
  NWBand *b=&eq->bands[i];b->b0=(1+alpha*A)/a0;b->b1=-2*cos(w)/a0;b->b2=(1-alpha*A)/a0;b->a1=-2*cos(w)/a0;b->a2=(1-alpha/A)/a0;
 }
 eq->trim=(float)pow(10,-boost/20);
}
float NWProcessEQ(NWEQ *eq,float input,unsigned channel) {
 if(channel>=NW_EQ_CHANNELS)return input;
 double value=input*eq->trim;
 for(int i=0;i<5;i++){NWBand *b=&eq->bands[i];double output=b->b0*value+b->z1[channel];b->z1[channel]=b->b1*value-b->a1*output+b->z2[channel];b->z2[channel]=b->b2*value-b->a2*output;value=output;}
 return isfinite(value)?(float)fmax(-1,fmin(1,value)):0;
}
