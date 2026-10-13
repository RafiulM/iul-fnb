CREATE TABLE "menu_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"tile" text DEFAULT '#F3EEE6' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menus" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"auto_unavailable" boolean DEFAULT false NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menus_price_positive" CHECK ("menus"."price" > 0)
);
--> statement-breakpoint
CREATE TABLE "recipe_items" (
	"id" text PRIMARY KEY NOT NULL,
	"menu_id" text NOT NULL,
	"ingredient_id" text NOT NULL,
	"qty_used" numeric(14, 3) NOT NULL,
	CONSTRAINT "recipe_items_qty_positive" CHECK ("recipe_items"."qty_used" > 0)
);
--> statement-breakpoint
CREATE TABLE "cafe_tables" (
	"id" text PRIMARY KEY NOT NULL,
	"table_number" text NOT NULL,
	"qr_code" text NOT NULL,
	"area" text DEFAULT 'Dalam' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cafe_tables_table_number_unique" UNIQUE("table_number"),
	CONSTRAINT "cafe_tables_qr_code_unique" UNIQUE("qr_code")
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"stock_qty" numeric(14, 3) DEFAULT 0 NOT NULL,
	"min_stock" numeric(14, 3) DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingredients_stock_non_negative" CHECK ("ingredients"."stock_qty" >= 0),
	CONSTRAINT "ingredients_min_non_negative" CHECK ("ingredients"."min_stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"ingredient_id" text NOT NULL,
	"qty" numeric(14, 3) NOT NULL,
	"type" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"order_id" text,
	"created_by" text,
	"created_by_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_counters" (
	"business_date" date PRIMARY KEY NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"menu_id" text,
	"name" text NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"qty" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"business_date" date NOT NULL,
	"seq" integer NOT NULL,
	"table_id" text,
	"table_number" text,
	"order_type" text NOT NULL,
	"status" text NOT NULL,
	"customer_name" text,
	"subtotal" integer NOT NULL,
	"tax" integer NOT NULL,
	"service" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"payment_status" text DEFAULT 'BELUM' NOT NULL,
	"payment_method" text,
	"payment_channel" text,
	"paid_amount" integer,
	"cancel_reason" text,
	"cashier_id" text,
	"cashier_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"stock_deducted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cafe_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"cafe_name" text NOT NULL,
	"logo_url" text,
	"address" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"instagram" text DEFAULT '' NOT NULL,
	"hours" jsonb NOT NULL,
	"tax_percent" numeric(5, 2) DEFAULT 0 NOT NULL,
	"service_percent" numeric(5, 2) DEFAULT 0 NOT NULL,
	"tax_inclusive" boolean DEFAULT false NOT NULL,
	"receipt" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cafe_settings_singleton" CHECK ("cafe_settings"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "menus" ADD CONSTRAINT "menus_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_id_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menus"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_cafe_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."cafe_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cashier_id_user_id_fk" FOREIGN KEY ("cashier_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "menu_categories_name_uq" ON "menu_categories" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "menus_name_uq" ON "menus" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "menus_category_idx" ON "menus" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_items_menu_ingredient_uq" ON "recipe_items" USING btree ("menu_id","ingredient_id");--> statement-breakpoint
CREATE INDEX "recipe_items_ingredient_idx" ON "recipe_items" USING btree ("ingredient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_name_uq" ON "ingredients" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "stock_movements_created_idx" ON "stock_movements" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "stock_movements_ingredient_idx" ON "stock_movements" USING btree ("ingredient_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id","position");--> statement-breakpoint
CREATE INDEX "order_items_menu_idx" ON "order_items" USING btree ("menu_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_business_date_seq_uq" ON "orders" USING btree ("business_date","seq");--> statement-breakpoint
CREATE INDEX "orders_business_date_idx" ON "orders" USING btree ("business_date","created_at");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_table_status_idx" ON "orders" USING btree ("table_id","status");