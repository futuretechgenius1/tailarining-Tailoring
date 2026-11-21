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
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-7 sm:py-9 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0B7285]">
            TAILERING LOOKBOOK ARCHIVE
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#0B1F3A] font-serif-accent">
            Curated Stitching Designs
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Select a silhouette and our verified Hyderabad master ateliers will tailor it to your
            exact fit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center bg-[#F1F5F9] border border-[#E2E8F0] p-1 rounded-xl">
            {(['all', 'women', 'men'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGenderFilter(g);
                  setSelectedCategory('all');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                  genderFilter === g
                    ? 'bg-[#0B1F3A] text-white shadow-2xs'
                    : 'text-[#475569] hover:text-[#0B1F3A]'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-1.5 bg-white border border-[#CBD5E1] rounded-xl px-3 py-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#64748B]" />
            <select
              aria-label="Sort designs"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'popular' | 'price-low' | 'price-high')}
              className="text-xs font-semibold text-[#0B1F3A] bg-transparent focus:outline-none cursor-pointer"
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
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search maggam blouse, lehenga, sherwani, gown..."
            className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-[#0B1F3A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0B7285]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#0B7285] text-white'
                : 'bg-white border border-[#E2E8F0] text-[#334155] hover:border-[#0B7285]'
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
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-[#0B7285] text-white'
                    : 'bg-white border border-[#E2E8F0] text-[#334155] hover:border-[#0B7285]'
                }`}
              >
                {cat.name}
              </button>
            ))}
        </div>
      </div>

      {/* Designs Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
          <p className="text-base font-bold text-[#0B1F3A]">No designs matched your filter.</p>
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
            className="mt-4 bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-colors"
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
                className="group bg-white rounded-2xl border border-[#E2E8F0] hover:border-[#0B7285]/45 hover:shadow-md overflow-hidden flex flex-col transition-all"
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
                    <span className="absolute top-2.5 left-2.5 bg-[#0B1F3A]/85 backdrop-blur-xs text-[#E2B14B] text-[10px] font-bold px-2.5 py-0.5 rounded-md">
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
                  <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 bg-white/90 text-[#0B1F3A] text-[10.5px] font-bold px-2 py-0.5 rounded-md tabular-nums">
                    <Clock className="w-3 h-3 text-[#0B7285]" />
                    {design.turnaroundDays}d
                  </span>
                </div>

                <div className="p-3.5 flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#0B7285] truncate">
                        {design.category}
                      </p>
                      <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-[#0B1F3A] shrink-0 tabular-nums">
                        <Star className="w-3 h-3 fill-[#C8922A] text-[#C8922A]" />
                        {design.rating}
                      </span>
                    </div>
                    <h3
                      onClick={() => onSelectDesign(design)}
                      className="mt-1 text-xs sm:text-sm font-bold text-[#0B1F3A] line-clamp-2 hover:text-[#0B7285] cursor-pointer"
                    >
                      {design.title}
                    </h3>
                    <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                      by {design.boutique}
                    </p>
                    <div className="mt-2 flex items-baseline gap-2 tabular-nums">
                      <span className="text-base font-extrabold text-[#0B1F3A]">
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
                      <Eye className="w-3.5 h-3.5 text-[#0B7285]" />
                      {design.views}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label="Add to bag"
                        onClick={() => onQuickAddDesign(design)}
                        className="w-8 h-8 rounded-lg border border-[#CBD5E1] text-[#0B1F3A] hover:border-[#0B7285] hover:text-[#0B7285] flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectDesign(design)}
                        className="bg-[#0B1F3A] hover:bg-[#15325B] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
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
