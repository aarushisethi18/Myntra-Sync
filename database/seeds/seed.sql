INSERT INTO users
(full_name,email,city,state,budget_min,budget_max,preferred_style,preferred_colors,favorite_brands)
VALUES
(
'Ananya Paliwal',
'ananya@example.com',
'Delhi',
'Delhi',
1500,
3000,
'Minimal Chic',
ARRAY['White','Black','Olive'],
ARRAY['Myntra','H&M','Roadster']
);

INSERT INTO wardrobe
(user_id,product_name,category,color,brand,purchase_date,last_worn)

SELECT
id,
'White Oxford Shirt',
'Shirt',
'White',
'H&M',
'2026-04-10',
'2026-07-10'
FROM users
LIMIT 1;

INSERT INTO wardrobe
(user_id,product_name,category,color,brand,purchase_date,last_worn)

SELECT
id,
'Black Straight Jeans',
'Jeans',
'Black',
'Levis',
'2026-02-05',
'2026-07-11'
FROM users
LIMIT 1;

INSERT INTO wardrobe
(user_id,product_name,category,color,brand,purchase_date,last_worn)

SELECT
id,
'White Sneakers',
'Shoes',
'White',
'Nike',
'2026-05-15',
'2026-07-12'
FROM users
LIMIT 1;


INSERT INTO calendar_events
(user_id,title,event_type,event_date,location)

SELECT
id,
'Riya Birthday Party',
'Birthday',
'2026-07-20',
'Delhi'
FROM users
LIMIT 1;

INSERT INTO calendar_events
(user_id,title,event_type,event_date,location)

SELECT
id,
'College Placement Interview',
'Interview',
'2026-07-22',
'Noida'
FROM users
LIMIT 1;


INSERT INTO weather_context
(city,temperature,condition,forecast_date)

VALUES
(
'Delhi',
31,
'Rain',
'2026-07-18'
);


INSERT INTO products
(name,category,brand,color,price,style,image_url)

VALUES

('Olive Overshirt','Shirt','Roadster','Olive',1999,'Casual',''),

('Beige Chinos','Pants','Levis','Beige',2499,'Smart Casual',''),

('Waterproof Jacket','Jacket','Puma','Black',2799,'Outdoor',''),

('Brown Loafers','Footwear','Red Tape','Brown',2299,'Formal','');


INSERT INTO recommendations
(user_id,product_id,reason,confidence,context_type)

SELECT
u.id,
p.id,
'Complements your wardrobe and matches your upcoming birthday event.',
94,
'Calendar'
FROM users u
CROSS JOIN products p
WHERE p.name='Olive Overshirt'
LIMIT 1;

INSERT INTO notifications
(user_id,title,message,notification_type)

SELECT
id,
'Birthday Reminder',
'Your friend Riya''s birthday is in 3 days. Here are outfit and gift recommendations.',
'Calendar'
FROM users
LIMIT 1;

