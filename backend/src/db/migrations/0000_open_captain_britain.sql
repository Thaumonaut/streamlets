CREATE TABLE IF NOT EXISTS "character_definitions" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"rarity" varchar(20) NOT NULL,
	"description" text,
	"artwork_url" varchar(500),
	"season" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "character_instances" (
	"id" serial PRIMARY KEY NOT NULL,
	"serial_number" varchar(50) NOT NULL,
	"char_id" varchar(50) NOT NULL,
	"owner_id" integer NOT NULL,
	"acquisition_method" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "character_instances_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "material_definitions" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"rarity" varchar(20) NOT NULL,
	"point_value" integer NOT NULL,
	"description" text,
	"icon_url" varchar(500)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "material_inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"viewer_id" integer NOT NULL,
	"material_id" varchar(50) NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_viewer_material" UNIQUE("viewer_id","material_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pull_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"viewer_id" integer NOT NULL,
	"tier" varchar(10) NOT NULL,
	"dust_cost" integer NOT NULL,
	"materials_received" jsonb NOT NULL,
	"characters_received" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recipe_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" varchar(50) NOT NULL,
	"material_id" varchar(50) NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "unique_recipe_material" UNIQUE("recipe_id","material_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recipes" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"char_id" varchar(50) NOT NULL,
	"total_point_cost" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recipes_char_id_unique" UNIQUE("char_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "viewers" (
	"id" serial PRIMARY KEY NOT NULL,
	"twitch_id" varchar(255) NOT NULL,
	"twitch_username" varchar(255),
	"dust_balance" integer DEFAULT 250 NOT NULL,
	"last_watch_heartbeat" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "viewers_twitch_id_unique" UNIQUE("twitch_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_characters_rarity" ON "character_definitions" ("rarity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_instances_owner" ON "character_instances" ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_instances_serial" ON "character_instances" ("serial_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_instances_char" ON "character_instances" ("char_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_materials_rarity" ON "material_definitions" ("rarity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_viewer" ON "material_inventory" ("viewer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pull_results_viewer" ON "pull_results" ("viewer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pull_results_created" ON "pull_results" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_recipe_materials_recipe" ON "recipe_materials" ("recipe_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_recipes_char" ON "recipes" ("char_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_viewers_twitch_id" ON "viewers" ("twitch_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character_instances" ADD CONSTRAINT "character_instances_char_id_character_definitions_id_fk" FOREIGN KEY ("char_id") REFERENCES "character_definitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "character_instances" ADD CONSTRAINT "character_instances_owner_id_viewers_id_fk" FOREIGN KEY ("owner_id") REFERENCES "viewers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_inventory" ADD CONSTRAINT "material_inventory_viewer_id_viewers_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "viewers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "material_inventory" ADD CONSTRAINT "material_inventory_material_id_material_definitions_id_fk" FOREIGN KEY ("material_id") REFERENCES "material_definitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pull_results" ADD CONSTRAINT "pull_results_viewer_id_viewers_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "viewers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recipe_materials" ADD CONSTRAINT "recipe_materials_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recipe_materials" ADD CONSTRAINT "recipe_materials_material_id_material_definitions_id_fk" FOREIGN KEY ("material_id") REFERENCES "material_definitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recipes" ADD CONSTRAINT "recipes_char_id_character_definitions_id_fk" FOREIGN KEY ("char_id") REFERENCES "character_definitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
