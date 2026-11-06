package world.newt.app;
import android.app.PendingIntent;
import android.content.Intent;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

public final class PlaybackService extends MediaSessionService {
 private MediaSession session;
 private final NativeEqualizer equalizer=new NativeEqualizer();
 private android.content.SharedPreferences preferences;
 private android.content.SharedPreferences.OnSharedPreferenceChangeListener listener;
 public static volatile boolean eqAvailable=false;
 @Override public void onCreate(){
  super.onCreate();
  ExoPlayer player=new ExoPlayer.Builder(this).build();
  preferences=getSharedPreferences("native-player",MODE_PRIVATE);
  listener=(prefs,key)->{if("equalizer".equals(key))equalizer.apply(prefs.getString(key,"{}"));};preferences.registerOnSharedPreferenceChangeListener(listener);
  player.addListener(new androidx.media3.common.Player.Listener(){@Override public void onAudioSessionIdChanged(int id){eqAvailable=equalizer.attach(id);equalizer.apply(preferences.getString("equalizer","{}"));}});
  player.setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(),true);
  player.setHandleAudioBecomingNoisy(true);player.setWakeMode(C.WAKE_MODE_NETWORK);
  PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  session=new MediaSession.Builder(this,player).setSessionActivity(open).build();
 }
 @Override public MediaSession onGetSession(MediaSession.ControllerInfo controller){return session;}
 @Override public void onTaskRemoved(Intent rootIntent){if(session==null||!session.getPlayer().getPlayWhenReady())stopSelf();}
 @Override public void onDestroy(){if(preferences!=null)preferences.unregisterOnSharedPreferenceChangeListener(listener);equalizer.release();eqAvailable=false;if(session!=null){session.getPlayer().release();session.release();session=null;}super.onDestroy();}
}
