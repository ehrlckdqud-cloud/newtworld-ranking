// Server revisions prevent a slow room poll from undoing a newly confirmed purchase.
export class MemberCoins {
 constructor(){this.balance=0;this.revision=-1;this.pending=false;}
 update({balance,revision}){if(!Number.isSafeInteger(balance)||balance<0||!Number.isSafeInteger(revision)||revision<this.revision)return false;this.balance=balance;this.revision=revision;return true;}
}
