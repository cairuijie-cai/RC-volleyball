import { sqliteTable, text, integer, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('training_workspaces', {
  userId: text('user_id').primaryKey(),
  payload: text('payload').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});
export const homeworkFiles = sqliteTable('homework_files', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  studentId: text('student_id').notNull(),
  name: text('name').notNull(),
  size: integer('size').notNull(),
  contentType: text('content_type').notNull(),
  objectKey: text('object_key').notNull(),
  createdAt: text('created_at').notNull(),
});
export const trainingViewers=sqliteTable('training_viewers',{
 ownerId:text('owner_id').notNull(),
 userId:text('user_id').notNull(),
 studentId:text('student_id'),
 email:text('email').notNull(),
 displayName:text('display_name').notNull(),
 firstSeen:text('first_seen').notNull(),
 lastSeen:text('last_seen').notNull(),
 visits:integer('visits').notNull().default(1),
},table=>[
 primaryKey({columns:[table.ownerId,table.userId]}),
 uniqueIndex('training_viewers_student_unique').on(table.ownerId,table.studentId),
]);
