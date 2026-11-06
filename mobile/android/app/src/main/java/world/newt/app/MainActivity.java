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
import java.util.Set;

public final class MainActivity extends ComponentActivity {
 private WebView web;private MediaController controller;private ListenableFuture<MediaController> future;
 private final Handler handler=new Handler(Looper.getMainLooper());private boolean pageReady=false;
 private final Runnable tick=new Runnable(){public void run(){sendState();handler.postDelayed(this,500);}};
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  web=new WebView(this);setContentView(web);
  androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(web,(v,insets)->{androidx.core.graphics.Insets bars=insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);return insets;});web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);
  web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);
  WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web.setWebViewClient(new WebViewClientCompat(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return loader.shouldInterceptRequest(request.getUrl());}
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !"appassets.androidplatform.net".equals(request.getUrl().getHost());}
  });
  if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){
   web.loadData("Android System WebView를 업데이트한 뒤 다시 실행해주세요.","text/html","UTF-8");return;
  }
  WebViewCompat.addWebMessageListener(web,"NWAndroid",Set.of("https://appassets.androidplatform.net"),(view,message,origin,main,reply)->{
   if(main&&"appassets.androidplatform.net".equals(origin.getHost()))handler.post(()->command(message.getData()));
  });
  future=new MediaController.Builder(this,new SessionToken(this,new ComponentName(this,PlaybackService.class))).buildAsync();
  future.addListener(()->{try{controller=future.get();controller.addListener(new Player.Listener(){
   @Override public void onEvents(Player player,Player.Events events){sendState();}
   @Override public void onPlayerError(PlaybackException e){emit("error",e.getErrorCodeName());}
  });if(pageReady)emit("ready",null);}catch(Exception e){emit("error","재생 서비스 연결 실패");}},getMainExecutor());
  web.loadUrl("https://appassets.androidplatform.net/assets/web/index.html");
  getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){@Override public void handleOnBackPressed(){moveTaskToBack(true);}});
 }
 private boolean validURL(String value){Uri u=Uri.parse(value);return "https".equals(u.getScheme())&&"ehrlckdqud-cloud.github.io".equals(u.getHost())&&u.getPath()!=null&&u.getPath().startsWith("/newtworld-ranking/assets/");}
 private void command(String raw){try{
  JSONObject m=new JSONObject(raw);if(m.optInt("version")!=1)return;String command=m.optString("command");
  if(command.equals("ready")){pageReady=true;if(controller!=null){emit("ready",null);sendState();}return;}
  if(controller==null){emit("error","재생 기능을 준비하는 중입니다.");return;}
  switch(command){
   case "queue":{
    // Returning to the UI must not reset music already owned by the service.
    if(controller.getMediaItemCount()>0){sendState();break;}
    JSONArray input=m.getJSONArray("tracks");if(input.length()>500)throw new IllegalArgumentException();ArrayList<MediaItem> items=new ArrayList<>();
    for(int i=0;i<input.length();i++){JSONObject t=input.getJSONObject(i);String url=t.getString("url");if(!validURL(url))throw new IllegalArgumentException();
     MediaMetadata.Builder meta=new MediaMetadata.Builder().setTitle(t.optString("title")).setArtist(t.optString("artist")).setAlbumTitle("뉴트월드");String art=t.optString("artwork");if(validURL(art))meta.setArtworkUri(Uri.parse(art));
     items.add(new MediaItem.Builder().setMediaId(t.getString("id")).setUri(url).setMediaMetadata(meta.build()).build());
    }controller.setMediaItems(items);modes(m);controller.prepare();sendState();break;
   }
   case "play":controller.play();break;
   case "pause":controller.pause();break;
   case "stop":controller.stop();controller.clearMediaItems();break;
   case "next":controller.seekToNextMediaItem();break;
   case "previous":controller.seekToPreviousMediaItem();break;
   case "select":for(int i=0;i<controller.getMediaItemCount();i++)if(controller.getMediaItemAt(i).mediaId.equals(m.optString("id"))){controller.seekTo(i,0);controller.play();break;}break;
   case "seek":controller.seekTo(Math.max(0,(long)(m.optDouble("position",0)*1000)));break;
   case "volume":controller.setVolume((float)Math.max(0,Math.min(1,m.optDouble("value",1))));break;
   case "modes":modes(m);break;
   case "state":sendState();break;
  }
 }catch(Exception e){emit("error","재생 요청을 처리하지 못했습니다.");}}
 private void modes(JSONObject m){controller.setRepeatMode(m.optString("repeat").equals("all")?Player.REPEAT_MODE_ALL:Player.REPEAT_MODE_OFF);controller.setShuffleModeEnabled(m.optBoolean("shuffle"));}
 private void emit(String type,String message){try{JSONObject o=new JSONObject().put("type",type);if(message!=null)o.put("message",message);send(o);}catch(Exception ignored){}}
 private void sendState(){if(controller==null)return;try{MediaItem item=controller.getCurrentMediaItem();send(new JSONObject().put("type","state").put("id",item==null?"":item.mediaId).put("position",Math.max(0,controller.getCurrentPosition())/1000.0).put("duration",Math.max(0,controller.getDuration())/1000.0).put("playing",controller.getPlayWhenReady()&&controller.getPlaybackState()!=Player.STATE_ENDED));}catch(Exception ignored){}}
 private void send(JSONObject o){if(pageReady&&web!=null)web.evaluateJavascript("window.NWNativeReceive&&window.NWNativeReceive("+o.toString()+")",null);}
 @Override protected void onStart(){super.onStart();handler.post(tick);}
 @Override protected void onStop(){handler.removeCallbacks(tick);super.onStop();}
 @Override protected void onDestroy(){handler.removeCallbacksAndMessages(null);if(future!=null)MediaController.releaseFuture(future);if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
