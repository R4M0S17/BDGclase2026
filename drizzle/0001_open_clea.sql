ALTER TABLE "tickets" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX "audit_logs_ticket_id_idx" ON "audit_logs" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "comments_ticket_id_idx" ON "comments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_assignees_user_id_idx" ON "ticket_assignees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_priority_idx" ON "tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tickets_created_by_idx" ON "tickets" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "tickets_archived_at_idx" ON "tickets" USING btree ("archived_at");