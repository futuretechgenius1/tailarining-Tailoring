import mysql, { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

let pool: Pool | null = null;
let schemaReadyPromise: Promise<void> | null = null;

export function isDbConfigured(): boolean {
  return Boolean(
    process.env.MYSQL_HOST &&
      process.env.MYSQL_USER &&
      process.env.MYSQL_PASSWORD &&
      process.env.MYSQL_DATABASE,
  );
}

export function getPool(): Pool {
  if (!isDbConfigured()) {
    const err = new Error(
      'MySQL database credentials are not configured in server environment variables (MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE).',
    ) as Error & { code?: string; statusCode?: number };
    err.code = 'DB_NOT_CONFIGURED';
    err.statusCode = 503;
    throw err;
  }

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 12000,
      decimalNumbers: true,
    });
  }

  return pool;
}

type SqlParam = string | number | boolean | null | Date | Buffer;

export async function queryRows<T extends RowDataPacket[]>(
  sql: string,
  params: SqlParam[] = [],
): Promise<T> {
  const [rows] = await getPool().execute<T>(sql, params);
  return rows;
}

export async function executeSql(
  sql: string,
  params: SqlParam[] = [],
): Promise<ResultSetHeader> {
  const [res] = await getPool().execute<ResultSetHeader>(sql, params);
  return res;
}

export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function runSchemaMigrations(): Promise<void> {
  const p = getPool();

  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      phone VARCHAR(30) NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('owner', 'tailor', 'customer') NOT NULL DEFAULT 'customer',
      status ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'active',
      locality VARCHAR(160) NOT NULL DEFAULT 'Alkapur Township, Manikonda',
      address TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_users_role (role),
      INDEX idx_users_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS tailor_profiles (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL UNIQUE,
      shop_name VARCHAR(160) NOT NULL,
      master_tailor VARCHAR(120) NOT NULL,
      bio TEXT NULL,
      locality VARCHAR(160) NOT NULL DEFAULT 'Alkapur Township, Manikonda',
      address TEXT NULL,
      specialties_json JSON NULL,
      working_hours VARCHAR(120) NOT NULL DEFAULT '10:00 AM – 08:30 PM',
      experience_years SMALLINT UNSIGNED NOT NULL DEFAULT 5,
      home_visit_fee DECIMAL(10,2) NOT NULL DEFAULT 49.00,
      pickup_available TINYINT(1) NOT NULL DEFAULT 1,
      is_available TINYINT(1) NOT NULL DEFAULT 1,
      is_verified TINYINT(1) NOT NULL DEFAULT 0,
      commission_rate DECIMAL(5,2) NOT NULL DEFAULT 12.00,
      rating DECIMAL(3,2) NOT NULL DEFAULT 4.80,
      total_reviews INT UNSIGNED NOT NULL DEFAULT 0,
      completed_orders INT UNSIGNED NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_tailor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_tailor_locality (locality),
      INDEX idx_tailor_verified (is_verified, is_available)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS services (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      tailor_id INT UNSIGNED NULL,
      title VARCHAR(160) NOT NULL,
      category ENUM('custom', 'alteration', 'uniform', 'bridal', 'menswear') NOT NULL DEFAULT 'custom',
      description TEXT NULL,
      base_price DECIMAL(10,2) NOT NULL,
      turnaround_days SMALLINT UNSIGNED NOT NULL DEFAULT 3,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_service_tailor FOREIGN KEY (tailor_id) REFERENCES tailor_profiles(id) ON DELETE CASCADE,
      INDEX idx_services_tailor (tailor_id),
      INDEX idx_services_category (category, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_code VARCHAR(32) NOT NULL UNIQUE,
      customer_id INT UNSIGNED NOT NULL,
      tailor_id INT UNSIGNED NULL,
      service_id INT UNSIGNED NULL,
      service_title VARCHAR(180) NOT NULL,
      order_type ENUM('custom', 'alteration', 'uniform', 'bridal', 'menswear') NOT NULL DEFAULT 'custom',
      status ENUM(
        'Booking Created',
        'Tailor Accepted',
        'Visit Scheduled',
        'Measurements Completed',
        'Quotation Submitted',
        'Customer Approved',
        'Stitching Started',
        'Quality Check',
        'Ready for Delivery',
        'Delivered',
        'Cancelled'
      ) NOT NULL DEFAULT 'Booking Created',
      quoted_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      visit_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      platform_commission DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      tailor_payout DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      quote_approved TINYINT(1) NOT NULL DEFAULT 0,
      payment_status ENUM('pending', 'paid', 'partially_paid', 'refunded') NOT NULL DEFAULT 'pending',
      pickup_mode ENUM('doorstep_pickup', 'shop_visit') NOT NULL DEFAULT 'doorstep_pickup',
      pickup_date DATE NULL,
      pickup_slot VARCHAR(64) NULL,
      delivery_date DATE NULL,
      locality VARCHAR(160) NOT NULL DEFAULT 'Alkapur Township, Manikonda',
      pickup_address TEXT NULL,
      garment_notes TEXT NULL,
      customer_requirements TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT fk_orders_tailor FOREIGN KEY (tailor_id) REFERENCES tailor_profiles(id) ON DELETE SET NULL,
      CONSTRAINT fk_orders_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
      INDEX idx_orders_customer (customer_id, created_at),
      INDEX idx_orders_tailor (tailor_id, status),
      INDEX idx_orders_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS order_status_history (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      order_id INT UNSIGNED NOT NULL,
      from_status VARCHAR(64) NULL,
      to_status VARCHAR(64) NOT NULL,
      changed_by_user_id INT UNSIGNED NOT NULL,
      note VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
      INDEX idx_history_order (order_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      payment_code VARCHAR(32) NOT NULL UNIQUE,
      order_id INT UNSIGNED NOT NULL,
      customer_id INT UNSIGNED NOT NULL,
      tailor_id INT UNSIGNED NULL,
      amount DECIMAL(10,2) NOT NULL,
      platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      tailor_earning DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      payment_method ENUM('upi', 'card', 'cash', 'netbanking', 'wallet') NOT NULL DEFAULT 'upi',
      payment_status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
      payout_status ENUM('unsettled', 'scheduled', 'settled') NOT NULL DEFAULT 'unsettled',
      transaction_ref VARCHAR(120) NULL,
      paid_at TIMESTAMP NULL,
      settled_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_payments_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT fk_payments_tailor FOREIGN KEY (tailor_id) REFERENCES tailor_profiles(id) ON DELETE SET NULL,
      INDEX idx_payments_order (order_id),
      INDEX idx_payments_tailor (tailor_id, payout_status),
      INDEX idx_payments_status (payment_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS measurement_profiles (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      customer_id INT UNSIGNED NOT NULL,
      label VARCHAR(120) NOT NULL,
      garment_type VARCHAR(80) NOT NULL,
      owner_name VARCHAR(120) NOT NULL,
      measured_by VARCHAR(120) NOT NULL DEFAULT 'Self Entered',
      consent_saved TINYINT(1) NOT NULL DEFAULT 1,
      values_json JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_measurements_customer FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_measurements_customer (customer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      title VARCHAR(160) NOT NULL,
      message TEXT NOT NULL,
      category ENUM('order', 'payment', 'system', 'account') NOT NULL DEFAULT 'order',
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      related_order_id INT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_notifications_order FOREIGN KEY (related_order_id) REFERENCES orders(id) ON DELETE SET NULL,
      INDEX idx_notifications_user (user_id, is_read, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await p.query(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      setting_key VARCHAR(80) PRIMARY KEY,
      setting_value VARCHAR(255) NOT NULL,
      category VARCHAR(60) NOT NULL DEFAULT 'operations',
      description VARCHAR(255) NULL,
      updated_by INT UNSIGNED NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_settings_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Idempotent structural default settings (INSERT IGNORE never overwrites owner changes)
  const defaultSettings: [string, string, string, string][] = [
    ['platform_name', 'Tailering', 'brand', 'Display name of the tailoring marketplace'],
    ['platform_commission_pct', '12', 'finance', 'Default platform commission percentage on orders'],
    ['default_home_visit_fee', '49', 'finance', 'Standard doorstep measurement & pickup fee (INR)'],
    ['free_visit_min_order', '500', 'finance', 'Minimum order total (INR) for complimentary doorstep pickup'],
    ['max_service_radius_km', '5', 'operations', 'Default hyperlocal matching radius in kilometers'],
    ['auto_reroute_seconds', '180', 'operations', 'Dispatch auto-reroute countdown window in seconds'],
    ['require_quote_approval', 'true', 'operations', 'Block stitching until customer explicitly approves the quote'],
    ['mask_address_until_accepted', 'true', 'privacy', 'Hide customer flat/street details until tailor accepts'],
    ['support_email', 'support@tailering.in', 'support', 'Primary customer & partner support email'],
    ['support_phone', '+91 98480 00100', 'support', 'Operations & concierge helpline number'],
  ];

  for (const [k, v, cat, desc] of defaultSettings) {
    await p.execute(
      `INSERT IGNORE INTO platform_settings (setting_key, setting_value, category, description) VALUES (?, ?, ?, ?)`,
      [k, v, cat, desc],
    );
  }

  // Ensure platform master catalog services exist if services table is empty
  const [[svcCount]] = await p.query<RowDataPacket[]>(`SELECT COUNT(*) AS cnt FROM services`);
  if (Number(svcCount?.cnt || 0) === 0) {
    const starterServices: [string, string, string, number, number][] = [
      [
        'Designer / Maggam Blouse Stitching',
        'bridal',
        'Custom lining, neckline shaping, padded cups option, and doorstep trial.',
        1299,
        5,
      ],
      [
        'Express Garment Alteration Bundle',
        'alteration',
        'Waist fitting, original-hem shortening, zip replacement, or slim-fit tapering.',
        349,
        2,
      ],
      [
        "Men's Bespoke Suit / Kurta Tailoring",
        'menswear',
        'Custom-drafted suit jacket, blazer, wedding sherwani, or formal trousers.',
        2499,
        6,
      ],
      [
        'Saree Fall, Pico & 1-Minute Pre-Pleating',
        'alteration',
        'Color-matched fall attachment, fine edge pico, and compact box pre-pleating.',
        799,
        2,
      ],
      [
        'Custom Kurti & Palazzo / Salwar Set',
        'custom',
        'Breathable cotton-lined ethnic set with pocketed palazzo or salwar.',
        1190,
        4,
      ],
      [
        'School, Clinic or Corporate Uniform Set',
        'uniform',
        'Reinforced institutional uniform stitching with multi-size grading.',
        999,
        5,
      ],
    ];

    for (const [title, cat, desc, price, days] of starterServices) {
      await p.execute(
        `INSERT INTO services (tailor_id, title, category, description, base_price, turnaround_days, is_active)
         VALUES (NULL, ?, ?, ?, ?, ?, 1)`,
        [title, cat, desc, price, days],
      );
    }
  }
}

export async function ensureDatabaseReady(): Promise<void> {
  if (!isDbConfigured()) return;
  if (!schemaReadyPromise) {
    schemaReadyPromise = runSchemaMigrations().catch((err) => {
      schemaReadyPromise = null;
      throw err;
    });
  }
  return schemaReadyPromise;
}

export async function getPlatformSettingsMap(): Promise<Record<string, string>> {
  const rows = await queryRows<RowDataPacket[]>(
    `SELECT setting_key, setting_value FROM platform_settings`,
  );
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[String(r.setting_key)] = String(r.setting_value);
  }
  return map;
}
