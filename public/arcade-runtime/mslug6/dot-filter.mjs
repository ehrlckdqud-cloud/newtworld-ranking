import xbrzProgram from './xbrz-program.mjs';
import {xbrzFactor} from '../picture-quality.mjs';
// Scale2x operates on the PSP framebuffer before it is stretched to the viewport.
const program = `
#ifdef GL_ES
precision highp float;
#endif
#if __VERSION__ >= 130
#define texture2D texture
#ifdef VERTEX
#define attribute in
#define varying out
#else
#define varying in
out vec4 fragColor;
#define gl_FragColor fragColor
#endif
#endif
#ifdef VERTEX
attribute vec4 VertexCoord;
attribute vec2 TexCoord;
uniform mat4 MVPMatrix;
varying vec2 uv;
void main(){gl_Position=MVPMatrix*VertexCoord;uv=TexCoord;}
#elif defined(FRAGMENT)
uniform sampler2D Texture;
uniform vec2 TextureSize;
varying vec2 uv;
void main(){
 vec2 stepUV=1.0/TextureSize;
 vec2 center=(floor(uv*TextureSize)+0.5)*stepUV;
 vec3 e=texture2D(Texture,center).rgb;
 vec3 b=texture2D(Texture,center-vec2(0.,stepUV.y)).rgb;
 vec3 h=texture2D(Texture,center+vec2(0.,stepUV.y)).rgb;
 vec3 d=texture2D(Texture,center-vec2(stepUV.x,0.)).rgb;
 vec3 f=texture2D(Texture,center+vec2(stepUV.x,0.)).rgb;
 vec2 halfPixel=fract(uv*TextureSize);
 vec3 side=halfPixel.x<0.5?d:f;
 vec3 vertical=halfPixel.y<0.5?b:h;
 gl_FragColor=vec4(b!=h && d!=f && side==vertical?side:e,1.);
}
#endif`;
export function enableDotFilter(emulator, registry=emulator.shaders??={}){
 registry.Scale2x={
  shader:{type:'text',value:'shaders = 1\nshader0 = dot2.glsl\nfilter_linear0 = false\nscale_type0 = source\nscale0 = 2.0\n'},
  resources:[{name:'dot2.glsl',type:'text',value:program}]
 };
 emulator.enableShader('Scale2x');
}

export function applyPictureMode(emulator,mode,registry=emulator.shaders??={}){
 if(mode==='on'){enableDotFilter(emulator,registry);return;}
 const factor=xbrzFactor(mode);
 if(!factor){emulator.enableShader('disabled');return;}
 const name='xBRZ'+factor;
 registry[name]??={
  shader:{type:'text',value:'shaders = 1\nshader0 = xbrz.glsl\nfilter_linear0 = false\nscale_type0 = source\nscale0 = '+factor+'.0\n'},
  resources:[{name:'xbrz.glsl',type:'text',value:xbrzProgram}]
 };
 emulator.enableShader(name);
}
