-- Trinity Oil Mills DB backup
-- Database: trinityoil_oil_shop_db_new
-- Host: localhost
-- Date: 2026-03-03T19:48:18.133Z

SET FOREIGN_KEY_CHECKS=0;


-- ----------------------------
-- Table structure for `canteen_addresses`
-- ----------------------------
DROP TABLE IF EXISTS `canteen_addresses`;
CREATE TABLE `canteen_addresses` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `canteen_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Tamil Nadu',
  `pincode` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `contact_person` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `mobile_number` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `gst_number` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT '33AAAGT0316F1ZT',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `billing_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `billing_city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `billing_state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `billing_pincode` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Records of `canteen_addresses`
-- ----------------------------
INSERT INTO `canteen_addresses` (`id`, `canteen_name`, `address`, `city`, `state`, `pincode`, `contact_person`, `mobile_number`, `gst_number`, `is_active`, `created_at`, `updated_at`, `billing_address`, `billing_city`, `billing_state`, `billing_pincode`) VALUES ('canteen-1758954910410', 'TN Police Master Canteen (Copy)', 'Pudupet(Egmore),
No 49, RR Stadium,
Men Barracks, AR Line,
Pudupet,', 'Chennai', 'Tamil Nadu', '600002', 'Tr.R.Kannan', '9498172560', '33AAAGT0316F1ZT', 1, '2025-09-27 06:35:10', '2025-09-27 06:35:10', 'Pudupet(Egmore),
No 49, RR Stadium,
Men Barracks, AR Line,
Pudupet,', 'Chennai', 'Tamil Nadu', '600002');
INSERT INTO `canteen_addresses` (`id`, `canteen_name`, `address`, `city`, `state`, `pincode`, `contact_person`, `mobile_number`, `gst_number`, `is_active`, `created_at`, `updated_at`, `billing_address`, `billing_city`, `billing_state`, `billing_pincode`) VALUES ('canteen-1772541483571-0', 'Sample Canteen', 'no number at Delivery Road, T. Nagar', 'Chennai', 'Tamil Nadu', '600017', 'Raman Kumar', '9876543210', '33AAAGT0316F1ZT', 1, '2026-03-03 12:38:03', '2026-03-03 12:38:20', '123 Billing Street, T. Nagar', 'Chennai', 'Tamil Nadu', '600017');
INSERT INTO `canteen_addresses` (`id`, `canteen_name`, `address`, `city`, `state`, `pincode`, `contact_person`, `mobile_number`, `gst_number`, `is_active`, `created_at`, `updated_at`, `billing_address`, `billing_city`, `billing_state`, `billing_pincode`) VALUES ('canteen-chennai-master', 'TN Police Master Canteen', 'Master Canteen', 'Chennai', 'Tamil Nadu', '600002', 'Tr.R.Kannan', '9498172560', '33AAAGT0316F1ZT', 1, '2025-09-15 11:33:52', '2026-03-03 12:22:40', 'Pudupet(Egmore),
No 49, RR Stadium,
Men Barracks, AR Line,
Pudupet,', 'Chennai', 'Tamil Nadu', '600002');

-- ----------------------------
-- Table structure for `courier_rates`
-- ----------------------------
DROP TABLE IF EXISTS `courier_rates`;
CREATE TABLE `courier_rates` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `destination` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `weight` decimal(10,2) NOT NULL,
  `rate` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for `customers`
-- ----------------------------
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'Tamil Nadu',
  `pincode` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'retail',
  `gst_number` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for `expenses`
-- ----------------------------
DROP TABLE IF EXISTS `expenses`;
CREATE TABLE `expenses` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'cash',
  `receipt_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `expense_date` datetime NOT NULL,
  `user_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Records of `expenses`
-- ----------------------------
INSERT INTO `expenses` (`id`, `category`, `description`, `amount`, `payment_method`, `receipt_number`, `expense_date`, `user_id`, `created_at`, `updated_at`) VALUES ('exp_1758092295566_3js6lv4hv', 'administrative', 'Rent', '18000.00', 'cash', NULL, '2025-09-16 18:30:00', 'admin-001', '2025-09-17 01:28:15', '2025-09-17 01:28:15');
INSERT INTO `expenses` (`id`, `category`, `description`, `amount`, `payment_method`, `receipt_number`, `expense_date`, `user_id`, `created_at`, `updated_at`) VALUES ('exp_1758092306214_rqlm60jww', 'administrative', 'Salary', '10000.00', 'cash', NULL, '2025-09-16 18:30:00', 'admin-001', '2025-09-17 01:28:26', '2025-09-17 01:28:26');
INSERT INTO `expenses` (`id`, `category`, `description`, `amount`, `payment_method`, `receipt_number`, `expense_date`, `user_id`, `created_at`, `updated_at`) VALUES ('exp_1758277099817_q09ll5mh8', 'transportation', 'Auto charges for lables ', '100.00', 'cash', NULL, '2025-09-18 18:30:00', 'admin-1757920260065', '2025-09-19 04:48:19', '2025-09-19 04:48:19');

-- ----------------------------
-- Table structure for `inventory`
-- ----------------------------
DROP TABLE IF EXISTS `inventory`;
CREATE TABLE `inventory` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `product_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '0.00',
  `min_stock` decimal(10,2) NOT NULL DEFAULT '10.00',
  `max_stock` decimal(10,2) NOT NULL DEFAULT '1000.00',
  `location` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'main_store',
  `batch_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `expiry_date` datetime DEFAULT NULL,
  `cost_price` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Records of `inventory`
-- ----------------------------
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv-castor-200ml', 'castor-200ml', '60.00', '10.00', '1000.00', 'main_store', NULL, NULL, NULL, '2025-09-15 14:38:04', '2026-03-03 12:37:26');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv-coconut-1l', 'coconut-1l', '84.00', '10.00', '1000.00', 'main_store', NULL, NULL, NULL, '2025-09-15 14:38:04', '2025-09-26 10:19:41');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv-coconut-500ml', 'coconut-500ml', '95.00', '10.00', '1000.00', 'main_store', NULL, NULL, NULL, '2025-09-15 14:38:04', '2025-09-26 10:19:41');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv-deepam-1l', 'deepam-1l', '98.00', '10.00', '1000.00', 'main_store', NULL, NULL, NULL, '2025-09-15 14:49:47', '2025-09-26 10:19:41');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv-deepam-500ml', 'deepam-500ml', '98.00', '10.00', '1000.00', 'main_store', NULL, NULL, NULL, '2025-09-15 14:49:47', '2025-09-26 10:19:41');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv-gingelly-1l', 'gingelly-1l', '10.00', '10.00', '1000.00', 'main_store', NULL, NULL, NULL, '2025-09-15 14:38:04', '2025-09-27 06:22:26');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv-gingelly-500ml', 'gingelly-500ml', '98.00', '10.00', '1000.00', 'main_store', NULL, NULL, NULL, '2025-09-15 14:38:04', '2025-09-26 10:19:41');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv-groundnut-1l', 'groundnut-1l', '98.00', '10.00', '1000.00', 'main_store', NULL, NULL, NULL, '2025-09-15 14:38:04', '2025-09-26 10:19:41');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv-groundnut-500ml', 'groundnut-500ml', '98.00', '10.00', '1000.00', 'main_store', NULL, NULL, NULL, '2025-09-15 14:38:04', '2025-09-26 10:19:41');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv-prod-coconut', 'prod-coconut', '400.00', '40.00', '900.00', 'main_store', 'BATCH-1757920179259', NULL, '80.00', '2025-09-15 07:09:39', '2025-09-15 07:09:39');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv-prod-gingelly', 'prod-gingelly', '300.00', '30.00', '800.00', 'main_store', 'BATCH-1757920179255', NULL, '120.00', '2025-09-15 07:09:39', '2025-09-15 07:09:39');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv-prod-ground-nut', 'prod-ground-nut', '500.00', '50.00', '1000.00', 'main_store', 'BATCH-1757920179250', NULL, '100.00', '2025-09-15 07:09:39', '2025-09-15 07:09:39');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv-purch-castor', 'purch-castor', '100.00', '10.00', '300.00', 'main_store', 'BATCH-1757920179266', NULL, '180.00', '2025-09-15 07:09:39', '2025-09-15 15:05:57');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv-purch-deepam', 'purch-deepam', '200.00', '20.00', '500.00', 'main_store', 'BATCH-1757920179263', NULL, '70.00', '2025-09-15 07:09:39', '2025-09-15 07:09:39');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv_001', 'prod_groundnut_001', '498.00', '50.00', '1000.00', 'main_store', NULL, NULL, NULL, '2025-09-17 06:17:39', '2025-09-26 10:19:41');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv_002', 'prod_gingelly_001', '298.00', '30.00', '800.00', 'main_store', NULL, NULL, NULL, '2025-09-17 06:17:39', '2025-09-26 10:19:41');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv_003', 'prod_coconut_001', '396.00', '40.00', '900.00', 'main_store', NULL, NULL, NULL, '2025-09-17 06:17:39', '2025-09-26 10:19:41');
INSERT INTO `inventory` (`id`, `product_id`, `quantity`, `min_stock`, `max_stock`, `location`, `batch_number`, `expiry_date`, `cost_price`, `created_at`, `updated_at`) VALUES ('inv_004', 'prod_deepam_001', '198.00', '20.00', '500.00', 'main_store', NULL, NULL, NULL, '2025-09-17 06:17:39', '2025-09-26 10:19:41');

-- ----------------------------
-- Table structure for `loan_payments`
-- ----------------------------
DROP TABLE IF EXISTS `loan_payments`;
CREATE TABLE `loan_payments` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `loan_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `payment_date` date NOT NULL,
  `payment_amount` decimal(10,2) NOT NULL,
  `principal_amount` decimal(10,2) NOT NULL,
  `interest_amount` decimal(10,2) NOT NULL,
  `outstanding_balance` decimal(12,2) NOT NULL,
  `payment_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'bank_transfer',
  `transaction_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `receipt_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'paid',
  `late_fee` decimal(10,2) DEFAULT '0.00',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for `loans`
-- ----------------------------
DROP TABLE IF EXISTS `loans`;
CREATE TABLE `loans` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `loan_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `lender_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `loan_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `principal_amount` decimal(12,2) NOT NULL,
  `interest_rate` decimal(5,2) NOT NULL,
  `tenure` int NOT NULL,
  `emi_amount` decimal(10,2) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `account_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ifsc_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `collateral` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `purpose` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'active',
  `remaining_balance` decimal(12,2) NOT NULL,
  `next_payment_date` date DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Records of `loans`
-- ----------------------------
INSERT INTO `loans` (`id`, `loan_name`, `lender_name`, `loan_type`, `principal_amount`, `interest_rate`, `tenure`, `emi_amount`, `start_date`, `end_date`, `account_number`, `ifsc_code`, `collateral`, `purpose`, `status`, `remaining_balance`, `next_payment_date`, `notes`, `created_by`, `created_at`, `updated_at`) VALUES ('c5f1a75f-1daf-4b80-90f5-b3bbb7d9f4e9', 'Ravikumar sir ', 'Ravi kumar sir', 'working_capital', '200000.00', '0.00', 24, '8500.00', '2025-09-30 18:30:00', '2027-09-30 18:30:00', NULL, NULL, NULL, 'he gave while opening the shop', 'active', '200000.00', '2025-10-31 18:30:00', NULL, 'admin-001', '2025-09-24 15:54:58', '2025-09-24 15:54:58');

-- ----------------------------
-- Table structure for `order_items`
-- ----------------------------
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `order_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `product_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `gst_rate` decimal(5,2) NOT NULL,
  `gst_amount` decimal(10,2) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for `orders`
-- ----------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `customer_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `order_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `subtotal` decimal(10,2) NOT NULL,
  `gst_amount` decimal(10,2) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `delivery_date` datetime DEFAULT NULL,
  `delivery_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for `product_price_history`
-- ----------------------------
DROP TABLE IF EXISTS `product_price_history`;
CREATE TABLE `product_price_history` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `product_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `base_price` decimal(10,2) NOT NULL,
  `retail_price` decimal(10,2) NOT NULL,
  `gst_rate` decimal(5,2) NOT NULL,
  `effective_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Records of `product_price_history`
-- ----------------------------
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('00171a15-b1b4-4c49-ab0b-213f2ed6a827', 'prod_groundnut_001', '180.00', '189.00', '5.00', '2025-09-16 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('03c0958d-48a8-458a-b2fb-66d2befec679', 'castor-200ml', '80.00', '84.00', '5.00', '2025-09-14 18:30:00', '2025-09-24 18:30:00', 0, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('1540eb53-4ccd-4be5-a859-ff92f0d087ba', 'gingelly-5l', '1700.00', '1700.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('1d1aed3e-f74f-4d83-b982-2f40124f9c67', 'coconut-100ml', '90.00', '90.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('1daa609d-5905-4baf-8d8d-77e85b62894c', 'deepam-1l', '220.00', '220.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('30680e7b-ce9a-49dd-9c4d-95f9060574e8', 'prod_coconut_001', '160.00', '168.00', '5.00', '2025-09-16 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('31755383-6d00-4c39-a081-49e093f012b9', 'pack_pet_bottle_500ml', '5.25', '5.25', '18.00', '2025-09-15 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('3998b36d-458f-47e9-a81e-d98f07bff0a7', 'groundnut-500ml', '150.00', '150.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('3a5c0664-cfe7-4710-8c96-c7eee3b65f9d', 'prod_deepam_001', '90.00', '94.50', '5.00', '2025-09-16 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('3dc7da67-2637-46b9-b636-fb170b07e7da', 'deepam-100ml', '33.00', '33.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('471b522d-5a6e-467f-bae4-4e44814872b4', 'pack_packing_tape', '45.00', '45.00', '18.00', '2025-09-15 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('4e7e5532-5831-49df-9d6b-c426d7bea5d6', 'pack_carton_box', '12.00', '12.00', '18.00', '2025-09-15 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('5f5940fd-8e64-483e-b25d-c384146052a1', 'pack_pet_bottle_1l', '8.50', '8.50', '18.00', '2025-09-15 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('6cf2a90d-522f-4e2b-ac24-ed5993d4a283', 'coconut-5l', '2550.00', '2550.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('764f6926-ee96-487c-8a66-7fb06316cf00', 'coconut-500ml', '300.00', '300.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('7c7fa72a-b6eb-46e6-ba11-0bdb0cdca63a', 'groundnut-5l', '1275.00', '1275.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('8e451d36-e070-4738-83ce-025d899c7f02', 'groundnut-1l', '300.00', '300.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('92af3168-06a8-40f3-a1d8-0c98ce2657a0', 'castor-200ml', '80.00', '80.00', '5.00', '2025-09-25 18:30:00', NULL, 1, '2025-09-26 11:42:50', 'admin-001', '');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('b2f697ab-6d06-49b0-adaf-07c9d6524c57', 'gingelly-100ml', '60.00', '60.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('bd2f449d-08c6-4ab3-a0fe-c6a402e8ac35', 'prod_gingelly_001', '220.00', '231.00', '5.00', '2025-09-16 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('c43a6af1-6a4b-43f1-8230-d3ff706ba379', 'groundnut-100ml', '45.00', '45.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('c9e57b12-9bb5-4da1-b901-1ce075bfb740', 'prod_bottle_1l', '12.00', '12.60', '5.00', '2025-09-16 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('d0efaa6a-b3f5-41cd-9971-4ae15b4f3df8', 'deepam-500ml', '110.00', '110.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('d496aa9f-b2ad-43d9-8179-f20cb702f340', 'coconut-1l', '600.00', '600.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('dd739fa1-d96e-4714-abaf-997e05daad90', 'pack_pet_bottle_200ml', '3.75', '3.75', '18.00', '2025-09-15 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('ed183232-5335-4779-9b67-d1bd74debd59', 'prod_bottle_500ml', '8.00', '8.40', '5.00', '2025-09-16 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('ef119689-615d-496b-afa1-43a80b3c7794', 'gingelly-1l', '400.00', '400.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('f291f1ca-347a-4c6e-8845-0e37184601d5', 'gingelly-500ml', '200.00', '200.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');
INSERT INTO `product_price_history` (`id`, `product_id`, `base_price`, `retail_price`, `gst_rate`, `effective_date`, `end_date`, `is_active`, `created_at`, `created_by`, `notes`) VALUES ('f3b2dee5-6029-4b0e-a50c-1fe1c23972dd', 'deepam-5l', '935.00', '935.00', '5.00', '2025-09-14 18:30:00', NULL, 1, '2025-09-26 11:05:25', 'admin-001', 'Initial price history entry');

-- ----------------------------
-- Table structure for `production`
-- ----------------------------
DROP TABLE IF EXISTS `production`;
CREATE TABLE `production` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `product_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `batch_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `cost_per_unit` decimal(10,2) NOT NULL,
  `total_cost` decimal(10,2) NOT NULL,
  `production_date` datetime NOT NULL,
  `expiry_date` datetime DEFAULT NULL,
  `quality_check` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Records of `production`
-- ----------------------------
INSERT INTO `production` (`id`, `product_id`, `batch_number`, `quantity`, `cost_per_unit`, `total_cost`, `production_date`, `expiry_date`, `quality_check`, `notes`, `created_at`, `updated_at`) VALUES ('prod_rec_001', 'prod_groundnut_001', 'GN-2024-001', '200.00', '165.00', '33000.00', '2024-11-30 18:30:00', NULL, 1, 'Premium quality groundnut oil batch', '2025-09-17 06:17:39', '2025-09-17 06:17:39');
INSERT INTO `production` (`id`, `product_id`, `batch_number`, `quantity`, `cost_per_unit`, `total_cost`, `production_date`, `expiry_date`, `quality_check`, `notes`, `created_at`, `updated_at`) VALUES ('prod_rec_002', 'prod_gingelly_001', 'GS-2024-001', '100.00', '200.00', '20000.00', '2024-12-01 18:30:00', NULL, 1, 'Pure gingelly oil with natural aroma', '2025-09-17 06:17:39', '2025-09-17 06:17:39');
INSERT INTO `production` (`id`, `product_id`, `batch_number`, `quantity`, `cost_per_unit`, `total_cost`, `production_date`, `expiry_date`, `quality_check`, `notes`, `created_at`, `updated_at`) VALUES ('prod_rec_003', 'prod_coconut_001', 'CO-2024-001', '150.00', '145.00', '21750.00', '2024-12-02 18:30:00', NULL, 1, 'Extra virgin coconut oil cold pressed', '2025-09-17 06:17:39', '2025-09-17 06:17:39');

-- ----------------------------
-- Table structure for `production_cost_history`
-- ----------------------------
DROP TABLE IF EXISTS `production_cost_history`;
CREATE TABLE `production_cost_history` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `production_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `product_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `raw_material_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `quantity_used` decimal(10,3) NOT NULL,
  `cost_per_unit` decimal(10,2) NOT NULL,
  `total_cost` decimal(10,2) NOT NULL,
  `production_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for `production_recipes`
-- ----------------------------
DROP TABLE IF EXISTS `production_recipes`;
CREATE TABLE `production_recipes` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `product_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `raw_material_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `quantity_per_unit` decimal(10,3) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for `products`
-- ----------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `base_price` decimal(10,2) NOT NULL,
  `retail_price` decimal(10,2) NOT NULL,
  `gst_rate` decimal(5,2) NOT NULL DEFAULT '5.00',
  `gst_included` tinyint(1) NOT NULL DEFAULT '0',
  `unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'liters',
  `barcode` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Records of `products`
-- ----------------------------
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('castor-200ml', 'Castor Oil', 'Purchased', 'Castor', 'Pure castor oil', '80.00', '80.00', '5.00', 0, '200ml', NULL, 1, '2025-09-15 14:38:04', '2025-09-26 11:42:50');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('coconut-100ml', 'Coconut Oil - 100ml', 'Produced', 'Coconut', 'Loose Coconut Oil - 100ml', '90.00', '90.00', '5.00', 1, '100ml', NULL, 1, '2025-09-15 17:00:53', '2025-09-15 17:00:53');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('coconut-1l', 'Coconut Oil', 'Produced', 'Coconut', 'Pure coconut oil', '600.00', '600.00', '5.00', 1, '1L', NULL, 1, '2025-09-15 14:38:04', '2025-09-15 14:52:51');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('coconut-500ml', 'Coconut Oil', 'Produced', 'Coconut', 'Pure coconut oil', '300.00', '300.00', '5.00', 1, '500ml', NULL, 1, '2025-09-15 14:38:04', '2025-09-15 14:38:04');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('coconut-5l', 'Coconut Oil - 5L', 'Produced', 'Coconut', 'Bulk Coconut Oil - 5L Container', '2550.00', '2550.00', '5.00', 1, '5L', NULL, 1, '2025-09-15 17:19:26', '2025-09-15 17:19:26');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('deepam-100ml', 'Deepam Oil - 100ml', 'Purchased', 'Deepam', 'Loose Deepam Oil - 100ml', '33.00', '33.00', '5.00', 1, '100ml', NULL, 1, '2025-09-15 17:00:53', '2025-09-15 17:00:53');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('deepam-1l', 'Deepam Oil', 'Purchased', 'Deepam', 'Deepam oil for lighting', '220.00', '220.00', '5.00', 1, '1L', NULL, 1, '2025-09-15 14:49:47', '2025-09-15 14:49:47');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('deepam-500ml', 'Deepam Oil', 'Purchased', 'Deepam', 'Deepam oil for lighting', '110.00', '110.00', '5.00', 1, '500ml', NULL, 1, '2025-09-15 14:49:47', '2025-09-15 14:49:47');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('deepam-5l', 'Deepam Oil - 5L', 'Purchased', 'Deepam', 'Bulk Deepam Oil - 5L Container', '935.00', '935.00', '5.00', 1, '5L', NULL, 1, '2025-09-15 17:19:26', '2025-09-15 17:19:26');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('gingelly-100ml', 'Gingelly Oil - 100ml', 'Produced', 'Gingelly', 'Loose Gingelly Oil - 100ml', '60.00', '60.00', '5.00', 1, '100ml', NULL, 1, '2025-09-15 17:00:53', '2025-09-15 17:00:53');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('gingelly-1l', 'Gingelly Oil', 'Produced', 'Gingelly', 'Pure gingelly oil', '400.00', '400.00', '5.00', 1, '1L', NULL, 1, '2025-09-15 14:38:04', '2025-09-15 14:38:04');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('gingelly-500ml', 'Gingelly Oil', 'Produced', 'Gingelly', 'Pure gingelly oil', '200.00', '200.00', '5.00', 1, '500ml', NULL, 1, '2025-09-15 14:38:04', '2025-09-15 14:38:04');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('gingelly-5l', 'Gingelly Oil - 5L', 'Produced', 'Gingelly', 'Bulk Gingelly Oil - 5L Container', '1700.00', '1700.00', '5.00', 1, '5L', NULL, 1, '2025-09-15 17:19:26', '2025-09-15 17:19:26');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('groundnut-100ml', 'Groundnut Oil - 100ml', 'Produced', 'Groundnut', 'Loose Groundnut Oil - 100ml', '45.00', '45.00', '5.00', 1, '100ml', NULL, 1, '2025-09-15 17:00:53', '2025-09-15 17:00:53');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('groundnut-1l', 'Groundnut Oil', 'Produced', 'Groundnut', 'Pure groundnut oil', '300.00', '300.00', '5.00', 1, '1L', NULL, 1, '2025-09-15 14:38:04', '2025-09-15 14:38:04');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('groundnut-500ml', 'Groundnut Oil', 'Produced', 'Groundnut', 'Pure groundnut oil', '150.00', '150.00', '5.00', 1, '500ml', NULL, 1, '2025-09-15 14:38:04', '2025-09-15 14:38:04');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('groundnut-5l', 'Groundnut Oil - 5L', 'Produced', 'Groundnut', 'Bulk Groundnut Oil - 5L Container', '1275.00', '1275.00', '5.00', 1, '5L', NULL, 1, '2025-09-15 17:19:26', '2025-09-15 17:19:26');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('pack_carton_box', 'Cardboard Box', 'packaging', 'carton_box', 'Cardboard box for oil bottle packaging and shipping', '12.00', '12.00', '18.00', 1, 'pieces', '8901234567893', 0, '2025-09-16 10:13:05', '2025-09-18 07:47:59');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('pack_packing_tape', 'Packaging Tape', 'packaging', 'packing_tape', 'Clear packaging tape for sealing boxes', '45.00', '45.00', '18.00', 1, 'rolls', '8901234567894', 0, '2025-09-16 10:13:05', '2025-09-18 07:47:59');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('pack_pet_bottle_1l', 'PET Bottle 1 Liter', 'packaging', 'pet_bottle', 'Clear PET bottle for 1 liter oil packaging', '8.50', '8.50', '18.00', 1, 'pieces', '8901234567890', 0, '2025-09-16 10:13:05', '2025-09-18 07:47:59');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('pack_pet_bottle_200ml', 'PET Bottle 200ml', 'packaging', 'pet_bottle', 'Clear PET bottle for 200ml oil packaging', '3.75', '3.75', '18.00', 1, 'pieces', '8901234567892', 0, '2025-09-16 10:13:05', '2025-09-18 07:47:59');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('pack_pet_bottle_500ml', 'PET Bottle 500ml', 'packaging', 'pet_bottle', 'Clear PET bottle for 500ml oil packaging', '5.25', '5.25', '18.00', 1, 'pieces', '8901234567891', 0, '2025-09-16 10:13:05', '2025-09-18 07:47:59');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('prod_bottle_1l', 'PET Bottle 1 Liter', 'purchased', 'packaging', '1 Liter PET bottle for oil packaging', '12.00', '12.60', '5.00', 0, 'pieces', NULL, 0, '2025-09-17 06:17:39', '2025-09-18 07:47:59');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('prod_bottle_500ml', 'PET Bottle 500ml', 'purchased', 'packaging', '500ml PET bottle for oil packaging', '8.00', '8.40', '5.00', 0, 'pieces', NULL, 0, '2025-09-17 06:17:39', '2025-09-18 07:47:59');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('prod_deepam_001', 'Deepam Oil Traditional', 'produced', 'deepam', 'Traditional deepam oil for lamps and religious purposes', '90.00', '94.50', '5.00', 0, 'liters', NULL, 1, '2025-09-17 06:17:39', '2025-09-17 06:17:39');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('prod_gingelly_001', 'Gingelly Oil Pure', 'produced', 'gingelly', 'Pure gingelly (sesame) oil with natural aroma', '220.00', '231.00', '5.00', 0, 'liters', NULL, 1, '2025-09-17 06:17:39', '2025-09-17 06:17:39');
INSERT INTO `products` (`id`, `name`, `category`, `type`, `description`, `base_price`, `retail_price`, `gst_rate`, `gst_included`, `unit`, `barcode`, `is_active`, `created_at`, `updated_at`) VALUES ('prod_groundnut_001', 'Groundnut Oil Premium', 'produced', 'ground_nut', 'Premium quality groundnut oil extracted using traditional methods', '180.00', '189.00', '5.00', 0, 'liters', NULL, 1, '2025-09-17 06:17:39', '2025-09-17 06:17:39');

-- ----------------------------
-- Table structure for `raw_material_price_history`
-- ----------------------------
DROP TABLE IF EXISTS `raw_material_price_history`;
CREATE TABLE `raw_material_price_history` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `raw_material_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `cost_per_unit` decimal(10,2) NOT NULL,
  `gst_rate` decimal(5,2) NOT NULL,
  `effective_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `supplier` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for `raw_material_purchases`
-- ----------------------------
DROP TABLE IF EXISTS `raw_material_purchases`;
CREATE TABLE `raw_material_purchases` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `raw_material_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `supplier` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_cost` decimal(10,2) NOT NULL,
  `total_cost` decimal(10,2) NOT NULL,
  `gst_amount` decimal(10,2) NOT NULL,
  `purchase_date` datetime NOT NULL,
  `invoice_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for `raw_materials`
-- ----------------------------
DROP TABLE IF EXISTS `raw_materials`;
CREATE TABLE `raw_materials` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `unit` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `cost_per_unit` decimal(10,2) NOT NULL,
  `supplier` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `minimum_stock` decimal(10,2) DEFAULT '0.00',
  `current_stock` decimal(10,2) DEFAULT '0.00',
  `gst_rate` decimal(5,2) NOT NULL DEFAULT '18.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for `sale_items`
-- ----------------------------
DROP TABLE IF EXISTS `sale_items`;
CREATE TABLE `sale_items` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `sale_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `product_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `gst_rate` decimal(5,2) NOT NULL,
  `gst_amount` decimal(10,2) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Records of `sale_items`
-- ----------------------------
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758267782529-castor-200ml', 'sale-1758267782529', 'castor-200ml', '40.00', '80.00', '5.00', '160.00', '3360.00', '2025-09-19 07:43:02');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758268529233-castor-200ml', 'sale-1758268529233', 'castor-200ml', '1.00', '84.00', '5.00', '4.00', '84.00', '2025-09-19 07:55:29');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758268529233-coconut-1l', 'sale-1758268529233', 'coconut-1l', '10.00', '600.00', '5.00', '285.71', '6000.00', '2025-09-19 07:55:29');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758268529233-coconut-500ml', 'sale-1758268529233', 'coconut-500ml', '1.00', '300.00', '5.00', '14.29', '300.00', '2025-09-19 07:55:29');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758277998843-castor-200ml', 'sale-1758277998843', 'castor-200ml', '80.00', '80.00', '5.00', '320.00', '6720.00', '2025-09-19 10:33:18');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758614014690-castor-200ml', 'sale-1758614014690', 'castor-200ml', '2.00', '80.00', '5.00', '8.00', '168.00', '2025-09-23 07:53:34');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758706964762-coconut-1l', 'sale-1758706964762', 'coconut-1l', '2.00', '600.00', '5.00', '57.14', '1200.00', '2025-09-24 09:42:44');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758707027914-castor-200ml', 'sale-1758707027914', 'castor-200ml', '2.00', '80.00', '5.00', '8.00', '168.00', '2025-09-24 09:43:47');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758707027914-coconut-100ml', 'sale-1758707027914', 'coconut-100ml', '2.00', '90.00', '5.00', '9.00', '189.00', '2025-09-24 09:43:48');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758707027914-coconut-1l', 'sale-1758707027914', 'coconut-1l', '2.00', '600.00', '5.00', '60.00', '1260.00', '2025-09-24 09:43:47');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758707027914-coconut-500ml', 'sale-1758707027914', 'coconut-500ml', '2.00', '300.00', '5.00', '30.00', '630.00', '2025-09-24 09:43:47');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758707027914-coconut-5l', 'sale-1758707027914', 'coconut-5l', '2.00', '2550.00', '5.00', '255.00', '5355.00', '2025-09-24 09:43:48');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758707027914-prod_coconut_001', 'sale-1758707027914', 'prod_coconut_001', '2.00', '160.00', '5.00', '16.00', '336.00', '2025-09-24 09:43:48');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-castor-200ml', 'sale-1758881926746', 'castor-200ml', '1.00', '84.00', '5.00', '4.00', '84.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-coconut-100ml', 'sale-1758881926746', 'coconut-100ml', '1.00', '90.00', '5.00', '4.29', '90.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-coconut-1l', 'sale-1758881926746', 'coconut-1l', '1.00', '600.00', '5.00', '28.57', '600.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-coconut-500ml', 'sale-1758881926746', 'coconut-500ml', '1.00', '300.00', '5.00', '14.29', '300.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-coconut-5l', 'sale-1758881926746', 'coconut-5l', '1.00', '2550.00', '5.00', '121.43', '2550.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-deepam-100ml', 'sale-1758881926746', 'deepam-100ml', '1.00', '33.00', '5.00', '1.57', '33.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-deepam-1l', 'sale-1758881926746', 'deepam-1l', '1.00', '220.00', '5.00', '10.48', '220.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-deepam-500ml', 'sale-1758881926746', 'deepam-500ml', '1.00', '110.00', '5.00', '5.24', '110.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-deepam-5l', 'sale-1758881926746', 'deepam-5l', '1.00', '935.00', '5.00', '44.52', '935.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-gingelly-100ml', 'sale-1758881926746', 'gingelly-100ml', '1.00', '60.00', '5.00', '2.86', '60.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-gingelly-1l', 'sale-1758881926746', 'gingelly-1l', '1.00', '400.00', '5.00', '19.05', '400.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-gingelly-500ml', 'sale-1758881926746', 'gingelly-500ml', '1.00', '200.00', '5.00', '9.52', '200.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-gingelly-5l', 'sale-1758881926746', 'gingelly-5l', '1.00', '1700.00', '5.00', '80.95', '1700.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-groundnut-100ml', 'sale-1758881926746', 'groundnut-100ml', '1.00', '45.00', '5.00', '2.14', '45.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-groundnut-1l', 'sale-1758881926746', 'groundnut-1l', '1.00', '300.00', '5.00', '14.29', '300.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-groundnut-500ml', 'sale-1758881926746', 'groundnut-500ml', '1.00', '150.00', '5.00', '7.14', '150.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-groundnut-5l', 'sale-1758881926746', 'groundnut-5l', '1.00', '1275.00', '5.00', '60.71', '1275.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-prod_coconut_001', 'sale-1758881926746', 'prod_coconut_001', '1.00', '168.00', '5.00', '8.00', '168.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-prod_deepam_001', 'sale-1758881926746', 'prod_deepam_001', '1.00', '94.50', '5.00', '4.50', '94.50', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-prod_gingelly_001', 'sale-1758881926746', 'prod_gingelly_001', '1.00', '231.00', '5.00', '11.00', '231.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881926746-prod_groundnut_001', 'sale-1758881926746', 'prod_groundnut_001', '1.00', '189.00', '5.00', '9.00', '189.00', '2025-09-26 10:18:46');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-castor-200ml', 'sale-1758881981458', 'castor-200ml', '1.00', '80.00', '5.00', '4.00', '84.00', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-coconut-100ml', 'sale-1758881981458', 'coconut-100ml', '1.00', '90.00', '5.00', '4.50', '94.50', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-coconut-1l', 'sale-1758881981458', 'coconut-1l', '1.00', '600.00', '5.00', '30.00', '630.00', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-coconut-500ml', 'sale-1758881981458', 'coconut-500ml', '1.00', '300.00', '5.00', '15.00', '315.00', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-coconut-5l', 'sale-1758881981458', 'coconut-5l', '1.00', '2550.00', '5.00', '127.50', '2677.50', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-deepam-100ml', 'sale-1758881981458', 'deepam-100ml', '1.00', '33.00', '5.00', '1.65', '34.65', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-deepam-1l', 'sale-1758881981458', 'deepam-1l', '1.00', '220.00', '5.00', '11.00', '231.00', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-deepam-500ml', 'sale-1758881981458', 'deepam-500ml', '1.00', '110.00', '5.00', '5.50', '115.50', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-deepam-5l', 'sale-1758881981458', 'deepam-5l', '1.00', '935.00', '5.00', '46.75', '981.75', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-gingelly-100ml', 'sale-1758881981458', 'gingelly-100ml', '1.00', '60.00', '5.00', '3.00', '63.00', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-gingelly-1l', 'sale-1758881981458', 'gingelly-1l', '1.00', '400.00', '5.00', '20.00', '420.00', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-gingelly-500ml', 'sale-1758881981458', 'gingelly-500ml', '1.00', '200.00', '5.00', '10.00', '210.00', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-gingelly-5l', 'sale-1758881981458', 'gingelly-5l', '1.00', '1700.00', '5.00', '85.00', '1785.00', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-groundnut-100ml', 'sale-1758881981458', 'groundnut-100ml', '1.00', '45.00', '5.00', '2.25', '47.25', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-groundnut-1l', 'sale-1758881981458', 'groundnut-1l', '1.00', '300.00', '5.00', '15.00', '315.00', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-groundnut-500ml', 'sale-1758881981458', 'groundnut-500ml', '1.00', '150.00', '5.00', '7.50', '157.50', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-groundnut-5l', 'sale-1758881981458', 'groundnut-5l', '1.00', '1275.00', '5.00', '63.75', '1338.75', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-prod_coconut_001', 'sale-1758881981458', 'prod_coconut_001', '1.00', '160.00', '5.00', '8.00', '168.00', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-prod_deepam_001', 'sale-1758881981458', 'prod_deepam_001', '1.00', '90.00', '5.00', '4.50', '94.50', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-prod_gingelly_001', 'sale-1758881981458', 'prod_gingelly_001', '1.00', '220.00', '5.00', '11.00', '231.00', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1758881981458-prod_groundnut_001', 'sale-1758881981458', 'prod_groundnut_001', '1.00', '180.00', '5.00', '9.00', '189.00', '2025-09-26 10:19:41');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('sale-1772541260653-castor-200ml', 'sale-1772541260653', 'castor-200ml', '40.00', '80.00', '5.00', '160.00', '3360.00', '2026-03-03 12:34:20');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('si_001', 'sale_001', 'prod_groundnut_001', '3.00', '189.00', '5.00', '28.35', '595.35', '2025-09-17 06:17:39');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('si_002', 'sale_001', 'prod_coconut_001', '2.00', '168.00', '5.00', '16.80', '352.80', '2025-09-17 06:17:39');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('si_003', 'sale_002', 'prod_groundnut_001', '20.00', '180.00', '5.00', '180.00', '3780.00', '2025-09-17 06:17:39');
INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_amount`, `created_at`) VALUES ('si_004', 'sale_003', 'prod_gingelly_001', '2.00', '231.00', '5.00', '23.10', '485.10', '2025-09-17 06:17:39');

-- ----------------------------
-- Table structure for `sales`
-- ----------------------------
DROP TABLE IF EXISTS `sales`;
CREATE TABLE `sales` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `customer_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `invoice_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `sale_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'retail',
  `subtotal` decimal(10,2) NOT NULL,
  `gst_amount` decimal(10,2) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'cash',
  `payment_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'paid',
  `shipment_status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pending',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `canteen_address_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `po_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `mode_of_sales` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Records of `sales`
-- ----------------------------
INSERT INTO `sales` (`id`, `customer_id`, `user_id`, `invoice_number`, `sale_type`, `subtotal`, `gst_amount`, `total_amount`, `payment_method`, `payment_status`, `shipment_status`, `notes`, `created_at`, `updated_at`, `canteen_address_id`, `po_number`, `po_date`, `mode_of_sales`) VALUES ('sale-1758267782529', NULL, 'admin-1757920260065', 'C0000001/2025', 'canteen', '3200.00', '160.00', '3360.00', 'credit', 'paid', 'pending', '', '2025-09-19 07:43:02', '2025-09-19 09:56:26', 'canteen_001', '56-2025', '2025-09-17 18:30:00', 'email:cbevillagecanteenaddress@gmail.com');
INSERT INTO `sales` (`id`, `customer_id`, `user_id`, `invoice_number`, `sale_type`, `subtotal`, `gst_amount`, `total_amount`, `payment_method`, `payment_status`, `shipment_status`, `notes`, `created_at`, `updated_at`, `canteen_address_id`, `po_number`, `po_date`, `mode_of_sales`) VALUES ('sale-1758268529233', NULL, 'admin-1757920260065', 'R0000001/2025', 'retail', '6080.00', '304.00', '6384.00', 'upi', 'paid', 'walk_in_delivery', '', '2025-09-19 07:55:29', '2025-09-19 08:28:24', NULL, NULL, NULL, NULL);
INSERT INTO `sales` (`id`, `customer_id`, `user_id`, `invoice_number`, `sale_type`, `subtotal`, `gst_amount`, `total_amount`, `payment_method`, `payment_status`, `shipment_status`, `notes`, `created_at`, `updated_at`, `canteen_address_id`, `po_number`, `po_date`, `mode_of_sales`) VALUES ('sale-1758277998843', NULL, 'admin-1757920260065', 'C0000002/2025', 'canteen', '6400.00', '320.00', '6720.00', 'credit', 'paid', 'walk_in_delivery', 'Walk-in Customer', '2025-09-19 10:33:18', '2025-09-19 10:33:18', 'canteen-chennai-master', '57', '2025-09-17 18:30:00', 'email:abc@efg.com');
INSERT INTO `sales` (`id`, `customer_id`, `user_id`, `invoice_number`, `sale_type`, `subtotal`, `gst_amount`, `total_amount`, `payment_method`, `payment_status`, `shipment_status`, `notes`, `created_at`, `updated_at`, `canteen_address_id`, `po_number`, `po_date`, `mode_of_sales`) VALUES ('sale-1758614014690', NULL, 'admin-1757920260065', 'C0000003/2025', 'canteen', '160.00', '8.00', '168.00', 'credit', 'paid', 'walk_in_delivery', 'human', '2025-09-23 07:53:34', '2025-09-23 07:53:34', 'canteen-coimbatore-admin', NULL, NULL, 'walk_in');
INSERT INTO `sales` (`id`, `customer_id`, `user_id`, `invoice_number`, `sale_type`, `subtotal`, `gst_amount`, `total_amount`, `payment_method`, `payment_status`, `shipment_status`, `notes`, `created_at`, `updated_at`, `canteen_address_id`, `po_number`, `po_date`, `mode_of_sales`) VALUES ('sale-1758706964762', NULL, 'admin-001', 'R0000002/2025', 'retail', '1142.86', '57.14', '1200.00', 'upi', 'paid', 'walk_in_delivery', 'Walk-in Customer', '2025-09-24 09:42:44', '2025-09-24 09:42:44', NULL, NULL, NULL, NULL);
INSERT INTO `sales` (`id`, `customer_id`, `user_id`, `invoice_number`, `sale_type`, `subtotal`, `gst_amount`, `total_amount`, `payment_method`, `payment_status`, `shipment_status`, `notes`, `created_at`, `updated_at`, `canteen_address_id`, `po_number`, `po_date`, `mode_of_sales`) VALUES ('sale-1758707027914', NULL, 'admin-001', 'C0000004/2025', 'canteen', '7560.00', '378.00', '7938.00', 'credit', 'paid', 'walk_in_delivery', 'Walk-in Customer', '2025-09-24 09:43:47', '2025-09-24 09:43:47', 'canteen_001', '2356', '2025-09-20 18:30:00', 'email:abc@efg.com');
INSERT INTO `sales` (`id`, `customer_id`, `user_id`, `invoice_number`, `sale_type`, `subtotal`, `gst_amount`, `total_amount`, `payment_method`, `payment_status`, `shipment_status`, `notes`, `created_at`, `updated_at`, `canteen_address_id`, `po_number`, `po_date`, `mode_of_sales`) VALUES ('sale-1758881926746', NULL, 'admin-001', 'R0000003/2025', 'retail', '9270.95', '463.55', '9734.50', 'upi', 'paid', 'walk_in_delivery', 'Walk-in Customer', '2025-09-26 10:18:46', '2025-09-26 10:18:46', NULL, NULL, NULL, NULL);
INSERT INTO `sales` (`id`, `customer_id`, `user_id`, `invoice_number`, `sale_type`, `subtotal`, `gst_amount`, `total_amount`, `payment_method`, `payment_status`, `shipment_status`, `notes`, `created_at`, `updated_at`, `canteen_address_id`, `po_number`, `po_date`, `mode_of_sales`) VALUES ('sale-1758881981458', NULL, 'admin-001', 'C0000005/2025', 'canteen', '9698.00', '484.90', '10182.90', 'credit', 'paid', 'walk_in_delivery', 'Walk-in Customer', '2025-09-26 10:19:41', '2025-09-26 10:19:41', 'canteen-coimbatore-admin', '235/2025', '2025-09-24 18:30:00', 'email:abc@efg.com');
INSERT INTO `sales` (`id`, `customer_id`, `user_id`, `invoice_number`, `sale_type`, `subtotal`, `gst_amount`, `total_amount`, `payment_method`, `payment_status`, `shipment_status`, `notes`, `created_at`, `updated_at`, `canteen_address_id`, `po_number`, `po_date`, `mode_of_sales`) VALUES ('sale-1772541260653', NULL, 'admin-001', 'C0000001/2026', 'canteen', '3200.00', '160.00', '3360.00', 'credit', 'pending', 'pending', 'Walk-in Customer', '2026-03-03 12:34:20', '2026-03-03 12:34:20', 'canteen-1772540315117', NULL, '2026-03-01 18:30:00', 'email:po@testing.com');
INSERT INTO `sales` (`id`, `customer_id`, `user_id`, `invoice_number`, `sale_type`, `subtotal`, `gst_amount`, `total_amount`, `payment_method`, `payment_status`, `shipment_status`, `notes`, `created_at`, `updated_at`, `canteen_address_id`, `po_number`, `po_date`, `mode_of_sales`) VALUES ('sale_001', NULL, 'user_staff_001', 'INV-2024-001', 'retail', '945.00', '47.25', '992.25', 'cash', 'paid', 'pending', NULL, '2025-09-17 06:17:39', '2025-09-17 06:17:39', NULL, NULL, NULL, NULL);
INSERT INTO `sales` (`id`, `customer_id`, `user_id`, `invoice_number`, `sale_type`, `subtotal`, `gst_amount`, `total_amount`, `payment_method`, `payment_status`, `shipment_status`, `notes`, `created_at`, `updated_at`, `canteen_address_id`, `po_number`, `po_date`, `mode_of_sales`) VALUES ('sale_002', NULL, 'user_staff_001', 'INV-2024-002', 'canteen', '3600.00', '180.00', '3780.00', 'credit', 'paid', 'pending', NULL, '2025-09-17 06:17:39', '2025-09-17 06:17:39', 'canteen_001', NULL, NULL, NULL);
INSERT INTO `sales` (`id`, `customer_id`, `user_id`, `invoice_number`, `sale_type`, `subtotal`, `gst_amount`, `total_amount`, `payment_method`, `payment_status`, `shipment_status`, `notes`, `created_at`, `updated_at`, `canteen_address_id`, `po_number`, `po_date`, `mode_of_sales`) VALUES ('sale_003', NULL, 'user_staff_001', 'INV-2024-003', 'retail', '462.00', '23.10', '485.10', 'upi', 'paid', 'pending', NULL, '2025-09-17 06:17:39', '2025-09-17 06:17:39', NULL, NULL, NULL, NULL);

-- ----------------------------
-- Table structure for `savings_investments`
-- ----------------------------
DROP TABLE IF EXISTS `savings_investments`;
CREATE TABLE `savings_investments` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'savings, investment, fixed_deposit, mutual_fund, stock, property, gold, other',
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `amount` decimal(15,2) NOT NULL,
  `current_value` decimal(15,2) DEFAULT NULL,
  `investment_date` datetime NOT NULL,
  `maturity_date` datetime DEFAULT NULL,
  `interest_rate` decimal(5,2) DEFAULT NULL,
  `institution` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Bank, broker, etc.',
  `account_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'active' COMMENT 'active, matured, closed, sold',
  `user_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_savings_investments_user_id` (`user_id`),
  KEY `idx_savings_investments_type` (`type`),
  KEY `idx_savings_investments_status` (`status`),
  KEY `idx_savings_investments_investment_date` (`investment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Records of `savings_investments`
-- ----------------------------
INSERT INTO `savings_investments` (`id`, `type`, `title`, `description`, `amount`, `current_value`, `investment_date`, `maturity_date`, `interest_rate`, `institution`, `account_number`, `status`, `user_id`, `created_at`, `updated_at`) VALUES ('si-sample-003', 'gold', 'Gold Investment', 'Physical gold purchase', '25000.00', '26800.00', '2024-06-10 03:45:00', NULL, NULL, 'Local Jeweller', NULL, 'active', 'admin-001', '2025-09-26 08:06:36', '2025-09-26 08:06:36');

-- ----------------------------
-- Table structure for `users`
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `role` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'retail_staff',
  `reset_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reset_token_expiry` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Records of `users`
-- ----------------------------
INSERT INTO `users` (`id`, `email`, `password`, `name`, `role`, `reset_token`, `reset_token_expiry`, `created_at`, `updated_at`) VALUES ('accountant-001', 'accountant@trinityoil.com', '$2b$10$Klm03QCEXT8tfsvPNdId2.7KWKQD1S/.sGehHsoT/GeYTsYo1Y4A2', 'Accountant User', 'accountant', NULL, NULL, '2025-09-15 07:09:39', '2025-09-15 07:09:39');
INSERT INTO `users` (`id`, `email`, `password`, `name`, `role`, `reset_token`, `reset_token_expiry`, `created_at`, `updated_at`) VALUES ('accountant-1758258433032', 'abc@efg.com', '$2b$10$vrn1/TI665hwbX8JqWBh6.xIm.zS0BmRf75muHpRZQxmUMhBsoVP.', 'Kiran', 'accountant', NULL, NULL, '2025-09-19 05:07:13', '2025-09-19 05:07:13');
INSERT INTO `users` (`id`, `email`, `password`, `name`, `role`, `reset_token`, `reset_token_expiry`, `created_at`, `updated_at`) VALUES ('admin-001', 'admin@trinityoil.com', '$2b$10$Utfw4rxq9TJUK7fGv/Eb7up2P/XL1VwrDAokgBnL/3oQBmTOQ0qjK', 'Admin User', 'admin', '0bbabf4c55baf042cc752cb2798b203bb8111fe4f195f9dcd7f362a8809d5690', '2025-09-15 09:08:07', '2025-09-15 07:09:39', '2025-12-21 15:35:41');
INSERT INTO `users` (`id`, `email`, `password`, `name`, `role`, `reset_token`, `reset_token_expiry`, `created_at`, `updated_at`) VALUES ('admin-1757920260065', 'rvkiran@yahoo.com', '$2b$10$pVWNiZOzgPg5vpbmPWsTIu6rkaQvBGw0QYER3jSbpdaKE2vU1mFsu', 'R V Kiran Kumar', 'admin', NULL, NULL, '2025-09-15 07:11:00', '2025-09-15 08:11:29');
INSERT INTO `users` (`id`, `email`, `password`, `name`, `role`, `reset_token`, `reset_token_expiry`, `created_at`, `updated_at`) VALUES ('admin-1757926180020', 'shwaruna@gmail.com', '$2b$10$JZMvdu6ezyr3RrXYiaO3nusbYtg.FmDPYPkRXN39Moqe6iuFE5/2q', 'swarna', 'admin', NULL, NULL, '2025-09-15 08:49:40', '2025-09-15 08:49:40');
INSERT INTO `users` (`id`, `email`, `password`, `name`, `role`, `reset_token`, `reset_token_expiry`, `created_at`, `updated_at`) VALUES ('admin-1758979932533', 'test@trinityoilmills.com', '$2b$10$T9FUhR0YJbihipt55V2Zfe8A5jumiSP.h4mkaaMRHaoD.PQuDsmeW', 'Test Admin', 'admin', NULL, NULL, '2025-09-27 13:32:12', '2025-09-27 13:32:12');
INSERT INTO `users` (`id`, `email`, `password`, `name`, `role`, `reset_token`, `reset_token_expiry`, `created_at`, `updated_at`) VALUES ('retail-001', 'staff@trinityoil.com', '$2b$10$Klm03QCEXT8tfsvPNdId2.7KWKQD1S/.sGehHsoT/GeYTsYo1Y4A2', 'Retail Staff', 'retail_staff', NULL, NULL, '2025-09-15 07:09:39', '2025-09-15 07:09:39');

SET FOREIGN_KEY_CHECKS=1;
