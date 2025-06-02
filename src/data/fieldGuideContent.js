// fieldGuideContent.js - Data structure for the Founder's Field Guide content
// This file structures the content to make it easier to maintain and expand

// Topics and their associated emojis
export const topics = [
  { id: "ideation", name: "Ideation", emoji: "🚀" },
  { id: "business-formation", name: "Business Formation", emoji: "🏗️" },
  { id: "business-model", name: "Business Model", emoji: "💼" },
  { id: "fundraising", name: "Fundraising", emoji: "💰" },
  { id: "operations", name: "Operations", emoji: "⚙️" },
  { id: "tech-stack", name: "Tech Stack", emoji: "💻" },
  { id: "go-to-market", name: "Go-to-Market", emoji: "🎯" },
  { id: "legal", name: "Legal", emoji: "⚖️" }
];

// Helper function to create paragraphs from text
// This helps with formatting - each paragraph becomes an item in the array
// Now includes support for preserving hyperlinks from the original content
const paragraph = (text) => {
  if (!text) return [];
  return text.split('\n\n')
    .filter(p => p.trim().length > 0)
    .map(p => p.trim());
};

// Format section titles consistently
const formatSectionTitle = (number, title, emoji) => {
  return `${number}. ${title} ${emoji}`;
};

// Main sections of the field guide
export const sections = [
  {
    id: "introduction",
    title: "Founder's Field Guide: From Idea to Early Growth",
    emoji: "📘",
    topics: ["ideation", "business-formation", "fundraising", "exits"],
    content: paragraph(`Starting a business is an exciting journey that spans from the spark of an idea to building a viable, growing company. This field guide is organized into modular sections to help first-time U.S. entrepreneurs navigate each stage, with plain-language advice, frameworks, and checklists along the way.`),
  },
  {
    id: "ideation",
    title: formatSectionTitle("1", "Ideation", "🚀"),
    emoji: "🚀",
    topics: ["ideation"],
    content: paragraph(`Goal: Identify a viable business idea and validate that it solves a real problem for customers.

Identifying a Viable Business Idea
Choosing what business to start is the first critical step. Begin by looking inward and outward:

Passion and Skills: List your interests, past projects, and skills. A business that aligns with your passions can keep you motivated through tough times. Also consider your domain expertise – do you have industry knowledge or a hobby that could be monetized?

Problem Solving: Great businesses often start with solving a problem or filling a need. Ask yourself what annoying inefficiencies or gaps you notice in daily life or work. If you have experienced a pain point, others likely have too.

"Main Street" vs. Tech Ideas: A Main Street business (like a retail shop or local service) might be based on an existing model but in a new location or with a twist. A tech startup usually aims for a scalable solution with high growth potential (often leveraging software). Both are valid – just be clear on your goals. For example, opening a neighborhood bakery is different from launching the next food delivery app in terms of scale and funding needs.

Market Research: Once you have an idea, research the market. Who are the potential customers? Are there competitors already? If competitors exist, that can actually validate that a market exists – you'll just need to differentiate your offering. Use online searches, industry reports, or even Google Trends to gauge interest. The SBA suggests using Google, Amazon, and eBay to see if products/services like yours are selling, and identify what's missing that you could improve.

Tip: Don't get stuck seeking a "perfect" idea. Many successful startups evolve from a simple idea that gets refined over time. Pick an idea that interests you and addresses a clear need – then prepare to validate and refine it.`),
    subsections: [
      {
        id: "tools-frameworks",
        title: "Tools & Frameworks for Shaping Ideas",
        content: paragraph(`Rather than writing a 30-page business plan up front, use lean tools to sketch and test your idea:

Lean Canvas: A 1-page business model template that lets you capture key assumptions: problem, solution, customer segments, revenue streams, etc. Created by Ash Maurya, it's a stripped-down version of the Business Model Canvas focusing on what's most risky. Fill out a Lean Canvas to map your idea's essentials – it forces clarity and highlights what you need to validate. (Example: If your idea is a new meal-prep service, your canvas would list the customer problem (e.g. "no time to cook"), your solution, target customers (busy professionals), how you'll make money (subscription fees), etc.)

Jobs to Be Done: Think in terms of the job your customer needs done, rather than just product features. As Harvard Professor Clayton Christensen put it, customers don't simply buy a product – they "hire" it to do a job for them. For instance, a customer doesn't buy a drill because they want a drill; they buy it to get a hole in the wall. Focusing on the core job-to-be-done will help ensure your idea truly addresses what customers need. Ask yourself: What job would my product/service fulfill for the customer?

Design Thinking: This is a human-centered approach to creativity and problem solving. It follows five non-linear stages: Empathize, Define, Ideate, Prototype, Test. In practice, this means: talk to users to understand their needs (empathize), clearly define the problem, brainstorm solutions (ideate), build a quick prototype, and test it with real users for feedback. Design Thinking is especially useful if you're still figuring out which problem to solve or how best to solve it – it encourages iteration based on user feedback. As IDEO's CEO Tim Brown says, it "integrates the needs of people, the possibilities of technology, and the requirements for business success".

Use these frameworks as living documents. Revise your Lean Canvas or problem definition as you learn more. The goal is to avoid falling in love with your first idea and instead stay flexible to tweak the idea into something that really works.`)
      },
      {
        id: "market-validation",
        title: "Market Validation & Customer Discovery",
        content: paragraph(`Having an idea is great – now you need evidence that real customers want it. This phase is all about talking to customers and testing your concept quickly and cheaply:

Customer Discovery Interviews: Get out of the building and speak with potential customers (in person, phone, Zoom). Rather than pitching your idea outright, ask open-ended questions about their needs and pain points. Example: if you're building a meal-prep service, ask people how they currently handle dinner on busy weekdays, what they dislike about it, etc. Conducting 20–30 interviews will reveal patterns and help you refine your value proposition. (Steve Blank's mantra: "No plan survives first contact with customers," so make contact early!)

Landing Page Smoke Test: Create a simple one-page website describing your product/service offering and a call-to-action ("Sign up for early access" or "Pre-order now for 20% off"). You can do this before the product exists. Drive some traffic to the page (via social media or small ads budget) and see if people sign up – it's a great gauge of interest. For instance, startups often use a landing page to collect emails from interested customers even while the product is still in development. If nobody clicks or signs up, that's a signal to re-think your messaging or the idea itself.

Minimum Viable Product (MVP): Rather than building a fully polished product, create the smallest functional version of your idea that delivers value, and release it to early adopters. This could be a prototype or even a manual, Wizard-of-Oz style solution. The MVP lets you observe real user behavior. For example, Zappos founder Nick Swinmurn's MVP for an online shoe store was simply a website with photos – when people ordered, he went and bought the shoes from a store to ship to customers. This validated demand for online shoe buying before investing in inventory. The MVP approach saves you from building features no one needs.

Early Feedback and Iteration: When you do have a prototype or MVP, give it to users and gather feedback aggressively. You might even give it away for free to a handful of target customers in exchange for their honest input (especially in B2B, a pilot program can work). What do they like? Where do they get confused? This is your chance to iterate. Customer discovery is an ongoing process – even after launch you'll continue refining the product based on feedback.

Tactics for Validation: In 2025, some lean validation techniques include online surveys, collecting pre-orders (e.g. a Kickstarter campaign to see if people will put money down), or running small ad campaigns to gauge click interest. The key is to gather real-world data with minimal spend. Every bit of validation reduces risk and helps you make informed decisions.`)
      },
      {
        id: "ideation-checklist",
        title: "Checklist – Early Validation Steps",
        content: paragraph(`Have you:

- Defined your target customer and the specific problem you solve?
- Talked to at least 5–10 potential customers (in your target market) to vet the problem/need?
- Researched existing solutions or competitors?
- Created a simple landing page or brochure describing your solution?
- Obtained some signal of interest (email signups, survey responses, letters of intent)?
- Identified what the "must-have" core of your solution is (for your MVP)?

If you can check most of these off, you're on a solid path to moving forward. If not, consider looping back – better to refine the idea now than after you've sunk lots of time and money. Remember, flexibility at the ideation stage is your friend. Many startups pivot (change direction) when early validation shows a better opportunity. That's a normal part of the process in reaching a viable business idea.`)
      }
    ]
  },
  {
    id: "business-formation",
    title: formatSectionTitle("2", "Business Formation", "🏗️"),
    emoji: "🏗️",
    topics: ["business-formation", "legal"],
    content: paragraph(`Goal: Turn your idea into an official business entity and set up the legal/financial foundation correctly from the start.

Choosing a Business Structure
One of the first decisions is your business structure. In the U.S., the common structures are: Sole Proprietorship, Partnership, LLC, S-Corp, and C-Corp. The best choice depends on your situation and goals:

Sole Proprietorship: Default for a one-person business. Easiest to start (no formal registration needed aside from perhaps a local DBA name). However, you have no liability separation – business debts or lawsuits are personal debts and lawsuits. All income is personal income. This can be fine for a low-risk side business, but risky if you have significant personal assets, since you can be held personally liable for business obligations.

Partnership: Default for 2+ people starting a business together (without forming an LLC/corp). Income flows to partners' personal taxes. Like sole prop, at least one partner (in a general partnership) has personal liability. Many partnerships register as an LLP (Limited Liability Partnership) to shield partners from each other's liabilities, but LLP status is mainly used by certain professions (law firms, etc.). If you have co-founders, it's often better to form an LLC or corp to clarify ownership shares and liability.`),
    subsections: [
      {
        id: "llc-formation",
        title: "LLC (Limited Liability Company)",
        content: paragraph(`Very popular for small businesses and startups. It's a separate legal entity that protects your personal assets – your house, car, savings generally aren't at risk if the company is sued. An LLC is flexible and relatively simple: you can choose how it's taxed (by default, single-member LLCs are taxed like sole props and multi-member LLCs like partnerships – profits "pass through" to your personal tax return). There's no corporate-level tax unless you elect C-Corp taxation. This avoids the double taxation issue C-Corps face. LLCs have fewer ongoing formalities than corporations (e.g. usually no required board meetings or extensive record-keeping by law). 

When to consider LLC: You want liability protection, a simple structure, and you don't plan to seek venture capital immediately. Many "main street" businesses choose LLC. Keep in mind, if you later decide to raise VC, you might convert the LLC to a C-Corp (investors often prefer C-Corps).`)
      },
      {
        id: "c-corporation",
        title: "C-Corporation",
        content: paragraph(`A C-Corp is a classic corporation – a fully separate entity, owned by shareholders. It offers the strongest personal liability protection and is the standard for high-growth startups that plan to raise investor money. C-Corps pay their own taxes (currently a flat 21% federal tax rate). Shareholders then pay tax on any dividends, hence the "double taxation" (company profits taxed, then your dividend taxed). However, if you're not issuing dividends early on, double-taxation may not hit until you have profits. Also, qualifying small C-Corp stock can get tax exclusions on gains (Section 1202 QSBS) if held >5 years, which is a perk for startups. 

When to consider C-Corp: If you aim to raise venture capital or eventually go public, a Delaware C-Corp is the typical route – many institutional investors will require a C-Corp for funding. C-Corps also allow things like multiple classes of shares, easy equity grants to employees, etc. Downside: more paperwork (bylaws, board meetings, annual reports) and costs to maintain.`)
      },
      {
        id: "s-corporation",
        title: "S-Corporation",
        content: paragraph(`Not a separate entity type per se, but a tax election that certain corporations or LLCs can file for. An S-Corp lets you have the liability protection of a corporation but be taxed like a pass-through (no corporate tax; profits flow to owners' personal taxes). There are strict eligibility rules: e.g. <=100 shareholders, all U.S. citizens/residents, one class of stock. S-Corp can be beneficial for an owner-operated profitable business to save on self-employment taxes, but it's not used by startups seeking VC (VCs and foreign founders can't invest in S-Corps easily, and preferred stock isn't allowed). 

If you're running a small consultancy or local business making steady profits, S-Corp could lower your tax bill compared to C-Corp (avoiding double tax). But if you plan to reinvest earnings for growth (common in startups), the tax advantages shrink. Note that an LLC can elect to be taxed as an S-Corp as well, once it's making enough profit.

In summary, LLC or S-Corp is often best for small businesses focused on profitability and simplicity, whereas C-Corp is best for startups that will seek outside investment and possibly issue stock to many people. It's common to start as an LLC and later convert to C-Corp if needed. Choose what fits your near-term needs, and consult an attorney or CPA if unsure.`)
      },
      {
        id: "business-registration",
        title: "Registering Your Business (and Other Setup Steps)",
        content: paragraph(`Once you've chosen a structure, follow these steps to make it official and compliant:

Name and State Registration: Pick a unique business name. Do a search on your state's business registry to ensure it's not taken. For an LLC or corporation, you'll file formation documents (e.g. Articles of Organization for LLC, or Articles of Incorporation for Corp) with your state (usually the Secretary of State office). This officially creates the business entity. If you're a sole proprietor and want to use a business name (like "Joe's Plumbing" instead of just Joe Smith), file a DBA (Doing Business As) registration in your county or state.

Employer Identification Number (EIN): This is a federal Tax ID for your business, obtained from the IRS (free on IRS.gov). It's like a Social Security Number for your company. You'll use the EIN to open bank accounts, apply for licenses, and file taxes. Even if you have no employees, an EIN is often needed (and it lets you avoid giving out your personal SSN for business forms). Applying online takes about 10 minutes.

State/Local Tax IDs: Aside from the EIN, some states require a separate state tax registration, especially if you will collect sales tax or have employees. For example, if selling products, you may need a state sales tax permit. If hiring staff, you'll register for state unemployment insurance and withholding accounts. Check with your state's taxation department or use their online business registration portal.

Business Licenses & Permits: Make sure you have any required licenses to operate. These can vary widely by industry and location. Examples: restaurants need health department permits; an home contractor might need a specific contractor's license; many cities require a general business license to operate within city limits. Use the SBA's Business License & Permit tool or your local city/county clerk's office to see what's required. Regulated industries (healthcare, finance, childcare, etc.) have additional compliance – research early so you can budget time and cost for any certifications or inspections.`)
      }
    ]
  },
  {
    id: "early-operations",
    title: formatSectionTitle("3", "Early Operations", "⚙️"),
    emoji: "⚙️",
    topics: ["operations", "team-building"],
    content: paragraph(`Goal: Set up the day-to-day operations of running the business – people, processes, and tools – to start delivering your product or service.
    
    Building a Founding Team & Defining Roles
    Many startups begin with a team of one or a small founding team. How you divvy up responsibilities early on can shape your company's culture and efficiency:
    
    Solo Founder vs. Co-Founders: If you're a solo founder, you'll be wearing all the hats by yourself initially – product development, marketing, sales, admin. It's doable, but be ready to hustle and to seek outside help/advisors in areas you're less strong. If you have co-founders, decide who focuses on what. Typically, roles might be CEO (overall vision, fundraising, maybe marketing/sales), CTO (product development/tech if it's a tech startup), COO (operations), etc. Titles matter less than clear ownership of tasks. Clearly defining each founder's duties and focus is crucial to avoid duplication of effort or confusion.`),
    subsections: [
      {
        id: "founding-team",
        title: "Building a Founding Team & Defining Roles",
        content: paragraph(`Many startups begin with a team of one or a small founding team. How you divvy up responsibilities early on can shape your company's culture and efficiency.
        
        Solo Founder vs. Co-Founders: If you're a solo founder, you'll be wearing all the hats by yourself initially – product development, marketing, sales, admin. It's doable, but be ready to hustle and to seek outside help/advisors in areas you're less strong. If you have co-founders, decide who focuses on what.
        
        Leverage Strengths: Have an open conversation about each person's strengths, weaknesses, and interests. Perhaps one of you is great at coding, another at design and branding. Or one loves numbers (good for finance/admin) while the other loves networking (good for sales). Align roles to these strengths.
        
        Communication and Overlap: In a tiny team, you'll all be in the loop on most things. But as you grow, define a communication rhythm. Maybe a quick founders sync meeting once a week to ensure everyone knows progress and roadblocks across the board.`)
      },
      {
        id: "hr-setup",
        title: "Setting Up Payroll, Accounting & HR",
        content: paragraph(`When it comes to operations, some tasks aren't glamorous but are essential to keep the machine running and comply with laws:
        
        Payroll Setup: If you or any co-founder plan to take a salary, or you hire employees, you need a payroll system. This ensures that taxes are withheld and paid, and that you file required returns.
        
        Employee vs. Contractor: When you start getting help, decide whether the person is an employee (W-2) or independent contractor (1099). Generally, short-term or very part-time, project-based help can be contractors.
        
        Basic HR Policies: As soon as you have even one employee, get the basics in place: Have them fill out a W-4 (for tax withholding) and I-9 (work authorization) on day one – these are required.`)
      },
      {
        id: "tech-stack",
        title: "Tools and Tech Stack Recommendations",
        content: paragraph(`Running a startup efficiently often comes down to using the right tools. Here's a breakdown of a lean tech stack that can empower a small team:
        
        Communication & Collaboration: Every team needs a way to communicate and manage projects. Top picks in 2025 include Slack for team chat and Trello or Notion for project management. Slack keeps remote/hybrid teams connected and integrates with tons of other apps. Trello is a simple kanban board for tracking tasks, great for clarity without complexity.
        
        File Storage & Sharing: Use a cloud-based storage like Google Drive or Dropbox to store important documents, spreadsheets, and backups of key data. Google Workspace is very startup-friendly – you get professional email (yourname@yourcompany.com) plus Google Docs/Sheets and Drive storage.
        
        Product Development & IT: If you are a software or tech startup, consider GitHub or GitLab for version control, cloud hosting like AWS, Azure, or Google Cloud Platform, and design tools like Figma.`)
      }
    ]
  },
  {
    id: "business-model",
    title: formatSectionTitle("4", "Business Model", "💼"),
    emoji: "💼",
    topics: ["business-model", "operations"],
    content: paragraph(`Goal: Design a sustainable business model that captures value from your solution to customer problems.

Understanding Business Models
At its core, a business model explains how your company creates, delivers, and captures value. It answers fundamental questions like: What do you sell? Who buys it? How do they pay you? What costs do you incur? How do you reach customers? A good business model creates a virtuous cycle where delivering value to customers generates profit that you can reinvest to deliver even more value.

Revenue Models: How You Make Money
The way you charge customers is a critical decision that affects everything from cash flow to customer relationships:

One-Time Sales: The traditional model where customers pay once for a product/service. Simple, but requires constantly finding new customers unless you have repeat purchases. Examples: retail stores, project-based services.

Subscription: Customers pay a recurring fee (monthly/annually) for ongoing access to your product/service. Benefits include predictable revenue and customer lifetime value, though you need to focus on retention. Examples: SaaS software, streaming services, subscription boxes.

Marketplace/Platform: You connect buyers and sellers, taking a commission or fee from transactions. Requires building both sides of the marketplace and reaching critical mass. Examples: Etsy, Uber, Airbnb.

Freemium: Basic version is free, premium features cost money. Good for rapid user growth and product validation, but conversion rates to paid are typically low (often 2-5%). Examples: Dropbox, Spotify, many mobile apps.`),
    subsections: [
      {
        id: "pricing-strategy",
        title: "Pricing Strategy",
        content: paragraph(`How you price dramatically impacts both your user acquisition and profitability:

Cost-Plus: Calculate your costs, add desired margin. Simple but ignores market conditions and customer value perception. Common in manufacturing and traditional retail.

Value-Based: Charge based on the value you deliver to customers, not your costs. Often yields higher margins but requires understanding customer ROI. Example: Enterprise software priced on customer savings.

Competitive: Price relative to alternatives. Works well in established markets but might be hard in new categories. You can be premium (higher than market), economy (below market), or match competition.

Penetration: Start low to gain market share, then increase. Good for network-effect businesses, but hard to raise prices later. Examples: Many consumer apps start here.

Skimming: Start high for early adopters, then lower over time. Works for innovative products or luxury positioning. Examples: New tech gadgets often use this.

For startups, a common approach is to underprice slightly at first while learning the market, then optimize as you understand customer value perception better. Consider psychological price points like $9.99 vs $10, and test different pricing tiers to accommodate various customer segments.`)
      },
      {
        id: "unit-economics",
        title: "Unit Economics: The Building Blocks of Profitability",
        content: paragraph(`Before scaling, understand if your business makes money per customer/transaction:

Customer Acquisition Cost (CAC): All sales and marketing expenses divided by new customers gained. Includes advertising, sales salaries, commissions, etc.

Lifetime Value (LTV): The total revenue you expect from a customer before they churn. For subscription businesses: LTV = Average Monthly Revenue per User × Gross Margin % × Average Customer Lifespan (in months).

The LTV:CAC ratio is critical - aim for at least 3:1 (you make $3 for every $1 spent acquiring a customer). Lower ratios may indicate an unsustainable business; higher ratios might mean you're under-investing in growth.

Revenue per User (ARPU): Average revenue generated per customer, often measured monthly. Higher ARPU businesses can afford higher acquisition costs.

Contribution Margin: Revenue minus variable costs per unit. Shows how each sale contributes to covering fixed costs. If negative, you lose money on each sale.

Payback Period: How long it takes to recover your CAC. Ideally under 12 months for most startups – faster payback means better cash flow.

For example, if you spend $300 to acquire a customer (CAC) for a $50/month subscription with 70% gross margin, and customers stay 24 months on average:
- LTV = $50 × 70% × 24 = $840
- LTV:CAC = $840/$300 = 2.8:1 (close to the healthy 3:1 ratio)
- Payback Period = $300/($50 × 70%) = 8.6 months (healthy)`)
      },
      {
        id: "business-model-canvas",
        title: "Business Model Canvas",
        content: paragraph(`A powerful tool to visualize your entire business model on a single page is the Business Model Canvas, developed by Alexander Osterwalder. The canvas has nine components:

Customer Segments: Who are you creating value for? What are their characteristics?

Value Propositions: What bundle of products/services are you offering? What pain do you address or gain do you create?

Channels: How do you reach your customer segments? (Marketing, sales, distribution)

Customer Relationships: What type of relationship do you establish with customers? (Self-service, personal assistance, communities)

Revenue Streams: How do customers pay? What pricing mechanism?

Key Resources: What assets are required? (Physical, intellectual, human, financial)

Key Activities: What must you do to deliver your value proposition? (Production, problem-solving, platform)

Key Partnerships: Who are your suppliers and partners? What do they provide?

Cost Structure: What are your main costs? (Fixed costs, variable costs, economies of scale)

By working through each box of the canvas, you create a comprehensive view of how your business operates. This tool helps identify dependencies and inconsistencies in your model before they become problems. Many startups iterate on their canvas regularly as they learn and adjust.`)
      },
      {
        id: "business-model-fit",
        title: "Finding Business Model Fit",
        content: paragraph(`Your business model needs to align with your market, product type, and growth strategy:

Product-Led vs. Sales-Led Growth: Consider whether your user acquisition is primarily driven by the product itself (like Dropbox's referral system) or requires dedicated sales effort (common for B2B enterprise solutions).

Market Size and Customer Concentration: High-volume, low-price models work when you can reach many customers efficiently. High-touch, high-price models work for concentrated markets where each customer has significant buying power.

Capital Requirements: Consider if your model requires substantial upfront investment before generating revenue (e.g., manufacturing) or can start earning quickly with minimal capital (e.g., service businesses, software).

Switching Costs: Does your business create "lock-in" where customers would face high switching costs to leave your solution? This affects retention strategy and pricing power.

Recurring vs. One-Off Revenue: Recurring revenue models (subscriptions, SaaS) often receive higher market valuations because of their predictability, but require different operational approaches than transactional businesses.

A strong business model creates alignment between your value proposition, customer segments, revenue model, and operations. The best models have inherent competitive advantages like network effects, economies of scale, or high switching costs, making them difficult for competitors to replicate.`)
      }
    ]
  },
  {
    id: "fundraising",
    title: formatSectionTitle("5", "Fundraising", "💰"),
    emoji: "💰",
    topics: ["fundraising", "operations"],
    content: paragraph(`Goal: Understand funding options and develop a capital strategy that aligns with your business model and growth trajectory.

Funding Options Overview
Different businesses need different funding approaches. Your choice should align with your business model, growth pace, and personal goals:

Bootstrapping: Using personal savings, revenue from initial sales, and lean operations to grow without external funding. Gives maximum control and forces disciplined growth, but might limit growth speed.

Friends & Family: Early capital from personal connections, typically under $100K. Often less formal than other funding, but can strain relationships if not handled professionally.

Small Business Loans: Traditional bank loans, SBA-backed loans, or credit lines. Requires credit history, often collateral, and sometimes personal guarantees. No equity dilution but adds debt service pressure.

Grants: Non-dilutive funding from government, foundations, or corporations. Often targeted at specific industries, demographics, or research areas. Competitive application process but "free money" if awarded.

Angel Investors: Wealthy individuals who invest their own money, typically $25K-$250K in early-stage startups. Can provide valuable mentorship and connections alongside capital.

Venture Capital: Professional investors managing funds from limited partners. Typically invest in high-growth tech companies with potential for huge returns (10x+). Offer larger amounts ($500K to millions) but expect significant equity and growth focus.

Crowdfunding: Raising small amounts from many people, usually online. Reward-based (e.g., Kickstarter, pre-selling product) or equity-based (offering shares to non-accredited investors).

Revenue-Based Financing: Investors provide capital in exchange for a percentage of future revenue until they receive an agreed-upon return. No equity dilution but impacts cash flow.

Each option comes with different expectations about control, growth rate, and eventual outcomes. The right fit depends on your specific circumstances and goals.`),
    subsections: [
      {
        id: "funding-lifecycle",
        title: "The Funding Lifecycle for Startups",
        content: paragraph(`For companies pursuing external funding, the process typically follows stages:

Pre-seed: Very early funding when you have an idea but limited traction. Usually from founders themselves, friends and family, or angel investors. Typically $50K-$500K to build an MVP and find initial product-market fit.

Seed: First significant round, typically after some validation but before significant revenue. Usually from angels or seed-focused VCs. Typically $500K-$2M to refine product, establish traction metrics, and build team.

Series A: First major VC round, usually requiring substantial traction (~$1M+ ARR for SaaS companies) and a clear path to growth. Typically $3M-$15M to scale customer acquisition and build out team.

Series B and beyond: Later rounds focused on scaling a working model. Typically $10M+ for significant market expansion, entering new segments, or preparing for exit.

Each stage brings progressively larger investment amounts but also more demanding requirements in terms of traction, team, and growth metrics. The bar gets higher with each round. Between formal rounds, many startups also raise bridge financing to extend runway while working toward the next milestone.`)
      },
      {
        id: "bootstrapping",
        title: "Bootstrapping Effectively",
        content: paragraph(`Building without external funding requires disciplined financial management:

Focus on Revenue: Unlike funded startups that can prioritize user growth or market share, bootstrapped companies need revenue sooner. Prioritize paying customers and positive unit economics from day one.

Minimize Fixed Costs: Keep overhead low by using co-working spaces instead of leasing offices, hiring contractors before full-time employees, and using cloud services instead of purchasing infrastructure.

Customer Funding: Get customers to pay upfront when possible. Consider pre-sales, deposits, or annual payments (with discount) rather than monthly billing to improve cash flow.

Alternative Resources: Use startup programs offering free or discounted services (AWS credits, Google for Startups, etc.). Barter services with other startups when possible.

Gradual Scaling: Grow at the pace your cash flow allows. Validate each step before investing in the next level of growth, ensuring sustainability.

Bootstrapping requires patience but offers freedom. Many successful companies like Mailchimp, Shopify, and Basecamp started bootstrapped, giving them time to find sustainable business models without investor pressure.`)
      },
      {
        id: "preparing-investors",
        title: "Preparing for Investors",
        content: paragraph(`If you decide to pursue outside investment, prepare:

Pitch Deck: A concise presentation (10-15 slides) covering problem, solution, market size, business model, traction, team, competition, and funding ask. Keep it visual and compelling.

Financial Model: Detailed spreadsheet showing projected revenue, expenses, cash flow, and unit economics. Should demonstrate understanding of key drivers and assumptions.

Due Diligence Materials: Corporate documents, cap table, key contracts, intellectual property documentation, employee agreements. Well-organized documents indicate professionalism.

Elevator Pitch: A 30-second explanation of what your company does, for whom, and why it matters. Practice until it's natural and compelling.

Target List: Research investors who fund companies in your sector, stage, and geography. Look at their portfolios to find those who understand your market but don't have direct competitors.

Warm Introductions: Cold outreach has low success rates. Instead, use your network to get introductions to investors from founders they've backed, mutual connections, or advisors.

The fundraising process typically takes 3-6 months and is a full-time job for at least one founder. Plan accordingly and ensure you have sufficient runway.`)
      },
      {
        id: "terms-valuation",
        title: "Understanding Terms and Valuation",
        content: paragraph(`When raising money, the details matter as much as the amount:

Pre-money vs. Post-money Valuation: Pre-money is your company's value before new investment; post-money includes the new funds. If your pre-money valuation is $4M and you raise $1M, post-money is $5M. The new investors own 20% ($1M/$5M).

Equity Types: Common stock (typically held by founders/employees) vs. preferred stock (typically held by investors, with liquidation preferences and sometimes additional rights).

Liquidation Preference: Determines payout order if company is sold. "1x non-participating" means investors get their money back first or convert to common shares, whichever is better. Higher multiples (2x, 3x) or participating preferences are more investor-friendly.

Board Seats: Investors often request board representation. Consider the balance of founder vs. investor control and include independent directors when possible.

Pro-rata Rights: Allow investors to maintain their ownership percentage in future rounds by contributing additional capital.

Anti-dilution Provisions: Protect investors if future rounds are at lower valuations. "Full ratchet" is most investor-friendly; "weighted average" is more balanced.

Founder Vesting: Even founders should have vesting schedules (typically 4 years with 1-year cliff) to ensure long-term commitment and protect co-founders if someone leaves early.

First-time founders should get experienced legal counsel for fundraising. Standard documents like Y Combinator's SAFE (Simple Agreement for Future Equity) can simplify seed rounds, but Series A and beyond usually involve formal term sheets and extensive negotiation.`)
      },
      {
        id: "funding-alternatives",
        title: "Alternative Funding Sources",
        content: paragraph(`Beyond traditional equity and loans, consider:

Accelerators/Incubators: Programs like Y Combinator, Techstars, and 500 Startups offer small investment ($50K-$150K), mentorship, and cohort-based learning in exchange for equity (typically 6-8%). Provide structure and network for early-stage companies.

Corporate Venture Capital: Investment arms of large corporations (like Google Ventures, Intel Capital). Can provide strategic partnership alongside funding but may have specific interests aligned with parent company.

Revenue-Based Financing: Companies like Clearbanc, Lighter Capital offer capital repaid as percentage of monthly revenue. Good for companies with consistent revenue but not on VC-scale growth trajectory.

Venture Debt: Loans specifically for venture-backed startups, often with warrants (options to purchase equity). Generally available after raising equity, extending runway without immediate dilution.

SBIR/STTR Grants: Government programs for innovative research and development, particularly in science and technology. Non-dilutive but have specific focus areas and application requirements.

Community Development Financial Institutions (CDFIs): Mission-driven lenders focused on economic opportunity in underserved markets. May offer more flexible terms than traditional banks.

"AlleyCorp" Model: Building multiple related businesses that share resources and feed each other, using profits from earlier successes to fund new ventures.

The best funding strategy often combines multiple sources at different stages, matching each source to specific needs and growth phases.`)
      }
    ]
  },
  {
    id: "go-to-market",
    title: formatSectionTitle("6", "Go-to-Market & First Customers", "🎯"),
    emoji: "🎯",
    topics: ["go-to-market", "business-model"],
    content: paragraph(`Goal: Create and execute a strategy to find, acquire, and retain your first customers.
    
    Finding Your First Customers
    The journey from idea to paying customers can be challenging, but early customers provide not just revenue but also crucial validation and feedback.
    
    Understanding Your Target Market: Be very specific about who your ideal customer is. Create customer personas that detail not just demographics but also their pain points, goals, and buying behavior. For B2B, this includes understanding the decision-maker and purchasing process. For consumer products, it means knowing lifestyle factors and purchase triggers.`),
    subsections: [
      {
        id: "marketing-strategies",
        title: "Early-Stage Marketing Strategies",
        content: paragraph(`With limited resources, focus marketing efforts on high-ROI activities:
        
        Content Marketing: Create valuable content that addresses your target audience's questions and challenges. This establishes expertise and helps with SEO. Examples include blog posts, guides, or educational videos related to your product's value proposition.
        
        Social Media: Choose 1-2 platforms where your audience is most active rather than trying to be everywhere. Focus on creating meaningful engagement rather than just broadcasting.
        
        Community Building: Foster a community around your product or the problem it solves. This could be a Slack group, forum, or regular virtual events. Communities create organic word-of-mouth and valuable feedback loops.`)
      },
      {
        id: "sales-approaches",
        title: "Sales Approaches for New Startups",
        content: paragraph(`Your sales approach will vary based on your business model:
        
        Direct Sales: For high-value B2B products, direct outreach to potential customers is often necessary. Start with a "land and expand" strategy - get a foothold in organizations with a smaller initial deal, then grow your presence.
        
        Self-Service: For lower-priced or consumer products, focus on creating a frictionless purchasing process. Reduce steps to conversion and make it easy for customers to try your product with minimal commitment.
        
        Partnerships: Identify complementary businesses that already have relationships with your target customers. Partner programs, integrations, or co-marketing can provide access to established customer bases.`)
      }
    ]
  }
];

// Helper function to get subsection by ID
export const getSubsectionById = (sectionId, subsectionId) => {
  const section = sections.find(s => s.id === sectionId);
  if (!section || !section.subsections) return null;
  
  return section.subsections.find(ss => ss.id === subsectionId);
};

// Helper function to get section by ID
export const getSectionById = (sectionId) => {
  return sections.find(s => s.id === sectionId);
};

// Helper function to get content for specific sections or all sections
export const getContent = (sectionId = null, subsectionId = null) => {
  if (sectionId && subsectionId) {
    // Return specific subsection
    const subsection = getSubsectionById(sectionId, subsectionId);
    return subsection ? subsection.content : [];
  } else if (sectionId) {
    // Return specific section
    const section = getSectionById(sectionId);
    return section ? section.content : [];
  } else {
    // Return all content
    return sections.flatMap(section => {
      const sectionContent = [...section.content];
      
      if (section.subsections) {
        section.subsections.forEach(subsection => {
          sectionContent.push(...subsection.content.map(p => `${subsection.title}: ${p}`));
        });
      }
      
      return sectionContent;
    });
  }
};

// Search function to find content based on keywords
export const searchContent = (query) => {
  if (!query.trim()) return [];
  
  query = query.toLowerCase();
  const results = [];
  
  // Search through all sections and subsections
  sections.forEach(section => {
    const sectionMatches = section.content.some(para => 
      para.toLowerCase().includes(query)
    );
    
    const subsectionMatches = section.subsections?.some(subsection => 
      subsection.title.toLowerCase().includes(query) || 
      subsection.content.some(para => para.toLowerCase().includes(query))
    );
    
    if (section.title.toLowerCase().includes(query) || sectionMatches || subsectionMatches) {
      results.push({
        id: section.id,
        title: section.title,
        type: 'section'
      });
    }
    
    // Add matching subsections
    section.subsections?.forEach(subsection => {
      if (subsection.title.toLowerCase().includes(query) || 
          subsection.content.some(para => para.toLowerCase().includes(query))) {
        results.push({
          id: subsection.id,
          title: subsection.title,
          parentId: section.id,
          type: 'subsection'
        });
      }
    });
  });
  
  return results;
};
