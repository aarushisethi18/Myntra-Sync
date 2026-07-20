import { useState } from "react";

const categories = ["Men", "Women", "Kids", "Home", "Beauty", "Gen Z", "Studio"];

export default function ShopHeader({ onSearch, onCategory, bagCount }: { onSearch: (value: string) => void; onCategory: (category: string) => void; bagCount: number }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    onCategory(category);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAEAEC] transition-all duration-300">
      <div className="max-w-[1440px] mx-auto h-[76px] px-6 md:px-12 flex items-center justify-between gap-4 md:gap-8">
        {/* Brand Logo */}
        <a 
          className="flex items-center gap-2.5 text-[#282C3F] font-extrabold text-[20px] md:text-[22px] tracking-tight hover:opacity-90 transition-opacity" 
          href="#top"
          onClick={() => handleCategoryClick("")}
        >
          <span className="flex items-center justify-center bg-[#FF3F6C] text-white w-7.5 h-7.5 rounded-[9px] font-serif italic font-bold shadow-[0_4px_12px_rgba(255,63,108,0.2)]">
            m
          </span> 
          <span>Myntra <span className="text-[#FF3F6C] font-normal italic">Sync</span></span>
        </a>

        {/* Category Navigation - Desktop */}
        <nav className="hidden lg:flex items-center gap-6 h-full ml-4">
          {categories.map((category) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`relative h-[76px] uppercase text-[12px] md:text-[13px] tracking-wider font-bold transition-colors cursor-pointer ${
                  isActive ? "text-[#FF3F6C]" : "text-[#282C3F] hover:text-[#FF3F6C]"
                }`}
              >
                {category}
                <span 
                  className={`absolute bottom-0 left-0 h-[3px] bg-[#FF3F6C] transition-all duration-300 ${
                    isActive ? "w-full" : "w-0 hover:w-full"
                  }`} 
                />
              </button>
            );
          })}
        </nav>

        {/* Search Bar */}
        <form 
          onSubmit={(e) => { e.preventDefault(); onSearch(query); }}
          className="relative flex-1 max-w-[480px] group"
        >
          <input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Search for products, brands and more" 
            aria-label="Search products"
            className="w-full bg-[#F5F5F6] border border-transparent rounded-full py-2.5 pl-11 pr-4 text-[13px] text-[#282C3F] placeholder:text-[#94969F] focus:outline-none focus:bg-white focus:border-[#EAEAEC] focus:ring-1 focus:ring-[#FF3F6C] transition-all duration-200"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94969F] group-focus-within:text-[#FF3F6C] transition-colors duration-200 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>

        {/* Navigation Action Buttons */}
        <div className="flex items-center gap-5 md:gap-7">
          {/* Profile */}
          <button 
            className="flex flex-col items-center justify-center text-[#282C3F] hover:text-[#FF3F6C] transition-all duration-200 cursor-pointer group" 
            title="Profile"
          >
            <div className="relative p-1 group-hover:scale-105 transition-transform duration-200">
              <svg className="w-[21px] h-[21px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-[10px] font-bold tracking-wide mt-0.5">Profile</span>
          </button>

          {/* Wishlist */}
          <button 
            className="flex flex-col items-center justify-center text-[#282C3F] hover:text-[#FF3F6C] transition-all duration-200 cursor-pointer group" 
            title="Wishlist"
          >
            <div className="relative p-1 group-hover:scale-105 transition-transform duration-200">
              <svg className="w-[21px] h-[21px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-[10px] font-bold tracking-wide mt-0.5">Wishlist</span>
          </button>

          {/* Bag */}
          <button 
            className="flex flex-col items-center justify-center text-[#282C3F] hover:text-[#FF3F6C] transition-all duration-200 cursor-pointer relative group" 
            title="Bag"
          >
            <div className="relative p-1 group-hover:scale-105 transition-transform duration-200">
              <svg className="w-[21px] h-[21px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {bagCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF3F6C] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white animate-pulse">
                  {bagCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-wide mt-0.5">Bag</span>
          </button>
        </div>
      </div>

      {/* Category Navigation - Mobile (Horizontal Scroll) */}
      <div className="lg:hidden flex gap-5 overflow-x-auto no-scrollbar py-2.5 px-6 bg-white border-t border-[#EAEAEC] scroll-smooth">
        {categories.map((category) => {
          const isActive = activeCategory === category;
          return (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`uppercase text-[11px] tracking-wider font-bold whitespace-nowrap px-1 py-1 cursor-pointer transition-colors duration-200 ${
                isActive ? "text-[#FF3F6C] border-b-2 border-[#FF3F6C]" : "text-[#282C3F] hover:text-[#FF3F6C]"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </header>
  );
}
