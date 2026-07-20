import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { fetchBag } from "../services/catalogService";

const categories = ["Men", "Women", "Kids", "Home", "Beauty", "Gen Z", "Studio"];

export default function ShopHeader({ 
  onSearch, 
  onCategory, 
  bagCount 
}: { 
  onSearch?: (value: string) => void; 
  onCategory?: (category: string) => void; 
  bagCount?: number 
}) {
  const { user, session, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [dbBagCount, setDbBagCount] = useState(0);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outside = (event: MouseEvent) => { if (profileRef.current && !profileRef.current.contains(event.target as Node)) setShowProfileDropdown(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setShowProfileDropdown(false); };
    document.addEventListener("mousedown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); };
  }, []);

  // Sync and fetch bag count from database if session is active
  useEffect(() => {
    if (session) {
      fetchBag(session)
        .then((items) => {
          setDbBagCount(items.reduce((acc, i) => acc + i.quantity, 0));
        })
        .catch(() => {});
    }
  }, [session, bagCount]);

  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    if (onCategory) {
      onCategory(category);
    } else {
      navigate(`/?category=${category}`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    } else {
      navigate(`/?search=${query}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  // Get user avatar display
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "User";
  const initials = fullName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();

  const currentBagCount = typeof bagCount === "number" && bagCount > 0 ? bagCount : dbBagCount;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAEAEC] transition-all duration-300">
      <div className="max-w-[1440px] mx-auto h-[76px] px-6 md:px-12 flex items-center justify-between gap-4 md:gap-8">
        {/* Brand Logo */}
        <Link 
          className="flex items-center gap-2.5 text-[#282C3F] font-extrabold text-[20px] md:text-[22px] tracking-tight hover:opacity-90 transition-opacity" 
          to="/"
          onClick={() => handleCategoryClick("")}
        >
          <span className="flex items-center justify-center bg-[#FF3F6C] text-white w-7.5 h-7.5 rounded-[9px] font-serif italic font-bold shadow-[0_4px_12px_rgba(255,63,108,0.2)]">
            m
          </span> 
          <span>Myntra <span className="text-[#FF3F6C] font-normal italic">Sync</span></span>
        </Link>

        {/* Category Navigation - Desktop */}
        <nav className="hidden lg:flex items-center gap-6 h-full ml-4">
          {categories.map((category) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`relative h-[76px] uppercase text-[12px] md:text-[13px] tracking-wider font-bold transition-colors cursor-pointer border-0 bg-transparent ${
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
          onSubmit={handleSearchSubmit}
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
          {/* Profile Group */}
          <div ref={profileRef} className="relative flex flex-col items-center justify-center text-[#282C3F] py-2 group">
            <button type="button" aria-expanded={showProfileDropdown} onClick={() => setShowProfileDropdown((open) => !open)} className="flex flex-col items-center cursor-pointer border-0 bg-transparent text-inherit p-0">
            <div className="relative p-1 group-hover:scale-105 transition-transform duration-200">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={fullName} 
                  className="w-[21px] h-[21px] rounded-full object-cover border border-[#EAEAEC]"
                />
              ) : (
                <svg className="w-[21px] h-[21px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-wide mt-0.5">Profile</span>
            </button>

            {/* Styled Profile Dropdown */}
            {showProfileDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-[#EAEAEC] rounded-xl shadow-[0_12px_30px_rgba(40,44,63,.16)] p-3 text-left z-50 animate-fade-in-up">
                <div className="pb-3 border-b border-gray-100 mb-3">
                  <div className="flex items-center gap-2.5">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={fullName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#FF3F6C] text-white flex items-center justify-center font-bold text-[13px]">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-[13px] text-[#282C3F] truncate">{fullName}</h4>
                      <p className="text-[11px] text-[#94969F] truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                <ul className="space-y-1 text-[12px] text-gray-700 font-bold">
                  <li><Link to="/" onClick={() => setShowProfileDropdown(false)} className="flex py-2 px-2.5 rounded-lg hover:bg-[#FFF0F4]/40 hover:text-[#FF3F6C] transition-all">Profile</Link></li>
                  <li>
                    <Link to="/orders" onClick={() => setShowProfileDropdown(false)} className="flex items-center py-2 px-2.5 rounded-lg hover:bg-[#FFF0F4]/40 hover:text-[#FF3F6C] transition-all text-transparent before:content-['Orders'] before:text-gray-700 hover:before:text-[#FF3F6C]">
                      🛍️ Orders
                    </Link>
                  </li>
                  <li>
                    <Link to="/wishlist" onClick={() => setShowProfileDropdown(false)} className="flex items-center py-2 px-2.5 rounded-lg hover:bg-[#FFF0F4]/40 hover:text-[#FF3F6C] transition-all text-transparent before:content-['Wishlist'] before:text-gray-700 hover:before:text-[#FF3F6C]">
                      🖤 Wishlist
                    </Link>
                  </li>
                  <li>
                    <Link to="/bag" onClick={() => setShowProfileDropdown(false)} className="flex items-center py-2 px-2.5 rounded-lg hover:bg-[#FFF0F4]/40 hover:text-[#FF3F6C] transition-all text-transparent before:content-['Shopping_Bag'] before:text-gray-700 hover:before:text-[#FF3F6C]">
                      👜 Shopping Bag
                    </Link>
                  </li>
                  <li><button type="button" onClick={() => setShowProfileDropdown(false)} className="w-full text-left py-2 px-2.5 rounded-lg hover:bg-[#FFF0F4]/40 hover:text-[#FF3F6C] transition-all font-bold cursor-pointer border-0 bg-transparent">Settings</button></li>
                  <li className="pt-2 mt-2 border-t border-gray-100">
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left py-2 px-2.5 rounded-lg text-red-500 hover:bg-red-50 transition-all font-bold cursor-pointer border-0 bg-transparent text-transparent before:content-['Log_Out'] before:text-red-500"
                    >
                      🚪 Log Out
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Wishlist Link */}
          <Link 
            to="/wishlist"
            className="flex flex-col items-center justify-center text-[#282C3F] hover:text-[#FF3F6C] transition-all duration-200 cursor-pointer group" 
            title="Wishlist"
          >
            <div className="relative p-1 group-hover:scale-105 transition-transform duration-200">
              <svg className="w-[21px] h-[21px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-[10px] font-bold tracking-wide mt-0.5">Wishlist</span>
          </Link>

          {/* Bag Link */}
          <Link 
            to="/bag"
            className="flex flex-col items-center justify-center text-[#282C3F] hover:text-[#FF3F6C] transition-all duration-200 cursor-pointer relative group" 
            title="Bag"
          >
            <div className="relative p-1 group-hover:scale-105 transition-transform duration-200">
              <svg className="w-[21px] h-[21px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {currentBagCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF3F6C] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white animate-pulse">
                  {currentBagCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-wide mt-0.5">Bag</span>
          </Link>
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
              className={`uppercase text-[11px] tracking-wider font-bold whitespace-nowrap px-1 py-1 cursor-pointer transition-colors duration-200 border-0 bg-transparent ${
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
