import metal5 from './mslug5-package.json' with {type:'json'};
import metal4 from './mslug4-package.json' with {type:'json'};
import metalX from './mslugx-package.json' with {type:'json'};
import metal1 from './mslug-package.json' with {type:'json'};
import metal2 from './mslug2-package.json' with {type:'json'};
import metal from './game-package.json' with {type:'json'};
import gunbird from './gunbird2-package.json' with {type:'json'};
import puyo from './puyopuyo2-package.json' with {type:'json'};
export const arcadePackages=new Map([
 ['mslug',{manifest:metal1,keyName:'NW_MSLUG_PACKAGE_KEY'}],
 ['mslug2',{manifest:metal2,keyName:'NW_MSLUG2_PACKAGE_KEY'}],
 ['mslugx',{manifest:metalX,keyName:'NW_MSLUGX_PACKAGE_KEY'}],
 ['mslug3',{manifest:metal,keyName:'NW_GAME_PACKAGE_KEY'}],
 ['mslug4',{manifest:metal4,keyName:'NW_MSLUG4_PACKAGE_KEY'}],
 ['mslug5',{manifest:metal5,keyName:'NW_MSLUG5_PACKAGE_KEY'}],
 ['gunbird2',{manifest:gunbird,keyName:'NW_GUNBIRD2_PACKAGE_KEY'}],
 ['puyopuyo2',{manifest:puyo,keyName:'NW_PUYO2_PACKAGE_KEY'}]
]);
