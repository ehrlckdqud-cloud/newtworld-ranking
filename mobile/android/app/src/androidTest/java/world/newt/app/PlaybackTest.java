package world.newt.app;
import android.content.Context;
import android.content.ContentValues;
import android.net.Uri;
import android.provider.MediaStore;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.media3.common.MediaItem;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.*;
import java.nio.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class PlaybackTest {
 private byte[] wav(){int samples=22050;ByteBuffer b=ByteBuffer.allocate(44+samples*2).order(ByteOrder.LITTLE_ENDIAN);b.put("RIFF".getBytes()).putInt(36+samples*2).put("WAVEfmt ".getBytes()).putInt(16).putShort((short)1).putShort((short)1).putInt(44100).putInt(88200).putShort((short)2).putShort((short)16).put("data".getBytes()).putInt(samples*2);for(int i=0;i<samples;i++)b.putShort((short)(3000*Math.sin(2*Math.PI*440*i/44100)));return b.array();}
 @Test public void personalMusicSurvivesSourceRemovalAndReload()throws Exception{
  Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();File folder=new File(context.getCacheDir(),"test-library-"+UUID.randomUUID());LocalLibrary library=new LocalLibrary(context,folder);
  ContentValues values=new ContentValues();values.put(MediaStore.Audio.Media.DISPLAY_NAME,"newt-test-"+UUID.randomUUID()+".wav");values.put(MediaStore.Audio.Media.MIME_TYPE,"audio/wav");values.put(MediaStore.Audio.Media.IS_PENDING,1);
  Uri uri=context.getContentResolver().insert(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,values);assertNotNull(uri);
  try{
   try(OutputStream out=context.getContentResolver().openOutputStream(uri)){out.write(wav());}
   JSONObject track=library.importFile(uri);String id=track.getString("id");context.getContentResolver().delete(uri,null,null);
   LocalLibrary restored=new LocalLibrary(context,folder);assertEquals(1,restored.read().length());assertTrue(new File(folder,id+".audio").isFile());assertTrue(restored.webTracks().getJSONObject(0).getBoolean("local"));
   try{restored.delete("builtin-1");fail("Default-song deletion must be rejected");}catch(IllegalArgumentException expected){}
   restored.delete(id);assertEquals(0,new LocalLibrary(context,folder).read().length());assertFalse(new File(folder,id+".audio").exists());
  }finally{try{context.getContentResolver().delete(uri,null,null);}catch(SecurityException ignored){}File[] files=folder.listFiles();if(files!=null)for(File f:files)f.delete();folder.delete();}
 }
 @Test public void nativeQueueAdvancesWithoutJavascript()throws Exception{
  Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();File source=new File(context.getCacheDir(),"queue-test-"+UUID.randomUUID()+".wav");try(FileOutputStream out=new FileOutputStream(source)){out.write(wav());}
  CountDownLatch ended=new CountDownLatch(1);Set<String> visited=Collections.synchronizedSet(new HashSet<>());ExoPlayer[] holder=new ExoPlayer[1];
  try{
   InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{ExoPlayer player=new ExoPlayer.Builder(context).build();holder[0]=player;player.setVolume(0);player.addListener(new Player.Listener(){@Override public void onMediaItemTransition(MediaItem item,int reason){if(item!=null)visited.add(item.mediaId);}@Override public void onPlaybackStateChanged(int state){if(state==Player.STATE_ENDED)ended.countDown();}});for(int i=0;i<3;i++)player.addMediaItem(new MediaItem.Builder().setMediaId("test-"+i).setUri(Uri.fromFile(source)).build());player.prepare();player.play();});
   assertTrue("Native queue should complete three tracks",ended.await(20,TimeUnit.SECONDS));assertEquals(3,visited.size());
  }finally{InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{if(holder[0]!=null)holder[0].release();});source.delete();}
 }
 @Test public void backgroundServiceKeepsNotificationAcrossTracks()throws Exception{
  Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();File source=new File(context.getCacheDir(),"service-test-"+UUID.randomUUID()+".wav");
  // Repeat the half-second PCM fixture into a three-second WAV.
  byte[] shortWave=wav();int pcmSize=(shortWave.length-44)*6;ByteBuffer wave=ByteBuffer.allocate(44+pcmSize).order(ByteOrder.LITTLE_ENDIAN);wave.put(shortWave,0,44);wave.putInt(4,36+pcmSize);wave.putInt(40,pcmSize);for(int i=0;i<6;i++)wave.put(shortWave,44,shortWave.length-44);try(FileOutputStream out=new FileOutputStream(source)){out.write(wave.array());}
  androidx.media3.session.MediaController[] control=new androidx.media3.session.MediaController[1];
  java.util.concurrent.atomic.AtomicReference<com.google.common.util.concurrent.ListenableFuture<androidx.media3.session.MediaController>> pending=new java.util.concurrent.atomic.AtomicReference<>();
  CountDownLatch thirdTrack=new CountDownLatch(1),finished=new CountDownLatch(1);
  try(androidx.test.core.app.ActivityScenario<MainActivity> scenario=androidx.test.core.app.ActivityScenario.launch(MainActivity.class)){
   scenario.onActivity(activity->{try{java.lang.reflect.Field field=MainActivity.class.getDeclaredField("web");field.setAccessible(true);android.webkit.WebView web=(android.webkit.WebView)field.get(activity);web.stopLoading();androidx.webkit.WebViewCompat.removeWebMessageListener(web,"NWAndroid");web.loadData("Native playback test","text/html","UTF-8");}catch(Exception e){throw new RuntimeException(e);}});
   InstrumentationRegistry.getInstrumentation().runOnMainSync(()->pending.set(new androidx.media3.session.MediaController.Builder(context,new androidx.media3.session.SessionToken(context,new android.content.ComponentName(context,PlaybackService.class))).buildAsync()));
   control[0]=pending.get().get(10,TimeUnit.SECONDS);
   InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{
    control[0].addListener(new Player.Listener(){@Override public void onMediaItemTransition(MediaItem item,int reason){if(item!=null&&item.mediaId.equals("background-2"))thirdTrack.countDown();}@Override public void onPlaybackStateChanged(int state){if(state==Player.STATE_ENDED)finished.countDown();}});
    ArrayList<MediaItem> tracks=new ArrayList<>();for(int i=0;i<3;i++)tracks.add(new MediaItem.Builder().setMediaId("background-"+i).setUri(Uri.fromFile(source)).setMediaMetadata(new androidx.media3.common.MediaMetadata.Builder().setTitle("Background test "+i).build()).build());
    control[0].setMediaItems(tracks);control[0].setRepeatMode(Player.REPEAT_MODE_OFF);control[0].setVolume(0);control[0].prepare();control[0].play();
   });
   scenario.onActivity(activity->activity.moveTaskToBack(true));
   assertTrue("Third track starts with activity backgrounded",thirdTrack.await(30,TimeUnit.SECONDS));
   android.app.NotificationManager notifications=(android.app.NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
   assertTrue("Media notification remains at the third track",notifications.getActiveNotifications().length>0);
   assertTrue("Background queue reaches its end",finished.await(15,TimeUnit.SECONDS));
  }finally{InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{if(control[0]!=null){control[0].stop();control[0].release();}});source.delete();}
 }

}
