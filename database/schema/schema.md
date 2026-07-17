# Myntra LifeOS Database Schema

## Overview

The database is designed to support the core AI-powered personalization engine of Myntra LifeOS. Instead of storing only shopping information, it stores contextual data that helps generate proactive fashion recommendations based on the user's wardrobe, upcoming events, weather, budget, and preferences.

---

# Entity Relationship Diagram

```text
                    +----------------+
                    |     USERS      |
                    +----------------+
                    | id (PK)        |
                    | full_name      |
                    | email          |
                    | city           |
                    | state          |
                    | budget_min     |
                    | budget_max     |
                    | preferred_style|
                    +--------+-------+
                             |
        ---------------------------------------------
        |                 |               |          |
        |                 |               |          |
        ▼                 ▼               ▼          ▼

+----------------+  +----------------+  +------------------+  +----------------------+
|   WARDROBE     |  | CALENDAR_EVENTS|  | NOTIFICATIONS    |  | FASHION_PROFILE      |
+----------------+  +----------------+  +------------------+  +----------------------+
| id             |  | id             |  | id               |  | id                   |
| user_id (FK)   |  | user_id (FK)   |  | user_id (FK)     |  | user_id (FK)         |
| product_name   |  | title          |  | title            |  | dominant_style       |
| category       |  | event_type     |  | message          |  | fashion_personality  |
| color          |  | event_date     |  | type             |  | average_spend        |
| brand          |  | location       |  | is_read          |  | favorite_color       |
+----------------+  +----------------+  +------------------+  +----------------------+

                             |
                             |
                             ▼

                  +----------------------+
                  | RECOMMENDATIONS      |
                  +----------------------+
                  | id                   |
                  | user_id (FK)         |
                  | product_id (FK)      |
                  | reason               |
                  | confidence           |
                  | context_type         |
                  +----------+-----------+
                             |
                             |
                             ▼

                     +----------------+
                     |   PRODUCTS     |
                     +----------------+
                     | id             |
                     | name           |
                     | category       |
                     | brand          |
                     | color          |
                     | price          |
                     | style          |
                     | image_url      |
                     +----------------+

Weather Context is stored independently and is used while generating recommendations.

+----------------------+
| WEATHER_CONTEXT      |
+----------------------+
| id                   |
| city                 |
| temperature          |
| condition            |
| forecast_date        |
+----------------------+
```

---

# Tables

## 1. Users

Stores the user's profile and personalization preferences.

### Fields

| Column | Description |
|----------|------------|
| id | Primary Key |
| full_name | User's name |
| email | Email address |
| city | Current city |
| state | Current state |
| budget_min | Minimum preferred budget |
| budget_max | Maximum preferred budget |
| preferred_style | Fashion style |
| preferred_colors | Favorite colors |
| favorite_brands | Preferred brands |
| created_at | Record creation timestamp |

---

## 2. Wardrobe

Stores clothing items already owned by the user.

### Fields

- id
- user_id (FK → Users)
- product_name
- category
- color
- brand
- purchase_date
- last_worn
- created_at

Purpose:

Supports Wardrobe Intelligence by avoiding duplicate recommendations and suggesting complementary products.

---

## 3. Calendar Events

Stores upcoming personal events.

### Fields

- id
- user_id (FK)
- title
- event_type
- event_date
- location
- created_at

Purpose:

Supports Calendar Intelligence.

Examples:

- Birthday
- Wedding
- Interview
- Vacation
- College Fest

---

## 4. Weather Context

Stores weather information for recommendation generation.

### Fields

- id
- city
- temperature
- condition
- forecast_date

Purpose:

Supports Weather Intelligence.

---

## 5. Products

Stores product catalog information.

### Fields

- id
- name
- category
- brand
- color
- price
- style
- image_url

Purpose:

Products recommended by the AI engine.

---

## 6. Recommendations

Stores AI-generated recommendations.

### Fields

- id
- user_id (FK)
- product_id (FK)
- reason
- confidence
- context_type
- created_at

Purpose:

Stores personalized recommendations generated using multiple contextual signals.

Example Context Types:

- Weather
- Calendar
- Wardrobe
- Festival
- Budget

---

## 7. Notifications

Stores proactive notifications shown to the user.

### Fields

- id
- user_id (FK)
- title
- message
- notification_type
- is_read
- created_at

Purpose:

Supports proactive engagement by notifying users about relevant shopping opportunities.

---

## 8. Fashion Profile

Stores AI-derived user insights.

### Fields

- id
- user_id (FK)
- dominant_style
- fashion_personality
- favorite_color
- average_spend
- updated_at

Purpose:

Supports:

- Fashion Wrapped
- Fashion Blend
- Budget Intelligence
- Long-term Personalization

---

# Database Flow

User Data
↓

Wardrobe
↓

Calendar Events
↓

Weather Context
↓

AI Context Engine
↓

Recommendation Engine
↓

Notifications
↓

Frontend (Myntra LifeOS)

---

# Current MVP Coverage

The current schema supports:

- ✅ Personal Context
- ✅ Wardrobe Intelligence
- ✅ Calendar Intelligence
- ✅ Weather Intelligence
- ✅ Budget Intelligence
- ✅ Fashion Wrapped
- ✅ Fashion Blend
- ✅ Context-aware Recommendations
- ✅ Proactive Notifications

This schema is intentionally designed to be extensible, allowing additional AI models and personalization features to be integrated without major structural changes.