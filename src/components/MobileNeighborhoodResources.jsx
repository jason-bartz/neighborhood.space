import React, { useState, useEffect, useRef, useMemo } from "react";
import "./NeighborhoodResources.css";
import Papa from "papaparse";
import "../mock-fs.js"; // Import mock filesystem

// Resource emoji mapping
const resourceEmojis = {
  "Funding": "🏦", 
  "Incubator/Accelerator": "🏭",
  "Mentorship": "🧑‍🏫",
  "Legal": "⚖️",
  "Education": "🏫",
  "Community": "🏘️",
  "Government": "🏛️",
  "Venture Capital": "💰",
  "Angel Group": "👼",
  "Coworking": "🏢",
  "Nonprofit": "🏥",
  "Corporate Venture": "🏙️",
  "Private Equity": "💵",
  "Investment Platform": "💼",
  "Venture Studio": "🏗️"
};

// Neighborhood colors
const neighborhoodColors = {
  "Ideation": "#FFD6EC", // Pastel pink
  "Early Stage": "#FFE6B3", // Pastel yellow
  "Growth": "#B3E6CC", // Pastel green
  "Established": "#B3D9FF" // Pastel blue
};

// District definitions
const districts = {
  "The Venture District": ["Venture Capital", "Angel Group", "Private Equity", "Funding", "Investment Platform"],
  "Startup Campus": ["Education", "Mentorship"],
  "Government Quarter": ["Government", "Nonprofit"],
  "Innovation Alley": ["Incubator/Accelerator", "Coworking", "Venture Studio", "Legal", "Corporate Venture"],
  "Community Center": ["Community"]
};

// Street names
const horizontalStreets = [
  "Runway Road",
  "Tres Commas Way",
  "Pitchbook Path",
  "Venture St",
  "Ship It St",
  "F&F Avenue"
];

const verticalStreets = [
  "Dilution Drive",
  "Bootstrap Blvd",
  "SPAC Street",
  "Moonshot Mile",
  "Disruption Drive",
  "Pivot Lane"
];

export default function MobileNeighborhoodResources({ onClose }) {
  const [resources, setResources] = useState([]);
  const [filteredResources, setFilteredResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState({
    stage: "",
    type: ""
  });
  const [carPositions, setCarPositions] = useState([]);
  const [hoveredResource, setHoveredResource] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const mapRef = useRef(null);
  const animationRef = useRef(null);
  const contentRef = useRef(null); // Reference to the inner content area
  const [currentTime, setCurrentTime] = useState("");
  const containerRef = useRef(null); // Reference to the main container div
  
  // Add state for map zooming and panning
  const [mapTransform, setMapTransform] = useState({
    scale: 0.5,  // More zoomed out to see all neighborhoods
    translateX: -200,  // Adjusted to center horizontally
    translateY: -50,  // Adjusted to show more of the content area
    initialDistance: 0,
    isDragging: false,
    lastX: 0,
    lastY: 0
  });
  
  // Scroll to top when component mounts
  useEffect(() => {
    // Function to ensure we scroll to the top
    const scrollToTop = () => {
      // Scroll the main container
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
      
      // Scroll the content div
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
      
      // Scroll the window
      window.scrollTo(0, 0);
    };
    
    // Execute scroll immediately
    scrollToTop();
    
    // Also execute after a short delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      scrollToTop();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Clock functionality
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setCurrentTime(`${dateStr} ${timeStr} 2002`);
    };
    
    updateClock(); // Call once immediately
    const interval = setInterval(updateClock, 60000); // Then every minute
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);
  
  useEffect(() => {
    async function loadCSV() {
      try {
        // Use the same mock filesystem as the desktop version
        if (window.fs && window.fs.readFile) {
          const response = await window.fs.readFile('Western_New_York_Entrepreneurial_Resources_with_Business_Stage.csv', { encoding: 'utf8' });
          
          Papa.parse(response, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
              if (results.data && results.data.length > 0) {
                // Make sure all rows have a business stage, defaulting to "Ideation" if missing
                const fixedData = results.data.map(item => ({
                  ...item,
                  "Business Stage": item["Business Stage"] || "Ideation"
                }));
                const processedResources = processResources(fixedData);
                setResources(processedResources);
                setFilteredResources(processedResources);
              } else {
                console.error("No data found in CSV results");
                setFallbackData();
              }
            },
            error: (error) => {
              console.error("Error parsing CSV:", error);
              setFallbackData();
            }
          });
        } else {
          console.error("Mock filesystem not available");
          setFallbackData();
        }
      } catch (error) {
        console.error("Error loading CSV:", error);
        setFallbackData();
      }
    }
    
    function setFallbackData() {
      console.warn("Using fallback data");
      // This is a much smaller fallback dataset in case the main one fails
      const sampleData = [
        {
          Resource: "43North Accelerator",
          Type: "Incubator/Accelerator",
          "Focus Area": "High-growth startups",
          "Relocation Required?": "Yes (1 year in Buffalo)",
          "Counties Served": "Global",
          URL: "https://43north.org/",
          "Expanded Details": "A globally recognized startup competition investing $1M each in 5 companies annually.",
          "Average Check Size": "NA",
          "Business Stage": "Growth"
        },
        {
          Resource: "Launch NY",
          Type: "Venture Capital",
          "Focus Area": "High-growth startups",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties",
          URL: "https://launchny.org/",
          "Expanded Details": "Seed fund and mentorship for scalable startups.",
          "Average Check Size": "Up to $100K",
          "Business Stage": "Early"
        },
        {
          Resource: "BNMC Innovation Center",
          Type: "Incubator/Accelerator",
          "Focus Area": "Health/Medtech, Technology",
          "Relocation Required?": "No",
          "Counties Served": "Erie",
          URL: "https://bnmc.org/",
          "Expanded Details": "Incubator located within Buffalo Niagara Medical Campus offering office space, networking with healthcare institutions, and business development support.",
          "Average Check Size": "NA",
          "Business Stage": "Ideation"
        },
        {
          Resource: "BOLD Ventures",
          Type: "Venture Capital",
          "Focus Area": "Underrepresented founders",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties, Rustbelt",
          URL: "https://boldventures.vc/",
          "Expanded Details": "Early-stage VC fund focused on underrepresented founders across Rust Belt cities, including Buffalo, with human-centered investing approach.",
          "Average Check Size": "$250K–$1M",
          "Business Stage": "Early"
        },
        {
          Resource: "BootSector",
          Type: "Community",
          "Focus Area": "Broad startups support",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties",
          URL: "https://joinbootsector.com/#about",
          "Expanded Details": "BootSector's mission is to empower, educate, and support the next generation of local entrepreneurs and startup leaders.",
          "Average Check Size": "NA",
          "Business Stage": "Ideation"
        },
        {
          Resource: "Buffalo Angels",
          Type: "Angel Group",
          "Focus Area": "Various sectors",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties",
          URL: "https://wnyventure.com/",
          "Expanded Details": "Angel investment network tied to the WNY Venture Association, actively funding early-stage startups and syndicating deals in Buffalo.",
          "Average Check Size": "~$50K–$250K typical syndicate",
          "Business Stage": "Early"
        },
        {
          Resource: "Canisius University Women's Business Center",
          Type: "Education",
          "Focus Area": "Women Entrepreneurs",
          "Relocation Required?": "No",
          "Counties Served": "Erie, Niagara, Cattaraugus, Chautauqua",
          URL: "https://thewomensbusinesscenter.com/",
          "Expanded Details": "SBA-funded center providing business training, counseling, networking, and resources specifically for women entrepreneurs throughout Western NY.",
          "Average Check Size": "NA",
          "Business Stage": "All"
        },
        {
          Resource: "Center for Entrepreneurial Leadership (CEL)",
          Type: "Education",
          "Focus Area": "Growth programs for small businesses",
          "Relocation Required?": "No",
          "Counties Served": "Erie",
          URL: "https://management.buffalo.edu/entrepreneurship.html",
          "Expanded Details": "Offers entrepreneurship education programs including the Core program, Minority and Women Entrepreneurs program, and High-Tech CEL for scalable startups.",
          "Average Check Size": "NA",
          "Business Stage": "Early"
        },
        {
          Resource: "Community Foundation for Greater Buffalo",
          Type: "Funding",
          "Focus Area": "Nonprofit community projects",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties",
          URL: "https://www.cfgb.org/",
          "Expanded Details": "A philanthropic foundation funding nonprofits across the region, with grants aimed at community vitality, youth development, and education.",
          "Average Check Size": "NA",
          "Business Stage": "Early"
        },
        {
          Resource: "East Hill Foundation",
          Type: "Funding",
          "Focus Area": "Nonprofit community projects",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties",
          URL: "https://easthillfdn.com/",
          "Expanded Details": "Funds nonprofits addressing human needs in Erie and Niagara Counties, offering grants typically up to $50,000.",
          "Average Check Size": "NA",
          "Business Stage": "Early"
        },
        {
          Resource: "Endeavor Western New York",
          Type: "Mentorship",
          "Focus Area": "Scaling businesses",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties",
          URL: "https://endeavor.org/",
          "Expanded Details": "Supports high-impact entrepreneurs in scaling their companies via mentorship and access to a global network.",
          "Average Check Size": "NA",
          "Business Stage": "Growth"
        },
        {
          Resource: "Excell Partners",
          Type: "Venture Capital",
          "Focus Area": "High-tech sectors",
          "Relocation Required?": "No",
          "Counties Served": "Upstate NY, Erie",
          URL: "https://excellny.com/",
          "Expanded Details": "State-supported venture fund backing university spinouts and high-tech startups across Upstate, including Buffalo-area companies.",
          "Average Check Size": "$250K–$750K",
          "Business Stage": "Early"
        },
        {
          Resource: "Foundry Buffalo",
          Type: "Community",
          "Focus Area": "Makerspace, Small Business",
          "Relocation Required?": "No",
          "Counties Served": "Erie",
          URL: "https://thefoundrybuffalo.org/",
          "Expanded Details": "Makerspace and entrepreneur hub supporting small business creation through hands-on skills and access to resources.",
          "Average Check Size": "NA",
          "Business Stage": "Ideation"
        },
        {
          Resource: "Fredonia Technology Incubator",
          Type: "Incubator/Accelerator",
          "Focus Area": "All sectors",
          "Relocation Required?": "No",
          "Counties Served": "Chautauqua",
          URL: "https://fredonia.edu/incubator",
          "Expanded Details": "A SUNY Fredonia initiative providing business incubation, co-working space, and mentorship to entrepreneurs in Chautauqua County.",
          "Average Check Size": "NA",
          "Business Stage": "Ideation"
        },
        {
          Resource: "Good Neighbor Fund",
          Type: "Funding",
          "Focus Area": "Micro-grants for under-resourced founders",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties",
          URL: "https://www.neighborhoods.space/",
          "Expanded Details": "Nonprofit micro-grant fund awarding $1,000 grants to founders from underrepresented backgrounds, emphasizing community-driven entrepreneurship. No equity taken.",
          "Average Check Size": "NA",
          "Business Stage": "Ideation"
        },
        {
          Resource: "Impellent Ventures",
          Type: "Venture Capital",
          "Focus Area": "Tech Startups",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties",
          URL: "https://impellent.vc/",
          "Expanded Details": "Early-stage VC firm focused on software, AI, healthtech, and tech-enabled services with Buffalo and Rochester ties.",
          "Average Check Size": "$100K–$2M",
          "Business Stage": "Early"
        },
        {
          Resource: "IncubatorWorks (Alfred)",
          Type: "Incubator/Accelerator",
          "Focus Area": "All sectors",
          "Relocation Required?": "No",
          "Counties Served": "Allegany",
          URL: "https://incubatorworks.org/",
          "Expanded Details": "IncubatorWorks focuses on serving rural entrepreneurs with mentoring, coworking space, and startup support programs in Allegany County.",
          "Average Check Size": "NA",
          "Business Stage": "Ideation"
        },
        {
          Resource: "Insyte Consulting",
          Type: "Education",
          "Focus Area": "Manufacturing",
          "Relocation Required?": "No",
          "Counties Served": "Erie, Niagara, Allegany, Cattaraugus, Chautauqua",
          URL: "https://insyte-consulting.com/",
          "Expanded Details": "Manufacturing Extension Partnership center providing consulting services to manufacturers on growth, operational excellence, and innovation.",
          "Average Check Size": "NA",
          "Business Stage": "Established"
        },
        {
          Resource: "Lakelet Capital",
          Type: "Private Investment Office",
          "Focus Area": "Growth-stage businesses",
          "Relocation Required?": "No",
          "Counties Served": "Global",
          URL: "https://lakeletcapital.com/",
          "Expanded Details": "Buffalo-based family investment office funding growth-stage companies with EBITDA between $1M–$10M across manufacturing, services, and distribution.",
          "Average Check Size": "Strategic (not disclosed)",
          "Business Stage": "Growth"
        },
        {
          Resource: "Launch NY",
          Type: "Venture Capital",
          "Focus Area": "High-growth startups",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties",
          URL: "https://launchny.org/",
          "Expanded Details": "Launch NY offers free mentoring via Entrepreneurs-in-Residence and operates New York State's most active nonprofit seed fund, focused on high-growth, scalable ventures across Upstate NY.",
          "Average Check Size": "NA",
          "Business Stage": "Ideation"
        },
        {
          Resource: "Lorraine Capital",
          Type: "Private Investment Office",
          "Focus Area": "Growth-stage businesses",
          "Relocation Required?": "No",
          "Counties Served": "Global",
          URL: "https://lorrainecap.com/",
          "Expanded Details": "Private investment firm backing mature businesses in Buffalo and Upstate NY through management buyouts and growth capital.",
          "Average Check Size": "$2M–$10M",
          "Business Stage": "Growth"
        },
        {
          Resource: "Moog Venture Initiatives",
          Type: "Corporate Venture",
          "Focus Area": "Autonomy, Robotics",
          "Relocation Required?": "No",
          "Counties Served": "Global",
          URL: "https://www.moog.com/",
          "Expanded Details": "Strategic venture investment arm of Moog, focused on autonomous systems, robotics, and advanced tech startups complementing Moog's aerospace businesses.",
          "Average Check Size": "Strategic (not disclosed)",
          "Business Stage": "Established"
        },
        {
          Resource: "New York Ventures (ESD)",
          Type: "Government",
          "Focus Area": "Technology, Innovation",
          "Relocation Required?": "No",
          "Counties Served": "New York State",
          URL: "https://esd.ny.gov/",
          "Expanded Details": "State-run venture capital fund supporting commercialization of innovation in NY, including seed and Series A rounds for Buffalo startups.",
          "Average Check Size": "$500K–$2M",
          "Business Stage": "Early"
        },
        {
          Resource: "NextCorps",
          Type: "Incubator/Accelerator",
          "Focus Area": "Technology startups",
          "Relocation Required?": "No",
          "Counties Served": "Monroe, Finger Lakes",
          URL: "https://nextcorps.org/",
          "Expanded Details": "Startup incubator and accelerator supporting technology-driven companies with mentoring and programming.",
          "Average Check Size": "NA",
          "Business Stage": "Early"
        },
        {
          Resource: "Olean Business Incubator",
          Type: "Incubator/Accelerator",
          "Focus Area": "All sectors",
          "Relocation Required?": "No",
          "Counties Served": "Cattaraugus",
          URL: "https://sbu.edu/oleanbusinessincubator",
          "Expanded Details": "Incubator supporting small businesses and startups in Cattaraugus County, affiliated with St. Bonaventure University.",
          "Average Check Size": "NA",
          "Business Stage": "Early"
        },
        {
          Resource: "Radial Ventures (43North Foundation Studio)",
          Type: "Venture Studio",
          "Focus Area": "New startups/tech",
          "Relocation Required?": "No",
          "Counties Served": "Erie",
          URL: "https://www.radialventures.com/",
          "Expanded Details": "Buffalo's first venture studio backed by 43North Foundation, co-founding tech startups and providing operational support and early funding.",
          "Average Check Size": "NA",
          "Business Stage": "Ideation"
        },
        {
          Resource: "Rand Capital",
          Type: "Venture Capital",
          "Focus Area": "Growth capital for startups",
          "Relocation Required?": "No",
          "Counties Served": "Erie",
          URL: "https://www.randcapital.com/",
          "Expanded Details": "Publicly traded BDC investing in growth-stage private companies, often providing expansion capital or venture debt in Buffalo.",
          "Average Check Size": "$500K–$2M",
          "Business Stage": "Established"
        },
        {
          Resource: "Rich Products Ventures",
          Type: "Corporate Venture",
          "Focus Area": "Food tech, Sustainability",
          "Relocation Required?": "No",
          "Counties Served": "Global",
          URL: "https://www.richproductsventures.com/",
          "Expanded Details": "Corporate VC arm of Rich Products, investing in food tech, plant-based innovation, and future of food companies globally.",
          "Average Check Size": "$500K–$2M",
          "Business Stage": "Established"
        },
        {
          Resource: "Rochester Angel Network",
          Type: "Angel Group",
          "Focus Area": "Various sectors",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties",
          URL: "https://rochesterangels.com/",
          "Expanded Details": "Greater Rochester-area angel group investing in Upstate NY seed-stage companies, often co-investing with Buffalo Angels in deals.",
          "Average Check Size": "~$50K–$150K",
          "Business Stage": "Early"
        },
        {
          Resource: "S2 Venture Partners",
          Type: "Angel Group",
          "Focus Area": "Local startups (general)",
          "Relocation Required?": "No",
          "Counties Served": "Erie",
          URL: "https://s2venturepartners.com/",
          "Expanded Details": "Buffalo-based early-stage investment group pooling local executives and investors to back high-potential startups.",
          "Average Check Size": "~$100K–$500K pooled",
          "Business Stage": "Early"
        },
        {
          Resource: "SCORE Buffalo–Niagara Chapter",
          Type: "Mentorship",
          "Focus Area": "Free expert business mentoring, workshops and tools for entrepreneurs at all stages",
          "Relocation Required?": "No",
          "Counties Served": "Erie, Niagara",
          URL: "https://www.score.org/buffaloniagara",
          "Expanded Details": "SCORE is a national nonprofit (SBA partner) whose Buffalo–Niagara chapter connects entrepreneurs with volunteer mentors and workshop programs. Mentors advise on business planning, marketing, finance and more. Services include free one-on-one advice (in-person or virtual) and educational events. As SBA notes, SCORE is 'the nation's largest network of volunteer, expert business mentors' dedicated to helping small businesses start and grow.",
          "Average Check Size": "N/A (no funding; advisory only)",
          "Business Stage": "All"
        },
        {
          Resource: "Small Business Development Centers (SBDCs)",
          Type: "Education",
          "Focus Area": "Small business counseling",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties",
          URL: "https://nysbdc.org/",
          "Expanded Details": "Free 1:1 counseling, business planning assistance, and technical training for entrepreneurs across all industries and stages.",
          "Average Check Size": "NA",
          "Business Stage": "Ideation"
        },
        {
          Resource: "Start-Up NY",
          Type: "Government",
          "Focus Area": "Tax incentives for businessesYes - locate near universities",
          "Relocation Required?": "No",
          "Counties Served": "New York State",
          URL: "https://esd.ny.gov/startup-ny-program",
          "Expanded Details": "Program offering tax-based incentives to businesses that locate or expand near New York State colleges and universities.",
          "Average Check Size": "NA",
          "Business Stage": "Early"
        },
        {
          Resource: "Startup Grind: Rochester",
          Type: "Community",
          "Focus Area": "Broad startups support",
          "Relocation Required?": "No",
          "Counties Served": "Genesee Valley",
          URL: "https://www.startupgrind.com/rochester/",
          "Expanded Details": "Startup Grind is a global startup community, actively educating, inspiring and connecting 3.5 million entrepreneurs in more than 525 cities. Founded in Silicon Valley, we nurture startup ecosystems in 125 countries through local and international events and partnerships with organizations like Google for Startups, AWS and Global Silicon Valley.",
          "Average Check Size": "NA",
          "Business Stage": "Ideation"
        },
        {
          Resource: "Stella Foundation",
          Type: "Funding",
          "Focus Area": "Women-led startups",
          "Relocation Required?": "No",
          "Counties Served": "National",
          URL: "https://stella.co/",
          "Expanded Details": "Stella Foundation is a national nonprofit dedicated to closing the funding gap for women entrepreneurs by providing capital, mentorship, and a robust support network from ideation to exit. Founded in 2012 by Dr. Silvia Mah, Stella has helped over 500 female founders raise more than $100 million, with a strong emphasis on supporting BIPOC, LGBTQ+, veteran, and mompreneur communities.​",
          "Average Check Size": "NA",
          "Business Stage": "All"
        },
        {
          Resource: "Summer Street Capital",
          Type: "Private Investment Office",
          "Focus Area": "Growth-stage businesses",
          "Relocation Required?": "No",
          "Counties Served": "Global",
          URL: "https://summerstreetcapital.com/",
          "Expanded Details": "Buffalo-based private equity firm investing in lower middle-market companies across environmental services, manufacturing, and business services.",
          "Average Check Size": "$2M–$10M",
          "Business Stage": "Growth"
        },
        {
          Resource: "SUNY Jamestown Community College – The Hatch",
          Type: "Accelerator/Incubator",
          "Focus Area": "Entrepreneurial incubator space, mentoring, workshops and networking for new and existing businesses",
          "Relocation Required?": "Yes (entrepreneurs work onsite at JCC's Cattaraugus County campus)",
          "Counties Served": "Cattaraugus",
          URL: "https://www.sunyjcc.edu/workforce/hatch",
          "Expanded Details": "The Hatch provides office/incubator space and amenities on JCC's Olean campus. It 'fills a gap' in the local entrepreneurial ecosystem by offering access to mentors, classes and networking in a 'nest' environment for startups. Clients have 24/7 access to a professional setting (classrooms, conference rooms, manufacturing labs, a commercial kitchen, etc.) and attend Hatch-run training on finance, legal, marketing and business operations. Dedicated staff and volunteers advise on business plans and connections.",
          "Average Check Size": "N/A (no investment; incubator support only)",
          "Business Stage": "Ideation"
        },
        {
          Resource: "The Exchange at Beverly Gray",
          Type: "Incubator/Accelerator",
          "Focus Area": "BIPOC Entrepreneurs",
          "Relocation Required?": "No",
          "Counties Served": "Erie",
          URL: "https://www.theexchangeatbeverlygray.org/",
          "Expanded Details": "Buffalo East Side hub for BIPOC entrepreneurs, offering coworking, business workshops, and UB partnership support. Named after civic leader Beverly Gray.",
          "Average Check Size": "NA",
          "Business Stage": "Early"
        },
        {
          Resource: "UB Cultivator",
          Type: "Incubator/Accelerator",
          "Focus Area": "High-growth startups",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties",
          URL: "https://www.buffalo.edu/partnerships/about/programs/ub-cultivator.html",
          "Expanded Details": "Pre-seed program affiliated with UB, offering up to $100K investment and structured mentorship to help early founders validate markets and prepare for funding.",
          "Average Check Size": "NA",
          "Business Stage": "Ideation"
        },
        {
          Resource: "UB Entrepreneurship Law Center",
          Type: "Legal",
          "Focus Area": "Startup legal support",
          "Relocation Required?": "No",
          "Counties Served": "Erie",
          URL: "https://www.buffalo.edu/partnerships/about/programs/e-law.html",
          "Expanded Details": "Provides free legal services to startups and entrepreneurs, particularly UB-affiliated and minority-owned businesses, with help on IP, formation, and contracts.",
          "Average Check Size": "NA",
          "Business Stage": "Early"
        },
        {
          Resource: "UB Incubators (CBLS, Baird, Downtown)",
          Type: "Incubator/Accelerator",
          "Focus Area": "Tech startups, Life Sciences",
          "Relocation Required?": "No",
          "Counties Served": "Erie",
          URL: "https://www.buffalo.edu/partnerships/business/incubators.html",
          "Expanded Details": "Affordable incubator space, wet labs, and business support services for startups, with proximity to university talent and facilities.",
          "Average Check Size": "NA",
          "Business Stage": "Early"
        },
        {
          Resource: "UB Startup and Innovation Collaboratory",
          Type: "Education",
          "Focus Area": "Student entrepreneurs",
          "Relocation Required?": "No",
          "Counties Served": "Erie",
          URL: "https://www.buffalo.edu/entrepreneurship.html",
          "Expanded Details": "The CoLab is a campus-based entrepreneurship and innovation center that empowers students to realize solutions for the global and local challenges of our time. Part startup incubator and part idea-sharing center, it connects students to mentors, events, funding and experiences that cultivate the skills and mindset to build successful companies or innovate competitively in careers within any organization.",
          "Average Check Size": "NA",
          "Business Stage": "Ideation"
        },
        {
          Resource: "Varia Ventures",
          Type: "Venture Capital",
          "Focus Area": "Healthcare/Life Sciences",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties",
          URL: "https://variaventures.com/",
          "Expanded Details": "Online co-investment platform leveraging physician and industry expert networks to fund healthcare and life science startups.",
          "Average Check Size": "$100K–$500K",
          "Business Stage": "Early"
        },
        {
          Resource: "Western New York Impact Investment Fund",
          Type: "Venture Capital",
          "Focus Area": "Double Bottom Line (social impact + profits)",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties",
          URL: "https://wnyimpact.com/",
          "Expanded Details": "Impact-oriented VC fund investing in WNY businesses that generate economic and social returns, with job creation focus.",
          "Average Check Size": "$250K–$1M",
          "Business Stage": "Early"
        },
        {
          Resource: "Western New York Incubator Network (WIN)",
          Type: "Incubator/Accelerator",
          "Focus Area": "Broad startups support",
          "Relocation Required?": "No",
          "Counties Served": "Erie, Niagara, Allegany, Cattaraugus, Chautauqua",
          URL: "https://wnyincubators.com/",
          "Expanded Details": "A consortium of incubators sharing best practices, space, mentoring, and financial resource connections across five counties.",
          "Average Check Size": "NA",
          "Business Stage": "Early"
        },
        {
          Resource: "Westminster Economic Development Initiative (WEDI)",
          Type: "Incubator/Accelerator",
          "Focus Area": "Underserved Entrepreneurs",
          "Relocation Required?": "No",
          "Counties Served": "Erie",
          URL: "https://www.wedibuffalo.org/",
          "Expanded Details": "The Westminster Economic Development Initiative (WEDI) is a Buffalo-based nonprofit and certified Community Development Financial Institution (CDFI) that empowers underserved entrepreneurs—including immigrants, refugees, and low-income residents—through a comprehensive suite of services. These include microloans, business education, technical assistance, and incubation opportunities, all designed to foster economic equity and community revitalization.​",
          "Average Check Size": "$5K–25K (loans)",
          "Business Stage": "All"
        },
        {
          Resource: "StartFast Ventures",
          Type: "Venture Capital",
          "Focus Area": "B2B SaaS",
          "Relocation Required?": "No",
          "Counties Served": "Global",
          URL: "https://startfastventures.com/",
          "Expanded Details": "StartFast is optimized to address challenges faced by startups outside major VC hubs through: faster investment decision making, access to trusted coinvestors, extensive network of mentors/subject matter experts, and referrals to strategic partners and later stage investors.",
          "Average Check Size": "$500K-$2MM",
          "Business Stage": "Early"
        },
        {
          Resource: "Upstate Venture Connect (UVC)",
          Type: "Community",
          "Focus Area": "Networking, mentorship, and strategic referrals for high‑growth startups in Upstate New York",
          "Relocation Required?": "No",
          "Counties Served": "Upstate New York",
          URL: "https://uvc.org/",
          "Expanded Details": "Since 2010, UVC has connected and empowered Upstate NY founders via its Founder Network (high‑value introductions), Founder Fusion curated events, the UNY50 leadership circle, and the annual Unleashed retreat—generating thousands of mentor/advisor/capital referrals to help companies scale.",
          "Average Check Size": "NA",
          "Business Stage": "All"
        },
        {
          Resource: "WNY Prosperity Fellowship",
          Type: "Mentorship",
          "Focus Area": "Student entrepreneurs",
          "Relocation Required?": "No",
          "Counties Served": "All 8 counties",
          URL: "https://www.buffalo.edu/entrepreneurship/programs/wny-prosperity.html",
          "Expanded Details": "Supports UB students creating ventures that contribute to WNY's economy with scholarship, professional development, and internships.",
          "Average Check Size": "NA",
          "Business Stage": "Ideation"
        }
      ];
      
      const processedResources = processResources(sampleData);
      setResources(processedResources);
      setFilteredResources(processedResources);
    }
    
    // Call loadCSV to fetch data
    loadCSV();
  }, []);

  const FIXED_TREES = [
    { key: "tree-1", x: 250, y: 120, type: "🌲" },
    { key: "tree-2", x: 450, y: 220, type: "🌳" },
    { key: "tree-3", x: 650, y: 80, type: "🌲" },
    { key: "tree-4", x: 850, y: 180, type: "🌳" },
    { key: "tree-5", x: 1050, y: 120, type: "🌲" },
    { key: "tree-6", x: 1250, y: 220, type: "🌳" },
    { key: "tree-7", x: 1450, y: 180, type: "🌲" },
    
    { key: "tree-8", x: 200, y: 380, type: "🌳" },
    { key: "tree-9", x: 400, y: 420, type: "🌲" },
    { key: "tree-10", x: 600, y: 350, type: "🌳" },
    { key: "tree-11", x: 800, y: 420, type: "🌲" },
    { key: "tree-12", x: 1000, y: 350, type: "🌳" },
    { key: "tree-13", x: 1200, y: 420, type: "🌲" },
    { key: "tree-14", x: 1400, y: 380, type: "🌳" },
    
    { key: "tree-15", x: 150, y: 650, type: "🌲" },
    { key: "tree-16", x: 350, y: 580, type: "🌳" },
    { key: "tree-17", x: 550, y: 650, type: "🌲" },
    { key: "tree-18", x: 750, y: 580, type: "🌳" },
    { key: "tree-19", x: 950, y: 650, type: "🌲" },
    { key: "tree-20", x: 1150, y: 580, type: "🌳" },
    { key: "tree-21", x: 1350, y: 650, type: "🌲" },
    
    { key: "tree-22", x: 300, y: 980, type: "🌳" },
    { key: "tree-23", x: 500, y: 880, type: "🌲" },
    { key: "tree-24", x: 700, y: 980, type: "🌳" },
    { key: "tree-25", x: 900, y: 880, type: "🌲" },
    { key: "tree-26", x: 1100, y: 980, type: "🌳" },
    { key: "tree-27", x: 1300, y: 880, type: "🌲" },
    { key: "tree-28", x: 1500, y: 980, type: "🌳" },
  ];

  // Process the resources and position them on the map
  const processResources = (rawResources) => {
    // Create grid for resource placement to prevent overlaps
    const gridSize = 70; // Minimum distance between resources
    const occupiedCells = {};
    
    // First group resources by district and stage
    const resourcesByDistrictAndStage = {};
    
    // Process the district rename mapping
    const oldToNewDistrictMap = {
      "Capital District": "The Venture District",
      "Education District": "Startup Campus",
      "Government District": "Government Quarter",
      "Innovation District": "Innovation Alley",
      "Professional District": "Innovation Alley",
      "Community District": "Town Square"
    };
    
    rawResources.forEach(resource => {
      const businessStage = resource["Business Stage"] || "Ideation";
      const resourceType = resource["Type"] || "Other";
      
      // Special case for specific resources that should be in Town Square
      if (resource.Resource === "BootSector" || 
          resource.Resource === "Foundry Buffalo" || 
          resource.Resource === "Startup Grind: Rochester") {
        
        let district = "Town Square";
        
        // Initialize district and stage if needed
        if (!resourcesByDistrictAndStage[district]) {
          resourcesByDistrictAndStage[district] = {};
        }
        if (!resourcesByDistrictAndStage[district][businessStage]) {
          resourcesByDistrictAndStage[district][businessStage] = [];
        }
        
        // Add to group
        resourcesByDistrictAndStage[district][businessStage].push({
          ...resource,
          businessStage,
          resourceType,
          district,
          emoji: resourceEmojis[resourceType] || "🏢"
        });
        return; // Skip the normal district assignment
      }
      
      // Determine district
      let district = "Other";
      for (const [districtName, types] of Object.entries(districts)) {
        if (types.includes(resourceType)) {
          district = districtName;
          break;
        }
      }
      
      // Initialize district and stage if needed
      if (!resourcesByDistrictAndStage[district]) {
        resourcesByDistrictAndStage[district] = {};
      }
      if (!resourcesByDistrictAndStage[district][businessStage]) {
        resourcesByDistrictAndStage[district][businessStage] = [];
      }
      
      // Add to group
      resourcesByDistrictAndStage[district][businessStage].push({
        ...resource,
        businessStage,
        resourceType,
        district,
        emoji: resourceEmojis[resourceType] || "🏢"
      });
    });
    
    // Process each district and stage to position resources
    const positionedResources = [];
    const mapWidth = 1600;
    const mapHeight = 1200;
    
    // Define neighborhood y-positions
    const neighborhoodYPositions = {
      "Ideation": { start: mapHeight * 0.75, end: mapHeight * 0.95, streetY: mapHeight * 0.85 },
      "Early Stage": { start: mapHeight * 0.5, end: mapHeight * 0.75, streetY: mapHeight * 0.6 },
      "Growth": { start: mapHeight * 0.25, end: mapHeight * 0.5, streetY: mapHeight * 0.35 },
      "Established": { start: 0, end: mapHeight * 0.25, streetY: mapHeight * 0.15 }
    };
    
    // Define district x-positions - now with our updated district names
    const districtsList = ["The Venture District", "Startup Campus", "Government Quarter", "Innovation Alley", "Town Square"];
    const districtWidth = mapWidth / districtsList.length;
    
    Object.entries(resourcesByDistrictAndStage).forEach(([district, stageResources], districtIndex) => {
      // Calculate district position
      const districtPos = districtsList.indexOf(district);
      const districtX = (districtPos >= 0) ? districtPos * districtWidth + districtWidth/2 : (districtIndex % districtsList.length) * districtWidth + districtWidth/2;
      
      Object.entries(stageResources).forEach(([stage, resources]) => {
        // Normalize stage name to match our neighborhoods
        const normalizedStage = stage.trim().toLowerCase();
        let neighborhoodKey = "Ideation"; // Default
        
        if (normalizedStage.includes("ideation")) neighborhoodKey = "Ideation";
        else if (normalizedStage.includes("early")) neighborhoodKey = "Early Stage";
        else if (normalizedStage.includes("growth")) neighborhoodKey = "Growth";
        else if (normalizedStage.includes("established")) neighborhoodKey = "Established";
        
        const streetY = neighborhoodYPositions[neighborhoodKey].streetY;
        
        // Position resources along the street in this district and stage
        resources.forEach((resource, resourceIndex) => {
          // Calculate row and column for positioning (3 items per row)
          const row = Math.floor(resourceIndex / 3);
          const col = resourceIndex % 3 - 1; // -1, 0, 1 for left, center, right
          
          // Calculate offsets
          const offsetX = col * gridSize;
          const offsetY = row * gridSize * 0.6; // Smaller vertical spread
          
          // Calculate base position along street
          const xPos = districtX + offsetX;
          const yPos = streetY + offsetY - 25; // Move up slightly to avoid covering street names
          
          // Generate a cell key for tracking occupied positions
          const cellX = Math.floor(xPos / gridSize);
          const cellY = Math.floor(yPos / gridSize);
          const cellKey = `${cellX},${cellY}`;
          
          // Find an unoccupied cell nearby
          let finalX = xPos;
          let finalY = yPos;
          let finalCellKey = cellKey;
          let attempts = 0;
          
          while (occupiedCells[finalCellKey] && attempts < 10) {
            // Try slightly different positions to avoid overlaps
            const direction = attempts % 4;
            const distance = Math.floor(attempts / 4) + 1;
            
            switch (direction) {
              case 0: finalX = xPos + (gridSize * distance); break;
              case 1: finalY = yPos + (gridSize * distance); break;
              case 2: finalX = xPos - (gridSize * distance); break;
              case 3: finalY = yPos - (gridSize * distance); break;
            }
            
            // Ensure we stay within district and neighborhood bounds
            finalX = Math.max(districtX - districtWidth/2 + 50, Math.min(districtX + districtWidth/2 - 50, finalX));
            finalY = Math.max(neighborhoodYPositions[neighborhoodKey].start + 30, 
                       Math.min(neighborhoodYPositions[neighborhoodKey].end - 30, finalY));
            
            // Update cell key
            const newCellX = Math.floor(finalX / gridSize);
            const newCellY = Math.floor(finalY / gridSize);
            finalCellKey = `${newCellX},${newCellY}`;
            
            attempts++;
          }
          
          // Mark this cell as occupied
          occupiedCells[finalCellKey] = true;
          
          // Add to positioned resources
          positionedResources.push({
            id: positionedResources.length,
            ...resource,
            x: finalX,
            y: finalY,
            positioned: true
          });
        });
      });
    });
    
    return positionedResources;
  };

  // Filter resources when filters or search term changes
  useEffect(() => {
    if (!resources.length) return;
    
    let filtered = resources;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(resource => 
        resource.Resource?.toLowerCase().includes(term) ||
        resource.resourceType?.toLowerCase().includes(term) ||
        resource["Focus Area"]?.toLowerCase().includes(term)
      );
    }
    
    // Apply stage filter
    if (filter.stage) {
      filtered = filtered.filter(resource => 
        resource.businessStage === filter.stage
      );
    }
    
    // Apply type filter
    if (filter.type) {
      filtered = filtered.filter(resource => 
        resource.resourceType === filter.type
      );
    }
    
    setFilteredResources(filtered);
  }, [resources, searchTerm, filter]);

  // Animation for cars
  useEffect(() => {
    // Create car animations only once
    const initCars = () => {
      const cars = [];
      // Add more car types
      const carEmojis = {
        car: ["🚗", "🚙", "🚕"],
        special: ["🚓", "🚌"] // Police car and bus
      };
      
      // Create 7 cars instead of 5 (adding 2 more)
      for (let i = 0; i < 7; i++) {
        // Randomly choose horizontal or vertical street
        const isHorizontal = Math.random() > 0.5;
        
        // Determine car type - make sure police car and bus appear at least once
        let carType;
        if (i < 2) {
          // First two cars are special vehicles (police, bus)
          carType = carEmojis.special[i % carEmojis.special.length];
        } else {
          // Regular cars for the rest
          const randomIndex = Math.floor(Math.random() * carEmojis.car.length);
          carType = carEmojis.car[randomIndex];
        }
        
        if (isHorizontal) {
          // Pick a random horizontal street
          const streetIndex = Math.floor(Math.random() * horizontalStreets.length);
          const y = 1200 * (0.125 + streetIndex * 0.15); // Position along one of the horizontal streets
          
          cars.push({
            id: `car-h-${i}`,
            emoji: carType,
            x: 1600, // Start from right side
            y,
            direction: "left",
            speed: 1 + Math.random() * 2
          });
        } else {
          // Pick a random vertical street
          const streetIndex = Math.floor(Math.random() * verticalStreets.length);
          const x = 1600 * ((1 + streetIndex) / (verticalStreets.length + 1));
          
          cars.push({
            id: `car-v-${i}`,
            emoji: carType,
            x,
            y: 0,
            direction: "down",
            speed: 1 + Math.random() * 2
          });
        }
      }
      return cars;
    };
    
    // Only set initial car positions if not already set
    if (carPositions.length === 0) {
      setCarPositions(initCars());
    }
    
    // Only start animation loop if we have cars
    if (carPositions.length > 0) {
      // Start animation loop at a more reasonable frame rate (60fps → 15fps)
      let lastTime = 0;
      const animate = (timestamp) => {
        if (timestamp - lastTime > 66) { // ~15fps
          lastTime = timestamp;
          setCarPositions(prevCars => {
            return prevCars.map(car => {
              let { x, y, direction, speed } = car;
              
              // Move car
              switch (direction) {
                case "left": 
                  x -= speed;
                  if (x < 0) x = 1600; // Loop back to right side
                  break;
                case "down":
                  y += speed;
                  if (y > 1200) y = 0; // Loop back to top
                  break;
                default:
                  break;
              }
              
              return { ...car, x, y };
            });
          });
        }
        
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }
    
    // Cleanup animation
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [carPositions.length, horizontalStreets.length, verticalStreets.length]);

  // Generate unique stages and types for filters
  const getUniqueValues = (field) => {
    if (!resources.length) return [];
    
    const values = new Set();
    
    if (field === "stage") {
      resources.forEach(resource => {
        if (resource.businessStage) values.add(resource.businessStage);
      });
    } else if (field === "type") {
      resources.forEach(resource => {
        if (resource.resourceType) values.add(resource.resourceType);
      });
    }
    
    return [...values].sort();
  };

  const handleResourceClick = (resource, e) => {
    if (e) e.stopPropagation();
    setSelectedResource(resource);
  };

  const handleCloseModal = () => {
    setSelectedResource(null);
  };

  const handleFilterChange = (field, value) => {
    setFilter(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle touch events for map zooming and panning
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      // Single touch - prepare for panning
      setMapTransform(prev => ({
        ...prev,
        isDragging: true,
        lastX: e.touches[0].clientX, 
        lastY: e.touches[0].clientY
      }));
    } else if (e.touches.length === 2) {
      // Two fingers - prepare for pinch zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setMapTransform(prev => ({
        ...prev,
        initialDistance: distance
      }));
    }
  };
  
  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && mapTransform.isDragging) {
      // Handle panning
      const deltaX = e.touches[0].clientX - mapTransform.lastX;
      const deltaY = e.touches[0].clientY - mapTransform.lastY;
      
      setMapTransform(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY,
        lastX: e.touches[0].clientX,
        lastY: e.touches[0].clientY
      }));
    } else if (e.touches.length === 2 && mapTransform.initialDistance > 0) {
      // Handle pinch zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      
      const newScale = Math.max(0.5, Math.min(3, mapTransform.scale * (distance / mapTransform.initialDistance)));
      
      setMapTransform(prev => ({
        ...prev,
        scale: newScale,
        initialDistance: distance
      }));
    }
    
    // Prevent default behavior to avoid scrolling the page
    e.preventDefault();
  };
  
  const handleTouchEnd = () => {
    setMapTransform(prev => ({
      ...prev,
      isDragging: false,
      initialDistance: 0
    }));
  };
  
  const resetZoom = () => {
    setMapTransform({
      scale: 0.5,  // Reset to initial zoomed out view
      translateX: 200,  // Adjusted to center horizontally
      translateY: 50,  // Adjusted to show more of the content area
      initialDistance: 0,
      isDragging: false,
      lastX: 0,
      lastY: 0
    });
  };

  return (
    <div 
      ref={containerRef}
      style={{
        minHeight: "100vh",
        background: "url('/assets/gnf-wallpaper-blue.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif',
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        padding: "10px"
      }}
    >
      {/* Main app container with integrated title bar */}
      <div style={{
        background: "white",
        border: "2px solid #d48fc7",
        borderRadius: "8px",
        flex: "1",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        {/* Window Title Bar */}
        <div style={{
          background: "#ffeaf5",
          borderBottom: "1px solid #d48fc7",
          padding: "6px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: "bold",
          fontSize: "16px"
        }}>
          <span>📝 Neighborhood Resources Map</span>
          <button
            onClick={onClose}
            style={{
              background: "#ffbde2",
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
              padding: "0 8px",
              height: "24px",
              lineHeight: "24px",
              fontSize: "16px"
            }}
          >
            ✖
          </button>
        </div>
        
        {/* Mobile-optimized toolbar */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          padding: "10px",
          background: "#f5f5f5",
          borderBottom: "1px solid #ddd"
        }}>
          {/* Resource dropdown */}
          <div style={{ width: "100%" }}>
            <select 
              onChange={(e) => {
                if (e.target.value) {
                  const resource = filteredResources.find(r => r.id === parseInt(e.target.value));
                  if (resource) {
                    handleResourceClick(resource);
                  }
                }
              }}
              style={{
                padding: "8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontFamily: "inherit",
                fontSize: "14px",
                width: "100%"
              }}
              value=""
            >
              <option value="">Select a resource...</option>
              {[...filteredResources]
                .sort((a, b) => a.Resource?.localeCompare(b.Resource || ""))
                .map(resource => (
                  <option key={resource.id} value={resource.id}>
                    {resource.emoji} {resource.Resource}
                  </option>
                ))}
            </select>
          </div>
          
          {/* Filters */}
          <div style={{ display: "flex", gap: "5px" }}>
            <select 
              value={filter.stage}
              onChange={(e) => handleFilterChange("stage", e.target.value)}
              style={{
                padding: "8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontFamily: "inherit",
                fontSize: "14px",
                flex: 1
              }}
            >
              <option value="">All Stages</option>
              {getUniqueValues("stage").map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
            
            <select 
              value={filter.type}
              onChange={(e) => handleFilterChange("type", e.target.value)}
              style={{
                padding: "8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontFamily: "inherit",
                fontSize: "14px",
                flex: 1
              }}
            >
              <option value="">All Types</option>
              {getUniqueValues("type").map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div 
          ref={contentRef}
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            overflow: "auto",
            flex: 1
          }}>
          {/* Map Instructions */}
          <div style={{ padding: "10px" }}>
            <div style={{ 
              margin: "0 0 10px 0", 
              backgroundColor: "#ffeaf5",
              borderRadius: "8px",
              padding: "10px"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px"
              }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: "16px",
                }}>
                  Resources ({filteredResources.length})
                </h3>
              </div>
              
              <p style={{ fontSize: "13px", margin: 0 }}>
                Browse resources on the map below or use the dropdown at the top to view details.
              </p>
            </div>
          </div>

          {/* Map View */}
          <div 
            id="resourcesMap" 
            style={{ 
              padding: "0 10px 10px 10px",
              flex: 1,
              position: "relative"
            }}
          >
            <h3 style={{ 
              margin: "0 0 10px 0", 
              fontSize: "16px",
              borderBottom: "1px solid #ddd",
              paddingBottom: "5px"
            }}>
              Resource Map
            </h3>
            
            <div style={{ 
              position: "relative",
              width: "100%",
              height: "calc(100vh - 300px)", /* Set a specific height that doesn't dominate the viewport */
              maxHeight: "500px", /* Limit maximum height */
              overflow: "hidden", /* Changed from auto to hidden to handle our own scrolling */
              border: "1px solid #ddd",
              borderRadius: "4px",
              touchAction: "none" /* Prevents browser handling of touch events */
            }}>
              {/* Zoom controls */}
              <div style={{
                position: "absolute",
                right: "10px",
                top: "10px",
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                gap: "5px"
              }}>
                <button
                  onClick={() => setMapTransform(prev => ({ ...prev, scale: Math.min(3, prev.scale + 0.2) }))}
                  style={{
                    width: "30px",
                    height: "30px",
                    background: "white",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  +
                </button>
                <button
                  onClick={() => setMapTransform(prev => ({ ...prev, scale: Math.max(0.5, prev.scale - 0.2) }))}
                  style={{
                    width: "30px",
                    height: "30px",
                    background: "white",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "16px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  −
                </button>
                <button
                  onClick={resetZoom}
                  style={{
                    width: "30px",
                    height: "30px",
                    background: "white",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  ↺
                </button>
              </div>
              
              <div 
                style={{ 
                  width: "1600px", 
                  height: "1200px", 
                  position: "relative",
                  transformOrigin: "0 0",
                  transform: `scale(${mapTransform.scale}) translate(${mapTransform.translateX / mapTransform.scale}px, ${mapTransform.translateY / mapTransform.scale}px)`,
                  transition: mapTransform.isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                ref={mapRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              >
                {/* Map SVG */}
                <svg viewBox="0 0 1600 1200" style={{ width: "100%", height: "100%" }}>
                  {/* Neighborhoods backgrounds */}
                  <g>
                    <rect 
                      x="0" y="900" 
                      width="1600" height="300" 
                      fill={neighborhoodColors["Ideation"]}
                    />
                    <rect 
                      x="0" y="600" 
                      width="1600" height="300" 
                      fill={neighborhoodColors["Early Stage"]}
                    />
                    <rect 
                      x="0" y="300" 
                      width="1600" height="300" 
                      fill={neighborhoodColors["Growth"]}
                    />
                    <rect 
                      x="0" y="0" 
                      width="1600" height="300" 
                      fill={neighborhoodColors["Established"]}
                    />
                  </g>
                  
                  {/* Draw districts backgrounds */}
                  <g>
                    {useMemo(() => {
                      const districtNames = Object.keys(districts);
                      const totalWidth = 1600;
                      const districtWidth = totalWidth / districtNames.length;
                      
                      return (
                        <>
                          {/* Draw district background shapes without borders */}
                          {districtNames.map((district, index) => {
                            const x = index * districtWidth;
                            
                            return (
                              <g key={district}>
                                <rect 
                                  x={x}
                                  y={0}
                                  width={districtWidth}
                                  height={1200}
                                  fill="rgba(255,255,255,0.05)"
                                  stroke="none"
                                />
                                <text 
                                  x={x + districtWidth/2} 
                                  y="1180" 
                                  textAnchor="middle"
                                  style={{ fontSize: "26px", fontWeight: "bold", fill: "#4a2770", stroke: "white", strokeWidth: "0.8px", paintOrder: "stroke" }}
                                >
                                  {district}
                                </text>
                              </g>
                            );
                          })}
                          
                          {/* Draw only the 4 vertical dividing lines */}
                          {[1, 2, 3, 4].map(i => {
                            const x = i * districtWidth;
                            
                            // Create a slightly varied line for visual interest
                            const pathData = `M ${x} 0 L ${x + (Math.sin(i * 5) * 20)} 300 
                                             L ${x + (Math.cos(i * 3) * 30)} 600 
                                             L ${x + (Math.sin(i * 4) * 25)} 900 
                                             L ${x} 1200`;
                            
                            return (
                              <path 
                                key={`divider-${i}`}
                                d={pathData}
                                fill="none"
                                stroke="white"
                                strokeWidth="7"
                                strokeDasharray="6,10"
                              />
                            );
                          })}
                        </>
                      );
                    }, [districts])}
                  </g>
                  
                  {/* Streets */}
                  <g>
                    {/* Horizontal streets */}
                    <g>
                      {horizontalStreets.map((street, index) => {
                        const y = 150 + index * 180;
                        
                        return (
                          <g key={street}>
                            <path 
                              d={`M 0 ${y} C ${400} ${y+30}, ${1200} ${y-30}, ${1600} ${y}`}
                              stroke="#aaaaaa"
                              strokeWidth="8"
                              fill="none"
                            />
                            <text 
                              x="255" 
                              y={y-10}
                              style={{ fontSize: "22px", fill: "black", stroke: "white", strokeWidth: "0.8px", paintOrder: "stroke" }}
                            >
                              {street}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                    
                    {/* Vertical streets */}
                    <g>
                      {verticalStreets.map((street, index) => {
                        const streetX = (1 + index) * (1600 / (verticalStreets.length + 1));
                        
                        return (
                          <g key={street}>
                            <path 
                              d={`M ${streetX} 0 C ${streetX+30} ${300}, ${streetX-30} ${900}, ${streetX} ${1200}`}
                              stroke="#aaaaaa"
                              strokeWidth="8"
                              fill="none"
                            />
                            <text 
                              x={streetX-20} 
                              y="470" 
                              transform={`rotate(90, ${streetX-20}, 470)`}
                              style={{ fontSize: "22px", fill: "black", stroke: "white", strokeWidth: "0.8px", paintOrder: "stroke" }}
                            >
                              {street}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  </g>
                  
                  {/* Trees */}
                  <g>
                    {FIXED_TREES.map(tree => (
                      <text 
                        key={tree.key} 
                        x={tree.x} 
                        y={tree.y} 
                        fontSize="24"
                        style={{ userSelect: "none", pointerEvents: "none" }}
                      >
                        {tree.type}
                      </text>
                    ))}
                  </g>
                  
                  {/* Moving cars */}
                  <g>
                    {carPositions.map(car => (
                      <text 
                        key={car.id} 
                        x={car.x} 
                        y={car.y} 
                        fontSize="20"
                        style={{ userSelect: "none", pointerEvents: "none" }}
                      >
                        {car.emoji}
                      </text>
                    ))}
                  </g>
                  
                  {/* Resource buildings */}
                  <g>
                    {filteredResources.map(resource => (
                      <g 
                        key={resource.id}
                        onClick={(e) => handleResourceClick(resource, e)}
                        onMouseEnter={(e) => {
                          setHoveredResource(resource);
                          setMousePosition({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseMove={(e) => {
                          setMousePosition({ x: e.clientX, y: e.clientY });
                        }}
                        onMouseLeave={() => {
                          setHoveredResource(null);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <rect 
                          x={resource.x - 20} 
                          y={resource.y - 20} 
                          width="40" 
                          height="40" 
                          rx="5"
                          fill={hoveredResource?.id === resource.id ? "#FFD6EC" : "#ffffff"}
                          stroke={hoveredResource?.id === resource.id ? "#d48fc7" : "#ccc"}
                          strokeWidth={hoveredResource?.id === resource.id ? 2 : 1}
                        >
                          <title>{resource.Resource}</title>
                        </rect>
                        <text 
                          x={resource.x} 
                          y={resource.y} 
                          fontSize="30"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          {resource.emoji}
                          <title>{resource.Resource}</title>
                        </text>
                      </g>
                    ))}
                  </g>
                  
                  {/* Neighborhood labels */}
                  <g>
                    <text x="800" y="1050" textAnchor="middle" style={{ fontSize: "32px", fontWeight: "bold", fill: "#550000", stroke: "white", strokeWidth: "1px", paintOrder: "stroke" }}>Ideation Valley</text>
                    <text x="800" y="750" textAnchor="middle" style={{ fontSize: "32px", fontWeight: "bold", fill: "#553300", stroke: "white", strokeWidth: "1px", paintOrder: "stroke" }}>Early Stage Neighborhood</text>
                    <text x="800" y="450" textAnchor="middle" style={{ fontSize: "32px", fontWeight: "bold", fill: "#004400", stroke: "white", strokeWidth: "1px", paintOrder: "stroke" }}>Growth Park</text>
                    <text x="800" y="150" textAnchor="middle" style={{ fontSize: "32px", fontWeight: "bold", fill: "#000055", stroke: "white", strokeWidth: "1px", paintOrder: "stroke" }}>Establishment Heights</text>
                  </g>
                </svg>
                
                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.9)',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  zIndex: 100
                }}>
                  <img 
                    src="/assets/Clampie.webp" 
                    alt="Clampie" 
                    style={{ width: '40px', height: '40px', marginRight: '8px' }} 
                  />
                  <span style={{ fontSize: '12px' }}>
                    💬 "Missing a resource? <a 
                      href="mailto:jason@goodneighbor.fund?subject=Neighborhood%20Resources%20Map%20Edit"
                      style={{ color: '#7030a0', fontWeight: 'bold' }}
                    >
                      email us"
                    </a>
                  </span>
                </div>
              </div>
            </div>
            
            <div style={{ 
              marginTop: "10px",
              fontSize: "12px",
              textAlign: "center",
              padding: "5px",
              background: "#f5f5f5",
              borderRadius: "4px"
            }}>
              <em>Tip: Pinch to zoom and drag to pan the map. Tap on resources to view details.</em>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Detail Modal */}
      {selectedResource && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}
          onClick={handleCloseModal}
        >
          <div 
            style={{
              background: "white",
              width: "90%",
              maxWidth: "400px",
              maxHeight: "80vh",
              borderRadius: "8px",
              padding: "20px",
              overflow: "auto"
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ 
              display: "flex",
              alignItems: "center",
              gap: "10px",
              margin: "0 0 15px 0",
              borderBottom: "1px solid #ddd",
              paddingBottom: "10px"
            }}>
              <span style={{ fontSize: "28px" }}>{selectedResource.emoji}</span> 
              {selectedResource.Resource}
            </h2>
            
            <div>
              <p><strong>Type:</strong> {selectedResource.resourceType}</p>
              <p><strong>Focus Area:</strong> {selectedResource["Focus Area"]}</p>
              <p><strong>Business Stage:</strong> {selectedResource.businessStage}</p>
              <p><strong>Counties Served:</strong> {selectedResource["Counties Served"]}</p>
              
              {selectedResource["Average Check Size"] && selectedResource["Average Check Size"] !== "NA" && (
                <p><strong>Average Check Size:</strong> {selectedResource["Average Check Size"]}</p>
              )}
              
              {selectedResource["Relocation Required?"] && (
                <p><strong>Relocation Required:</strong> {selectedResource["Relocation Required?"]}</p>
              )}
              
              {selectedResource["Expanded Details"] && (
                <div style={{
                  marginTop: "15px",
                  padding: "10px",
                  background: "#f9f9f9",
                  borderRadius: "4px",
                  borderLeft: "3px solid #FFD6EC"
                }}>
                  <h3 style={{ margin: "0 0 5px 0", fontSize: "16px" }}>Details</h3>
                  <p style={{ margin: 0 }}>{selectedResource["Expanded Details"]}</p>
                </div>
              )}
              
              {selectedResource.URL && (
                <a 
                  href={selectedResource.URL} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    marginTop: "15px",
                    padding: "8px 16px",
                    background: "#FFD6EC",
                    color: "#333",
                    textDecoration: "none",
                    borderRadius: "4px",
                    fontWeight: "bold"
                  }}
                >
                  Visit Website ↗
                </a>
              )}
            </div>
            
            <button 
              onClick={handleCloseModal}
              style={{
                display: "block",
                width: "100%",
                marginTop: "20px",
                padding: "10px",
                background: "#f0f0f0",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "16px",
                fontFamily: "inherit",
                cursor: "pointer"
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}