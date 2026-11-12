#ifndef NEWT_EQ_DSP_H
#define NEWT_EQ_DSP_H
#include <stddef.h>
#define NW_EQ_BANDS 5
#define NW_EQ_CHANNELS 32
typedef struct {
 double b0,b1,b2,a1,a2;
 double z1[NW_EQ_CHANNELS],z2[NW_EQ_CHANNELS];
} NWBand;
typedef struct { NWBand bands[NW_EQ_BANDS]; float trim; } NWEQ;
void NWConfigureEQ(NWEQ *eq, double sampleRate, const float gains[NW_EQ_BANDS]);
float NWProcessEQ(NWEQ *eq, float input, unsigned channel);
#endif
