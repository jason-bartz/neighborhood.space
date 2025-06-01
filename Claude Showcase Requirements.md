# GNF Community Showcase & Resources Platform - Requirements

## Project Overview
A comprehensive web application for the Good Neighbors Fund (GNF) that combines a curated resource database, community-driven business showcase, and voting system. This will be a subpage of neighborhoods.space website.

## Core Features

### 1. Resource Database
**Description**: A curated collection of low-code/no-code and AI tools organized by category.

**Requirements**:
- **Categories**:
  - AI Development Tools (Cursor, Windsurf, etc.)
  - No-Code Platforms (Airtable, Notion, Webflow)
  - Form Builders (Tally.so, Typeform)
  - Website Builders (Carrd.co, Framer)
  - Backend Services (Supabase, Firebase)
  - Payment Processing (Stripe, Square)
  - Analytics & Data (Mixpanel, Segment)
  - Automation (Zapier, Make)
  - Design Tools (Figma, Canva)
  - Other/Misc

- **Tool Information**:
  - Tool name
  - Brief description (100-200 characters)
  - Detailed description (optional)
  - Category
  - Website URL
  - Pricing tier (Free, Freemium, Paid)
  - Tags (searchable)
  - Date added
  - Admin approval status

- **Features**:
  - Search functionality
  - Filter by category
  - Filter by pricing
  - Sort by date added/alphabetical
  - Admin CRUD operations

### 2. Business Idea Showcase & Voting System

**Showcase Requirements**:
- **Submission Fields**:
  - Business name
  - Founder name(s)
  - Email (verified)
  - Location (must be Western New York)
  - Business description (500 word limit)
  - Problem being solved
  - Target market
  - Revenue model
  - Funding requested
  - Logo/image upload
  - Video pitch URL (optional)
  - Social media links (optional)

- **Display Features**:
  - Grid/card layout of approved pitches
  - Search and filter capabilities
  - Category tags
  - Vote count display
  - Social sharing buttons

**Voting System**:
- **Voter Requirements**:
  - Email verification required
  - Location verification (Western NY only)
  - One vote per email per contest
  - Must opt-in to newsletter to vote
  - Prompt to share after voting

- **Voting Features**:
  - Real-time vote counting
  - Progress indicators
  - Leaderboard view (optional toggle)
  - Anonymous voting option

### 3. Contest Management

**Admin Features**:
- Approve/reject pitch submissions
- Edit pitch content
- Set contest start/end dates
- View voting analytics
- Export voter email list
- Export pitch data
- Reset contest (archive previous)
- Manage banned emails/IPs

**Contest Lifecycle**:
- Application period with countdown timer
- Review period (admin approval)
- Voting period with countdown timer
- Results announcement
- Archive and reset capability

### 4. User Authentication & Verification

**Location Verification**:
- IP-based geolocation check
- Manual ZIP code entry (14xxx range)
- Self-certification checkbox

**Email Verification**:
- Send verification code
- Confirm before allowing vote
- Store verified emails

### 5. Newsletter Integration

**Requirements**:
- Automatic opt-in when voting
- Clear consent language
- Integration with existing email service
- Unsubscribe capability
- GDPR/CAN-SPAM compliance

### 6. Social Sharing

**Share Card Features**:
- Dynamic OG meta tags
- Custom share image generation
- Pre-filled share text
- Track share analytics
- Support for Twitter, Facebook, LinkedIn

## Technical Specifications

### Frontend
- React (integrated into existing site)
- Responsive design
- Accessibility compliant (WCAG 2.1 AA)
- Progressive enhancement

### Backend/Database
- Firebase (existing infrastructure)
- Collections needed:
  - tools
  - pitches
  - votes
  - users
  - contests
  - emailList

### Security
- Rate limiting on votes
- CAPTCHA for submissions
- SQL injection prevention
- XSS protection
- CSRF tokens

## UI/UX Requirements

### Navigation
- Main tabs:
  - Showcase (default)
  - Resources
  - How-To/Learning
  - Submit Idea (CTA)

### Mobile Responsiveness
- Touch-friendly interface
- Swipe gestures for browsing
- Optimized forms
- Compressed images

### Performance
- Lazy loading for images
- Pagination for large lists
- Optimistic UI updates
- Offline capability (view only)

## Integration Points

### Existing Systems
- Firebase pitch application infrastructure
- neighborhoods.space main site
- Email service provider
- Analytics platform

### APIs Needed
- Geolocation service
- Email verification service
- Social media APIs (for sharing)
- Image storage/CDN

## Content Management

### Admin Dashboard
- Accessible at /admin route
- Role-based access control
- Activity logs
- Bulk operations

### Moderation
- Flag inappropriate content
- Review queue for pitches
- Automated spam detection
- User reporting system

## Analytics & Reporting

### Metrics to Track
- Total submissions
- Approval rate
- Vote participation
- Geographic distribution
- Tool database usage
- Newsletter signups
- Social shares

### Reports
- Contest summary
- Voter demographics
- Popular tools/categories
- Engagement trends

## Compliance & Legal

### Requirements
- Terms of Service
- Privacy Policy
- Contest rules
- Age verification (18+)
- Data retention policy

## Phase 1 MVP Features
1. Basic showcase with submission form
2. Simple voting (email verification only)
3. Admin approval workflow
4. Newsletter opt-in
5. Countdown timer
6. Basic resource database

## Phase 2 Enhancements
1. Advanced search/filtering
2. Social sharing cards
3. Location verification
4. Analytics dashboard
5. How-to content section
6. Community features (comments, likes)

## Phase 3 Future Features
1. Mobile app
2. API for third-party integration
3. Automated winner selection
4. Multi-language support
5. Advanced fraud detection
6. Pitch video hosting