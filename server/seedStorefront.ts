import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import {
  ALTERATION_SERVICES,
  ASSETS,
  CATEGORIES,
  DESIGNS_CATALOG,
  HYDERABAD_LOCALITIES,
  PROMO_OFFERS,
  TAILOR_PARTNERS,
} from './seedData';

type DbServiceCategory = 'custom' | 'alteration' | 'uniform' | 'bridal' | 'menswear';

const TAILOR_SHOP_LOGO_MAP: Record<string, string> = {
  'Radhika Designer Boutique': '/src/assets/images/logos/radhika-designer-boutique.svg',
  'Deccan Royal Menswear': '/src/assets/images/logos/deccan-royal-menswear.svg',
  'Sri Lakshmi Bridal Atelier': '/src/assets/images/logos/sri-lakshmi-bridal.svg',
  'Manikonda Express Alterations': '/src/assets/images/logos/manikonda-express.svg',
  'Ananya Heritage Couture': '/src/assets/images/logos/ananya-heritage.svg',
  'Jubilee Bespoke & Uniform Studio': '/src/assets/images/logos/jubilee-bespoke.svg',
  'Kora & Silk Bridal House': '/src/assets/images/logos/kora-silk-bridal.svg',
  'Nizam Savile Bespoke Studio': '/src/assets/images/logos/nizam-savile.svg',
  'Kondapur QuickStitch & Drape': '/src/assets/images/logos/kondapur-quickstitch.svg',
  'Vastraa Family & Gown Atelier': '/src/assets/images/logos/vastraa-family.svg',
};

const LOCALITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Alkapur Township, Manikonda': { lat: 17.3984, lng: 78.3746 },
  'Manikonda Puppalaguda': { lat: 17.4062, lng: 78.3821 },
  'Gachibowli, Financial District': { lat: 17.4401, lng: 78.3489 },
  'Jubilee Hills, Road No. 36': { lat: 17.4326, lng: 78.4071 },
  'Banjara Hills, Road No. 12': { lat: 17.4156, lng: 78.4347 },
  'Kondapur, Botanical Garden Rd': { lat: 17.4622, lng: 78.3568 },
  'Madhapur, Hitech City': { lat: 17.4483, lng: 78.3915 },
  'Kokapet, Neopolis': { lat: 17.3921, lng: 78.3322 },
  'Narsingi, ORR Service Rd': { lat: 17.3865, lng: 78.3574 },
  'Kukatpally, KPHB Phase 1': { lat: 17.4948, lng: 78.3996 },
  'Miyapur, Bollaram Rd': { lat: 17.4968, lng: 78.3614 },
  'Begumpet, Prakash Nagar': { lat: 17.4447, lng: 78.4664 },
};

const DEFAULT_CRAFT_SCENES = [
  {
    slug: 'scene-stitching',
    chapter: '01',
    title: 'Hand-Finished Silk Stitching',
    subtitle:
      'Fine needlework, reinforced French seams, and invisible hemming crafted to millimetre tolerance.',
    durationSec: 6,
    imageUrl: ASSETS.atelierHeroStitching,
    intentId: 'alterations',
    motionVariant: 'zoom',
  },
  {
    slug: 'scene-maggam',
    chapter: '02',
    title: 'Maggam & Zardosi Frame Craft',
    subtitle:
      'Traditional Hyderabadi aari needle embroidery with gold cutdana, silk thread, and bridal beadwork.',
    durationSec: 6,
    imageUrl: ASSETS.atelierMaggamCraft,
    intentId: 'blouses',
    motionVariant: 'pan',
  },
  {
    slug: 'scene-chalk',
    chapter: '03',
    title: 'Bespoke Chalk & Pattern Drafting',
    subtitle:
      'Individual paper-and-chalk pattern cutting for structured suits, bandhgalas, and wedding sherwanis.',
    durationSec: 6,
    imageUrl: ASSETS.atelierBespokeChalk,
    intentId: 'menswear',
    motionVariant: 'zoom',
  },
  {
    slug: 'scene-atelier',
    chapter: '04',
    title: 'Atelier Draping & Final Fit',
    subtitle:
      'Mannequin silhouette balancing, steam finishing, and doorstep garment delivery with 7-day fit care.',
    durationSec: 6,
    imageUrl: ASSETS.atelierBoutiqueInterior,
    intentId: 'ethnic',
    motionVariant: 'pan',
  },
];

const CUSTOM_STITCHING_CATALOG_SERVICES: {
  title: string;
  category: DbServiceCategory;
  description: string;
  basePrice: number;
  turnaroundDays: number;
}[] = [
  {
    title: 'Basic Blouse Stitching',
    category: 'custom',
    description: 'Clean lined or unlined saree blouse with precision princess or dart fitting.',
    basePrice: 549,
    turnaroundDays: 3,
  },
  {
    title: 'Designer / Padded Blouse',
    category: 'bridal',
    description: 'Custom neckline styling, cotton lining, optional padded cups & tassel finishing.',
    basePrice: 999,
    turnaroundDays: 4,
  },
  {
    title: 'Bridal Maggam Work Blouse',
    category: 'bridal',
    description: 'Intricate hand-worked zardosi, cutdana, and aari embroidery with bridal trial.',
    basePrice: 2499,
    turnaroundDays: 7,
  },
  {
    title: 'Chudidar / Salwar Kameez',
    category: 'custom',
    description: '2-piece or 3-piece ethnic suit with custom neckline and comfort bottom cut.',
    basePrice: 899,
    turnaroundDays: 4,
  },
  {
    title: 'Kurti Stitching',
    category: 'custom',
    description: 'Straight, A-line, or flared kurti stitched to your exact shoulder and bust fit.',
    basePrice: 599,
    turnaroundDays: 3,
  },
  {
    title: 'Lehenga Choli with Can-Can',
    category: 'bridal',
    description: 'Festive or bridal kalidar lehenga skirt with tailored choli blouse & side zip.',
    basePrice: 1699,
    turnaroundDays: 6,
  },
  {
    title: 'Men Formal / Casual Shirt',
    category: 'menswear',
    description: 'Custom collar spread, sleeve cuff style, placket, and tailored torso fit.',
    basePrice: 649,
    turnaroundDays: 4,
  },
  {
    title: 'Men Tailored Trousers',
    category: 'menswear',
    description: 'Flat-front, single-pleat, or Gurkha trousers drafted to your rise and taper.',
    basePrice: 699,
    turnaroundDays: 4,
  },
  {
    title: 'Men Festive Kurta Set',
    category: 'menswear',
    description: 'Silk or cotton kurta paired with tailored churidar, Aligarhi pyjama, or trouser.',
    basePrice: 1199,
    turnaroundDays: 5,
  },
];

function mapCategoryToDbEnum(raw: string): DbServiceCategory {
  const s = raw.toLowerCase();
  if (s.includes('alter') || s.includes('saree') || s.includes('fall') || s.includes('pleat')) {
    return 'alteration';
  }
  if (
    s.includes('uniform') ||
    s.includes('school') ||
    s.includes('corporate') ||
    s.includes('clinic')
  ) {
    return 'uniform';
  }
  if (
    s.includes('bridal') ||
    s.includes('maggam') ||
    s.includes('blouse') ||
    s.includes('lehenga') ||
    s.includes('zardosi') ||
    s.includes('half saree')
  ) {
    return 'bridal';
  }
  if (
    s.includes('men') ||
    s.includes('suit') ||
    s.includes('sherwani') ||
    s.includes('jodhpuri') ||
    s.includes('tuxedo') ||
    s.includes('shirt') ||
    s.includes('trouser') ||
    s.includes('kurta')
  ) {
    return 'menswear';
  }
  return 'custom';
}

function parseTurnaroundDays(text: string, fallback = 4): number {
  const m = text.match(/(\d+)/);
  if (!m) return fallback;
  const n = Number(m[1]);
  if (text.toLowerCase().includes('hr')) {
    return Math.max(1, Math.ceil(n / 24));
  }
  return Math.max(1, Math.min(60, n));
}

function readLocalAssetBytes(assetUrl: string): Buffer | null {
  try {
    const cleanRel = assetUrl.replace(/^\/+/, '');
    const absPath = path.resolve(process.cwd(), cleanRel);
    const allowedRoot = path.resolve(process.cwd(), 'src', 'assets', 'images');
    if (!absPath.startsWith(allowedRoot + path.sep)) return null;
    if (!fs.existsSync(absPath)) return null;
    return fs.readFileSync(absPath);
  } catch {
    return null;
  }
}

/**
 * Idempotently populates MySQL with complete demo storefront data
 * (verified tailor ateliers + shop logos, services, portfolio photos, curated designs,
 * alterations, categories, promos, localities, craft scenes & media mappings)
 * so ZERO mock/static data is required in the frontend UI.
 */
export async function seedInitialStorefrontData(p: Pool): Promise<void> {
  const [flagRows] = await p.query<RowDataPacket[]>(
    `SELECT setting_value FROM platform_settings WHERE setting_key = 'storefront_seeded_v1' LIMIT 1`,
  );

  // 1. Seed Tailors + Shop Logos + Services + Portfolio Photos (once)
  if (flagRows.length === 0) {
    const seedPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

    for (let idx = 0; idx < TAILOR_PARTNERS.length; idx++) {
      const t = TAILOR_PARTNERS[idx];
      const email = `partner.${t.id.replace(/[^a-z0-9]/gi, '').toLowerCase()}@tailering.in`;
      const logoUrl = TAILOR_SHOP_LOGO_MAP[t.shopName] || null;

      const [existingUsers] = await p.execute<RowDataPacket[]>(
        `SELECT id FROM users WHERE email = ? LIMIT 1`,
        [email],
      );

      let userId: number;
      if (existingUsers.length > 0) {
        userId = Number(existingUsers[0].id);
      } else {
        const [uRes] = await p.execute<ResultSetHeader>(
          `INSERT INTO users (full_name, email, phone, password_hash, role, status, locality, address)
           VALUES (?, ?, NULL, ?, 'tailor', 'active', ?, ?)`,
          [
            t.masterTailor,
            email,
            seedPasswordHash,
            t.locality,
            `${t.shopName}, ${t.locality}, Hyderabad`,
          ],
        );
        userId = uRes.insertId;
      }

      const [existingTp] = await p.execute<RowDataPacket[]>(
        `SELECT id FROM tailor_profiles WHERE user_id = ? LIMIT 1`,
        [userId],
      );

      let tailorProfileId: number;
      if (existingTp.length > 0) {
        tailorProfileId = Number(existingTp[0].id);
      } else {
        const [tpRes] = await p.execute<ResultSetHeader>(
          `INSERT INTO tailor_profiles (
             user_id, shop_name, master_tailor, bio, locality, address,
             specialties_json, working_hours, experience_years, home_visit_fee,
             pickup_available, is_available, is_verified, commission_rate,
             rating, total_reviews, completed_orders,
             cover_image_url, logo_url, distance_km, turnaround_text, turnaround_days,
             pickup_slots_json, recent_review_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 12.00, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            t.shopName,
            t.masterTailor,
            t.bio,
            t.locality,
            `${t.shopName}, ${t.locality}, Hyderabad`,
            JSON.stringify(t.specialties),
            t.workingHours,
            t.yearsExperience,
            t.homeVisitFee,
            t.pickupAvailable ? 1 : 0,
            t.openNow ? 1 : 0,
            t.verified ? 1 : 0,
            t.rating,
            t.reviewCount,
            t.completedOrders,
            t.coverImage,
            logoUrl,
            t.distanceKm,
            t.turnaround,
            t.turnaroundDays,
            JSON.stringify(t.pickupSlots),
            JSON.stringify(t.recentReview),
          ],
        );
        tailorProfileId = tpRes.insertId;

        for (const srv of t.services) {
          await p.execute(
            `INSERT INTO services (tailor_id, title, category, description, base_price, turnaround_days, is_active)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [
              tailorProfileId,
              srv.name,
              mapCategoryToDbEnum(`${srv.category} ${srv.name}`),
              srv.description,
              srv.price,
              parseTurnaroundDays(srv.turnaround, t.turnaroundDays),
            ],
          );
        }

        for (let pIdx = 0; pIdx < t.portfolio.length; pIdx++) {
          const work = t.portfolio[pIdx];
          const bytes = readLocalAssetBytes(work.image);
          if (!bytes) continue;
          const captionWithTags =
            work.tags.length > 0 ? `${work.category} · ${work.tags.join(', ')}` : work.category;
          await p.execute(
            `INSERT INTO tailor_portfolio_items (
               tailor_id, title, category, caption, price_hint, turnaround_days,
               mime_type, image_data, is_featured, is_visible
             ) VALUES (?, ?, ?, ?, ?, ?, 'image/jpeg', ?, ?, 1)`,
            [
              tailorProfileId,
              work.title,
              mapCategoryToDbEnum(`${work.category} ${work.title}`),
              captionWithTags,
              work.price,
              work.days,
              bytes,
              pIdx === 0 ? 1 : 0,
            ],
          );
        }
      }
    }
  }

  // 2. Seed Curated Stitching Designs (once)
  const [[designCount]] = await p.query<RowDataPacket[]>(`SELECT COUNT(*) AS cnt FROM designs_catalog`);
  if (Number(designCount?.cnt || 0) === 0 && flagRows.length === 0) {
    for (const d of DESIGNS_CATALOG) {
      await p.execute(
        `INSERT IGNORE INTO designs_catalog (
           slug, title, category, category_id, gender, boutique, price, original_price,
           image_url, views, turnaround_days, trusted, rating, description, fabric_note,
           is_trending, is_active
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          d.id,
          d.title,
          d.category,
          d.categoryId,
          d.gender,
          d.boutique,
          d.price,
          d.originalPrice ?? null,
          d.image,
          d.views,
          d.turnaroundDays,
          d.trusted ? 1 : 0,
          d.rating,
          d.description,
          d.fabricNote,
          d.isTrending ? 1 : 0,
        ],
      );
    }
  }

  // 3. Seed Doorstep Alteration Services (once)
  const [[altCount]] = await p.query<RowDataPacket[]>(`SELECT COUNT(*) AS cnt FROM alteration_services`);
  if (Number(altCount?.cnt || 0) === 0 && flagRows.length === 0) {
    for (const a of ALTERATION_SERVICES) {
      await p.execute(
        `INSERT IGNORE INTO alteration_services (
           slug, title, description, price, unit, badge, badge_color, section, icon_type, is_active
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          a.id,
          a.title,
          a.description,
          a.price,
          a.unit,
          a.badge,
          a.badgeColor,
          a.section,
          a.iconType,
        ],
      );
    }
  }

  if (flagRows.length === 0) {
    await p.execute(
      `INSERT IGNORE INTO platform_settings (setting_key, setting_value, category, description)
       VALUES ('storefront_seeded_v1', 'true', 'system', 'Initial storefront catalog population flag')`,
    );
  }

  // 4. V2 Full DB Migration: Backfill Tailor Shop Logos + Categories + Promos + Localities + Craft Scenes + Media + Custom Garment Services
  const [v2Flags] = await p.query<RowDataPacket[]>(
    `SELECT setting_value FROM platform_settings WHERE setting_key = 'storefront_seeded_v2' LIMIT 1`,
  );

  if (v2Flags.length === 0) {
    // Backfill source-folder logo_url onto existing demo tailors that don't have a logo yet
    for (const [shopName, logoPath] of Object.entries(TAILOR_SHOP_LOGO_MAP)) {
      await p.execute(
        `UPDATE tailor_profiles
         SET logo_url = ?
         WHERE shop_name = ? AND (logo_url IS NULL OR logo_url = '')`,
        [logoPath, shopName],
      );
    }

    // Seed Design Categories
    for (let i = 0; i < CATEGORIES.length; i++) {
      const cat = CATEGORIES[i];
      await p.execute(
        `INSERT IGNORE INTO design_categories (slug, name, gender, image_url, starting_price, design_count, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [cat.id, cat.name, cat.gender, cat.image, cat.startingPrice, cat.designCount, i + 1],
      );
    }

    // Seed Promo Offers
    for (const offer of PROMO_OFFERS) {
      await p.execute(
        `INSERT IGNORE INTO promo_offers (code, title, description, tag, discount_amount, min_order, gradient, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          offer.code,
          offer.title,
          offer.description,
          offer.tag,
          offer.discountAmount,
          offer.minOrder,
          offer.gradient,
        ],
      );
    }

    // Seed Service Localities
    for (let i = 0; i < HYDERABAD_LOCALITIES.length; i++) {
      const locName = HYDERABAD_LOCALITIES[i];
      const coords = LOCALITY_COORDS[locName] || { lat: 17.42, lng: 78.38 };
      await p.execute(
        `INSERT IGNORE INTO service_localities (name, city, lat, lng, sort_order, is_active)
         VALUES (?, 'Hyderabad', ?, ?, ?, 1)`,
        [locName, coords.lat, coords.lng, i + 1],
      );
    }

    // Seed Craft Reel Scenes
    for (let i = 0; i < DEFAULT_CRAFT_SCENES.length; i++) {
      const s = DEFAULT_CRAFT_SCENES[i];
      await p.execute(
        `INSERT IGNORE INTO craft_reel_scenes (slug, chapter, title, subtitle, duration_sec, image_url, intent_id, motion_variant, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          s.slug,
          s.chapter,
          s.title,
          s.subtitle,
          s.durationSec,
          s.imageUrl,
          s.intentId,
          s.motionVariant,
          i + 1,
        ],
      );
    }

    // Seed Storefront Media Map (every source image mapped to DB column)
    const mediaEntries: [string, string, string, string][] = [
      ['heroStudio', 'Hero Tailoring Studio', ASSETS.heroStudio, 'hero'],
      ['bannerFestive', 'Festive Family Banner', ASSETS.bannerFestive, 'banner'],
      ['bannerRelax', 'Relax at Home Banner', ASSETS.bannerRelax, 'banner'],
      ['bannerUniforms', 'Uniforms & Teamwear Banner', ASSETS.bannerUniforms, 'banner'],
      ['floralGown', 'Floral Tiered Gown', ASSETS.floralGown, 'design'],
      ['peacockMaggam', 'Peacock Maggam Blouse', ASSETS.peacockMaggam, 'design'],
      ['bridalBlouse', 'Bridal Designer Blouse', ASSETS.bridalBlouse, 'design'],
      ['festiveLehenga', 'Festive Bridal Lehenga', ASSETS.festiveLehenga, 'design'],
      ['mensSherwani', "Men's Royal Sherwani", ASSETS.mensSherwani, 'design'],
      ['kurtiPalazzo', 'Kurti & Palazzo Set', ASSETS.kurtiPalazzo, 'design'],
      ['mensSuit', "Men's Bespoke Suit", ASSETS.mensSuit, 'design'],
      ['sareePleating', 'Saree Fall & Pre-Pleating', ASSETS.sareePleating, 'design'],
      ['atelierHeroStitching', 'Atelier Hand Stitching', ASSETS.atelierHeroStitching, 'atelier'],
      ['atelierMaggamCraft', 'Maggam Frame Craft', ASSETS.atelierMaggamCraft, 'atelier'],
      ['atelierBespokeChalk', 'Bespoke Chalk Patterning', ASSETS.atelierBespokeChalk, 'atelier'],
      ['atelierBoutiqueInterior', 'Atelier Boutique Interior', ASSETS.atelierBoutiqueInterior, 'atelier'],
    ];

    for (const [key, label, imgUrl, cat] of mediaEntries) {
      await p.execute(
        `INSERT IGNORE INTO storefront_media (media_key, label, image_url, category)
         VALUES (?, ?, ?, ?)`,
        [key, label, imgUrl, cat],
      );
    }

    // Ensure platform-wide custom stitching catalog services exist in `services`
    for (const svc of CUSTOM_STITCHING_CATALOG_SERVICES) {
      const [exists] = await p.execute<RowDataPacket[]>(
        `SELECT id FROM services WHERE tailor_id IS NULL AND title = ? LIMIT 1`,
        [svc.title],
      );
      if (exists.length === 0) {
        await p.execute(
          `INSERT INTO services (tailor_id, title, category, description, base_price, turnaround_days, is_active)
           VALUES (NULL, ?, ?, ?, ?, ?, 1)`,
          [svc.title, svc.category, svc.description, svc.basePrice, svc.turnaroundDays],
        );
      }
    }

    await p.execute(
      `INSERT IGNORE INTO platform_settings (setting_key, setting_value, category, description)
       VALUES ('storefront_seeded_v2', 'true', 'system', 'Full DB storefront media, logos, categories, promos & localities seed flag')`,
    );
  }

  // 5. V3 High-Resolution Hero, Dual Individuals/B2B Banners & Trending Lookbook Migration
  const [v3Flags] = await p.query<RowDataPacket[]>(
    `SELECT setting_value FROM platform_settings WHERE setting_key = 'storefront_seeded_v3' LIMIT 1`,
  );

  if (v3Flags.length === 0) {
    const v3MediaEntries: [string, string, string, string][] = [
      ['heroStudio', 'Hero Tailoring Boutique Master', ASSETS.heroStudio, 'hero'],
      ['bannerIndividuals', 'For Individuals Promo Banner', ASSETS.bannerIndividuals, 'banner'],
      ['bannerB2B', 'For Businesses B2B Uniforms Banner', ASSETS.bannerB2B, 'banner'],
      ['anarkaliSuit', 'Pastel Floral Anarkali Suit', ASSETS.anarkaliSuit, 'design'],
      ['partyGown', 'Blush Layered Party Gown', ASSETS.partyGown, 'design'],
    ];

    for (const [key, label, imgUrl, cat] of v3MediaEntries) {
      await p.execute(
        `INSERT INTO storefront_media (media_key, label, image_url, category)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE label = VALUES(label), image_url = VALUES(image_url), category = VALUES(category)`,
        [key, label, imgUrl, cat],
      );
    }

    const v3Designs = DESIGNS_CATALOG.filter((d) => d.id === 'des-13' || d.id === 'des-14');
    for (const d of v3Designs) {
      await p.execute(
        `INSERT INTO designs_catalog (
           slug, title, category, category_id, gender, boutique, price, original_price,
           image_url, views, turnaround_days, trusted, rating, description, fabric_note,
           is_trending, is_active
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE image_url = VALUES(image_url), is_trending = VALUES(is_trending), is_active = 1`,
        [
          d.id,
          d.title,
          d.category,
          d.categoryId,
          d.gender,
          d.boutique,
          d.price,
          d.originalPrice ?? null,
          d.image,
          d.views,
          d.turnaroundDays,
          d.trusted ? 1 : 0,
          d.rating,
          d.description,
          d.fabricNote,
          d.isTrending ? 1 : 0,
        ],
      );
    }

    await p.execute(
      `INSERT IGNORE INTO platform_settings (setting_key, setting_value, category, description)
       VALUES ('storefront_seeded_v3', 'true', 'system', 'High-res hero, Individuals/B2B banners & trending lookbook media migration')`,
    );
  }

  // 6. V4 Dedicated Login & Sign Up Mannequin Studio Artwork Migration
  const [v4Flags] = await p.query<RowDataPacket[]>(
    `SELECT setting_value FROM platform_settings WHERE setting_key = 'storefront_seeded_v4' LIMIT 1`,
  );

  if (v4Flags.length === 0) {
    const v4MediaEntries: [string, string, string, string][] = [
      ['authLoginMannequin', 'Sign In Purple Silk Mannequin Studio', ASSETS.authLoginMannequin, 'auth'],
      ['authSignupMannequin', 'Sign Up Cream Linen Mannequin Studio', ASSETS.authSignupMannequin, 'auth'],
    ];

    for (const [key, label, imgUrl, cat] of v4MediaEntries) {
      await p.execute(
        `INSERT INTO storefront_media (media_key, label, image_url, category)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE label = VALUES(label), image_url = VALUES(image_url), category = VALUES(category)`,
        [key, label, imgUrl, cat],
      );
    }

    await p.execute(
      `INSERT IGNORE INTO platform_settings (setting_key, setting_value, category, description)
       VALUES ('storefront_seeded_v4', 'true', 'system', 'Dedicated Login & Sign Up mannequin studio imagery migration')`,
    );
  }

  // 7. V5 Dedicated Custom Stitching, Alterations, Uniforms & Measurements Page Studio Imagery Migration
  const [v5Flags] = await p.query<RowDataPacket[]>(
    `SELECT setting_value FROM platform_settings WHERE setting_key = 'storefront_seeded_v5' LIMIT 1`,
  );

  if (v5Flags.length === 0) {
    const v5MediaEntries: [string, string, string, string][] = [
      ['customStitchingHero', 'Custom Stitching Hero Couple Studio', ASSETS.customStitchingHero, 'hero'],
      ['customStitchingShears', 'Custom Stitching Golden Shears Silk', ASSETS.customStitchingShears, 'banner'],
      ['alterationsHeroMannequin', 'Alterations Hero Atelier Mannequin', ASSETS.alterationsHeroMannequin, 'hero'],
      ['alterationsCuttingHands', 'Alterations Precision Cutting Hands', ASSETS.alterationsCuttingHands, 'banner'],
      ['uniformsHeroTeam', 'Uniforms Hero Professionals Studio', ASSETS.uniformsHeroTeam, 'hero'],
      ['uniformsTeamFabrics', 'Uniforms Folded Suiting Fabrics & Shears', ASSETS.uniformsTeamFabrics, 'banner'],
      ['uniformSectorSchool', 'School Uniforms Sector Portrait', ASSETS.uniformSectorSchool, 'uniform'],
      ['uniformSectorCorporate', 'Corporate Uniforms Sector Portrait', ASSETS.uniformSectorCorporate, 'uniform'],
      ['uniformSectorHealthcare', 'Healthcare Uniforms Sector Portrait', ASSETS.uniformSectorHealthcare, 'uniform'],
      ['uniformSectorHospitality', 'Hospitality Uniforms Sector Portrait', ASSETS.uniformSectorHospitality, 'uniform'],
      ['uniformSectorIndustrial', 'Industrial Uniforms Sector Portrait', ASSETS.uniformSectorIndustrial, 'uniform'],
      ['measurementsHeroFitting', 'Measurements Hero Master Tailor Fitting', ASSETS.measurementsHeroFitting, 'hero'],
      ['measurementsGuideChest', 'Measurement Guide Chest Tape Visual', ASSETS.measurementsGuideChest, 'guide'],
    ];

    for (const [key, label, imgUrl, cat] of v5MediaEntries) {
      await p.execute(
        `INSERT INTO storefront_media (media_key, label, image_url, category)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE label = VALUES(label), image_url = VALUES(image_url), category = VALUES(category)`,
        [key, label, imgUrl, cat],
      );
    }

    await p.execute(
      `INSERT IGNORE INTO platform_settings (setting_key, setting_value, category, description)
       VALUES ('storefront_seeded_v5', 'true', 'system', 'Dedicated Custom Stitching, Alterations, Uniforms & Measurements studio imagery migration')`,
    );
  }

  // 8. V6 Dedicated Tailor Shop Customer Reviews Seed Migration (MySQL tailor_reviews table)
  const [v6Flags] = await p.query<RowDataPacket[]>(
    `SELECT setting_value FROM platform_settings WHERE setting_key = 'storefront_seeded_v6' LIMIT 1`,
  );

  if (v6Flags.length === 0) {
    const [allTailors] = await p.query<RowDataPacket[]>(
      `SELECT id, shop_name, master_tailor, locality, specialties_json, recent_review_json
       FROM tailor_profiles`,
    );

    const REVIEW_TEMPLATES: {
      reviewerName: string;
      locality: string;
      rating: number;
      daysAgo: number;
      buildComment: (shop: string, specialty: string, locality: string) => string;
    }[] = [
      {
        reviewerName: 'Sneha Reddy',
        locality: 'Alkapur Township',
        rating: 5,
        daysAgo: 5,
        buildComment: (shop, specialty, locality) =>
          `Booked ${shop} for ${specialty}. Master tailor arrived right on time in ${locality}, confirmed the final quote transparently before cutting, and the neckline and shoulder fit needed zero refitting.`,
      },
      {
        reviewerName: 'Karthik Rao',
        locality: 'Gachibowli',
        rating: 5,
        daysAgo: 12,
        buildComment: (shop, specialty) =>
          `Impeccable finishing on my ${specialty} order from ${shop}. Clean inner seams, crisp pressing, and delivered a day ahead of schedule with neat garment packaging.`,
      },
      {
        reviewerName: 'Meghana Kulkarni',
        locality: 'Manikonda',
        rating: 4,
        daysAgo: 21,
        buildComment: (shop, specialty, locality) =>
          `Very polite team at ${shop} near ${locality}. Great attention to detail on ${specialty} and clear WhatsApp updates at every stage from cutting to trial.`,
      },
      {
        reviewerName: 'Arjun Verma',
        locality: 'Jubilee Hills',
        rating: 5,
        daysAgo: 31,
        buildComment: (shop, specialty) =>
          `Consistently reliable craftsmanship. Have now ordered twice from ${shop} for ${specialty} and both garments fit like bespoke showroom pieces.`,
      },
    ];

    for (let tIdx = 0; tIdx < allTailors.length; tIdx++) {
      const tp = allTailors[tIdx];
      const tailorId = Number(tp.id);
      const [[existingRev]] = await p.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS cnt FROM tailor_reviews WHERE tailor_id = ?`,
        [tailorId],
      );
      if (Number(existingRev?.cnt || 0) > 0) continue;

      let specialties: string[] = [];
      try {
        const parsed =
          typeof tp.specialties_json === 'string'
            ? JSON.parse(tp.specialties_json)
            : tp.specialties_json;
        if (Array.isArray(parsed)) specialties = parsed.map(String);
      } catch {
        specialties = [];
      }

      const primarySpec = specialties[0] || 'Custom Tailoring';
      const secondarySpec = specialties[1] || primarySpec;
      const tertiarySpec = specialties[2] || primarySpec;

      // Insert shop's primary recent_review_json first if present
      let recentObj: { author?: string; text?: string; date?: string } | null = null;
      try {
        recentObj =
          typeof tp.recent_review_json === 'string'
            ? JSON.parse(tp.recent_review_json)
            : tp.recent_review_json;
      } catch {
        recentObj = null;
      }

      if (recentObj?.author && recentObj?.text) {
        await p.execute(
          `INSERT INTO tailor_reviews (
             tailor_id, customer_id, reviewer_name, reviewer_locality, service_name,
             rating, comment, is_verified_booking, created_at
           ) VALUES (?, NULL, ?, ?, ?, 5, ?, 1, DATE_SUB(NOW(), INTERVAL 2 DAY))`,
          [
            tailorId,
            String(recentObj.author).slice(0, 120),
            String(tp.locality || 'Hyderabad').slice(0, 120),
            primarySpec.slice(0, 160),
            String(recentObj.text),
          ],
        );
      }

      // Rotate & seed 3 additional authentic reviews referencing each shop's real specialties
      const specPool = [primarySpec, secondarySpec, tertiarySpec];
      for (let rIdx = 0; rIdx < 3; rIdx++) {
        const tpl = REVIEW_TEMPLATES[(tIdx + rIdx) % REVIEW_TEMPLATES.length];
        const chosenSpec = specPool[rIdx % specPool.length];
        await p.execute(
          `INSERT INTO tailor_reviews (
             tailor_id, customer_id, reviewer_name, reviewer_locality, service_name,
             rating, comment, is_verified_booking, created_at
           ) VALUES (?, NULL, ?, ?, ?, ?, ?, 1, DATE_SUB(NOW(), INTERVAL ? DAY))`,
          [
            tailorId,
            tpl.reviewerName,
            tpl.locality,
            chosenSpec.slice(0, 160),
            tpl.rating,
            tpl.buildComment(String(tp.shop_name), chosenSpec, String(tp.locality)),
            tpl.daysAgo + tIdx,
          ],
        );
      }
    }

    await p.execute(
      `INSERT IGNORE INTO platform_settings (setting_key, setting_value, category, description)
       VALUES ('storefront_seeded_v6', 'true', 'system', 'Seeded customer reviews per tailor shop in tailor_reviews table')`,
    );
  }
}
