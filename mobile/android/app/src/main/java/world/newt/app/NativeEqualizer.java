package world.newt.app;
import android.media.audiofx.Equalizer;
import org.json.JSONArray;
import org.json.JSONObject;

public final class NativeEqualizer {
 private Equalizer effect;
 private static final double[] CENTERS={60,230,910,3600,14000};
 public boolean attach(int session){release();if(session==0)return false;try{effect=new Equalizer(0,session);return true;}catch(RuntimeException e){return false;}}
 public void apply(String value){if(effect==null)return;try{
  JSONObject config=new JSONObject(value);JSONArray levels=config.optJSONArray("gains");short[] range=effect.getBandLevelRange();
  for(short band=0;band<effect.getNumberOfBands();band++){
   double hz=effect.getCenterFreq(band)/1000.0;int low=0;while(low<4&&CENTERS[low+1]<hz)low++;
   int high=Math.min(4,low+1);double a=levels==null?0:levels.optDouble(low,0),b=levels==null?0:levels.optDouble(high,0);
   double fraction=high==low?0:Math.max(0,Math.min(1,Math.log(hz/CENTERS[low])/Math.log(CENTERS[high]/CENTERS[low])));
   double gain=Math.max(-12,Math.min(12,a+(b-a)*fraction));effect.setBandLevel(band,(short)Math.max(range[0],Math.min(range[1],gain*100)));
  }effect.setEnabled(config.optBoolean("enabled",false));
 }catch(Exception ignored){}}
 public void release(){if(effect!=null){effect.release();effect=null;}}
}
