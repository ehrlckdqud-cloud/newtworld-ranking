package world.newt.app;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.content.ComponentName;
import android.net.Uri;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.session.MediaController;
import androidx.media3.session.SessionToken;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.google.common.util.concurrent.ListenableFuture;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Collections;

public final class MainActivity extends ComponentActivity {
 private WebView web;private MediaController controller;private ListenableFuture<MediaController> future;
 private final Handler handler=new Handler(Looper.getMainLooper());
 private LocalLibrary library;private JSONArray defaultTracks=new JSONArray();
 private static final java.util.concurrent.ExecutorService imports=java.util.concurrent.Executors.newSingleThreadExecutor();
 private final androidx.activity.result.ActivityResultLauncher<String[]> picker=registerForActivityResult(new androidx.activity.result.contract.ActivityResultContracts.OpenMultipleDocuments(),uris->{
  if(uris.isEmpty())return;emit("notice","음악을 저장하는 중…");imports.execute(()->{int added=0,failed=0;for(Uri uri:uris)try{library.importFile(uri);added++;}catch(Exception e){failed++;}final int success=added,errors=failed;
   handler.post(()->{if(isDestroyed())return;refreshQueue();sendLibrary();emit("notice",success+"곡 저장"+(errors>0?", "+errors+"곡 실패 — 파일 형식과 저장공간을 확인해주세요.":" 완료"));});
  });
 });
private boolean pageReady=false;
 private final Runnable tick=new Runnable(){public void run(){sendState();handler.postDelayed(this,500);}};
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  library=new LocalLibrary(this);try{defaultTracks=new JSONArray(getSharedPreferences("native-player",MODE_PRIVATE).getString("defaults","[]"));}catch(Exception ignored){}
  web=new WebView(this);setContentView(web);web.setWebChromeClient(new android.webkit.WebChromeClient());
  androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(web,(v,insets)->{androidx.core.graphics.Insets bars=insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);return insets;});web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).addPathHandler("/local/",new WebViewAssetLoader.InternalStoragePathHandler(this,library.directory)).build();
  web.setWebViewClient(new WebViewClientCompat(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return loader.shouldInterceptRequest(request.getUrl());}
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !"appassets.androidplatform.net".equals(request.getUrl().getHost());}
  });
  if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){
   web.loadData("Android System WebView를 업데이트한 뒤 다시 실행해주세요.","text/html","UTF-8");return;
  }
  WebViewCompat.addWebMessageListener(web,"NWAndroid",Collections.singleton("https://appassets.androidplatform.net"),(view,message,origin,main,reply)->{
   if(main&&"appassets.androidplatform.net".equals(origin.getHost()))handler.post(()->command(message.getData()));
  });
  future=new MediaController.Builder(this,new SessionToken(this,new ComponentName(this,PlaybackService.class))).buildAsync();
  future.addListener(()->{try{controller=future.get();controller.addListener(new Player.Listener(){
   @Override public void onEvents(Player player,Player.Events events){sendState();}
   @Override public void onPlayerError(PlaybackException e){emit("error",e.getErrorCodeName());}
  });if(pageReady){if(controller.getMediaItemCount()==0)refreshQueue();emit("ready",null);sendLibrary();sendState();}}catch(Exception e){emit("error","재생 서비스 연결 실패");}},androidx.core.content.ContextCompat.getMainExecutor(this));
  web.loadUrl("https://appassets.androidplatform.net/assets/web/index.html");
  getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){@Override public void handleOnBackPressed(){moveTaskToBack(true);}});
 }
 private boolean validURL(String value){Uri u=Uri.parse(value);return "https".equals(u.getScheme())&&"ehrlckdqud-cloud.github.io".equals(u.getHost())&&u.getPath()!=null&&u.getPath().startsWith("/newtworld-ranking/assets/");}
 private void command(String raw){try{
  JSONObject m=new JSONObject(raw);if(m.optInt("version")!=1)return;String command=m.optString("command");
  if(command.equals("ready")){pageReady=true;if(controller!=null){if(controller.getMediaItemCount()==0)refreshQueue();emit("ready",null);sendLibrary();sendState();}return;}
  if(controller==null){emit("error","재생 기능을 준비하는 중입니다.");return;}
  switch(command){
   case "queue":{
    JSONArray input=m.getJSONArray("tracks");for(int i=0;i<input.length();i++){JSONObject t=input.getJSONObject(i);if(!validURL(t.optString("url"))||t.optString("id").startsWith("local-"))throw new IllegalArgumentException();}
    defaultTracks=input;getSharedPreferences("native-player",MODE_PRIVATE).edit().putString("defaults",input.toString()).apply();refreshQueue();modes(m);sendState();break;
   }
   case "library":sendLibrary();break;
   case "import":picker.launch(new String[]{"audio/*"});break;
   case "delete":{
    String id=m.getString("id");imports.execute(()->{try{library.delete(id);handler.post(()->{if(!isDestroyed()){refreshQueue();sendLibrary();}});}catch(Exception e){handler.post(()->emit("error","개인 곡을 삭제하지 못했습니다."));}});break;
   }
   case "equalizer":getSharedPreferences("native-player",MODE_PRIVATE).edit().putString("equalizer",m.getJSONObject("settings").toString()).apply();sendState();break;
   case "play":if(controller.getPlaybackState()==Player.STATE_ENDED)controller.seekTo(0);if(controller.getPlaybackState()==Player.STATE_IDLE)controller.prepare();controller.play();break;
   case "pause":controller.pause();break;
   case "stop":controller.pause();controller.stop();break;
   case "next":controller.seekToNextMediaItem();break;
   case "previous":controller.seekToPreviousMediaItem();break;
   case "select":for(int i=0;i<controller.getMediaItemCount();i++)if(controller.getMediaItemAt(i).mediaId.equals(m.optString("id"))){controller.seekTo(i,0);controller.play();break;}break;
   case "seek":controller.seekTo(Math.max(0,(long)(m.optDouble("position",0)*1000)));break;
   case "volume":controller.setVolume((float)Math.max(0,Math.min(1,m.optDouble("value",1))));break;
   case "modes":modes(m);break;
   case "state":sendState();break;
  }
 }catch(Exception e){emit("error","재생 요청을 처리하지 못했습니다.");}}
 private void sendLibrary(){try{send(new JSONObject().put("type","library").put("tracks",library.webTracks()));}catch(Exception ignored){}}
 private void refreshQueue(){if(controller==null)return;try{
  JSONArray all=new JSONArray(defaultTracks.toString()),local=library.nativeTracks();for(int i=0;i<local.length();i++)all.put(local.get(i));
  ArrayList<MediaItem> desired=new ArrayList<>();for(int i=0;i<all.length();i++){
   JSONObject t=all.getJSONObject(i);MediaMetadata.Builder meta=new MediaMetadata.Builder().setTitle(t.optString("title")).setArtist(t.optString("artist")).setAlbumTitle("뉴트월드");
   String art=t.optString("artwork");if(!art.isEmpty()&&(t.optBoolean("local")||validURL(art)))meta.setArtworkUri(Uri.parse(art));
   desired.add(new MediaItem.Builder().setMediaId(t.getString("id")).setUri(t.getString("url")).setMediaMetadata(meta.build()).build());
  }
  for(int i=0;i<desired.size();i++){
   MediaItem item=desired.get(i);int found=-1;for(int j=i;j<controller.getMediaItemCount();j++)if(controller.getMediaItemAt(j).mediaId.equals(item.mediaId)){found=j;break;}
   if(found<0)controller.addMediaItem(i,item);else{if(found!=i)controller.moveMediaItem(found,i);MediaItem old=controller.getMediaItemAt(i);if(!old.mediaMetadata.equals(item.mediaMetadata)||(old.localConfiguration!=null&&!old.localConfiguration.uri.equals(item.localConfiguration.uri)))controller.replaceMediaItem(i,item);}
  }
  if(controller.getMediaItemCount()>desired.size())controller.removeMediaItems(desired.size(),controller.getMediaItemCount());
  if(controller.getPlaybackState()==Player.STATE_IDLE&&!desired.isEmpty())controller.prepare();sendState();
 }catch(Exception e){emit("error","곡 목록 갱신에 실패했습니다.");}}
 private void modes(JSONObject m){controller.setRepeatMode(m.optString("repeat").equals("all")?Player.REPEAT_MODE_ALL:Player.REPEAT_MODE_OFF);controller.setShuffleModeEnabled(m.optBoolean("shuffle"));}
 private void emit(String type,String message){try{JSONObject o=new JSONObject().put("type",type);if(message!=null)o.put("message",message);send(o);}catch(Exception ignored){}}
 private void sendState(){if(controller==null)return;try{MediaItem item=controller.getCurrentMediaItem();send(new JSONObject().put("type","state").put("id",item==null?"":item.mediaId).put("position",Math.max(0,controller.getCurrentPosition())/1000.0).put("duration",Math.max(0,controller.getDuration())/1000.0).put("eqAvailable",PlaybackService.eqAvailable).put("playing",controller.getPlayWhenReady()&&controller.getPlaybackState()!=Player.STATE_ENDED&&controller.getPlaybackState()!=Player.STATE_IDLE));}catch(Exception ignored){}}
 private void send(JSONObject o){if(pageReady&&web!=null)web.evaluateJavascript("window.NWNativeReceive&&window.NWNativeReceive("+o.toString()+")",null);}
 @Override protected void onStart(){super.onStart();handler.post(tick);}
 @Override protected void onStop(){handler.removeCallbacks(tick);super.onStop();}
 @Override protected void onDestroy(){handler.removeCallbacksAndMessages(null);if(future!=null)MediaController.releaseFuture(future);if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
