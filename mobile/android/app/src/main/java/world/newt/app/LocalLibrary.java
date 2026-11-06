package world.newt.app;

import android.content.Context;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.AtomicFile;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/** App-owned copies survive picker permission changes and process restarts. */
public final class LocalLibrary {
 private final Context context;
 public final File directory;
 public LocalLibrary(Context context){this(context,new File(context.getFilesDir(),"music"));}
 LocalLibrary(Context context,File directory){this.context=context.getApplicationContext();this.directory=directory;directory.mkdirs();}
 public synchronized JSONArray read(){try{return new JSONArray(new String(new AtomicFile(new File(directory,"library.json")).readFully(),StandardCharsets.UTF_8));}catch(Exception e){return new JSONArray();}}
 private void save(JSONArray tracks)throws Exception{
  AtomicFile file=new AtomicFile(new File(directory,"library.json"));FileOutputStream stream=null;
  try{stream=file.startWrite();stream.write(tracks.toString().getBytes(StandardCharsets.UTF_8));file.finishWrite(stream);}catch(Exception e){if(stream!=null)file.failWrite(stream);throw e;}
 }
 public synchronized JSONObject importFile(Uri source)throws Exception{
  String id="local-"+UUID.randomUUID(),name="내 음악";
  try(android.database.Cursor c=context.getContentResolver().query(source,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)){if(c!=null&&c.moveToFirst())name=c.getString(0);}
  File audio=new File(directory,id+".audio"),art=new File(directory,id+".jpg");
  try{
   try(InputStream in=context.getContentResolver().openInputStream(source);OutputStream out=new FileOutputStream(audio)){
    if(in==null)throw new IOException("파일을 열 수 없습니다.");byte[] buffer=new byte[65536];int count;while((count=in.read(buffer))!=-1)out.write(buffer,0,count);
   }
   String title=null,artist=null,lyrics="";long duration=0;
   MediaMetadataRetriever metadata=new MediaMetadataRetriever();try{
    metadata.setDataSource(audio.getAbsolutePath());title=metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE);artist=metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST);
    String length=metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);if(length!=null)duration=Long.parseLong(length);
    if(duration<=0)throw new IOException("재생 가능한 음악 파일이 아닙니다.");
    byte[] cover=metadata.getEmbeddedPicture();if(cover!=null)try(OutputStream out=new FileOutputStream(art)){out.write(cover);}
   }finally{metadata.release();}
   JSONObject track=new JSONObject().put("id",id).put("title",title==null||title.trim().isEmpty()?name.replaceFirst("\\.[^.]+$",""):title).put("artist",artist==null?"":artist).put("duration",duration/1000.0).put("lyrics",lyrics).put("local",true);
   JSONArray tracks=read();tracks.put(track);save(tracks);return track;
  }catch(Exception e){audio.delete();art.delete();throw e;}
 }
 public synchronized void delete(String id)throws Exception{
  JSONArray source=read(),next=new JSONArray();boolean found=false;
  for(int i=0;i<source.length();i++){JSONObject t=source.getJSONObject(i);if(t.getString("id").equals(id))found=true;else next.put(t);}
  if(!found)throw new IllegalArgumentException("개인 곡만 삭제할 수 있습니다.");
  save(next);new File(directory,id+".audio").delete();new File(directory,id+".jpg").delete();
 }
 public synchronized JSONArray webTracks(){JSONArray out=new JSONArray(),all=read();for(int i=0;i<all.length();i++)try{
  JSONObject t=new JSONObject(all.getJSONObject(i).toString());String id=t.getString("id");t.put("audio","native:"+id);t.put("cover",new File(directory,id+".jpg").exists()?"https://appassets.androidplatform.net/local/"+id+".jpg":"");out.put(t);
 }catch(Exception ignored){}return out;}
 public synchronized JSONArray nativeTracks(){JSONArray out=new JSONArray(),all=read();for(int i=0;i<all.length();i++)try{
  JSONObject t=new JSONObject(all.getJSONObject(i).toString());String id=t.getString("id");File audio=new File(directory,id+".audio");if(!audio.isFile())continue;
  t.put("url",Uri.fromFile(audio).toString());File art=new File(directory,id+".jpg");t.put("artwork",art.exists()?Uri.fromFile(art).toString():"");out.put(t);
 }catch(Exception ignored){}return out;}
}
