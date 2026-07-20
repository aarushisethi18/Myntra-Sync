import os
import uuid
import random
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Ensure reproducible generation
random.seed(42)

load_dotenv("apps/api/.env")
db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("DATABASE_URL is not set!")
    exit(1)

engine = create_engine(db_url.replace(":6543/", ":5432/"))

# Helper for direct Unsplash image links
def get_image_url(photo_id):
    return f"https://images.unsplash.com/{photo_id}?auto=format&fit=crop&w=800&q=82"

# Unsplash image IDs categorized for high relevance
image_ids = {
    "Men T-Shirt": ["photo-1521572267360-ee0c2909d518", "photo-1503342217505-b0a15ec3261c", "photo-1562157873-818bc0726f68", "photo-1581655353564-df123a1eb820"],
    "Men Shirt": ["photo-1596755094514-f87e34085b2c", "photo-1603252109303-2751441dd157", "photo-1620012253295-c05518e99309", "photo-1602810318383-e386cc2a3ccf"],
    "Men Jeans": ["photo-1542272604-787c3835535d", "photo-1541099649105-f69ad21f3246", "photo-1582562124811-c09040d0a901"],
    "Men Trousers": ["photo-1624378439575-d8705ad7ae80", "photo-1594633312681-425c7b97ccd1"],
    "Men Jacket": ["photo-1551028719-00167b16eac5", "photo-1483985988355-763728e1935b", "photo-1544923246-77307dd654cb"],
    "Men Hoodie": ["photo-1556821840-3a63f95609a7", "photo-1556821820-5654c602052c", "photo-1512436991641-6745cdb1723f"],
    "Men Shoes": ["photo-1549298916-b41d501d3772", "photo-1595950653106-6c9ebd614d3a", "photo-1485738422979-f5c462d49f74"],
    "Men Sneakers": ["photo-1542291026-7eec264c27ff", "photo-1460353581641-37baddab0fa2", "photo-1608231387042-66d1773070a5"],
    "Men Watch": ["photo-1523275335684-37898b6baf30", "photo-1524592094714-0f0654e20314", "photo-1539874754764-5a96559165b0"],
    "Men Wallet": ["photo-1627124118303-1d6cc3f69911", "photo-1506784983877-45594efa4cbe"],
    
    "Women Saree": ["photo-1610030469983-98e550d6193c", "photo-1617627143750-d86bc21e42bb", "photo-1609357518652-6cf0416f0cbe"],
    "Women Kurti": ["photo-1583391733956-6c78276477e2", "photo-1609357518652-6cf0416f0cbe", "photo-1610030469983-98e550d6193c"],
    "Women Dress": ["photo-1566174053879-31528523f8ae", "photo-1572804013309-59a88b7e92f1", "photo-1618244972963-dbee1a7edc95", "photo-1496747611176-843222e1e57c"],
    "Women Top": ["photo-1509631179647-0177331693ae", "photo-1554412930-87537295ab32", "photo-1515886657613-9f3515b0c78f"],
    "Women Jeans": ["photo-1541099649105-f69ad21f3246", "photo-1582562124811-c09040d0a901"],
    "Women Handbag": ["photo-1584917865442-de89df76afd3", "photo-1590874103328-eac38a683ce7", "photo-1614165939016-f351d77a8b23"],
    "Women Heels": ["photo-1543163521-1bf539c55dd2", "photo-1596702994230-a88f95a09e75", "photo-1535043934128-cf0b28d52f95"],
    "Women Jewellery": ["photo-1535632066927-ab7c9ab60908", "photo-1599643478518-a784e5dc4c8f", "photo-1605100804763-247f67b3557e"],
    "Women Ethnic Wear": ["photo-1610030469983-98e550d6193c", "photo-1583391733956-6c78276477e2"],
    "Women Footwear": ["photo-1596702994230-a88f95a09e75", "photo-1543163521-1bf539c55dd2"],
    
    "Kids": ["photo-1519457431-44ccd64a579b", "photo-1503919545889-aef636e10ad4", "photo-1607990283143-e81e7a2c93ab"],
    "Home": ["photo-1583847268964-b28dc8f51f92", "photo-1505693416388-ac5ce068fe85", "photo-1513694203232-719a280e022f"],
    "Beauty": ["photo-1596462502278-27bfdc403348", "photo-1522335789203-aabd1fc54bc9", "photo-1512496015851-a90fb38ba796"],
    "Sports": ["photo-1517836357463-d25dfeac3438", "photo-1476480862126-209bfaa8edc8", "photo-1556906781-9a412961c28c"],
    "Accessories": ["photo-1511499767150-a48a237f0083", "photo-1517462964-21fdcec3f25b", "photo-1521119989659-a83eee488004"]
}

# Source pools
colors_list = ["White", "Black", "Grey", "Navy", "Olive", "Beige", "Brown", "Pink", "Maroon", "Mustard", "Teal", "Cream", "Peach", "Ivory", "Rose", "Green", "Blue", "Red", "Yellow", "Orange", "Purple", "Lavender", "Gold", "Silver"]
fabrics_list = ["Cotton", "Linen", "Denim", "Satin", "Silk", "Chiffon", "Georgette", "Wool", "Polyester", "Leather", "Canvas", "Knit"]
occasions_list = ["Casual", "Party", "Festive", "Office Wear", "Wedding Season", "Sports", "Travel", "Lounge", "College", "Formal", "Interview"]
weather_suitability_list = ["Summer", "Winter", "Rainy Season"]
festival_suitability_list = ["Diwali", "Raksha Bandhan", "Holi", "Navratri", "Durga Puja", "Eid", "Christmas", "Wedding Season"]
trend_tags_list = ["Trending", "Bestseller", "New", "Editor's Choice", "Limited Edition", "Gen Z Pick", "Eco-Friendly", "Premium"]

# Invented brand names per department
brands = {
    "Men": ["Taavi Men", "Veloce Men", "Loom & Thread", "Urban Drapes", "Verdant Denim", "Monochrome Studio", "Kook N Keech Men", "Nordic Gear"],
    "Women": ["Tokyo Talkies", "DressBerry", "Anouk Luxe", "Taavi Women", "SASSAFRAS", "All About You", "Sangria", "Saffron Silk", "Kalon Beauty"],
    "Kids": ["Tokyo Talkies Kids", "Roadster Kids", "Kook N Keech Kids", "Tiny Threads", "Loom & Thread Kids"],
    "Home": ["Nordic Haven", "Solace Home", "Dune & Clay", "Taavi Home", "Aura Spaces"],
    "Beauty": ["Kalon Beauty", "Taavi Beauty", "DressBerry Cosmetics", "Aura Glow"],
    "Sports": ["CoreAthletics", "Veloce Sports", "HRX Active", "Puma Active"],
    "Accessories": ["Tokyo Talkies Acc", "Roadster Acc", "Nexa Watches", "Saffron Accessories", "Loom Accessories", "Verdant Leather"]
}

# Sizes list per department
sizes_map = {
    "Men": ["S", "M", "L", "XL", "XXL"],
    "Women": ["XS", "S", "M", "L", "XL"],
    "Kids": ["2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y"],
    "Home": ["One Size"],
    "Beauty": ["One Size"],
    "Sports": ["S", "M", "L", "XL"],
    "Accessories": ["One Size", "S", "M", "L"]
}

# Define mapping from department & item type to descriptive names
product_templates = {
    "Men": {
        "T-Shirt": "Printed Crew Neck T-Shirt",
        "Shirt": "Linen Relaxed Casual Shirt",
        "Jeans": "Slim Fit Stretch Denim Jeans",
        "Trousers": "Structured Smart Chino Trousers",
        "Jacket": "Water-Resistant Outdoor Utility Jacket",
        "Hoodies": "Plush Cotton Fleece Hoodie",
        "Shoes": "Classic Genuine Leather Oxfords",
        "Sneakers": "Minimal Statement Court Sneakers",
        "Watches": "Automatic Analogue Chronograph Watch",
        "Wallets": "Handcrafted Bifold Leather Wallet"
    },
    "Women": {
        "Saree": "Banarasi Kora Organza Zari Saree",
        "Kurtis": "Floral Printed A-Line Festive Kurta",
        "Dresses": "A-Line Satin Drape Evening Dress",
        "Tops": "Ruffled Cotton Casual Crop Top",
        "Jeans": "High-Rise Straight Leg Denim Jeans",
        "Handbags": "Structured Vegan Leather Shoulder Bag",
        "Heels": "Strappy Pointed Toe Stiletto Heels",
        "Jewellery": "Gold-Plated Handcrafted Statement Necklace",
        "Ethnic Wear": "Embroidered Chanderi Kurta Palazzo Set",
        "Footwear": "Embellished Velvet Festive Juttis"
    },
    "Kids": {
        "T-Shirt": "Cartoon Graphic Printed T-Shirt",
        "Dresses": "Tiered Cotton Casual Party Dress",
        "Shirts": "Linen Blend Collar Shirt",
        "Jeans": "Comfy Knit Denim Jogger Jeans",
        "Sneakers": "Lightweight Slip-On Kids Sneakers"
    },
    "Home": {
        "Bed Sheets": "Pure Cotton 300 TC Double Bed Sheet",
        "Towels": "Ultra Soft Turkish Cotton Bath Towel",
        "Cushions": "Embellished Velvet Cushion Cover Set",
        "Rugs": "Handwoven Geometric Cotton Floor Rug",
        "Curtains": "Linen Blend Blackout Window Curtains"
    },
    "Beauty": {
        "Lipstick": "Hydrating Matte Intense Lip Color",
        "Foundation": "Dewy Radiance Liquid Foundation",
        "Eye Shadow": "9-Shade Rich Pigment Eyeshadow Palette",
        "Perfume": "Oud Wood Luxe Eau de Parfum",
        "Face Wash": "Gentle Neem & Tea Tree Face Cleanser"
    },
    "Sports": {
        "T-Shirt": "Dry-Fit Moisture Wicking Running Tee",
        "Track Pants": "Breathable Performance Gym Track Pants",
        "Running Shoes": "Cushioned Flyknit Athletic Running Shoes",
        "Jackets": "Ultra-Lightweight Windbreaker Jacket",
        "Gym Bags": "Waterproof Compartment Sports Duffel Bag"
    },
    "Accessories": {
        "Sunglasses": "Polarized Retro Aviator Sunglasses",
        "Belts": "Classic Reversible Genuine Leather Belt",
        "Socks": "Cushioned Organic Cotton Ankle Socks",
        "Scarves": "Silky Floral Print Lightweight Scarf",
        "Caps": "Adjustable Cotton Twill Baseball Cap"
    }
}

# Generation loop
generated_products = []

for dept, items_dict in product_templates.items():
    dept_brands = brands[dept]
    dept_sizes = sizes_map[dept]
    
    for item_type, default_name in items_dict.items():
        # Generate 6-10 items per item type to ensure we hit at least 350 items overall
        num_items = random.randint(7, 10)
        for i in range(num_items):
            brand = random.choice(dept_brands)
            color = random.choice(colors_list)
            fabric = random.choice(fabrics_list)
            
            # Combine traits for title/name
            name = f"{color} {fabric} {default_name}"
            # Ensure unique names
            if i > 0:
                name += f" (V{i+1})"
            
            # Category mapping
            category = dept
            if dept == "Sports":
                category = "Sports Wear"
            elif dept == "Women" and item_type in ["Saree", "Kurtis", "Ethnic Wear"]:
                category = "Ethnic Wear"
            elif dept == "Women" and item_type in ["Heels", "Footwear"]:
                category = "Footwear"
            elif dept == "Men" and item_type in ["Shoes", "Sneakers"]:
                category = "Footwear"
            
            # Style field matching decision engine triggers or aesthetics
            style = "Casual"
            if item_type in ["Saree", "Kurtis", "Ethnic Wear", "Jewellery"]:
                style = "Ethnic"
            elif item_type in ["Shoes", "Trousers", "Watches"]:
                style = "Formal"
            elif item_type in ["Running Shoes", "Track Pants", "T-Shirt"] and dept == "Sports":
                style = "Sports"
            elif item_type in ["Jacket", "Hoodies", "Gym Bags"]:
                style = "Outdoor"
            elif item_type in ["Dress", "Heels"]:
                style = "Party"
            
            # Generate deterministic UUID based on brand & name
            product_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"{brand}:{name}")
            
            # Image mapping with error correction
            pool_key = f"{dept} {item_type}"
            if "T-Shirt" in pool_key: pool_key = "Men T-Shirt" if dept == "Men" else "Kids"
            elif "Shirt" in pool_key: pool_key = "Men Shirt" if dept == "Men" else "Kids"
            elif "Jeans" in pool_key: pool_key = "Men Jeans" if dept == "Men" else ("Women Jeans" if dept == "Women" else "Kids")
            elif "Trousers" in pool_key: pool_key = "Men Trousers"
            elif "Jacket" in pool_key: pool_key = "Men Jacket" if dept == "Men" else "Sports"
            elif "Hoodie" in pool_key or "Hoodies" in pool_key: pool_key = "Men Hoodie"
            elif "Sneaker" in pool_key or "Sneakers" in pool_key: pool_key = "Men Sneakers" if dept == "Men" else "Kids"
            elif "Shoes" in pool_key or "Footwear" in pool_key or "Heels" in pool_key: pool_key = "Men Shoes" if dept == "Men" else ("Women Heels" if item_type == "Heels" else "Women Footwear")
            elif "Watch" in pool_key or "Watches" in pool_key: pool_key = "Men Watch"
            elif "Wallet" in pool_key or "Wallets" in pool_key: pool_key = "Men Wallet"
            elif "Saree" in pool_key or "Sarees" in pool_key: pool_key = "Women Saree"
            elif "Kurti" in pool_key or "Kurtis" in pool_key or "Ethnic Wear" in pool_key: pool_key = "Women Kurti"
            elif "Dress" in pool_key or "Dresses" in pool_key: pool_key = "Women Dress"
            elif "Top" in pool_key or "Tops" in pool_key: pool_key = "Women Top"
            elif "Handbag" in pool_key or "Handbags" in pool_key: pool_key = "Women Handbag"
            elif "Jewellery" in pool_key: pool_key = "Women Jewellery"
            
            # Fallback if pool_key is not in image_ids
            if pool_key not in image_ids:
                pool_key = dept if dept in image_ids else "Accessories"
                
            photo_id = random.choice(image_ids[pool_key])
            image_url = get_image_url(photo_id)
            
            # Pricing
            original_price = random.randint(15, 80) * 100 - 1  # 1499, 2999, etc.
            discount_pct = random.choice([20, 30, 40, 50, 60])
            price = int(original_price * (1 - discount_pct / 100.0))
            
            rating = round(random.uniform(4.0, 4.9), 1)
            reviews = random.randint(20, 2500)
            
            # Sizes text array - safe sample range (1 to len)
            p_sizes = sorted(random.sample(dept_sizes, random.randint(1, len(dept_sizes))))
            if not p_sizes or dept_sizes == ["One Size"]:
                p_sizes = ["One Size"]
            
            description = f"Elevate your {style.lower()} wardrobe with this premium {name.lower()} from {brand}. Crafted from breathable {fabric.lower()} for all-day comfort."
            badge = random.choice([None, "Trending", "Bestseller", "New", "Only a few left", "Top Rated", "Editor's Choice"])
            
            # Suitability signals for Decision Engine
            weather_suitability = []
            if fabric in ["Cotton", "Linen"]:
                weather_suitability.append("Summer")
            if fabric in ["Wool", "Leather"]:
                weather_suitability.append("Winter")
            if style in ["Sports", "Outdoor"]:
                weather_suitability.append("Rainy Season")
            if not weather_suitability:
                weather_suitability = ["Summer", "Winter", "Rainy Season"]
                
            # Randomly pick 1-2 festivals for suitability
            festival_suitability = []
            if style == "Ethnic":
                festival_suitability = ["Diwali", "Raksha Bandhan", "Navratri", "Durga Puja", "Eid", "Wedding Season"]
            elif style == "Party":
                festival_suitability = ["Christmas", "Holi"]
            else:
                festival_suitability = ["Office Wear", "Summer", "Winter", "Rainy Season"]
            
            # Occasions
            p_occasions = [style]
            if style == "Casual":
                p_occasions.extend(["College", "Travel"])
            elif style == "Formal":
                p_occasions.extend(["Office Wear", "Interview"])
                
            # Trend tags
            trend_tags = []
            if badge:
                trend_tags.append(badge)
            if rating >= 4.5:
                trend_tags.append("Top Rated")
            if price < 2000:
                trend_tags.append("Budget Pick")
                
            generated_products.append({
                "id": str(product_uuid),
                "name": name,
                "category": category,
                "brand": brand,
                "color": color,
                "price": price,
                "style": style,
                "image_url": image_url,
                "original_price": original_price,
                "rating": rating,
                "reviews": reviews,
                "sizes": p_sizes,
                "description": description,
                "badge": badge,
                "colors": [color],
                "occasions": p_occasions,
                "fabrics": [fabric],
                "weather_suitability": weather_suitability,
                "festival_suitability": festival_suitability,
                "trend_tags": trend_tags
            })

# Save generated products to SQL
print(f"Generated {len(generated_products)} products.")

# Seed into public.products table
insert_stmt = text("""
    INSERT INTO public.products (
        id, name, category, brand, color, price, style, image_url,
        original_price, rating, reviews, sizes, description, badge,
        colors, occasions, fabrics, weather_suitability, festival_suitability, trend_tags
    ) VALUES (
        :id, :name, :category, :brand, :color, :price, :style, :image_url,
        :original_price, :rating, :reviews, :sizes, :description, :badge,
        :colors, :occasions, :fabrics, :weather_suitability, :festival_suitability, :trend_tags
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        brand = EXCLUDED.brand,
        color = EXCLUDED.color,
        price = EXCLUDED.price,
        style = EXCLUDED.style,
        image_url = EXCLUDED.image_url,
        original_price = EXCLUDED.original_price,
        rating = EXCLUDED.rating,
        reviews = EXCLUDED.reviews,
        sizes = EXCLUDED.sizes,
        description = EXCLUDED.description,
        badge = EXCLUDED.badge,
        colors = EXCLUDED.colors,
        occasions = EXCLUDED.occasions,
        fabrics = EXCLUDED.fabrics,
        weather_suitability = EXCLUDED.weather_suitability,
        festival_suitability = EXCLUDED.festival_suitability,
        trend_tags = EXCLUDED.trend_tags
""")

with engine.begin() as conn:
    # Clear existing recommendations to avoid foreign key issues
    conn.execute(text("DELETE FROM public.recommendations"))
    conn.execute(text("DELETE FROM public.products"))
    
    # Batch insert
    for p in generated_products:
        conn.execute(insert_stmt, p)

print("Catalog seeding complete! ~350 products inserted.")
