import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const rooms=sqliteTable('game_rooms',{
 id:text('id').primaryKey(),revision:integer('revision').notNull(),nonce:text('nonce').notNull(),
 state:text('state').notNull(),updated:integer('updated').notNull(),expires:integer('expires').notNull(),
});
export const events=sqliteTable('game_events',{
 key:text('key').primaryKey(),room:text('room').notNull(),seq:integer('seq').notNull(),
 target:integer('target'),payload:text('payload').notNull(),created:integer('created').notNull(),
},t=>[index('events_room_seq').on(t.room,t.seq),index('events_created').on(t.created)]);
