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
import { CategoryItem, DesignProduct } from '../types';
import { SafeImage } from './SafeImage';

interface DesignsCatalogPageProps {
  designs: DesignProduct[];
  categories: CategoryItem[];
  loading?: boolean;
  initialCategory?: string;
  initialSearch?: string;
  wishlistIds: string[];
  onToggleWishlist: (designId: string) => void;
  onSelectDesign: (design: DesignProduct) => void;
  onQuickAddDesign: (design: DesignProduct) => void;
}

export const DesignsCatalogPage: React.FC<DesignsCatalogPageProps> = ({
  designs,
  categories,
  loading = false,
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

  const filtered = designs.filter((item) => {
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
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-7 sm:py-9 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#EAE0FA]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6B21D9]">
            TAILERING LOOKBOOK ARCHIVE
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#1A103D]">
            Curated Stitching Designs
          </h1>
          <p className="text-xs sm:text-sm text-[#5B4E7A] mt-0.5">
            Select a silhouette and our verified Hyderabad master ateliers will tailor it to your
            exact fit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center bg-[#F4EEFF] border border-[#EAE0FA] p-1 rounded-full">
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
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#6B21D9] text-white shadow-2xs'
                    : 'text-[#4B3F6B] hover:text-[#1A103D]'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-1.5 bg-white border border-[#EAE0FA] rounded-full px-3.5 py-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#6B21D9]" />
            <select
              aria-label="Sort designs"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'popular' | 'price-low' | 'price-high')}
              className="text-xs font-bold text-[#1A103D] bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="popular">Most Popular</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search + Horizontal Category Filters */}
      <div className="space-y-3">
        <div className="relative max-w-xl">
          <Search className="w-4 h-4 text-[#6B21D9] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search maggam blouse, lehenga, sherwani, gown..."
            className="w-full bg-white border border-[#EAE0FA] rounded-full pl-11 pr-4 py-2.5 text-xs sm:text-sm text-[#1A103D] placeholder:text-[#746894] focus:outline-none focus:border-[#6B21D9]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#6B21D9] text-white shadow-xs'
                : 'bg-white border border-[#EAE0FA] text-[#4B3F6B] hover:border-[#6B21D9]'
            }`}
          >
            All Categories
          </button>
          {categories
            .filter((c) => genderFilter === 'all' || c.gender === genderFilter)
            .slice(0, 14)
            .map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#6B21D9] text-white shadow-xs'
                    : 'bg-white border border-[#EAE0FA] text-[#4B3F6B] hover:border-[#6B21D9]'
                }`}
              >
                {cat.name}
              </button>
            ))}
        </div>
      </div>

      {/* Designs Grid */}
      {loading && designs.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="bg-white rounded-2xl border border-[#EAE0FA] overflow-hidden animate-pulse"
            >
              <div className="aspect-[3/4] bg-[#EAE0FA]" />
              <div className="p-3.5 space-y-2">
                <div className="h-3 w-16 bg-[#EAE0FA] rounded" />
                <div className="h-4 w-3/4 bg-[#EAE0FA] rounded" />
                <div className="h-5 w-20 bg-[#EAE0FA] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EAE0FA] p-12 text-center">
          <p className="text-base font-bold text-[#1A103D]">No designs matched your filter.</p>
          <p className="text-xs text-[#64748B] mt-1">
            Try clearing your search or explore all curated Tailering styles.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setGenderFilter('all');
              setSearchQuery('');
            }}
            className="mt-4 bg-[#1A103D] hover:bg-[#2E1065] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-colors"
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
                className="group bg-white rounded-2xl border border-[#EAE0FA] hover:border-[#6B21D9]/45 hover:shadow-md overflow-hidden flex flex-col transition-all"
              >
                <div
                  onClick={() => onSelectDesign(design)}
                  className="relative aspect-[3/4] bg-[#F1F5F9] overflow-hidden cursor-pointer"
                >
                  <SafeImage
                    src={design.image}
                    alt={design.title}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                  {design.trusted && (
                    <span className="absolute top-2.5 left-2.5 bg-[#1A103D]/85 backdrop-blur-xs text-[#E2B14B] text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                      Atelier Verified
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
                        isFav ? 'fill-[#C8922A] text-[#C8922A]' : 'text-[#475569]'
                      }`}
                    />
                  </button>
                  <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 bg-white/90 text-[#1A103D] text-[10.5px] font-bold px-2 py-0.5 rounded-md tabular-nums">
                    <Clock className="w-3 h-3 text-[#6B21D9]" />
                    {design.turnaroundDays}d
                  </span>
                </div>

                <div className="p-3.5 flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B21D9] truncate">
                        {design.category}
                      </p>
                      <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-[#1A103D] shrink-0 tabular-nums">
                        <Star className="w-3 h-3 fill-[#C8922A] text-[#C8922A]" />
                        {design.rating}
                      </span>
                    </div>
                    <h3
                      onClick={() => onSelectDesign(design)}
                      className="mt-1 text-xs sm:text-sm font-bold text-[#1A103D] line-clamp-2 hover:text-[#6B21D9] cursor-pointer"
                    >
                      {design.title}
                    </h3>
                    <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                      by {design.boutique}
                    </p>
                    <div className="mt-2 flex items-baseline gap-2 tabular-nums">
                      <span className="text-base font-extrabold text-[#1A103D]">
                        ₹{design.price.toLocaleString('en-IN')}
                      </span>
                      {design.originalPrice && (
                        <span className="text-xs text-[#94A3B8] line-through">
                          ₹{design.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748B] tabular-nums">
                      <Eye className="w-3.5 h-3.5 text-[#6B21D9]" />
                      {design.views}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Add to bag"
                        onClick={() => onQuickAddDesign(design)}
                        className="w-8 h-8 rounded-lg border border-[#CBD5E1] text-[#1A103D] hover:border-[#6B21D9] hover:text-[#6B21D9] flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectDesign(design)}
                        className="bg-[#1A103D] hover:bg-[#2E1065] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
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
