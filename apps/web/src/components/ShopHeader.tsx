import { useState } from "react";

const categories = ["Men", "Women", "Kids", "Home", "Beauty", "Gen Z", "Studio"];
export default function ShopHeader({ onSearch, onCategory, bagCount }: { onSearch: (value: string) => void; onCategory: (category: string) => void; bagCount: number }) {
  const [query, setQuery] = useState("");
  return <header className="shop-header"><div className="nav-row"><a className="brand" href="#top"><span>m</span> Myntra <i>Sync</i></a><nav>{categories.map((category) => <button key={category} onClick={() => onCategory(category)}>{category}</button>)}</nav><form onSubmit={(e) => { e.preventDefault(); onSearch(query); }}><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for products, brands and more" aria-label="Search products" /><b>⌕</b></form><div className="nav-actions"><button title="Profile">♙<small>Profile</small></button><button title="Wishlist">♡<small>Wishlist</small></button><button title="Bag">▱<small>Bag {bagCount ? `(${bagCount})` : ""}</small></button></div></div><div className="mobile-cats">{categories.map((category) => <button key={category} onClick={() => onCategory(category)}>{category}</button>)}</div></header>;
}
