CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    city VARCHAR(100),
    state VARCHAR(100),
    budget_min INTEGER,
    budget_max INTEGER,
    preferred_style VARCHAR(100),
    preferred_colors TEXT[],
    favorite_brands TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE wardrobe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_name VARCHAR(150),
    category VARCHAR(50),
    color VARCHAR(50),
    brand VARCHAR(100),
    purchase_date DATE,
    last_worn DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150),
    event_type VARCHAR(50),
    event_date DATE,
    location VARCHAR(150),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE weather_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city VARCHAR(100),
    temperature INTEGER,
    condition VARCHAR(50),
    forecast_date DATE
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150),
    category VARCHAR(80),
    brand VARCHAR(100),
    color VARCHAR(50),
    price INTEGER,
    style VARCHAR(80),
    image_url TEXT
);

CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    reason TEXT,
    confidence INTEGER,
    context_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150),
    message TEXT,
    notification_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);