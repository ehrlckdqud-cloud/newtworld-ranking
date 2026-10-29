export function checkLaunch({slot,viewer,roster,coreReady}) {
 if(viewer||slot!==1)return 'GAME START는 방장만 누를 수 있습니다. 참가자는 READY를 누른 뒤 방장의 시작을 기다려주세요. 별도 설치는 필요하지 않습니다.';
 if(!roster.length||roster.some(p=>!p.ready||!p.connected))return 'READY가 준비되지 않았거나 연결이 끊긴 인원이 있습니다. 모든 참가자의 READY와 연결 상태를 확인해주세요.';
 if(!coreReady)return '방장 PC의 게임 준비가 완료되지 않았습니다. 게임 설치 또는 데이터 준비를 완료해주세요.';
 const purchasing=roster.filter(p=>p.purchasing);if(purchasing.length)return '코인 구매 처리 중입니다. 결제가 완료된 뒤 시작해주세요.';
 const empty=roster.filter(p=>!(p.credits>=1));if(empty.length)return `코인이 필요한 참가자: ${empty.map(p=>p.name).join(', ')}. READY를 취소하고 코인을 구매한 뒤 다시 준비해주세요.`;
 return null;
}
export function startError(code){return ({HOST_ONLY:'GAME START는 방장만 누를 수 있습니다.',HOST_CORE_REQUIRED:'방장 PC의 게임 준비가 서버에 확인되지 않았습니다. 방을 다시 만들고 데이터 준비를 완료해주세요.',ALL_PRESENT_READY_REQUIRED:'READY가 준비되지 않았거나 연결이 끊긴 인원이 있습니다.',ALL_PLAYERS_NEED_COIN:'모든 참가자에게 코인이 1개 이상 필요합니다. READY를 취소하고 코인을 구매해주세요.',PURCHASE_IN_PROGRESS:'코인 구매 처리 중입니다. 완료 후 다시 시작해주세요.',NOT_LOBBY:'이미 시작되었거나 방 상태가 변경되었습니다. 게임 연결 상태를 확인해주세요.'})[code]||`게임 시작 실패: ${code||'연결 오류'}`;}
