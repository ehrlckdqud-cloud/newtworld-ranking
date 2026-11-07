#import <MediaToolbox/MediaToolbox.h>
MTAudioProcessingTapRef _Nullable NWCreateEqualizerTap(void) CF_RETURNS_RETAINED;
void NWSetEqualizer(bool enabled, const float * _Nonnull gains);
