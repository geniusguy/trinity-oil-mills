CREATE TABLE `courier_rates` (
	`id` varchar(255) NOT NULL,
	`destination` varchar(100) NOT NULL,
	`weight` decimal(10,2) NOT NULL,
	`rate` decimal(10,2) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courier_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(20),
	`address` text,
	`city` varchar(100),
	`state` varchar(100) DEFAULT 'Tamil Nadu',
	`pincode` varchar(10),
	`customer_type` varchar(50) NOT NULL DEFAULT 'retail',
	`gst_number` varchar(15),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`payment_method` varchar(50) NOT NULL DEFAULT 'cash',
	`receipt_number` varchar(100),
	`expense_date` datetime NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` varchar(255) NOT NULL,
	`product_id` varchar(255) NOT NULL,
	`quantity` decimal(10,2) NOT NULL DEFAULT '0',
	`min_stock` decimal(10,2) NOT NULL DEFAULT '10',
	`max_stock` decimal(10,2) NOT NULL DEFAULT '1000',
	`location` varchar(100) DEFAULT 'main_store',
	`batch_number` varchar(100),
	`expiry_date` datetime,
	`cost_price` decimal(10,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` varchar(255) NOT NULL,
	`order_id` varchar(255) NOT NULL,
	`product_id` varchar(255) NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`unit_price` decimal(10,2) NOT NULL,
	`gst_rate` decimal(5,2) NOT NULL,
	`gst_amount` decimal(10,2) NOT NULL,
	`total_amount` decimal(10,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(255) NOT NULL,
	`customer_id` varchar(255) NOT NULL,
	`order_number` varchar(100) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`subtotal` decimal(10,2) NOT NULL,
	`gst_amount` decimal(10,2) NOT NULL,
	`total_amount` decimal(10,2) NOT NULL,
	`delivery_date` datetime,
	`delivery_address` text,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `production` (
	`id` varchar(255) NOT NULL,
	`product_id` varchar(255) NOT NULL,
	`batch_number` varchar(100) NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`cost_per_unit` decimal(10,2) NOT NULL,
	`total_cost` decimal(10,2) NOT NULL,
	`production_date` datetime NOT NULL,
	`expiry_date` datetime,
	`quality_check` boolean NOT NULL DEFAULT false,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `production_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`type` varchar(100) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`gst_rate` decimal(5,2) NOT NULL DEFAULT '5.00',
	`unit` varchar(50) NOT NULL DEFAULT 'liters',
	`barcode` varchar(100),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` varchar(255) NOT NULL,
	`sale_id` varchar(255) NOT NULL,
	`product_id` varchar(255) NOT NULL,
	`quantity` decimal(10,2) NOT NULL,
	`unit_price` decimal(10,2) NOT NULL,
	`gst_rate` decimal(5,2) NOT NULL,
	`gst_amount` decimal(10,2) NOT NULL,
	`total_amount` decimal(10,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sale_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` varchar(255) NOT NULL,
	`customer_id` varchar(255),
	`user_id` varchar(255) NOT NULL,
	`invoice_number` varchar(100) NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`gst_amount` decimal(10,2) NOT NULL,
	`total_amount` decimal(10,2) NOT NULL,
	`payment_method` varchar(50) NOT NULL DEFAULT 'cash',
	`payment_status` varchar(50) NOT NULL DEFAULT 'paid',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(50) NOT NULL DEFAULT 'retail_staff',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
