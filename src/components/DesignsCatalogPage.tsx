import React, { useState, useEffect } from 'react';
import {
  Clock,
  Eye,
  Heart,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import { CATEGORIES, DESIGNS_CATALOG } from '../data/catalogData';
import { DesignProduct } from '../types';
import { SafeImage } from './SafeImage';

interface DesignsCatalogPageProps {
  initialCategory?: string;
  initialSearch?: string;
  wishlistIds: string[];
  onToggleWishlist: (designId: string) => void;
  onSelectDesign: (design: DesignProduct) => void;
  onQuickAddDesign: (design: DesignProduct) => void;
}

export const DesignsCatalogPage: React.FC<DesignsCatalogPageProps> = ({
  initialCategory = 'all',
  initialSearch = '',
  wishlistIds,
  onToggleWishlist,
  onSelectDesign,
  onQuickAddDesign,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [genderFilter, setGenderFilter] = useState<'all' | 'women' | 'men'>('all');
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<'popular' | 'price-low' | 'price-high'>('popular');

  useEffect(() => {
    setSelectedCategory(initialCategory || 'all');
  }, [initialCategory]);

  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  const filtered = DESIGNS_CATALOG.filter((item) => {
    const matchesGender = genderFilter === 'all' || item.gender === genderFilter;
    const matchesCategory =
      selectedCategory === 'all' ||
      item.categoryId === selectedCategory ||
      item.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.boutique.toLowerCase().includes(q);
    return matchesGender && matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    return b.views - a.views;
  });

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917]">
            Curated Stitching Designs
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-0.5">
            Select a style and our verified Hyderabad master tailors will stitch it to your exact fit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center bg-[#F5EFE8] p-1 rounded-full">
            {(['all', 'women', 'men'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGenderFilter(g);
                  setSelectedCategory('all');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-all cursor-pointer ${
                  genderFilter === g
                    ? 'bg-[#18181B] text-white'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-1.5 bg-white border border-[#E7DDD2] rounded-xl px-3 py-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#78716C]" />
            <select
              aria-label="Sort designs"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'popular' | 'price-low' | 'price-high')}
              className="text-xs font-semibold text-[#1C1917] bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="popular">Most Popular</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search + Horizontal Category Pills */}
      <div className="space-y-3">
        <div className="relative max-w-xl">
          <Search className="w-4 h-4 text-[#A8A29E] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search maggam blouse, lehenga, sherwani, gown..."
            className="w-full bg-white border border-[#E7DDD2] rounded-xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-[#1C1917] focus:outline-none focus:border-[#EA580C]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#EA580C] text-white'
                : 'bg-white border border-[#E7DDD2] text-[#44403C] hover:border-[#EA580C]'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.filter((c) => genderFilter === 'all' || c.gender === genderFilter)
            .slice(0, 14)
            .map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#EA580C] text-white'
                    : 'bg-white border border-[#E7DDD2] text-[#44403C] hover:border-[#EA580C]'
                }`}
              >
                {cat.name}
              </button>
            ))}
        </div>
      </div>

      {/* Designs Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EFE6DC] p-12 text-center">
          <p className="text-base font-bold text-[#1C1917]">No designs matched your filter.</p>
          <p className="text-xs text-[#78716C] mt-1">
            Try clearing your search or explore all curated StitchMate styles.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setGenderFilter('all');
              setSearchQuery('');
            }}
            className="mt-4 bg-[#EA580C] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
          >
            Show All Designs
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {filtered.map((design) => {
            const isFav = wishlistIds.includes(design.id);
            return (
              <div
                key={design.id}
                className="group bg-white rounded-2xl border border-[#EFE6DC] hover:border-[#FED7AA] hover:shadow-md overflow-hidden flex flex-col transition-all"
              >
                <div
                  onClick={() => onSelectDesign(design)}
                  className="relative aspect-[3/4] bg-[#F8F6F4] overflow-hidden cursor-pointer"
                >
                  <SafeImage
                    src={design.image}
                    alt={design.title}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                  {design.trusted && (
                    <span className="absolute top-2.5 left-0 bg-[#38BDF8] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-r-full shadow-xs">
                      Trusted
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="Toggle wishlist"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWishlist(design.id);
                    }}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow-sm cursor-pointer"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isFav ? 'fill-[#E11D48] text-[#E11D48]' : 'text-[#57534E]'
                      }`}
                    />
                  </button>
                  <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 bg-white/90 text-[#1C1917] text-[10.5px] font-bold px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3 text-[#78716C]" />
                    {design.turnaroundDays}d
                  </span>
                </div>

                <div className="p-3.5 flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#EA580C] truncate">
                        {design.category}
                      </p>
                      <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-[#1C1917] shrink-0">
                        <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                        {design.rating}
                      </span>
                    </div>
                    <h3
                      onClick={() => onSelectDesign(design)}
                      className="mt-1 text-xs sm:text-sm font-bold text-[#1C1917] line-clamp-2 hover:text-[#EA580C] cursor-pointer"
                    >
                      {design.title}
                    </h3>
                    <p className="text-[11px] text-[#78716C] truncate mt-0.5">
                      by {design.boutique}
                    </p>
                    <div className="mt-2 flex items-baseline gap-2 tabular-nums">
                      <span className="text-base font-extrabold text-[#1C1917]">
                        ₹{design.price.toLocaleString('en-IN')}
                      </span>
                      {design.originalPrice && (
                        <span className="text-xs text-[#A8A29E] line-through">
                          ₹{design.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#F5EFE8] flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#EA580C] tabular-nums">
                      <Eye className="w-3.5 h-3.5" />
                      {design.views}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Add to bag"
                        onClick={() => onQuickAddDesign(design)}
                        className="w-8 h-8 rounded-lg border border-[#FED7AA] text-[#EA580C] hover:bg-[#FFF7ED] flex items-center justify-center cursor-pointer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectDesign(design)}
                        className="bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        Stitch
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
