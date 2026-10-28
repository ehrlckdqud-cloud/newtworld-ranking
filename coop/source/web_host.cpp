#include <emscripten.h>
#include <stdint.h>
#include <string>
#include <map>
#include <vector>
static std::vector<uint8_t> checkpoint;
#include "libretro.h"
static std::map<std::string,std::string> options;
static int frame=0,pixel=1;
static unsigned manual=0;static int hud_enabled=false;
static double rate=48000,fps=59.18;
extern "C" void retro_set_newtworld_hud(int);
extern "C" void retro_newtworld_credits(int);
extern "C" void retro_newtworld_glyph(unsigned,unsigned,uint32_t*);
EM_JS(void,video_js,(const void* ptr,unsigned w,unsigned h,unsigned pitch,int fmt),{if(Module.onVideo)Module.onVideo(ptr,w,h,pitch,fmt);});
EM_JS(void,audio_js,(const void* ptr,unsigned count),{if(Module.onAudio)Module.onAudio(ptr,count);});
static bool environment(unsigned cmd,void* data){
 switch(cmd&0xffff){
 case RETRO_ENVIRONMENT_GET_SYSTEM_DIRECTORY:case RETRO_ENVIRONMENT_GET_SAVE_DIRECTORY:case RETRO_ENVIRONMENT_GET_CONTENT_DIRECTORY:*(const char**)data="/system";return true;
 case RETRO_ENVIRONMENT_SET_PIXEL_FORMAT:pixel=*(int*)data;return true;
 case RETRO_ENVIRONMENT_GET_VARIABLE:{auto*v=(retro_variable*)data;auto i=options.find(v->key);v->value=i==options.end()?nullptr:i->second.c_str();return v->value!=nullptr;}
 case RETRO_ENVIRONMENT_SET_VARIABLES:{auto*v=(retro_variable*)data;for(;v->key;++v){if(options.count(v->key))continue;std::string s=v->value;size_t p=s.find(';');if(p!=std::string::npos)s=s.substr(p+1);while(!s.empty()&&s[0]==' ')s.erase(0,1);p=s.find('|');options[v->key]=s.substr(0,p);}return true;}
 case RETRO_ENVIRONMENT_GET_VARIABLE_UPDATE:*(bool*)data=false;return true;
 case RETRO_ENVIRONMENT_GET_CAN_DUPE:*(bool*)data=true;return true;
 case RETRO_ENVIRONMENT_SET_INPUT_DESCRIPTORS:case RETRO_ENVIRONMENT_SET_CONTROLLER_INFO:case RETRO_ENVIRONMENT_SET_MEMORY_MAPS:return true;
 case RETRO_ENVIRONMENT_GET_LOG_INTERFACE:return false;
 case RETRO_ENVIRONMENT_GET_LANGUAGE:*(unsigned*)data=0;return true;
 default:return false;
 }
}
static void video(const void*p,unsigned w,unsigned h,size_t pitch){if(p)video_js(p,w,h,pitch,pixel);}
static size_t batch(const int16_t*p,size_t n){audio_js(p,n);return n;}
static void sample(int16_t,int16_t){}
static void poll(){}
static int16_t input(unsigned port,unsigned device,unsigned,unsigned id){
 if(device!=RETRO_DEVICE_JOYPAD||port!=0)return 0;
 unsigned bit=0;
 switch(id){case 4:bit=1;break;case 5:bit=2;break;case 6:bit=4;break;case 7:bit=8;break;case 0:bit=16;break;case 8:bit=32;break;case 1:bit=64;break;case 2:bit=128;break;case 3:bit=256;break;}
 return (manual&bit)!=0;
}
extern "C" {
EMSCRIPTEN_KEEPALIVE int nw_load(){
 manual=0;hud_enabled=false;frame=0;retro_newtworld_credits(-1);retro_set_newtworld_hud(false);
 options["fbneo-allow-patched-romsets"]="enabled";options["fbneo-neogeo-mode"]="MVS";options["fbneo-cpu-speed-adjust"]="100%";options["fbneo-dipswitch-mslug3fd-BIOS"]="MVS Asia/Europe ver. 5 (1 slot)";
 retro_set_environment(environment);retro_set_video_refresh(video);retro_set_audio_sample(sample);retro_set_audio_sample_batch(batch);retro_set_input_poll(poll);retro_set_input_state(input);retro_init();
 retro_game_info info={"/roms/mslug3fd.zip",nullptr,0,nullptr};if(!retro_load_game(&info))return 0;
 retro_system_av_info av;retro_get_system_av_info(&av);rate=av.timing.sample_rate;fps=av.timing.fps;return 1;
}
extern unsigned retro_newtworld_cell(int,int);
EMSCRIPTEN_KEEPALIVE unsigned nw_cell(int x,int y){return retro_newtworld_cell(x,y);}
extern void retro_newtworld_redraw();
extern void retro_newtworld_credits(int);
EMSCRIPTEN_KEEPALIVE void nw_credits(int value){retro_newtworld_credits(value);}
EMSCRIPTEN_KEEPALIVE void nw_redraw(){retro_newtworld_redraw();}
EMSCRIPTEN_KEEPALIVE void nw_input(unsigned b){manual=b;}
EMSCRIPTEN_KEEPALIVE void nw_hud(int v){hud_enabled=v;}
EMSCRIPTEN_KEEPALIVE void nw_run(int f){frame=f;retro_set_newtworld_hud(hud_enabled);retro_run();}
EMSCRIPTEN_KEEPALIVE void* nw_ram(){return retro_get_memory_data(RETRO_MEMORY_SYSTEM_RAM);}
EMSCRIPTEN_KEEPALIVE double nw_rate(){return rate;}
EMSCRIPTEN_KEEPALIVE double nw_fps(){return fps;}
EMSCRIPTEN_KEEPALIVE uint32_t* nw_glyph(unsigned t,unsigned p){static uint32_t out[64];retro_newtworld_glyph(t,p,out);return out;}
EMSCRIPTEN_KEEPALIVE unsigned nw_snapshot(){checkpoint.resize(retro_serialize_size());if(checkpoint.empty()||!retro_serialize(checkpoint.data(),checkpoint.size()))return 0;return checkpoint.size();}
EMSCRIPTEN_KEEPALIVE void* nw_snapshot_ptr(){return checkpoint.data();}
EMSCRIPTEN_KEEPALIVE void* nw_snapshot_buffer(unsigned n){if(n>67108864)return nullptr;checkpoint.resize(n);return checkpoint.data();}
EMSCRIPTEN_KEEPALIVE int nw_restore(){return !checkpoint.empty()&&retro_unserialize(checkpoint.data(),checkpoint.size());}
EMSCRIPTEN_KEEPALIVE void nw_close(){retro_unload_game();retro_deinit();}
}
