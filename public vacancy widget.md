# Mr Childcare - Public Vacancy Widget Feature Specification

## Project Overview

**Project Name:** Mr Childcare - Vacancy Display System
**Owner:** Oscar (Operation Manager, Modern Education Family Childcare)
**Target Audience:** San Francisco Chinese family childcare community
**Tech Stack:** Supabase (backend/database) + Vercel (frontend hosting)

## Current State

Mr Childcare is an existing CRM and vacancy projection tool built with Supabase and Vercel. It currently helps family childcare providers:
- Manage their roster
- Project future vacancies based on enrollment trends
- Track operational data

## Problem Statement

Family childcare providers in the SF Chinese community face a common challenge:
1. They manage enrollment internally (often in spreadsheets or their CRM)
2. They need to manually update their website to show vacancy information
3. This leads to outdated information and missed enrollment opportunities
4. Families expect different availability than what's actually current

## Solution

Extend Mr Childcare to include a **Public Vacancy Widget System** that:
1. Providers update enrollment once in Mr Childcare
2. Widget automatically displays current vacancies on their public website
3. Supports bilingual display (English/Traditional Chinese)
4. Easy to embed with a simple code snippet
5. Integrates with existing CRM vacancy projection data

---

## Technical Requirements

### Phase 1: Database Schema Extensions

Review the existing Supabase schema and add/modify the following tables:

#### New Tables Needed:

**1. `providers` table** (if not exists)
```sql
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_zh TEXT, -- Traditional Chinese name
  address TEXT,
  city TEXT DEFAULT 'San Francisco',
  state TEXT DEFAULT 'CA',
  zip TEXT,
  phone TEXT,
  email TEXT,
  license_number TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_providers_user_id ON providers(user_id);
CREATE INDEX idx_providers_license ON providers(license_number);
```

**2. `locations` table** (for providers with multiple sites)
```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Richmond Location"
  name_zh TEXT,
  address TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_provider ON locations(provider_id);
```

**3. `classrooms` table**
```sql
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL, -- "Infant Room", "Toddler Class"
  name_zh TEXT, -- "嬰兒班", "幼兒班"
  age_range_min INTEGER, -- in months, e.g., 0
  age_range_max INTEGER, -- in months, e.g., 18
  age_range_text TEXT, -- "0-18 months"
  age_range_text_zh TEXT, -- "0-18個月"
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_classrooms_provider ON classrooms(provider_id);
CREATE INDEX idx_classrooms_location ON classrooms(location_id);
```

**4. `children` table** (if not exists - for enrollment tracking)
```sql
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  first_name_zh TEXT,
  last_name_zh TEXT,
  birth_date DATE,
  enrollment_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'waitlist', 'withdrawn', 'graduated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_children_provider ON children(provider_id);
CREATE INDEX idx_children_classroom ON children(classroom_id);
CREATE INDEX idx_children_status ON children(status);
```

**5. `provider_settings` table**
```sql
CREATE TABLE provider_settings (
  provider_id UUID PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  
  -- Widget display settings
  widget_enabled BOOLEAN DEFAULT false,
  show_on_website BOOLEAN DEFAULT false,
  display_language TEXT DEFAULT 'both' CHECK (display_language IN ('en', 'zh', 'both')),
  
  -- Display preferences
  show_waitlist_info BOOLEAN DEFAULT true,
  show_last_updated BOOLEAN DEFAULT true,
  custom_message TEXT,
  custom_message_zh TEXT,
  
  -- Contact settings
  show_phone BOOLEAN DEFAULT true,
  show_email BOOLEAN DEFAULT true,
  inquiry_email TEXT, -- Where inquiries should go
  
  -- Widget customization
  primary_color TEXT DEFAULT '#4F46E5', -- Hex color
  widget_style TEXT DEFAULT 'cards' CHECK (widget_style IN ('cards', 'table', 'list')),
  
  -- Analytics
  widget_views_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**6. `vacancy_snapshots` table** (for analytics and history)
```sql
CREATE TABLE vacancy_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  capacity INTEGER NOT NULL,
  enrolled INTEGER NOT NULL,
  available INTEGER NOT NULL,
  waitlist INTEGER DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshots_provider_date ON vacancy_snapshots(provider_id, snapshot_date DESC);
CREATE INDEX idx_snapshots_classroom ON vacancy_snapshots(classroom_id);
```

#### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacancy_snapshots ENABLE ROW LEVEL SECURITY;

-- Providers: Users can only manage their own provider record
CREATE POLICY "Users manage own provider"
  ON providers FOR ALL
  USING (user_id = auth.uid());

-- Locations: Providers manage their own locations
CREATE POLICY "Providers manage own locations"
  ON locations FOR ALL
  USING (provider_id IN (
    SELECT id FROM providers WHERE user_id = auth.uid()
  ));

-- Classrooms: Providers manage their own classrooms
CREATE POLICY "Providers manage own classrooms"
  ON classrooms FOR ALL
  USING (provider_id IN (
    SELECT id FROM providers WHERE user_id = auth.uid()
  ));

-- Children: Providers manage their own enrollment
CREATE POLICY "Providers manage own children"
  ON children FOR ALL
  USING (provider_id IN (
    SELECT id FROM providers WHERE user_id = auth.uid()
  ));

-- Provider Settings: Providers manage their own settings
CREATE POLICY "Providers manage own settings"
  ON provider_settings FOR ALL
  USING (provider_id IN (
    SELECT id FROM providers WHERE user_id = auth.uid()
  ));

-- PUBLIC READ POLICIES (for widget display)
-- Public can view providers who have enabled widgets
CREATE POLICY "Public view enabled providers"
  ON providers FOR SELECT
  USING (
    id IN (
      SELECT provider_id FROM provider_settings 
      WHERE widget_enabled = true AND show_on_website = true
    )
  );

-- Public can view classrooms from enabled providers
CREATE POLICY "Public view enabled classrooms"
  ON classrooms FOR SELECT
  USING (
    provider_id IN (
      SELECT provider_id FROM provider_settings 
      WHERE widget_enabled = true AND show_on_website = true
    )
  );

-- Public can view settings of enabled providers
CREATE POLICY "Public view enabled provider settings"
  ON provider_settings FOR SELECT
  USING (widget_enabled = true AND show_on_website = true);

-- Public can view active children count (for vacancy calculation)
CREATE POLICY "Public view active enrollment count"
  ON children FOR SELECT
  USING (
    status = 'active' AND
    provider_id IN (
      SELECT provider_id FROM provider_settings 
      WHERE widget_enabled = true AND show_on_website = true
    )
  );
```

#### Database Functions

**Function to calculate vacancies:**
```sql
CREATE OR REPLACE FUNCTION get_classroom_vacancies(classroom_uuid UUID)
RETURNS TABLE (
  classroom_id UUID,
  capacity INT,
  enrolled INT,
  available INT,
  waitlist INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as classroom_id,
    c.capacity,
    COALESCE(COUNT(ch.id) FILTER (WHERE ch.status = 'active'), 0)::INT as enrolled,
    GREATEST(c.capacity - COALESCE(COUNT(ch.id) FILTER (WHERE ch.status = 'active'), 0), 0)::INT as available,
    COALESCE(COUNT(ch.id) FILTER (WHERE ch.status = 'waitlist'), 0)::INT as waitlist
  FROM classrooms c
  LEFT JOIN children ch ON ch.classroom_id = c.id
  WHERE c.id = classroom_uuid
  GROUP BY c.id, c.capacity;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_provider_vacancies(provider_uuid UUID)
RETURNS TABLE (
  classroom_id UUID,
  classroom_name TEXT,
  classroom_name_zh TEXT,
  age_range_text TEXT,
  age_range_text_zh TEXT,
  capacity INT,
  enrolled INT,
  available INT,
  waitlist INT,
  location_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.name_zh,
    c.age_range_text,
    c.age_range_text_zh,
    c.capacity,
    COALESCE(COUNT(ch.id) FILTER (WHERE ch.status = 'active'), 0)::INT as enrolled,
    GREATEST(c.capacity - COALESCE(COUNT(ch.id) FILTER (WHERE ch.status = 'active'), 0), 0)::INT as available,
    COALESCE(COUNT(ch.id) FILTER (WHERE ch.status = 'waitlist'), 0)::INT as waitlist,
    l.name as location_name
  FROM classrooms c
  LEFT JOIN children ch ON ch.classroom_id = c.id
  LEFT JOIN locations l ON l.id = c.location_id
  WHERE c.provider_id = provider_uuid
  GROUP BY c.id, c.name, c.name_zh, c.age_range_text, c.age_range_text_zh, c.capacity, l.name, c.sort_order
  ORDER BY c.sort_order, c.id;
END;
$$ LANGUAGE plpgsql;
```

---

### Phase 2: API Development

Create the following API routes (Next.js API routes or Supabase Edge Functions):

#### **Route 1: GET `/api/vacancies/:providerId`**

Public endpoint to fetch vacancy data for widget display.

**Request:**
```
GET /api/vacancies/550e8400-e29b-41d4-a716-446655440000
Query params (optional):
  - lang: 'en' | 'zh' | 'both' (default: 'both')
```

**Response:**
```json
{
  "success": true,
  "provider": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Modern Education Family Childcare",
    "name_zh": "現代教育家庭幼兒園",
    "phone": "(415) 555-0123",
    "email": "info@moderneducation.com",
    "website": "https://moderneducation.com",
    "address": "123 Main St, San Francisco, CA 94112"
  },
  "settings": {
    "displayLanguage": "both",
    "showPhone": true,
    "showEmail": true,
    "showWaitlist": true,
    "customMessage": "Welcome! We offer a nurturing bilingual environment.",
    "customMessage_zh": "歡迎！我們提供充滿愛心的雙語環境。",
    "primaryColor": "#4F46E5",
    "widgetStyle": "cards"
  },
  "vacancies": [
    {
      "classroomId": "...",
      "name": "Infant Room",
      "name_zh": "嬰兒班",
      "ageRange": "0-18 months",
      "ageRange_zh": "0-18個月",
      "capacity": 4,
      "enrolled": 3,
      "available": 1,
      "waitlist": 0,
      "location": "Richmond"
    },
    {
      "classroomId": "...",
      "name": "Toddler Room",
      "name_zh": "幼兒班",
      "ageRange": "18-36 months",
      "ageRange_zh": "18-36個月",
      "capacity": 6,
      "enrolled": 6,
      "available": 0,
      "waitlist": 2,
      "location": "Richmond"
    }
  ],
  "lastUpdated": "2026-01-18T10:30:00Z"
}
```

**Error responses:**
```json
{
  "success": false,
  "error": "Provider not found or widget not enabled"
}
```

#### **Route 2: GET `/api/widget/embed-code/:providerId`**

Generate embed code for providers (authenticated).

**Response:**
```json
{
  "success": true,
  "embedCode": "<div id=\"mr-childcare-widget\" data-provider=\"550e8400...\"></div>\n<script src=\"https://mrchildcare.vercel.app/widget.js\"></script>",
  "previewUrl": "https://mrchildcare.vercel.app/preview/550e8400..."
}
```

#### **Route 3: POST `/api/settings/widget`**

Update widget settings (authenticated).

**Request:**
```json
{
  "widgetEnabled": true,
  "showOnWebsite": true,
  "displayLanguage": "both",
  "showWaitlist": true,
  "showPhone": true,
  "showEmail": true,
  "customMessage": "Welcome!",
  "customMessage_zh": "歡迎！",
  "primaryColor": "#4F46E5",
  "widgetStyle": "cards"
}
```

#### **Route 4: POST `/api/analytics/view`**

Track widget views (called by widget.js).

**Request:**
```json
{
  "providerId": "550e8400-e29b-41d4-a716-446655440000",
  "referrer": "https://moderneducation.com"
}
```

---

### Phase 3: Frontend Dashboard Components

Create the following components in the Mr Childcare admin dashboard:

#### **Component 1: Vacancy Dashboard**

**Path:** `/dashboard/vacancies`

**Features:**
- Real-time view of all classrooms with current enrollment
- Quick update buttons: +/- enrollment
- Visual indicators: 🟢 Available | 🟡 Limited | 🔴 Full | ⏸️ Waitlist
- Shows both English and Chinese labels
- Integration with existing CRM projection data (if available)

**UI Layout:**
```
┌─────────────────────────────────────────┐
│  Vacancy Overview                       │
│  Last Updated: Jan 18, 2026 10:30 AM   │
├─────────────────────────────────────────┤
│                                         │
│  Richmond Location                      │
│  ┌───────────────────────────────────┐ │
│  │ 🟢 Infant Room (嬰兒班)            │ │
│  │ 0-18 months (0-18個月)             │ │
│  │ ■■■□ 3/4 enrolled                  │ │
│  │ 1 spot available                   │ │
│  │ [−] [+] Quick Update              │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🔴 Toddler Room (幼兒班)           │ │
│  │ 18-36 months (18-36個月)           │ │
│  │ ■■■■■■ 6/6 enrolled                │ │
│  │ Waitlist: 2 families               │ │
│  │ [Manage Waitlist]                 │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

#### **Component 2: Widget Settings**

**Path:** `/dashboard/settings/widget`

**Features:**
- Toggle widget on/off
- Preview widget in real-time
- Customize appearance (colors, style)
- Set display language
- Add custom messages (bilingual)
- Configure contact display
- Generate embed code
- Copy to clipboard functionality

**UI Sections:**
1. **Enable Widget** - Toggle switch
2. **Display Settings** - Language, style, colors
3. **Custom Messages** - English & Chinese text areas
4. **Contact Settings** - Show/hide phone, email
5. **Preview** - Live preview of widget
6. **Embed Code** - Copy-paste code snippet

#### **Component 3: Widget Analytics**

**Path:** `/dashboard/analytics/widget`

**Features:**
- Total widget views
- Views over time (chart)
- Top referring websites
- View by classroom/age group interest

---

### Phase 4: Public Widget Component

Create an embeddable JavaScript widget that providers can add to their website.

#### **File: `/public/widget.js`**

**Functionality:**
1. Reads `data-provider` attribute from div
2. Fetches vacancy data from API
3. Renders styled vacancy information
4. Supports multiple display styles (cards, table, list)
5. Responsive design (mobile-friendly)
6. Bilingual display based on settings
7. Sends analytics event

**Widget Styles:**

**Style 1: Cards (default)**
```html
<div class="mc-widget-cards">
  <div class="mc-card mc-available">
    <div class="mc-badge">1 spot</div>
    <h3>Infant Room</h3>
    <p class="mc-zh">嬰兒班</p>
    <p class="mc-age">0-18 months (0-18個月)</p>
  </div>
  <div class="mc-card mc-waitlist">
    <div class="mc-badge">Waitlist</div>
    <h3>Toddler Room</h3>
    <p class="mc-zh">幼兒班</p>
    <p class="mc-age">18-36 months (18-36個月)</p>
  </div>
</div>
```

**Style 2: Table**
```html
<table class="mc-widget-table">
  <thead>
    <tr>
      <th>Age Group / 年齡組</th>
      <th>Availability / 名額</th>
    </tr>
  </thead>
  <tbody>
    <tr class="mc-available">
      <td>
        Infant Room (嬰兒班)<br>
        <small>0-18 months / 0-18個月</small>
      </td>
      <td>1 spot available</td>
    </tr>
  </tbody>
</table>
```

**Style 3: List**
```html
<ul class="mc-widget-list">
  <li class="mc-available">
    <span class="mc-icon">✓</span>
    <div>
      <strong>Infant Room (嬰兒班)</strong>
      <p>0-18 months / 0-18個月</p>
      <p class="mc-availability">1 spot available</p>
    </div>
  </li>
</ul>
```

#### **File: `/public/widget.css`**

Scoped styles with prefix `.mc-` (mr-childcare) to avoid conflicts.

**Features:**
- Clean, modern design
- Color-coded availability (green, yellow, red)
- Responsive breakpoints
- Chinese font support (Noto Sans TC)
- Customizable primary color via CSS variable
- Accessibility (ARIA labels, keyboard navigation)

---

### Phase 5: Integration with Existing CRM

**Review and integrate with existing vacancy projection tool:**

1. **Data Flow:**
   ```
   Current Enrollment → Vacancy Calculation → Public Widget
                     ↓
                Projection Model → Future Vacancies Dashboard
   ```

2. **Questions for Code Review:**
   - What tables/schema already exist for enrollment tracking?
   - Is there an existing enrollment update workflow?
   - Where is the projection model logic?
   - Can we hook into existing update triggers?

3. **Integration Points:**
   - Shared `children` or `enrollment` table
   - Trigger to update `vacancy_snapshots` on enrollment changes
   - Dashboard view combining current + projected vacancies

---

## Implementation Checklist

### Database
- [ ] Review existing schema in Supabase
- [ ] Add new tables (providers, classrooms, locations, etc.)
- [ ] Set up RLS policies
- [ ] Create database functions for vacancy calculations
- [ ] Add indexes for performance
- [ ] Create sample seed data for testing

### Backend/API
- [ ] Create `/api/vacancies/:providerId` endpoint
- [ ] Create `/api/widget/embed-code/:providerId` endpoint  
- [ ] Create `/api/settings/widget` endpoint
- [ ] Create `/api/analytics/view` endpoint
- [ ] Add authentication middleware
- [ ] Add rate limiting
- [ ] Add error handling
- [ ] Write API tests

### Frontend Dashboard
- [ ] Create Vacancy Dashboard page
- [ ] Create Widget Settings page
- [ ] Create Widget Analytics page
- [ ] Create enrollment quick-update component
- [ ] Add bilingual form inputs
- [ ] Add color picker for customization
- [ ] Add real-time preview
- [ ] Add copy-to-clipboard functionality

### Public Widget
- [ ] Create widget.js loader script
- [ ] Create widget rendering logic
- [ ] Create widget.css styles
- [ ] Implement 3 display styles (cards, table, list)
- [ ] Add responsive design
- [ ] Add bilingual support
- [ ] Add analytics tracking
- [ ] Test embed on sample websites
- [ ] Create widget documentation

### Testing
- [ ] Unit tests for API endpoints
- [ ] Integration tests for database functions
- [ ] E2E tests for dashboard workflows
- [ ] Cross-browser testing for widget
- [ ] Mobile responsive testing
- [ ] Bilingual display testing
- [ ] Performance testing (widget load time)

### Documentation
- [ ] API documentation
- [ ] Database schema documentation
- [ ] Provider setup guide (English & Chinese)
- [ ] Widget embed guide
- [ ] Troubleshooting guide
- [ ] README updates

### Deployment
- [ ] Database migrations script
- [ ] Environment variables setup
- [ ] Vercel deployment config
- [ ] CDN setup for widget.js (optional)
- [ ] Analytics setup (Plausible/GA)

---

## Success Metrics

**For Providers:**
- Time to update vacancy: < 30 seconds
- Widget setup time: < 5 minutes
- Reduction in outdated information on websites: 90%+

**For Families:**
- See real-time vacancies on provider websites
- Bilingual information access
- Better informed enrollment decisions

**For Platform:**
- 20+ SF Chinese FCC providers onboarded in first 3 months
- 80%+ widget uptime
- <2 second widget load time

---

## Technical Constraints

1. **Performance:**
   - Widget.js should be < 50KB gzipped
   - API response time < 500ms
   - Widget render time < 1 second

2. **Browser Support:**
   - Modern browsers (Chrome, Firefox, Safari, Edge)
   - Mobile browsers (iOS Safari, Chrome Mobile)
   - Graceful degradation for older browsers

3. **Accessibility:**
   - WCAG 2.1 Level AA compliance
   - Screen reader compatible
   - Keyboard navigation support

4. **Security:**
   - RLS policies prevent unauthorized data access
   - Rate limiting on public endpoints
   - Input sanitization
   - CORS properly configured

5. **Bilingual Support:**
   - UTF-8 encoding
   - Traditional Chinese character support
   - Font fallbacks for Chinese characters
   - RTL support not required (English & Chinese both LTR)

---

## Future Enhancements (Out of Scope for V1)

- [ ] SMS/Email notifications when spots open
- [ ] Waitlist management portal for families
- [ ] Integration with state licensing databases
- [ ] Multi-language support (Cantonese, Spanish)
- [ ] Mobile app version
- [ ] Advanced analytics (conversion tracking)
- [ ] Aggregated vacancy search across providers
- [ ] Direct inquiry form in widget

---

## Questions for Code Review

Please review the existing codebase and provide answers to:

1. **Existing Schema:**
   - What tables currently exist in Supabase?
   - Is there an existing enrollment/children tracking system?
   - What is the current user authentication setup?

2. **CRM Integration:**
   - Where is the vacancy projection logic?
   - What data does it currently track?
   - How often is it updated?
   - Can we reuse any existing components?

3. **Architecture:**
   - What frontend framework is being used? (Next.js, React, Vue?)
   - What styling approach? (Tailwind, CSS Modules, styled-components?)
   - Any existing component library?
   - Current folder structure?

4. **Deployment:**
   - Current Vercel project setup?
   - Environment variables in use?
   - Any existing CI/CD pipelines?

5. **Conflicts:**
   - Any naming conflicts with proposed schema?
   - Any existing routes that would conflict with new API routes?
   - Any existing components with similar functionality?

---

## Contact & Feedback

**Project Owner:** Oscar
**Target Launch:** Q1 2026
**Initial Target:** 20 SF Chinese family childcare providers

This specification should be treated as a living document. Please provide feedback on:
- Technical feasibility
- Timeline estimates
- Missing requirements
- Alternative approaches
- Integration concerns
