import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, increment, setDoc, getDoc, query, where, orderBy, limit, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ContestSubmissionForm from './ContestSubmissionForm';
import '../CommunityShowcase.css';

// Safe HTML rendering with basic tag whitelist
const createSafeHTML = (html) => {
  // This is a temporary solution that allows safe HTML tags
  // For production, install DOMPurify: npm install dompurify
  // Then replace this entire function with: return DOMPurify.sanitize(html);
  
  // Basic whitelist of safe tags
  const allowedTags = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h4', 'h5', 'h6', 'div', 'span'];
  const allowedAttributes = ['class', 'style'];
  
  // Create a temporary element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Function to recursively clean nodes
  const cleanNode = (node) => {
    // Remove script tags and event handlers
    const scripts = node.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    // Remove all elements with inline event handlers
    const allElements = node.querySelectorAll('*');
    allElements.forEach(el => {
      // Remove event attributes
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on') || attr.name === 'href' && attr.value.startsWith('javascript:')) {
          el.removeAttribute(attr.name);
        }
      });
      
      // Remove non-whitelisted tags
      if (!allowedTags.includes(el.tagName.toLowerCase())) {
        el.replaceWith(...el.childNodes);
      }
    });
  };
  
  cleanNode(temp);
  return temp.innerHTML;
};

const CommunityShowcase = () => {
  const [pitches, setPitches] = useState([]);
  const [filteredPitches, setFilteredPitches] = useState([]);
  const [selectedPitch, setSelectedPitch] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);
  const [votedPitches, setVotedPitches] = useState(new Set());
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [voterEmail, setVoterEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [sortBy, setSortBy] = useState('votes'); // votes, newest, random
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('showcase'); // showcase, resources, learning, about
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [showFAQ, setShowFAQ] = useState(false);
  const [votingTimeLeft, setVotingTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [savedPitches, setSavedPitches] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const PITCHES_PER_PAGE = 12;

  // Contest dates - Updated timeline
  const SUBMISSION_END_DATE = new Date('2025-06-30T23:59:59-04:00');
  const VOTING_START_DATE = new Date('2025-06-22T00:01:00-04:00');
  const VOTING_END_DATE = new Date('2025-07-06T23:59:59-04:00');
  const LP_REVIEW_START_DATE = new Date('2025-07-07T00:00:00-04:00');
  const LP_REVIEW_END_DATE = new Date('2025-07-11T23:59:59-04:00');
  const WINNER_ANNOUNCE_DATE = new Date('2025-07-11T12:00:00-04:00');
  
  // Legacy date for compatibility
  const CONTEST_END_DATE = WINNER_ANNOUNCE_DATE;
  
  // Phase detection function
  const getCurrentPhase = () => {
    const now = new Date();
    if (now < SUBMISSION_END_DATE) {
      if (now >= VOTING_START_DATE) {
        return 'submission-and-voting'; // Overlap period
      }
      return 'submission';
    }
    if (now >= VOTING_START_DATE && now <= VOTING_END_DATE) {
      return 'voting';
    }
    if (now >= LP_REVIEW_START_DATE && now <= LP_REVIEW_END_DATE) {
      return 'lp-review';
    }
    if (now >= WINNER_ANNOUNCE_DATE) {
      return 'winner-announced';
    }
    return 'between-phases';
  };
  
  const currentPhase = getCurrentPhase();

  useEffect(() => {
    fetchContestPitches();
    updateCountdown(); // Initial call
    updateVotingCountdown(); // Initial call
    
    // Use 60 second intervals to reduce re-renders
    const timer = setInterval(() => {
      updateCountdown();
      updateVotingCountdown();
    }, 60000); // Update every minute instead of every second
    
    loadVotedPitches();
    loadSavedPitches();
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    filterAndSortPitches();
  }, [pitches, searchTerm, sortBy, selectedIndustry]);

  // Pagination
  const indexOfLastPitch = currentPage * PITCHES_PER_PAGE;
  const indexOfFirstPitch = indexOfLastPitch - PITCHES_PER_PAGE;
  const currentPitches = filteredPitches.slice(indexOfFirstPitch, indexOfLastPitch);
  const totalPages = Math.ceil(filteredPitches.length / PITCHES_PER_PAGE);

  const fetchContestPitches = async () => {
    try {
      const q = query(
        collection(db, 'pitches'),
        where('isContest', '==', true)
      );
      const snapshot = await getDocs(q);
      const pitchData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPitches(pitchData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pitches:', error);
      setLoading(false);
    }
  };

  const filterAndSortPitches = () => {
    let filtered = [...pitches];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(pitch => 
        pitch.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pitch.founderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pitch.valueProp?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pitch.industry?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply industry filter
    if (selectedIndustry !== 'all') {
      filtered = filtered.filter(pitch => pitch.industry === selectedIndustry);
    }

    // Apply sorting
    switch (sortBy) {
      case 'votes':
        filtered.sort((a, b) => (b.votes || 0) - (a.votes || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
        break;
      case 'random':
        filtered.sort(() => Math.random() - 0.5);
        break;
    }

    setFilteredPitches(filtered);
  };

  const updateCountdown = () => {
    const now = new Date().getTime();
    const phase = getCurrentPhase();
    let targetDate;
    
    // Determine what we're counting down to based on current phase
    if (phase === 'submission' || phase === 'submission-and-voting') {
      targetDate = SUBMISSION_END_DATE;
    } else if (phase === 'voting') {
      targetDate = VOTING_END_DATE;
    } else if (phase === 'lp-review') {
      targetDate = LP_REVIEW_END_DATE;
    } else {
      targetDate = CONTEST_END_DATE;
    }
    
    const distance = targetDate.getTime() - now;

    if (distance < 0) {
      setTimeLeft(prev => prev.expired ? prev : { expired: true });
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    setTimeLeft(prev => {
      if (prev.days === days && prev.hours === hours && 
          prev.minutes === minutes && prev.seconds === seconds) {
        return prev; // No change, don't re-render
      }
      return { days, hours, minutes, seconds, phase };
    });
  };

  const updateVotingCountdown = () => {
    const now = new Date().getTime();
    const distance = VOTING_START_DATE.getTime() - now;

    if (distance < 0) {
      setVotingTimeLeft(prev => prev.votingOpen ? prev : { votingOpen: true });
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    setVotingTimeLeft(prev => {
      if (prev.days === days && prev.hours === hours && 
          prev.minutes === minutes && prev.seconds === seconds) {
        return prev; // No change, don't re-render
      }
      return { days, hours, minutes, seconds };
    });
  };

  const loadVotedPitches = () => {
    const stored = localStorage.getItem('gnfVotedPitches');
    if (stored) {
      setVotedPitches(new Set(JSON.parse(stored)));
    }
  };

  const loadSavedPitches = () => {
    const stored = localStorage.getItem('gnfSavedPitches');
    if (stored) {
      setSavedPitches(new Set(JSON.parse(stored)));
    }
  };

  const toggleSavePitch = (pitchId) => {
    const newSaved = new Set(savedPitches);
    if (newSaved.has(pitchId)) {
      newSaved.delete(pitchId);
    } else {
      newSaved.add(pitchId);
    }
    setSavedPitches(newSaved);
    localStorage.setItem('gnfSavedPitches', JSON.stringify(Array.from(newSaved)));
  };

  const saveVotedPitch = (pitchId) => {
    const newVoted = new Set(votedPitches);
    newVoted.add(pitchId);
    setVotedPitches(newVoted);
    localStorage.setItem('gnfVotedPitches', JSON.stringify(Array.from(newVoted)));
  };

  const handleVote = async (pitch) => {
    const now = new Date();
    
    // Check if voting is allowed
    if (now < VOTING_START_DATE) {
      // Store pitch info for Tally form
      sessionStorage.setItem('tallyPitchId', pitch.id);
      sessionStorage.setItem('tallyPitchName', pitch.businessName);
      
      // Close the pitch modal
      setSelectedPitch(null);
      
      // Trigger Tally form by clicking the hidden button
      setTimeout(() => {
        const tallyButton = document.getElementById('tally-notify-button');
        if (tallyButton) {
          tallyButton.click();
        }
      }, 100);
      return;
    }
    
    if (now > VOTING_END_DATE) {
      alert('Voting has ended. The LP review phase is now in progress.');
      return;
    }
    
    if (votedPitches.has(pitch.id)) {
      alert('You have already voted for this idea!');
      return;
    }
    setSelectedPitch(pitch);
    setShowVoteModal(true);
  };

  const sendVerificationCode = async () => {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);
    
    // CRITICAL: This must be replaced with server-side email sending before production
    // The verification code should NEVER be visible client-side
    // TODO: Implement Firebase Function to send verification emails
    console.warn('DEMO MODE: Verification code visible - DO NOT USE IN PRODUCTION');
    console.log('Verification code:', code);
    alert(`DEMO MODE - Verification code: ${code}\n\nIn production, this will be sent to ${voterEmail}`);
  };

  const verifyAndVote = async () => {
    if (verificationCode !== sentCode) {
      alert('Invalid verification code!');
      return;
    }

    try {
      // Update vote count
      const pitchRef = doc(db, 'pitches', selectedPitch.id);
      await updateDoc(pitchRef, {
        votes: increment(1)
      });

      // Record vote
      await setDoc(doc(collection(db, 'votes')), {
        pitchId: selectedPitch.id,
        email: voterEmail,
        timestamp: new Date(),
        contest: 'business-idea-challenge-2025'
      });

      // Add to newsletter
      await setDoc(doc(collection(db, 'newsletter'), voterEmail), {
        email: voterEmail,
        source: 'contest-vote',
        timestamp: new Date(),
        subscribed: true
      });

      saveVotedPitch(selectedPitch.id);
      setEmailVerified(true);
      
      // Update local state
      setPitches(pitches.map(p => 
        p.id === selectedPitch.id 
          ? { ...p, votes: (p.votes || 0) + 1 }
          : p
      ));

      setTimeout(() => {
        setShowVoteModal(false);
        resetVoteModal();
        alert('Thank you for voting! Share this contest with your network!');
      }, 2000);
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error submitting vote. Please try again.');
    }
  };

  const resetVoteModal = () => {
    setVoterEmail('');
    setVerificationCode('');
    setSentCode('');
    setEmailVerified(false);
    setSelectedPitch(null);
  };

  const industries = [
    'Technology & Software',
    'E-commerce & Retail',
    'Food & Beverage',
    'Health & Wellness',
    'Education & Training',
    'Financial Services',
    'Real Estate & Construction',
    'Marketing & Advertising',
    'Consulting & Professional Services',
    'Manufacturing & Hardware',
    'Entertainment & Media',
    'Transportation & Logistics',
    'Energy & Environment',
    'Agriculture & Farming',
    'Other'
  ];

  const getIndustryEmoji = (industry) => {
    const emojis = {
      'Technology & Software': '💻',
      'E-commerce & Retail': '🛍️',
      'Food & Beverage': '🍔',
      'Health & Wellness': '🏥',
      'Education & Training': '📚',
      'Financial Services': '💰',
      'Real Estate & Construction': '🏗️',
      'Marketing & Advertising': '📣',
      'Consulting & Professional Services': '💼',
      'Manufacturing & Hardware': '🏭',
      'Entertainment & Media': '🎮',
      'Transportation & Logistics': '🚚',
      'Energy & Environment': '🌱',
      'Agriculture & Farming': '🌾',
      'Other': '💡'
    };
    return emojis[industry] || '💡';
  };

  // Comprehensive startup resources data
  const resourceCategories = [
    {
      id: 'website-building',
      name: 'Website Building',
      icon: '🌐',
      description: 'For: Landing pages, business websites, portfolios',
      tools: [
        {
          name: 'Webflow',
          description: 'Professional websites without coding. Visual development platform for custom designs.',
          ourTake: 'Best for custom designs and complex layouts. Higher learning curve but maximum flexibility. Great for agencies and design-focused businesses. Free plan limited but sufficient for MVP testing.',
          pricing: 'Free plan available, Paid from $14/mo',
          bestFor: ['Custom Designs', 'Agencies', 'Complex Sites'],
          link: 'https://webflow.com',
          recommended: true
        },
        {
          name: 'Framer',
          description: 'Interactive website builder with advanced animations. Create stunning, responsive sites.',
          ourTake: 'Perfect for startups needing impressive, interactive sites. Excellent for SaaS landing pages. Steeper learning curve than competitors but produces stunning results.',
          pricing: 'Free plan, Paid from $10/mo',
          bestFor: ['SaaS', 'Interactive Sites', 'Startups'],
          link: 'https://framer.com'
        },
        {
          name: 'Carrd',
          description: 'Simple, one-page websites. Build responsive sites quickly and affordably.',
          ourTake: 'Ideal for $1,000 budgets. Create professional landing pages in minutes. Limited to single pages but perfect for testing ideas quickly and cheaply.',
          pricing: 'Free plan, Pro from $19/year',
          bestFor: ['MVPs', 'Landing Pages', 'Budget-Friendly'],
          link: 'https://carrd.co',
          recommended: true
        },
        {
          name: 'Ghost',
          description: 'Publishing-focused website platform. Built for content creators and publishers.',
          ourTake: 'Best for content-driven businesses. Built-in SEO, email newsletters, and membership features. Great for coaches, consultants, and media businesses.',
          pricing: 'From $9/mo',
          bestFor: ['Publishing', 'Newsletters', 'Memberships'],
          link: 'https://ghost.org'
        },
        {
          name: 'Umso',
          description: 'Website builder specifically for startups. Fast and focused.',
          ourTake: 'Built by founders for founders. Clean, modern templates that look professional. Less flexible than Webflow but much faster to launch. Great for SaaS and startup landing pages.',
          pricing: 'From $25/mo',
          bestFor: ['Startups', 'SaaS', 'Quick Launch'],
          link: 'https://umso.com'
        }
      ]
    },
    {
      id: 'ecommerce',
      name: 'E-commerce Platforms',
      icon: '🛒',
      description: 'For: Online stores, digital products, subscriptions',
      tools: [
        {
          name: 'Shopify',
          description: 'Complete e-commerce solution. Industry standard for online stores.',
          ourTake: 'Industry standard for good reason. Handles everything from payments to shipping. $29/month is worth it if you\'re serious about e-commerce. Thousands of apps available.',
          pricing: 'From $29/mo',
          bestFor: ['Online Stores', 'Physical Products', 'Scaling'],
          link: 'https://shopify.com',
          recommended: true
        },
        {
          name: 'Gumroad',
          description: 'Digital product sales made simple. Perfect for creators and digital goods.',
          ourTake: 'Perfect for creators selling digital products. Takes care of payments, delivery, and taxes. Higher fees but zero setup hassle. Great for testing digital product ideas.',
          pricing: 'Free to start, 9% + $0.30 per sale',
          bestFor: ['Digital Products', 'Creators', 'Quick Setup'],
          link: 'https://gumroad.com',
          recommended: false
        },
        {
          name: 'WooCommerce',
          description: 'WordPress e-commerce plugin. Most flexible open-source solution.',
          ourTake: 'Most flexible but requires technical knowledge. Hidden costs in hosting and plugins. Only choose if you have WordPress experience.',
          pricing: 'Free plugin, hosting from $10/mo',
          bestFor: ['WordPress Sites', 'Customization', 'Technical Users'],
          link: 'https://woocommerce.com'
        }
      ]
    },
    {
      id: 'app-development',
      name: 'App Development',
      icon: '📱',
      description: 'For: Mobile apps, web apps, internal tools',
      tools: [
        {
          name: 'Bubble',
          description: 'Full-stack web application builder. Build complex apps without code.',
          ourTake: 'Most powerful no-code platform. Can build complex SaaS applications. Steep learning curve but can replace expensive development teams. Free plan available for testing.',
          pricing: 'Free plan, Paid from $29/mo',
          bestFor: ['SaaS', 'Web Apps', 'Complex Logic'],
          link: 'https://bubble.io',
          recommended: true
        },
        {
          name: 'Adalo',
          description: 'Native mobile app builder. Create iOS and Android apps visually.',
          ourTake: 'Best for simple mobile apps. Publishing to app stores included. Limited customization but fast to market. Good for local service businesses needing an app.',
          pricing: 'From $45/mo',
          bestFor: ['Mobile Apps', 'Simple Apps', 'Quick Launch'],
          link: 'https://adalo.com'
        },
        {
          name: 'Glide',
          description: 'Apps from Google Sheets. Turn spreadsheets into powerful apps.',
          ourTake: 'Brilliant for simple database apps. If your business can run on a spreadsheet, Glide can turn it into an app. Perfect for inventory management, customer databases.',
          pricing: 'Free plan, Paid from $25/mo',
          bestFor: ['Database Apps', 'Internal Tools', 'Quick MVPs'],
          link: 'https://glideapps.com',
          recommended: false
        }
      ]
    },
    {
      id: 'payment-processing',
      name: 'Payment Processing',
      icon: '💳',
      description: 'For: Accepting payments online and in-person',
      tools: [
        {
          name: 'Stripe',
          description: 'Developer-friendly payments. Best for online businesses.',
          ourTake: 'Best overall choice for online businesses. Excellent documentation, reasonable fees, handles global payments. Essential for any serious online business.',
          pricing: '2.9% + $0.30 per transaction',
          bestFor: ['Online Payments', 'SaaS', 'Global Sales'],
          link: 'https://stripe.com',
          recommended: true
        },
        {
          name: 'Square',
          description: 'In-person and online payments. Complete POS system.',
          ourTake: 'Perfect for brick-and-mortar businesses expanding online. Free card reader, good POS system. Slightly higher online fees than Stripe.',
          pricing: '2.9% + $0.30 online, 2.6% + $0.10 in-person',
          bestFor: ['Retail', 'Restaurants', 'Service Businesses'],
          link: 'https://square.com',
          recommended: false
        },
        {
          name: 'PayPal',
          description: 'Ubiquitous payment processor. Most recognized by customers.',
          ourTake: 'Higher fees than Stripe but customers trust it more. Good for marketplaces and international sales. Buyer protection can be problematic for sellers.',
          pricing: '2.9% + $0.30 per transaction',
          bestFor: ['International', 'Marketplaces', 'Customer Trust'],
          link: 'https://paypal.com'
        }
      ]
    },
    {
      id: 'design-branding',
      name: 'Design & Branding',
      icon: '🎨',
      description: 'For: Logos, graphics, presentations, brand identity',
      tools: [
        {
          name: 'Canva',
          description: 'Design for everyone. Create professional graphics without design skills.',
          ourTake: 'Essential for any business. Professional designs without design skills. Pro version worth it for brand consistency. Can handle 80% of your design needs.',
          pricing: 'Free plan, Pro from $12.99/mo',
          bestFor: ['Social Media', 'Marketing Materials', 'Beginners'],
          link: 'https://canva.com',
          recommended: true
        },
        {
          name: 'Figma',
          description: 'Professional design tool. Industry standard for UI/UX design.',
          ourTake: 'Free tier is generous. Industry standard for UI/UX design. Overkill for simple graphics but essential if building apps or complex websites.',
          pricing: 'Free for 3 files, Paid from $12/mo',
          bestFor: ['UI/UX', 'App Design', 'Collaboration'],
          link: 'https://figma.com',
          recommended: false
        },
        {
          name: 'Looka',
          description: 'AI logo and brand generator. Quick branding for startups.',
          ourTake: 'Quick, affordable branding for early-stage businesses. Not as unique as custom design but gets you started professionally. Good value for $200 budget.',
          pricing: 'Logo packages from $20',
          bestFor: ['Quick Logos', 'Brand Kits', 'Startups'],
          link: 'https://looka.com'
        }
      ]
    },
    {
      id: 'email-marketing',
      name: 'Email Marketing',
      icon: '📧',
      description: 'For: Newsletters, customer communication, automation',
      tools: [
        {
          name: 'ConvertKit',
          description: 'Creator-focused email marketing. Best for content creators.',
          ourTake: 'Best for content creators and coaches. Excellent automation features. More expensive than competitors but higher deliverability rates.',
          pricing: 'Free up to 1,000 subscribers, then from $15/mo',
          bestFor: ['Creators', 'Automation', 'Courses'],
          link: 'https://convertkit.com',
          recommended: true
        },
        {
          name: 'Mailchimp',
          description: 'All-in-one marketing platform. Most popular email service.',
          ourTake: 'Good free tier for starting out. Becomes expensive quickly but includes landing pages and basic CRM. Easy to use but limited automation.',
          pricing: 'Free up to 500 contacts, then from $13/mo',
          bestFor: ['Beginners', 'Small Lists', 'All-in-One'],
          link: 'https://mailchimp.com',
          recommended: true
        },
        {
          name: 'Beehiiv',
          description: 'Newsletter platform built for growth. Modern email marketing.',
          ourTake: 'Newest player but impressive features. Built-in monetization tools. Great for media businesses and newsletters. Modern interface.',
          pricing: 'Free up to 2,500 subscribers, then from $42/mo',
          bestFor: ['Newsletters', 'Media', 'Monetization'],
          link: 'https://beehiiv.com'
        }
      ]
    },
    {
      id: 'marketing-engagement',
      name: 'Marketing & Customer Engagement',
      icon: '🛍️',
      description: 'For: Building customer relationships and driving sales',
      tools: [
        {
          name: 'Mailchimp',
          description: 'Email marketing for small businesses. Design, send, and track campaigns.',
          ourTake: 'The go-to for small business email marketing. Free tier is generous. Easy templates and automation. Integrates with everything.',
          pricing: 'Free up to 500 contacts, Essentials $13/mo',
          bestFor: ['Email Marketing', 'Newsletters', 'Automation'],
          link: 'https://mailchimp.com',
          recommended: true
        },
        {
          name: 'Buffer',
          description: 'Schedule posts across all social platforms from one dashboard.',
          ourTake: 'Simple and reliable social scheduling. Free plan covers basics. Analytics help you post at optimal times. Much cheaper than competitors.',
          pricing: 'Free for 3 channels, Essentials $6/channel/mo',
          bestFor: ['Social Scheduling', 'Multi-Platform', 'Analytics'],
          link: 'https://buffer.com',
          recommended: false
        },
        {
          name: 'Canva',
          description: 'Design marketing materials without design skills.',
          ourTake: 'Essential for any business. Templates for everything from social posts to menus. Free version is powerful. Brand kit feature worth the upgrade.',
          pricing: 'Free, Pro $15/mo',
          bestFor: ['Design', 'Social Media', 'Marketing Materials'],
          link: 'https://canva.com',
          recommended: true
        },
        {
          name: 'BirdEye',
          description: 'Review management and customer experience platform.',
          ourTake: 'Monitors reviews across 150+ sites. Automated review requests boost ratings. Expensive but crucial for reputation-dependent businesses.',
          pricing: 'Custom pricing, starts ~$299/mo',
          bestFor: ['Review Management', 'Reputation', 'Multi-Location'],
          link: 'https://birdeye.com'
        },
        {
          name: 'Google Business Profile',
          description: 'Manage your business on Google Search and Maps.',
          ourTake: 'Free and essential. Most customers find businesses through Google. Keep info updated, respond to reviews, post updates. No excuse not to use this.',
          pricing: 'Free',
          bestFor: ['Local SEO', 'Maps Visibility', 'Reviews'],
          link: 'https://business.google.com',
          recommended: false
        }
      ]
    },
    {
      id: 'team-operations',
      name: 'Team & Operations',
      icon: '👥',
      description: 'For: Managing staff and daily operations',
      tools: [
        {
          name: 'When I Work',
          description: 'Employee scheduling and time tracking made simple.',
          ourTake: 'Best scheduling app for small teams. Employees swap shifts themselves. Time clock prevents buddy punching. Affordable and easy.',
          pricing: 'Free up to 75 users, Essentials $2.50/user/mo',
          bestFor: ['Scheduling', 'Time Tracking', 'Shift Swapping'],
          link: 'https://wheniwork.com',
          recommended: false
        },
        {
          name: 'Slack',
          description: 'Team messaging that replaces email for internal communication.',
          ourTake: 'Changes how teams communicate. Free tier works for small teams. Reduces email overload. Mobile app keeps everyone connected.',
          pricing: 'Free, Pro $8.75/user/mo',
          bestFor: ['Team Chat', 'File Sharing', 'Remote Teams'],
          link: 'https://slack.com',
          recommended: true
        },
        {
          name: 'Gusto',
          description: 'Modern payroll, benefits, and HR in one place.',
          ourTake: 'Simplifies payroll and compliance. Handles taxes automatically. Employee self-service reduces admin work. Worth every penny for the peace of mind.',
          pricing: 'Simple $40/mo + $6/person',
          bestFor: ['Payroll', 'Benefits', 'HR Compliance'],
          link: 'https://gusto.com',
          recommended: false
        },
        {
          name: 'Indeed',
          description: 'Post jobs and find candidates quickly.',
          ourTake: 'Largest job site means most applicants. Free job posts available. Paid posts get more visibility. Built-in applicant tracking helps manage candidates.',
          pricing: 'Free posts available, Sponsored from $5/day',
          bestFor: ['Hiring', 'Job Posts', 'Recruitment'],
          link: 'https://indeed.com/hire'
        }
      ]
    },
    {
      id: 'inventory-orders',
      name: 'Inventory & Orders',
      icon: '📦',
      description: 'For: Product-based businesses',
      tools: [
        {
          name: 'Square for Retail',
          description: 'POS with integrated inventory management.',
          ourTake: 'Best for businesses already using Square. Real-time inventory sync across channels. Free plan available. Scales with your business.',
          pricing: 'Free, Plus $60/location/mo',
          bestFor: ['Retail POS', 'Multi-Channel', 'Inventory Sync'],
          link: 'https://squareup.com/retail',
          recommended: false
        },
        {
          name: 'Shopify',
          description: 'Complete e-commerce platform with POS options.',
          ourTake: 'Gold standard for online stores. Also offers POS for retail. Inventory syncs everywhere. App ecosystem adds any feature you need.',
          pricing: 'Basic $39/mo, POS Pro $89/mo',
          bestFor: ['E-commerce', 'Online + Retail', 'Scaling'],
          link: 'https://shopify.com',
          recommended: true
        },
        {
          name: 'ShipStation',
          description: 'Ship orders from all your sales channels in one place.',
          ourTake: 'Essential when you outgrow manual shipping. Huge carrier discounts. Batch printing saves hours. Integrates with everything.',
          pricing: 'Starter $9.99/mo (up to 50 shipments)',
          bestFor: ['Multi-Carrier', 'Automation', 'High Volume'],
          link: 'https://shipstation.com',
          recommended: false
        },
        {
          name: 'inFlow',
          description: 'Dedicated inventory management software.',
          ourTake: 'When spreadsheets aren\'t enough. Handles complex inventory needs. Barcode scanning, low stock alerts, purchase orders. Desktop and cloud options.',
          pricing: 'Essential $110/mo for 2 users',
          bestFor: ['Inventory Focus', 'B2B', 'Manufacturing'],
          link: 'https://inflowinventory.com'
        }
      ]
    },
    {
      id: 'industry-specific',
      name: 'Industry-Specific Tools',
      icon: '🏭',
      description: 'For: Specialized business needs',
      tools: [
        {
          name: 'ChowNow',
          description: 'Commission-free online ordering for restaurants.',
          ourTake: 'No commissions unlike delivery apps. You own customer data. Branded ordering experience. Setup fee but saves money long-term.',
          pricing: 'Setup from $399, Monthly from $149',
          bestFor: ['Restaurants', 'Direct Orders', 'No Commission'],
          link: 'https://chownow.com',
          recommended: false
        },
        {
          name: 'Acuity Scheduling',
          description: 'Powerful appointment booking for service businesses.',
          ourTake: 'More features than Calendly for service businesses. Client self-scheduling, payments, forms. Great for salons, consultants, healthcare.',
          pricing: 'Emerging $16/mo, Growing $27/mo',
          bestFor: ['Services', 'Classes', 'Multi-Staff'],
          link: 'https://acuityscheduling.com'
        },
        {
          name: 'Housecall Pro',
          description: 'Field service management for home service pros.',
          ourTake: 'Built for plumbers, HVAC, cleaners, etc. Scheduling, invoicing, payments in one app. Techs love the mobile app. Customers get notifications.',
          pricing: 'Starter $69/mo',
          bestFor: ['Field Service', 'Home Services', 'Mobile Teams'],
          link: 'https://housecallpro.com'
        },
        {
          name: 'MindBody',
          description: 'Business management for wellness and beauty businesses.',
          ourTake: 'Industry standard for yoga studios, spas, salons. Handles scheduling, payments, marketing. Expensive but comprehensive. Marketplace brings new clients.',
          pricing: 'Starter $139/mo',
          bestFor: ['Wellness', 'Beauty', 'Classes'],
          link: 'https://mindbodyonline.com'
        },
        {
          name: 'Lightspeed',
          description: 'Retail and restaurant POS with advanced features.',
          ourTake: 'Professional-grade POS for serious retailers and restaurants. Complex but powerful. Great reporting and multi-location support.',
          pricing: 'Retail from $89/mo, Restaurant from $69/mo',
          bestFor: ['Multi-Location', 'Advanced Retail', 'Fine Dining'],
          link: 'https://lightspeedhq.com'
        }
      ]
    },
    {
      id: 'payments-banking',
      name: 'Payments & Banking',
      icon: '💳',
      description: 'For: Managing money flow',
      tools: [
        {
          name: 'Stripe',
          description: 'Online payment processing for internet businesses.',
          ourTake: 'Developer-friendly but also has no-code options. Best for online businesses. Great fraud protection. Scales from startup to enterprise.',
          pricing: '2.9% + $0.30 per transaction',
          bestFor: ['Online Payments', 'SaaS', 'Marketplaces'],
          link: 'https://stripe.com',
          recommended: true
        },
        {
          name: 'PayPal Business',
          description: 'Widely accepted payment solution with buyer protection.',
          ourTake: 'Customers trust PayPal. Higher fees but better conversion. Essential for international sales. Instant payments but watch for holds.',
          pricing: '3.49% + $0.49 per transaction',
          bestFor: ['Customer Trust', 'International', 'Quick Setup'],
          link: 'https://paypal.com/business'
        },
        {
          name: 'Novo',
          description: 'Digital business banking built for small businesses.',
          ourTake: 'No monthly fees, no minimums. Great mobile app. Integrates with business tools. Quick approval. Perfect for new businesses.',
          pricing: 'Free',
          bestFor: ['Startups', 'Digital Banking', 'No Fees'],
          link: 'https://novo.co',
          recommended: false
        },
        {
          name: 'Mercury',
          description: 'Banking built for startups. Silicon Valley\'s favorite.',
          ourTake: 'The tech startup standard. Clean interface, great API, built for scale. Higher approval standards than Novo. Free wires and international payments. VC-friendly.',
          pricing: 'Free',
          bestFor: ['Tech Startups', 'VC-Backed', 'API Access'],
          link: 'https://mercury.com',
          recommended: true
        },
        {
          name: 'Invoice2go',
          description: 'Professional invoicing from your phone.',
          ourTake: 'Perfect for service businesses and contractors. Create estimates and invoices on-site. Tracks payments and sends reminders. Clients can pay online.',
          pricing: 'Lite $7.99/mo, Pro $19.99/mo',
          bestFor: ['Mobile Invoicing', 'Service Business', 'Contractors'],
          link: 'https://invoice.2go.com'
        }
      ]
    },
    {
      id: 'accounting',
      name: 'Accounting & Finance',
      icon: '💰',
      description: 'For: Bookkeeping, invoicing, financial management',
      tools: [
        {
          name: 'QuickBooks',
          description: 'Small business accounting standard. Comprehensive financial management.',
          ourTake: 'Industry standard for good reason. Handles everything from invoicing to taxes. Worth the monthly cost to avoid accounting headaches.',
          pricing: 'From $30/mo',
          bestFor: ['Full Accounting', 'Tax Prep', 'Growing Businesses'],
          link: 'https://quickbooks.com',
          recommended: true
        },
        {
          name: 'Wave',
          description: 'Free accounting software. Perfect for very early stage.',
          ourTake: 'Completely free for basic accounting and invoicing. Perfect for very early stage. Limited features but covers essentials.',
          pricing: 'Free accounting, paid payroll',
          bestFor: ['Startups', 'Freelancers', 'Free Option'],
          link: 'https://waveapps.com',
          recommended: false
        },
        {
          name: 'FreshBooks',
          description: 'Service business accounting. Time tracking and project management.',
          ourTake: 'Better than QuickBooks for service businesses. Excellent time tracking and project management. Good for consultants and agencies.',
          pricing: 'From $15/mo',
          bestFor: ['Service Businesses', 'Time Tracking', 'Projects'],
          link: 'https://freshbooks.com'
        }
      ]
    },
    {
      id: 'crm',
      name: 'CRM & Customer Management',
      icon: '👥',
      description: 'For: Managing customer relationships, sales pipelines, contact organization',
      tools: [
        {
          name: 'HubSpot CRM',
          description: 'Free CRM with powerful features. Great starting point for any business.',
          ourTake: 'The best free CRM on the market. No catch - it\'s actually free forever for core features. Scales with paid marketing and sales hubs when you\'re ready. Perfect for startups.',
          pricing: 'Free forever, Paid features from $45/mo',
          bestFor: ['Startups', 'Free Option', 'All-in-One Platform'],
          link: 'https://hubspot.com',
          recommended: true
        },
        {
          name: 'Pipedrive',
          description: 'Sales-focused CRM with visual pipeline. Built for closing deals.',
          ourTake: 'Designed by salespeople for salespeople. Visual pipeline makes it easy to see where deals stand. Less bloated than competitors. Great mobile app for sales on the go.',
          pricing: 'From $14/user/mo',
          bestFor: ['Sales Teams', 'Pipeline Management', 'Mobile Sales'],
          link: 'https://pipedrive.com',
          recommended: false
        },
        {
          name: 'Salesforce',
          description: 'Enterprise CRM leader. Highly customizable but complex.',
          ourTake: 'The 800-pound gorilla of CRMs. Incredibly powerful but overkill for most startups. Steep learning curve and expensive. Consider only when you have dedicated ops team.',
          pricing: 'From $25/user/mo',
          bestFor: ['Enterprise', 'Complex Sales', 'Customization'],
          link: 'https://salesforce.com'
        },
        {
          name: 'Airtable',
          description: 'Spreadsheet-database hybrid. Build custom CRM workflows.',
          ourTake: 'Not a traditional CRM but incredibly flexible. Build exactly what you need. Great for unique business models. Combine with automations for powerful workflows.',
          pricing: 'Free plan, Paid from $20/user/mo',
          bestFor: ['Custom Workflows', 'Flexibility', 'Small Teams'],
          link: 'https://airtable.com',
          recommended: true
        },
        {
          name: 'Folk',
          description: 'Modern CRM for creative teams. Beautiful interface, simple to use.',
          ourTake: 'The anti-Salesforce. Beautiful, intuitive interface that teams actually want to use. Great for agencies and creative businesses. Limited integrations but growing fast.',
          pricing: 'From $20/user/mo',
          bestFor: ['Agencies', 'Creative Teams', 'Simplicity'],
          link: 'https://folk.app'
        }
      ]
    },
    {
      id: 'analytics',
      name: 'Analytics & Data',
      icon: '📊',
      description: 'For: Understanding customers, tracking performance',
      tools: [
        {
          name: 'Google Analytics',
          description: 'Website traffic analysis. Free and comprehensive.',
          ourTake: 'Free and comprehensive but complex. Essential for understanding your audience. GA4 has learning curve but worth mastering.',
          pricing: 'Free',
          bestFor: ['Website Analytics', 'Traffic Sources', 'Free Option'],
          link: 'https://analytics.google.com',
          recommended: true
        },
        {
          name: 'Hotjar',
          description: 'User behavior analytics. See how users interact with your site.',
          ourTake: 'See how users actually interact with your site. Heatmaps and recordings reveal UX issues. Free plan sufficient for early stage.',
          pricing: 'Free plan, Paid from $32/mo',
          bestFor: ['UX Insights', 'Heatmaps', 'User Recordings'],
          link: 'https://hotjar.com',
          recommended: false
        }
      ]
    },
    {
      id: 'customer-support',
      name: 'Customer Support',
      icon: '🤝',
      description: 'For: Help desk, live chat, knowledge base',
      tools: [
        {
          name: 'Crisp',
          description: 'Free live chat for websites. Basic help desk included.',
          ourTake: 'Generous free plan with live chat and basic help desk. Good starting point before upgrading to premium solutions.',
          pricing: 'Free plan, Paid from $25/mo',
          bestFor: ['Live Chat', 'Small Teams', 'Free Start'],
          link: 'https://crisp.chat',
          recommended: true
        },
        {
          name: 'Intercom',
          description: 'Premium customer messaging platform. All-in-one solution.',
          ourTake: 'Premium solution but worth it for SaaS businesses. Combines live chat, help desk, and marketing automation. Expensive but increases conversion rates.',
          pricing: 'From $74/mo',
          bestFor: ['SaaS', 'Enterprise', 'Automation'],
          link: 'https://intercom.com'
        }
      ]
    },
    {
      id: 'llms',
      name: 'AI Language Models',
      icon: '🤖',
      description: 'For: Content creation, research, brainstorming, problem-solving',
      tools: [
        {
          name: 'ChatGPT',
          description: 'OpenAI\'s conversational AI. Most popular LLM for general use.',
          ourTake: 'The OG that started the AI revolution. GPT-4 is powerful for complex tasks. Free tier is great for testing. Plus plan worth it if you use it daily. Best for general purpose tasks and creative writing.',
          pricing: 'Free (GPT-3.5), Plus $20/mo (GPT-4)',
          bestFor: ['Content Creation', 'Brainstorming', 'General Use'],
          link: 'https://chat.openai.com',
          recommended: false
        },
        {
          name: 'Claude',
          description: 'Anthropic\'s AI assistant. Excellent for analysis and coding.',
          ourTake: 'Our favorite for business analysis and coding tasks. More thoughtful and nuanced than ChatGPT. Better at following complex instructions. Free tier generous. Pro tier includes Claude 3 Opus for heavy lifting.',
          pricing: 'Free tier, Pro $20/mo',
          bestFor: ['Business Analysis', 'Coding', 'Long Documents'],
          link: 'https://claude.ai',
          recommended: true
        },
        {
          name: 'Gemini',
          description: 'Google\'s multimodal AI. Integrated with Google ecosystem.',
          ourTake: 'Great if you\'re already in Google ecosystem. Can analyze images and integrates with Google Workspace. Advanced tier gives you Gemini Ultra. Best for research and fact-checking.',
          pricing: 'Free tier, Advanced $19.99/mo',
          bestFor: ['Research', 'Google Integration', 'Multimodal'],
          link: 'https://gemini.google.com'
        },
        {
          name: 'DeepSeek R1',
          description: 'Open-source reasoning model. Transparent thinking process.',
          ourTake: 'Game-changer for transparency. Shows its reasoning step-by-step. Free to use through their chat interface. Excellent for complex problem-solving where you need to understand the logic. Great alternative to expensive models.',
          pricing: 'Free',
          bestFor: ['Problem Solving', 'Transparency', 'Free Option'],
          link: 'https://chat.deepseek.com',
          recommended: false
        }
      ]
    },
    {
      id: 'ai-coding',
      name: 'AI Coding Tools',
      icon: '👨‍💻',
      description: 'For: Writing code faster, debugging, learning to code',
      tools: [
        {
          name: 'Cursor',
          description: 'AI-first code editor. The future of coding is here.',
          ourTake: 'Revolutionary for "vibe coding" - describe what you want and watch it build. Fork of VS Code with deep AI integration. Can edit multiple files at once. Perfect for founders who need to build fast without deep coding knowledge.',
          pricing: 'Free tier, Pro $20/mo',
          bestFor: ['Vibe Coding', 'Rapid Prototyping', 'Non-Coders'],
          link: 'https://cursor.sh',
          recommended: true
        },
        {
          name: 'Claude Code',
          description: 'Official coding tool from Anthropic. Deep reasoning for complex tasks.',
          ourTake: 'Best for complex coding challenges that require deep thinking. Excels at refactoring, debugging tricky issues, and explaining code. Less about speed, more about getting it right. Great for learning.',
          pricing: 'Included with Claude subscription',
          bestFor: ['Complex Problems', 'Code Refactoring', 'Learning'],
          link: 'https://claude.ai/code',
          recommended: true
        },
        {
          name: 'GitHub Copilot',
          description: 'AI pair programmer. Suggests code as you type.',
          ourTake: 'The original AI coding assistant. Great if you already know how to code and want to go faster. Less helpful for beginners than Cursor. Integrates with VS Code and other editors.',
          pricing: '$10/mo individual, $19/mo business',
          bestFor: ['Experienced Devs', 'Speed Coding', 'VS Code Users'],
          link: 'https://github.com/features/copilot'
        },
        {
          name: 'v0',
          description: 'Vercel\'s AI UI generator. Describe UI, get React code.',
          ourTake: 'Incredible for generating UI components. Describe what you want, get production-ready React code. Perfect for founders building web apps. Pairs beautifully with Cursor for full-stack development.',
          pricing: 'Free credits, then pay as you go',
          bestFor: ['UI Generation', 'React Apps', 'Quick Prototypes'],
          link: 'https://v0.dev',
          recommended: false
        },
        {
          name: 'Windsurf',
          description: 'AI IDE by Codeium. Strong Cursor alternative.',
          ourTake: 'Newer player but impressive. Similar to Cursor but with some unique features like better context awareness. Free tier is more generous. Good alternative if Cursor feels expensive.',
          pricing: 'Free tier, Pro $10/mo',
          bestFor: ['Full-Stack Dev', 'Budget-Friendly', 'Context-Aware'],
          link: 'https://codeium.com/windsurf'
        },
        {
          name: 'Replit AI',
          description: 'Cloud IDE with AI. Code and deploy in one place.',
          ourTake: 'Perfect for beginners. No setup required - code in browser and deploy instantly. AI helps debug and explain code. Great for learning and quick experiments. Mobile app lets you code on the go.',
          pricing: 'Free tier, Hacker $7/mo',
          bestFor: ['Beginners', 'Quick Deploy', 'Learning'],
          link: 'https://replit.com'
        }
      ]
    },
    {
      id: 'ai-notetakers',
      name: 'AI Meeting Notetakers',
      icon: '🎙️',
      description: 'For: Meeting transcription, note-taking, action items',
      tools: [
        {
          name: 'Fireflies.ai',
          description: 'AI meeting assistant that transcribes, summarizes, and analyzes conversations.',
          ourTake: 'Most comprehensive meeting AI. Integrates with all major video platforms. Great search and analytics. Can track action items and keywords. Team collaboration features are excellent.',
          pricing: 'Free for 800 mins/mo, Pro $10/user/mo',
          bestFor: ['Team Meetings', 'CRM Integration', 'Analytics'],
          link: 'https://fireflies.ai',
          recommended: true
        },
        {
          name: 'Fathom',
          description: 'Free AI meeting assistant. Records, transcribes, and highlights.',
          ourTake: 'Best free option. Unlimited recordings and transcriptions. Instant summaries and action items. Works with Zoom, Meet, Teams. Perfect for solopreneurs and small teams.',
          pricing: 'Free, Team features $19/user/mo',
          bestFor: ['Free Option', 'Quick Summaries', 'Solo Use'],
          link: 'https://fathom.video',
          recommended: false
        },
        {
          name: 'Otter.ai',
          description: 'Real-time transcription and collaboration platform.',
          ourTake: 'Pioneer in the space. Best for in-person meetings with mobile app. Real-time transcription is impressive. Good for content creators who need transcripts. Limited free tier.',
          pricing: 'Free for 300 mins/mo, Pro $10/mo',
          bestFor: ['In-Person Meetings', 'Mobile Recording', 'Live Transcription'],
          link: 'https://otter.ai'
        },
        {
          name: 'Spiky.ai',
          description: 'Sales-focused conversation intelligence platform.',
          ourTake: 'Built specifically for sales teams. Analyzes emotions, engagement, and talk ratios. Provides coaching insights. More expensive but valuable for sales-heavy businesses.',
          pricing: 'Custom pricing, starts ~$49/user/mo',
          bestFor: ['Sales Calls', 'Coaching', 'Revenue Teams'],
          link: 'https://spiky.ai',
          recommended: true
        },
        {
          name: 'Plaud Note',
          description: 'Physical AI voice recorder. Wearable pin for in-person meetings.',
          ourTake: 'Discrete physical device for in-person recordings. Good audio quality, AI summaries via app. Battery lasts all day. Great for conferences, interviews, or impromptu meetings.',
          pricing: 'Device $159, Pro features $79/year',
          bestFor: ['In-Person', 'Conferences', 'Interviews'],
          link: 'https://plaud.ai'
        },
        {
          name: 'Limitless Pendant',
          description: 'Wearable AI that remembers everything. Privacy-first design.',
          ourTake: 'Next-gen wearable for capturing all conversations. Encrypted, privacy-focused. Creates searchable memory of your day. Still in early access but promising for busy founders.',
          pricing: 'Device $99 (pre-order), Subscription TBD',
          bestFor: ['Always-On Recording', 'Privacy-First', 'Memory Aid'],
          link: 'https://limitless.ai'
        }
      ]
    },
    {
      id: 'productivity-workspace',
      name: 'Productivity & Workspaces',
      icon: '🗂️',
      description: 'For: Business organization, databases, internal wikis, project management',
      tools: [
        {
          name: 'Notion',
          description: 'All-in-one workspace for notes, databases, kanban boards, and wikis.',
          ourTake: 'The Swiss Army knife of productivity tools. Can replace multiple apps. Perfect for organizing everything from customer feedback to product roadmaps. Free plan generous enough for most startups. Can even build simple websites.',
          pricing: 'Free for personal, Team $8/user/mo',
          bestFor: ['Documentation', 'Databases', 'Team Wiki', 'Project Management'],
          link: 'https://notion.so',
          recommended: true
        },
        {
          name: 'Airtable',
          description: 'Spreadsheet-database hybrid with powerful views and automations.',
          ourTake: 'Think Excel meets database. Perfect for CRMs, inventory tracking, content calendars. Visual interface makes complex data manageable. Integrates with everything. Forms feature can replace dedicated form tools.',
          pricing: 'Free up to 1,200 records, Team $20/user/mo',
          bestFor: ['CRM', 'Inventory', 'Content Planning', 'Automations'],
          link: 'https://airtable.com',
          recommended: true
        },
        {
          name: 'Coda',
          description: 'Doc that brings words, data, and teams together. Like Google Docs meets Airtable.',
          ourTake: 'More powerful than Notion for complex workflows, but steeper learning curve. Great for building internal tools and dashboards. Pack ecosystem adds superpowers. Can build customer-facing tools too.',
          pricing: 'Free up to 10 editors, Team $10/mo/editor',
          bestFor: ['Internal Tools', 'Complex Workflows', 'Team Collaboration'],
          link: 'https://coda.io'
        },
        {
          name: 'Monday.com',
          description: 'Visual project management and team collaboration platform.',
          ourTake: 'Best for teams who need structure. Great templates for different industries. More traditional than Notion but easier for non-technical teams. Expensive but powerful for scaling teams.',
          pricing: 'Basic $8/seat/mo (min 3 seats)',
          bestFor: ['Project Management', 'Team Tasks', 'Client Projects'],
          link: 'https://monday.com'
        },
        {
          name: 'ClickUp',
          description: 'One app to replace them all. Tasks, docs, goals, and chat.',
          ourTake: 'Feature-rich alternative to Monday. Can feel overwhelming but incredibly customizable. Free tier is generous. Great for teams that want everything in one place. Learning curve pays off.',
          pricing: 'Free forever tier, Unlimited $7/user/mo',
          bestFor: ['All-in-One', 'Task Management', 'Goal Tracking'],
          link: 'https://clickup.com'
        }
      ]
    },
    {
      id: 'forms-surveys',
      name: 'Forms & Surveys',
      icon: '📋',
      description: 'For: Customer feedback, lead generation, applications, surveys',
      tools: [
        {
          name: 'Tally',
          description: 'Create forms for free. Unlimited forms and responses, no branding.',
          ourTake: 'The best free form builder. No limits, no branding, beautiful forms. Perfect for customer discovery surveys and lead capture. Integrates with everything via Zapier. Our top pick for bootstrapped startups.',
          pricing: 'Free forever, Pro $29/mo',
          bestFor: ['Unlimited Forms', 'No Branding', 'Customer Surveys'],
          link: 'https://tally.so',
          recommended: true
        },
        {
          name: 'Typeform',
          description: 'Conversational forms that get more responses.',
          ourTake: 'Most engaging form experience. Higher completion rates than traditional forms. Perfect for important surveys where response rate matters. Expensive but worth it for customer research.',
          pricing: 'Free for 10 responses/mo, Basic $25/mo',
          bestFor: ['User Experience', 'High Completion', 'Brand Surveys'],
          link: 'https://typeform.com'
        },
        {
          name: 'Google Forms',
          description: 'Simple, free forms integrated with Google Sheets.',
          ourTake: 'The quickest option. Zero learning curve, automatic spreadsheet integration. Limited design options but perfect for internal use or quick validation. Completely free with no limits.',
          pricing: 'Free',
          bestFor: ['Quick Setup', 'Google Integration', 'Internal Forms'],
          link: 'https://forms.google.com'
        },
        {
          name: 'Airtable Forms',
          description: 'Forms that feed directly into your Airtable database.',
          ourTake: 'Best when you\'re already using Airtable. Forms become database records instantly. Perfect for applications, registrations, or any structured data collection. Limited customization but powerful workflows.',
          pricing: 'Included with Airtable plans',
          bestFor: ['Database Integration', 'Structured Data', 'Workflows'],
          link: 'https://airtable.com/forms'
        },
        {
          name: 'Jotform',
          description: 'Powerful form builder with payment collection and integrations.',
          ourTake: 'Most features in free tier. Great for complex forms with conditional logic. Payment collection built-in. Thousands of templates. Can feel dated but incredibly reliable and feature-rich.',
          pricing: 'Free for 5 forms, Bronze $34/mo',
          bestFor: ['Payment Forms', 'Complex Logic', 'Templates'],
          link: 'https://jotform.com'
        }
      ]
    }
  ];

  const [resourceSearchTerm, setResourceSearchTerm] = useState('');
  const [selectedResourceCategory, setSelectedResourceCategory] = useState('all');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [expandedTools, setExpandedTools] = useState(new Set());
  const [showBeginnerFriendly, setShowBeginnerFriendly] = useState(false);
  const [expandedGuides, setExpandedGuides] = useState(new Set());

  // Learning Guides Component
  // Memoized Countdown Component
  const CountdownTimer = React.memo(({ timeLeft, large = false }) => {
    if (timeLeft.expired) return null;
    
    return (
      <div className={large ? "submission-countdown" : "timer-display"}>
        <div className={`countdown-unit ${large ? 'large' : ''}`}>
          <span className="countdown-value">{timeLeft.days || 0}</span>
          <span className="countdown-label">Days</span>
        </div>
        <div className={`countdown-unit ${large ? 'large' : ''}`}>
          <span className="countdown-value">{String(timeLeft.hours || 0).padStart(2, '0')}</span>
          <span className="countdown-label">Hours</span>
        </div>
        <div className={`countdown-unit ${large ? 'large' : ''}`}>
          <span className="countdown-value">{String(timeLeft.minutes || 0).padStart(2, '0')}</span>
          <span className="countdown-label">Minutes</span>
        </div>
        <div className={`countdown-unit ${large ? 'large' : ''}`}>
          <span className="countdown-value">{String(timeLeft.seconds || 0).padStart(2, '0')}</span>
          <span className="countdown-label">Seconds</span>
        </div>
      </div>
    );
  });

  const LearningGuides = React.memo(({ openGuideModal }) => {
    const [learningSearchTerm, setLearningSearchTerm] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('all');
    const [expandedCards, setExpandedCards] = useState(new Set());
    
    // Learning content structured like resources with expanded founder's guide content
    const learningCategories = [
      {
        id: 'contest-prep',
        name: 'Contest Preparation',
        icon: '🏆',
        description: 'Essential guides for winning the $1,000 Business Challenge',
        priority: 1,
        cards: [
          {
            id: 'pitch-video',
            title: 'Creating Your Pitch Video',
            icon: '📹',
            tags: ['pitch', 'video', 'contest', 'presentation'],
            intro: 'Your pitch video is your chance to share your passion! Whether you\'re still brainstorming or already building, show us what excites you about your idea.',
            sections: [
          {
            title: 'The Science of 60-Second Pitches',
            content: `
              <h4>Why 60 Seconds? The Psychology Behind It</h4>
              <p>Research shows that attention spans peak at 8-10 seconds and decision-making happens within the first 30 seconds. Your pitch must work with human psychology, not against it.</p>
              
              <div class="principle-section">
                <h5>The Neuroscience of Persuasion:</h5>
                <ul>
                  <li><strong>Emotional Hook (0-7 seconds):</strong> Triggers the amygdala for emotional engagement</li>
                  <li><strong>Logical Support (8-30 seconds):</strong> Engages the prefrontal cortex with evidence</li>
                  <li><strong>Social Proof (31-45 seconds):</strong> Activates mirror neurons through testimonials</li>
                  <li><strong>Call to Action (46-60 seconds):</strong> Creates urgency in the decision-making center</li>
                </ul>
              </div>

              <h4>Structure Your 60-Second Pitch:</h4>
              <div class="timeline-structure">
                <div class="time-block">
                  <span class="time-marker">0:00-0:10</span>
                  <h5>The Hook That Hits Different</h5>
                  <ul>
                    <li><strong>Pattern Interrupt:</strong> "What if I told you 73% of [industry] still uses [outdated method]?"</li>
                    <li><strong>Personal Story:</strong> "Last Tuesday, I watched my mom struggle for 2 hours with..."</li>
                    <li><strong>Provocative Question:</strong> "Why do we accept that [common problem] is just 'how things are'?"</li>
                    <li><strong>Shocking Stat:</strong> "Americans waste $[X] billion every year on [problem]"</li>
                  </ul>
                  <div class="pro-tip">
                    <strong>Pro Tip:</strong> Test your hook on 10 people. If 7+ don't lean in wanting more, rewrite it.
                  </div>
                </div>
                
                <div class="time-block">
                  <span class="time-marker">0:10-0:30</span>
                  <h5>Solution Storytelling</h5>
                  <ul>
                    <li><strong>The Vision:</strong> "Imagine if [desired outcome] was as easy as [simple analogy]"</li>
                    <li><strong>The Demo:</strong> Show, don't tell - screen recording, physical product, or vivid description</li>
                    <li><strong>The Differentiator:</strong> "Unlike [competitors], we [unique approach]"</li>
                    <li><strong>The Validation:</strong> "When I showed this to [target customer], they said [actual quote]"</li>
                  </ul>
                  <div class="example-box">
                    <h6>Power Phrases That Work:</h6>
                    <ul>
                      <li>"It's like Uber for..." (familiar analogy)</li>
                      <li>"We're the first to..." (category creation)</li>
                      <li>"Instead of 5 steps, it's just 1 click" (simplification)</li>
                      <li>"Customers save 3 hours per week" (specific benefit)</li>
                    </ul>
                  </div>
                </div>
                
                <div class="time-block">
                  <span class="time-marker">0:30-0:45</span>
                  <h5>Traction That Judges Can't Ignore</h5>
                  <ul>
                    <li><strong>Visual Evidence:</strong> Graph going up and to the right</li>
                    <li><strong>Customer Voices:</strong> Quick testimonial clips or quotes</li>
                    <li><strong>Momentum Metrics:</strong> "In just 2 weeks: 147 signups, 23 paying customers, $1,200 MRR"</li>
                    <li><strong>Partnership Proof:</strong> "Already partnering with [known brand]"</li>
                  </ul>
                  <div class="metrics-framework">
                    <h6>Traction Hierarchy (use your strongest):</h6>
                    <ol>
                      <li>Revenue/Sales</li>
                      <li>Paying Customers</li>
                      <li>Signed Contracts/LOIs</li>
                      <li>Active Users</li>
                      <li>Waitlist Signups</li>
                      <li>Survey Interest</li>
                      <li>Social Media Engagement</li>
                    </ol>
                  </div>
                </div>
                
                <div class="time-block">
                  <span class="time-marker">0:45-0:60</span>
                  <h5>The $1,000 Multiplier Effect</h5>
                  <ul>
                    <li><strong>Specific Allocation:</strong> Show a visual breakdown (pie chart works great)</li>
                    <li><strong>ROI Projection:</strong> "This $1,000 will generate $10,000 in revenue within 90 days"</li>
                    <li><strong>Milestone Map:</strong> "Week 1: Ship MVP, Week 2: Onboard 10 customers..."</li>
                    <li><strong>The Ask:</strong> "With your support, we'll [specific outcome]"</li>
                  </ul>
                  <div class="budget-examples">
                    <h6>Winning Budget Allocations:</h6>
                    <ul>
                      <li><strong>Tech Startup:</strong> $400 development tools, $300 marketing, $200 legal, $100 operations</li>
                      <li><strong>Product Business:</strong> $500 inventory, $300 packaging/branding, $200 marketing</li>
                      <li><strong>Service Business:</strong> $400 tools/software, $300 certifications, $300 marketing</li>
                    </ul>
                  </div>
                </div>
              </div>
            `
          },
          {
            title: 'Video Production Masterclass',
            content: `
              <h4>Professional Quality on Zero Budget</h4>
              <p>You don't need expensive equipment. Your smartphone + these techniques = professional results.</p>
              
              <div class="production-guide">
                <h5>Pre-Production Checklist:</h5>
                <ul>
                  <li>✅ <strong>Script:</strong> Write it out word-for-word (150-180 words for 60 seconds)</li>
                  <li>✅ <strong>Storyboard:</strong> Plan each shot (even stick figures help)</li>
                  <li>✅ <strong>Props:</strong> Product samples, laptop for demos, printed charts</li>
                  <li>✅ <strong>Practice:</strong> Record 5 practice runs (you'll nail it by #6)</li>
                </ul>
              </div>
              
              <div class="filming-setup">
                <h5>DIY Professional Setup:</h5>
                <div class="setup-grid">
                  <div class="setup-item">
                    <h6>📱 Camera</h6>
                    <ul>
                      <li>Use your phone's BACK camera (higher quality)</li>
                      <li>Clean the lens with microfiber cloth</li>
                      <li>Shoot horizontal (landscape) mode</li>
                      <li>Resolution: 1080p minimum, 4K if available</li>
                    </ul>
                  </div>
                  <div class="setup-item">
                    <h6>💡 Lighting</h6>
                    <ul>
                      <li>Face a window during daytime (natural light is best)</li>
                      <li>Evening? Use 2-3 desk lamps pointed at white wall behind camera</li>
                      <li>Avoid overhead lighting (creates shadows)</li>
                      <li>Ring light alternative: Phone flashlight + white paper as diffuser</li>
                    </ul>
                  </div>
                  <div class="setup-item">
                    <h6>🎤 Audio</h6>
                    <ul>
                      <li>Find quietest room (closets work great!)</li>
                      <li>Use earbuds with mic (better than phone mic)</li>
                      <li>Blankets/pillows around you reduce echo</li>
                      <li>Record room tone for 10 seconds (for editing)</li>
                    </ul>
                  </div>
                  <div class="setup-item">
                    <h6>🎬 Background</h6>
                    <ul>
                      <li>Clean, uncluttered (blur in post if needed)</li>
                      <li>Brand-relevant (workshop, office, or neutral)</li>
                      <li>Add depth: sit 3-4 feet from wall</li>
                      <li>Pro tip: Bookshelf = instant credibility</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div class="editing-guide">
                <h5>Free Editing Tools That Don't Suck:</h5>
                <ul>
                  <li><strong>CapCut (Mobile):</strong> Best free option, has everything you need</li>
                  <li><strong>DaVinci Resolve (Desktop):</strong> Hollywood-grade, completely free</li>
                  <li><strong>Canva Video:</strong> Template-based, super beginner-friendly</li>
                  <li><strong>iMovie (Mac/iOS):</strong> Simple but effective</li>
                </ul>
                
                <h6>Essential Edits:</h6>
                <ol>
                  <li><strong>Hook Enhancement:</strong> Add text overlay for opening stat</li>
                  <li><strong>B-Roll Inserts:</strong> Show product/screenshots while you talk</li>
                  <li><strong>Lower Thirds:</strong> Name, title, and key metrics</li>
                  <li><strong>Call-to-Action End Screen:</strong> What you want viewers to do</li>
                  <li><strong>Captions:</strong> 85% watch without sound - use auto-caption tools</li>
                </ol>
              </div>
              
              <div class="performance-tips">
                <h5>On-Camera Confidence Hacks:</h5>
                <ul>
                  <li><strong>Energy Level:</strong> Go 20% higher than feels natural (camera reduces energy)</li>
                  <li><strong>Eye Contact:</strong> Look at lens, not screen. Put arrow pointing to lens</li>
                  <li><strong>Smile Points:</strong> Beginning, when mentioning customers, and closing</li>
                  <li><strong>Hand Gestures:</strong> Keep hands in frame, gesture naturally</li>
                  <li><strong>Posture:</strong> Sit up straight, lean slightly forward (shows engagement)</li>
                  <li><strong>Voice:</strong> Vary your tone, pause for emphasis, speak 10% slower</li>
                </ul>
              </div>
              
              <div class="example-scripts">
                <h5>Winning Script Formulas:</h5>
                
                <div class="script-template">
                  <h6>Formula 1: The Problem-First Approach</h6>
                  <p class="script-example">
                    "Every week, 10,000 small business owners waste 5 hours on inventory management. <em>[pause]</em><br><br>
                    Hi, I'm Sarah, and I spent 6 months talking to restaurant owners about this exact problem.<br><br>
                    That's why we built SnapStock - inventory management that takes 5 minutes, not 5 hours. <em>[show app]</em><br><br>
                    In our beta test, Tony's Pizza saved 4 hours per week and reduced food waste by 30%. <em>[show testimonial]</em><br><br>
                    We already have 47 restaurants on our waitlist, and with this $1,000, we'll onboard our first 20 paying customers.<br><br>
                    Help us give time back to small business owners. Vote for SnapStock."
                  </p>
                </div>
                
                <div class="script-template">
                  <h6>Formula 2: The Story Arc</h6>
                  <p class="script-example">
                    "Last month, I watched my 73-year-old grandma struggle to video call her doctor. <em>[pause]</em><br><br>
                    It took 45 minutes and three family members to help.<br><br>
                    That's when I realized: telehealth isn't built for seniors. So we're building ElderCall. <em>[show interface]</em><br><br>
                    One button. That's it. Press it, and you're connected to your doctor.<br><br>
                    In testing with 20 seniors, 100% could use it without help. <em>[show happy user]</em><br><br>
                    This $1,000 will help us partner with our first senior living community and help 200 residents stay connected to care.<br><br>
                    Let's make healthcare accessible for everyone. Vote ElderCall."
                  </p>
                </div>
              </div>
            `
          },
          {
            title: 'Demonstrate Traction',
            content: `
              <h4>Types of Traction to Showcase:</h4>
              <ul>
                <li><strong>Customer Validation:</strong> Interview recordings, survey results</li>
                <li><strong>Market Demand:</strong> Waitlist size, email subscribers</li>
                <li><strong>Revenue Validation:</strong> Pre-orders, LOIs, pilot customers</li>
                <li><strong>Product Validation:</strong> Beta user feedback, usage metrics</li>
                <li><strong>Social Proof:</strong> Community engagement, testimonials</li>
              </ul>
              
              <h4>Present Your Evidence Visually:</h4>
              <ul>
                <li>Screenshot of spreadsheet with customer interviews</li>
                <li>Graph showing survey results</li>
                <li>Email inbox showing customer interest</li>
                <li>Waitlist landing page with signup numbers</li>
                <li>Testimonial quotes overlaid on video</li>
              </ul>
            `
          },
          {
            title: 'Be Authentic',
            content: `
              <h4>Production Best Practices:</h4>
              <ul>
                <li><strong>Keep it real:</strong> Don't overscript - enthusiasm beats perfection</li>
                <li><strong>Show your work:</strong> Screen recordings of customer interviews, your MVP, actual data</li>
                <li><strong>Quick cuts:</strong> 1 minute goes fast - edit tightly</li>
                <li><strong>Captions:</strong> Add text overlays for key metrics and quotes</li>
                <li><strong>Energy:</strong> Your excitement about customer feedback should be contagious</li>
              </ul>
              
              <div class="checklist-grid">
                <div class="checklist-column">
                  <h5>✅ What Judges Look For:</h5>
                  <ul>
                    <li>Clear evidence of customer validation</li>
                    <li>Specific use of the $1,000</li>
                    <li>Realistic 30-day milestones</li>
                    <li>Founder-market fit</li>
                    <li>Evidence this will actually launch</li>
                  </ul>
                </div>
                <div class="checklist-column">
                  <h5>❌ Red Flags to Avoid:</h5>
                  <ul>
                    <li>"I think customers will want this"</li>
                    <li>No evidence of talking to real people</li>
                    <li>Vague budget ("marketing stuff")</li>
                    <li>Unrealistic timeline</li>
                    <li>Solution looking for a problem</li>
                  </ul>
                </div>
              </div>
            `
          }
            ]
          },
          {
            id: 'share-idea',
            title: 'Sharing Your Idea',
            icon: '💡',
            tags: ['ideas', 'getting-started', 'brainstorming', 'contest'],
            intro: 'Have an idea? That\'s all you need to apply! We welcome ideas at ANY stage - from napkin sketches to validated concepts.',
            sections: [
          {
            title: 'The Art & Science of Idea Validation',
            content: `
              <h4>From Shower Thought to Fundable Business</h4>
              <p>Every billion-dollar company started with someone saying "What if...?" Here's how to transform your idea into something investors can't ignore.</p>
              
              <div class="validation-framework">
                <h5>The 5-Stage Idea Evolution Framework:</h5>
                
                <div class="stage-card">
                  <span class="stage-number">Stage 1</span>
                  <h6>Curiosity ("I wonder if...")</h6>
                  <ul>
                    <li><strong>What it looks like:</strong> You notice a problem or inefficiency</li>
                    <li><strong>Example:</strong> "I wonder if other parents struggle with finding last-minute babysitters"</li>
                    <li><strong>Next step:</strong> Write down 10 variations of the problem</li>
                    <li><strong>Time needed:</strong> 1-2 hours of thinking</li>
                  </ul>
                </div>
                
                <div class="stage-card">
                  <span class="stage-number">Stage 2</span>
                  <h6>Hypothesis ("I believe that...")</h6>
                  <ul>
                    <li><strong>What it looks like:</strong> You form a specific belief about the problem</li>
                    <li><strong>Example:</strong> "I believe 70% of parents cancel plans due to babysitter issues"</li>
                    <li><strong>Next step:</strong> Create a simple survey (Google Forms works)</li>
                    <li><strong>Time needed:</strong> 1 day to create and share survey</li>
                  </ul>
                </div>
                
                <div class="stage-card">
                  <span class="stage-number">Stage 3</span>
                  <h6>Discovery ("I learned that...")</h6>
                  <ul>
                    <li><strong>What it looks like:</strong> Real data from real people</li>
                    <li><strong>Example:</strong> "I learned that 8/10 parents would pay $20/month for guaranteed backup sitters"</li>
                    <li><strong>Next step:</strong> Talk to 10 people who took your survey</li>
                    <li><strong>Time needed:</strong> 1 week of conversations</li>
                  </ul>
                </div>
                
                <div class="stage-card">
                  <span class="stage-number">Stage 4</span>
                  <h6>Solution ("What if we...")</h6>
                  <ul>
                    <li><strong>What it looks like:</strong> A specific approach to solving the validated problem</li>
                    <li><strong>Example:</strong> "What if we created a network of pre-vetted backup sitters?"</li>
                    <li><strong>Next step:</strong> Create a one-page mockup or description</li>
                    <li><strong>Time needed:</strong> 2-3 days to design solution</li>
                  </ul>
                </div>
                
                <div class="stage-card">
                  <span class="stage-number">Stage 5</span>
                  <h6>Validation ("People will pay because...")</h6>
                  <ul>
                    <li><strong>What it looks like:</strong> Evidence of willingness to pay</li>
                    <li><strong>Example:</strong> "23 parents pre-registered and 5 paid deposits"</li>
                    <li><strong>Next step:</strong> Launch a simple landing page with payment option</li>
                    <li><strong>Time needed:</strong> 1 week to test payment intent</li>
                  </ul>
                </div>
              </div>
              
              <div class="tip-box">
                <h4>You Can Apply at ANY Stage!</h4>
                <p>We fund ideas from Stage 1 to Stage 5. The key is showing your thought process and commitment to learning.</p>
              </div>
              </div>
              
              <h4>The Mom Test: How to Talk to Customers Without Bias</h4>
              <p>Named after the book by Rob Fitzpatrick, this method helps you get honest feedback (even your mom won't lie!).</p>
              
              <div class="mom-test-rules">
                <h5>The 3 Golden Rules:</h5>
                <ol>
                  <li><strong>Talk about their life, not your idea</strong>
                    <ul>
                      <li>❌ Wrong: "Do you think my app idea is good?"</li>
                      <li>✅ Right: "Walk me through the last time you needed a babysitter"</li>
                    </ul>
                  </li>
                  <li><strong>Ask about specifics in the past, not hypotheticals</strong>
                    <ul>
                      <li>❌ Wrong: "Would you use an app for this?"</li>
                      <li>✅ Right: "What did you do the last time this happened?"</li>
                    </ul>
                  </li>
                  <li><strong>Listen more than you talk</strong>
                    <ul>
                      <li>Your ratio should be 80% listening, 20% asking questions</li>
                      <li>Never pitch during discovery - just learn</li>
                    </ul>
                  </li>
                </ol>
              </div>
              
              <h4>Customer Discovery Tactical Playbook:</h4>
              
              <div class="discovery-playbook">
                <h5>🎯 Finding Your First 100 Customers</h5>
                
                <div class="channel-strategy">
                  <h6>Where to Find Them (Ranked by Effectiveness):</h6>
                  
                  <div class="channel-item">
                    <strong>1. Reddit Communities</strong>
                    <ul>
                      <li>Search: "[your problem] reddit"</li>
                      <li>Look for complaint threads</li>
                      <li>DM active complainers</li>
                      <li>Success rate: 30-40% response</li>
                    </ul>
                    <div class="example-box">
                      <strong>Example:</strong> "Hey, I saw your post about struggling with [problem]. I'm researching this exact issue. Would you be open to a quick 15-min call? I'll send you a $10 Starbucks card as thanks."
                    </div>
                  </div>
                  
                  <div class="channel-item">
                    <strong>2. LinkedIn Outreach</strong>
                    <ul>
                      <li>Filter by: Job title + Company size + Location</li>
                      <li>Send 20 messages per day (LinkedIn limit)</li>
                      <li>Mention mutual connection or shared interest</li>
                      <li>Success rate: 20-25% response</li>
                    </ul>
                  </div>
                  
                  <div class="channel-item">
                    <strong>3. Facebook Groups</strong>
                    <ul>
                      <li>Join 5-10 relevant groups</li>
                      <li>Contribute value for 1 week first</li>
                      <li>Then post about your research</li>
                      <li>Success rate: 15-20% response</li>
                    </ul>
                  </div>
                  
                  <div class="channel-item">
                    <strong>4. Cold Email</strong>
                    <ul>
                      <li>Use Hunter.io to find emails</li>
                      <li>Subject: "Quick question about [their company]"</li>
                      <li>Keep it under 50 words</li>
                      <li>Success rate: 5-10% response</li>
                    </ul>
                  </div>
                </div>
                
                <div class="conversation-framework">
                  <h5>🗣️ The Perfect Customer Interview Script</h5>
                  
                  <div class="script-section">
                    <h6>Opening (Build Rapport - 2 min)</h6>
                    <p>"Thanks so much for taking the time. Before we dive in, I'd love to hear a bit about your role at [company] and what your typical day looks like."</p>
                  </div>
                  
                  <div class="script-section">
                    <h6>Problem Discovery (Go Deep - 10 min)</h6>
                    <ol>
                      <li><strong>The Story Question:</strong><br>
                        "Can you walk me through the last time you dealt with [problem area]? Start from the beginning - what triggered it?"</li>
                      
                      <li><strong>The Pain Question:</strong><br>
                        "What's the most frustrating part about [specific thing they mentioned]?"</li>
                      
                      <li><strong>The Frequency Question:</strong><br>
                        "How often does this come up? Daily? Weekly?"</li>
                      
                      <li><strong>The Cost Question:</strong><br>
                        "If you had to put a number on it, how much time/money/energy does this drain?"</li>
                      
                      <li><strong>The Current Solution:</strong><br>
                        "How are you solving this today? Walk me through your current process."</li>
                      
                      <li><strong>The Budget Question:</strong><br>
                        "What are you currently spending on [current solution]? What would you pay to make this problem go away?"</li>
                    </ol>
                  </div>
                  
                  <div class="script-section">
                    <h6>Solution Testing (Only if They're Engaged - 5 min)</h6>
                    <p>"Based on what you've shared, I'm exploring an idea around [brief description]. What's your gut reaction to that?"</p>
                    <p><em>Then shut up and listen for 2 full minutes.</em></p>
                  </div>
                  
                  <div class="script-section">
                    <h6>The Close (Lock in Next Steps - 3 min)</h6>
                    <ul>
                      <li>"Would you be interested in testing an early version?"</li>
                      <li>"Can I follow up in 2 weeks with a prototype?"</li>
                      <li>"Who else should I talk to about this?"</li>
                    </ul>
                  </div>
                </div>
                
                <div class="documentation-system">
                  <h5>📊 Turn Conversations into Evidence</h5>
                  
                  <div class="tracking-template">
                    <h6>Customer Discovery CRM (Google Sheets Template)</h6>
                    <table class="data-table">
                      <tr>
                        <th>Date</th>
                        <th>Name</th>
                        <th>Company</th>
                        <th>Problem Severity (1-10)</th>
                        <th>Current Solution</th>
                        <th>Monthly Budget</th>
                        <th>Best Quote</th>
                        <th>Next Step</th>
                      </tr>
                      <tr>
                        <td>3/15</td>
                        <td>Sarah M.</td>
                        <td>TechCo</td>
                        <td>8</td>
                        <td>Excel + Manual</td>
                        <td>$200</td>
                        <td>"I waste 10 hrs/week on this"</td>
                        <td>Demo scheduled</td>
                      </tr>
                    </table>
                  </div>
                  
                  <div class="insight-synthesis">
                    <h6>Weekly Insight Synthesis</h6>
                    <p>Every Friday, spend 1 hour answering these questions:</p>
                    <ol>
                      <li>What pattern showed up in 3+ conversations?</li>
                      <li>What surprised me this week?</li>
                      <li>What assumption was proven wrong?</li>
                      <li>What's the #1 pain point I keep hearing?</li>
                      <li>What feature request came up most?</li>
                    </ol>
                  </div>
                </div>
              </div>
                </ul>
              </div>
            `
          },
          {
            title: 'Competitive Intelligence Masterclass',
            content: `
              <h4>Turn Competition into Your Advantage</h4>
              <p>Your competitors have spent millions educating the market. Learn from their mistakes and find the gaps they've left behind.</p>
              
              <div class="competitive-research-framework">
                <h5>🕵️ The 7-Layer Competitive Analysis</h5>
                
                <div class="analysis-layer">
                  <h6>Layer 1: The Landscape Map</h6>
                  <ul>
                    <li><strong>Direct Competitors:</strong> Same solution, same market</li>
                    <li><strong>Indirect Competitors:</strong> Different solution, same problem</li>
                    <li><strong>Substitute Products:</strong> Different approach entirely</li>
                    <li><strong>Future Threats:</strong> Who could enter this space?</li>
                  </ul>
                  <div class="pro-tip">
                    <strong>Tool:</strong> Use G2, Capterra, or ProductHunt to find all players
                  </div>
                </div>
                
                <div class="analysis-layer">
                  <h6>Layer 2: The Customer Voice Mining</h6>
                  <p>Your competitors' unhappy customers are your best teachers.</p>
                  <ul>
                    <li><strong>G2/Capterra Reviews:</strong> Filter by 1-3 stars</li>
                    <li><strong>Reddit Complaints:</strong> "[competitor] + sucks/broken/alternative"</li>
                    <li><strong>Twitter Search:</strong> "[competitor] + frustrated/annoyed/hate"</li>
                    <li><strong>App Store Reviews:</strong> Sort by most critical</li>
                  </ul>
                  <div class="example-box">
                    <strong>Gold Mine Phrases to Search:</strong>
                    <ul>
                      <li>"I wish [competitor] would..."</li>
                      <li>"The one thing [competitor] doesn't do..."</li>
                      <li>"Switching from [competitor] because..."</li>
                    </ul>
                  </div>
                </div>
                
                <div class="analysis-layer">
                  <h6>Layer 3: The Pricing Psychology</h6>
                  <table class="pricing-analysis">
                    <tr>
                      <th>Competitor</th>
                      <th>Entry Price</th>
                      <th>Sweet Spot</th>
                      <th>Enterprise</th>
                      <th>Pricing Model</th>
                    </tr>
                    <tr>
                      <td>Example: Slack</td>
                      <td>Free</td>
                      <td>$8/user/mo</td>
                      <td>$15/user/mo</td>
                      <td>Per seat</td>
                    </tr>
                  </table>
                  <p><strong>Your Opportunity:</strong> Price 20% below their sweet spot OR create a completely different model (usage-based, flat fee, etc.)</p>
                </div>
                
                <div class="analysis-layer">
                  <h6>Layer 4: The Feature Gap Analysis</h6>
                  <div class="feature-matrix">
                    <p>Create a spreadsheet with these columns:</p>
                    <ul>
                      <li>✅ Features customers love (keep these)</li>
                      <li>❌ Features customers ignore (skip these)</li>
                      <li>⭐ Features customers request (build these)</li>
                      <li>🚀 Features no one offers (innovate here)</li>
                    </ul>
                  </div>
                </div>
                
                <div class="analysis-layer">
                  <h6>Layer 5: The Go-to-Market Reverse Engineering</h6>
                  <ul>
                    <li><strong>SEO Analysis:</strong> Use Ahrefs/SEMrush to see their top keywords</li>
                    <li><strong>Ad Spy:</strong> Facebook Ad Library to see their creative</li>
                    <li><strong>Content Strategy:</strong> What blog posts get most shares?</li>
                    <li><strong>Partnership Map:</strong> Who integrates with them?</li>
                  </ul>
                </div>
                
                <div class="analysis-layer">
                  <h6>Layer 6: The Achilles Heel Finder</h6>
                  <p>Every company has weaknesses. Find them:</p>
                  <ul>
                    <li><strong>Too Enterprise:</strong> You be simple</li>
                    <li><strong>Too Expensive:</strong> You be affordable</li>
                    <li><strong>Too Complex:</strong> You be intuitive</li>
                    <li><strong>Too Slow:</strong> You be instant</li>
                    <li><strong>Poor Support:</strong> You be responsive</li>
                  </ul>
                </div>
                
                <div class="analysis-layer">
                  <h6>Layer 7: The Positioning Statement</h6>
                  <div class="positioning-formula">
                    <p><strong>Formula:</strong> Unlike [competitor], we [key differentiator] so that [target customer] can [desired outcome] without [major pain point].</p>
                    <p><strong>Example:</strong> "Unlike Salesforce, we're built mobile-first so that field sales reps can update deals in 10 seconds without fighting a complex interface."</p>
                  </div>
                </div>
              </div>
              
              <div class="competitive-intel-tools">
                <h5>🔧 Competitive Intelligence Toolkit</h5>
                <div class="tools-grid">
                  <div class="tool-card">
                    <strong>For Tracking Competitors:</strong>
                    <ul>
                      <li>Crayon (monitors everything)</li>
                      <li>Visualping (tracks website changes)</li>
                      <li>Google Alerts (free option)</li>
                    </ul>
                  </div>
                  <div class="tool-card">
                    <strong>For Analysis:</strong>
                    <ul>
                      <li>SimilarWeb (traffic analysis)</li>
                      <li>BuiltWith (tech stack)</li>
                      <li>Glassdoor (employee insights)</li>
                    </ul>
                  </div>
                </div>
              </div>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr>
                    <td>Key Feature 1</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr>
                    <td>Key Feature 2</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr>
                    <td>Target Market</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                </table>
              </div>
            `
          },
          {
            title: 'Real Problems = Real Revenue',
            content: `
              <h4>Evidence-Based Problem Validation:</h4>
              
              <div class="evidence-requirements">
                <h5>Things That Can Strengthen Your Application (Optional):</h5>
                <ul>
                  <li>Any conversations you've had about your idea</li>
                  <li>Problems you've noticed or experienced yourself</li>
                  <li>Research you've done (even just Google searches!)</li>
                  <li>Why this matters to you personally</li>
                  <li>Your unique perspective or insight</li>
                </ul>
              </div>
              
              <div class="evidence-examples">
                <div class="example-column">
                  <h5>✅ Strong Evidence Examples:</h5>
                  <ul>
                    <li>"8 out of 10 restaurant owners said they waste 3+ hours weekly on inventory"</li>
                    <li>"Sarah from Cafe Luna already pays $200/month for 3 different tools"</li>
                    <li>"17 customers signed LOIs committing to $50/month subscriptions"</li>
                    <li>"Our waitlist grew to 134 people in 10 days with zero advertising"</li>
                  </ul>
                </div>
                
                <div class="example-column">
                  <h5>❌ Weak Evidence Examples:</h5>
                  <ul>
                    <li>"I think people will like this"</li>
                    <li>"My friends said it's a good idea"</li>
                    <li>"There's nothing like this in the market"</li>
                    <li>"Everyone needs this"</li>
                  </ul>
                </div>
              </div>
              
              <div class="action-box">
                <p><strong>The Bottom Line:</strong> Start where you are! Your $1,000 funding helps turn ideas into reality - whether you're still brainstorming or already building.</p>
              </div>
            `
          }
            ]
          },
          {
            id: 'use-funds',
            title: 'Using Your $1,000',
            icon: '💰',
            tags: ['budget', 'funding', 'expenses', 'contest'],
            intro: 'Strategic allocation of your $1,000 can make the difference between launching successfully and running out of runway.',
            sections: [
          {
            title: 'The $1,000 Startup Playbook',
            content: `
              <h4>Turn $1,000 into Your First $10,000</h4>
              <p>Based on analysis of 500+ micro-funded startups, here's exactly how successful founders allocate their first $1,000.</p>
              
              <div class="allocation-strategies">
                <h5>🎯 The 3 Proven Allocation Strategies</h5>
                
                <div class="strategy-card">
                  <h6>Strategy 1: The Lean Validator ($1,000 → Proof)</h6>
                  <p><strong>Best for:</strong> Unvalidated ideas, first-time founders</p>
                  <div class="budget-visual">
                    <div class="budget-item" style="width: 60%">
                      <span>Customer Discovery (60% - $600)</span>
                      <ul>
                        <li>$200 - Incentives for 40 interviews ($5 each)</li>
                        <li>$150 - Survey tools & paid respondents</li>
                        <li>$100 - Travel to meet customers</li>
                        <li>$150 - Prototype/mockup development</li>
                      </ul>
                    </div>
                    <div class="budget-item" style="width: 30%">
                      <span>MVP Development (30% - $300)</span>
                      <ul>
                        <li>$100 - No-code tools (3 months)</li>
                        <li>$100 - Domain, hosting, basic tools</li>
                        <li>$100 - Design assets & templates</li>
                      </ul>
                    </div>
                    <div class="budget-item" style="width: 10%">
                      <span>Legal/Ops (10% - $100)</span>
                    </div>
                  </div>
                  <p><strong>Success Metric:</strong> 10 paying customer commitments</p>
                </div>
                
                <div class="strategy-card">
                  <h6>Strategy 2: The Speed Launcher ($1,000 → Revenue)</h6>
                  <p><strong>Best for:</strong> Validated ideas, technical founders</p>
                  <div class="budget-visual">
                    <div class="budget-item" style="width: 40%">
                      <span>Product Development (40% - $400)</span>
                      <ul>
                        <li>$200 - AI/API credits for development</li>
                        <li>$100 - Premium tools & subscriptions</li>
                        <li>$100 - UI/UX templates & assets</li>
                      </ul>
                    </div>
                    <div class="budget-item" style="width: 40%">
                      <span>Growth & Marketing (40% - $400)</span>
                      <ul>
                        <li>$200 - Paid ads micro-testing</li>
                        <li>$100 - Email/SMS marketing tools</li>
                        <li>$100 - Content & creative production</li>
                      </ul>
                    </div>
                    <div class="budget-item" style="width: 20%">
                      <span>Operations (20% - $200)</span>
                    </div>
                  </div>
                  <p><strong>Success Metric:</strong> $1,000 MRR within 60 days</p>
                </div>
                
                <div class="strategy-card">
                  <h6>Strategy 3: The Community Builder ($1,000 → Audience)</h6>
                  <p><strong>Best for:</strong> Content creators, B2C products</p>
                  <div class="budget-visual">
                    <div class="budget-item" style="width: 50%">
                      <span>Content & Community (50% - $500)</span>
                      <ul>
                        <li>$200 - Video/podcast equipment</li>
                        <li>$150 - Community platform (3 months)</li>
                        <li>$150 - Content creation tools</li>
                      </ul>
                    </div>
                    <div class="budget-item" style="width: 30%">
                      <span>Audience Growth (30% - $300)</span>
                      <ul>
                        <li>$150 - Influencer partnerships</li>
                        <li>$150 - Paid social promotion</li>
                      </ul>
                    </div>
                    <div class="budget-item" style="width: 20%">
                      <span>Product Dev (20% - $200)</span>
                    </div>
                  </div>
                  <p><strong>Success Metric:</strong> 1,000 engaged community members</p>
                </div>
              </div>
              
              <div class="roi-calculator">
                <h5>📈 The $1,000 ROI Calculator</h5>
                <div class="calculator-framework">
                  <p><strong>Your Success Formula:</strong></p>
                  <ol>
                    <li><strong>Customer Acquisition Cost (CAC):</strong> How much to get one customer?
                      <ul><li>Example: $50 in ads ÷ 5 signups = $10 CAC</li></ul>
                    </li>
                    <li><strong>Customer Lifetime Value (LTV):</strong> How much will they pay you?
                      <ul><li>Example: $30/month × 6 months = $180 LTV</li></ul>
                    </li>
                    <li><strong>The Golden Ratio:</strong> LTV should be 3x+ your CAC
                      <ul><li>Example: $180 LTV ÷ $10 CAC = 18x (excellent!)</li></ul>
                    </li>
                  </ol>
                  <div class="pro-tip">
                    <strong>Pro Tip:</strong> With $1,000, you can afford to acquire 20 customers at $50 CAC. If each pays $50/month, that's $1,000 MRR on day one!
                  </div>
                </div>
              </div>
              
              <div class="tool-stack">
                <h5>🔧 The $1,000 Essential Tool Stack</h5>
                <div class="tools-by-category">
                  <div class="tool-category">
                    <h6>Development (Choose One Path)</h6>
                    <div class="tool-option">
                      <strong>No-Code Path:</strong>
                      <ul>
                        <li>Bubble.io - $32/mo (full apps)</li>
                        <li>Webflow - $29/mo (marketing sites)</li>
                        <li>Softr - $32/mo (data-driven apps)</li>
                      </ul>
                    </div>
                    <div class="tool-option">
                      <strong>AI-Assisted Code Path:</strong>
                      <ul>
                        <li>Cursor Pro - $20/mo</li>
                        <li>Vercel - $20/mo (hosting)</li>
                        <li>Supabase - Free tier (database)</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="tool-category">
                    <h6>Marketing & Growth</h6>
                    <ul>
                      <li><strong>Email:</strong> ConvertKit free up to 300 subscribers</li>
                      <li><strong>Analytics:</strong> PostHog free tier</li>
                      <li><strong>Social:</strong> Buffer free for 3 accounts</li>
                      <li><strong>SEO:</strong> Ubersuggest $12/mo</li>
                    </ul>
                  </div>
                  
                  <div class="tool-category">
                    <h6>Operations</h6>
                    <ul>
                      <li><strong>Payments:</strong> Stripe (2.9% + 30¢)</li>
                      <li><strong>Support:</strong> Tawk.to (free)</li>
                      <li><strong>CRM:</strong> HubSpot free tier</li>
                      <li><strong>Legal:</strong> Stripe Atlas ($500) or local LLC</li>
                    </ul>
                  </div>
                </div>
              </div>
            `
          },
          {
            title: 'Test Marketing Channels',
            content: `
              <h4>Channel Testing Playbook:</h4>
              
              <div class="tier-strategy">
                <h5>Tier 1: Low-Cost, High-Impact</h5>
                
                <div class="channel-card">
                  <h6>Content Marketing</h6>
                  <ul>
                    <li>Start a blog/newsletter in your niche</li>
                    <li>Guest post on relevant sites</li>
                    <li>Create valuable free tools/calculators</li>
                  </ul>
                </div>
                
                <div class="channel-card">
                  <h6>Community Marketing</h6>
                  <ul>
                    <li>Become valuable in 3-5 communities first</li>
                    <li>Share insights, not just promotions</li>
                    <li>Host AMAs or workshops</li>
                  </ul>
                </div>
                
                <div class="channel-card">
                  <h6>Social Proof Building</h6>
                  <ul>
                    <li>Case studies from beta users</li>
                    <li>Testimonials and reviews</li>
                    <li>User-generated content</li>
                  </ul>
                </div>
              </div>
              
              <div class="tier-strategy">
                <h5>Tier 2: Paid Experiments</h5>
                
                <div class="channel-card">
                  <h6>Micro-Influencers</h6>
                  <ul>
                    <li>Find 5-10 nano influencers (<10k followers)</li>
                    <li>Offer product for honest review</li>
                    <li>Track referral codes</li>
                  </ul>
                </div>
                
                <div class="channel-card">
                  <h6>Paid Ads Testing</h6>
                  <ul>
                    <li>Start with $5/day budgets</li>
                    <li>Test 3-5 different audiences</li>
                    <li>Focus on one platform first (FB, Google, or LinkedIn)</li>
                  </ul>
                </div>
              </div>
              
              <div class="tracking-setup">
                <h5>Tracking Setup:</h5>
                <ul>
                  <li>UTM parameters for all links</li>
                  <li>Conversion pixel installation</li>
                  <li>Attribution survey ("How did you hear about us?")</li>
                  <li>Weekly channel performance review</li>
                </ul>
              </div>
            `
          },
          {
            title: 'Invest in Essential Tools',
            content: `
              <h4>The Non-Negotiable Stack:</h4>
              
              <div class="tool-categories">
                <div class="tool-category">
                  <h5>Analytics & Tracking</h5>
                  <ul>
                    <li>Google Analytics 4 (free)</li>
                    <li>Hotjar or Clarity (free tier)</li>
                    <li>Mixpanel or Amplitude (free tier)</li>
                  </ul>
                </div>
                
                <div class="tool-category">
                  <h5>Customer Communication</h5>
                  <ul>
                    <li>Email: ConvertKit or Mailchimp</li>
                    <li>Support: Crisp or Intercom (free tier)</li>
                    <li>Community: Discord or Circle</li>
                  </ul>
                </div>
                
                <div class="tool-category">
                  <h5>Productivity & Operations</h5>
                  <ul>
                    <li>Notion for documentation</li>
                    <li>Calendly for scheduling</li>
                    <li>Canva for design needs</li>
                    <li>Loom for async communication</li>
                  </ul>
                </div>
                
                <div class="tool-category">
                  <h5>Development Tools</h5>
                  <ul>
                    <li>Version control: GitHub (free)</li>
                    <li>Error tracking: Sentry (free tier)</li>
                    <li>Uptime monitoring: UptimeRobot (free)</li>
                  </ul>
                </div>
              </div>
              
              <div class="avoid-spending">
                <h5>❌ Where NOT to Spend:</h5>
                <ul>
                  <li>Premium themes/templates (use free ones)</li>
                  <li>Expensive logo design (use Canva)</li>
                  <li>Multiple tool subscriptions (consolidate)</li>
                  <li>Fancy office space or equipment</li>
                  <li>Premature scaling expenses</li>
                </ul>
              </div>
            `
          }
            ]
          },
          {
            id: 'vibe-coding',
            title: 'The Power of Vibe Coding',
            icon: '🚀',
            tags: ['vibe-coding', 'ai', 'mvp', 'contest', 'technical'],
            intro: 'Vibe coding is the art of building products through natural language and AI collaboration. Ship your MVP in days, not months.',
            sections: [
          {
            title: 'What is Vibe Coding?',
            content: `
              <p>Vibe coding is the art of building products through natural language and AI collaboration. Instead of spending months learning to code, you can ship your MVP in days by effectively directing AI to write code for you. It's not about being a programmer—it's about being a clear communicator with a strong product vision.</p>
              
              <div class="comparison-grid">
                <div class="path-comparison">
                  <h5>Traditional Path:</h5>
                  <ul>
                    <li>6-12 months learning to code</li>
                    <li>$10,000+ on bootcamps or courses</li>
                    <li>Another 6 months building your first real project</li>
                    <li>High chance of giving up before shipping</li>
                  </ul>
                </div>
                
                <div class="path-comparison">
                  <h5>Vibe Coding Path:</h5>
                  <ul>
                    <li>1 week learning the tools and principles</li>
                    <li>$20-50/month on AI tools</li>
                    <li>2-4 weeks to working MVP</li>
                    <li>Ship fast, iterate based on real feedback</li>
                  </ul>
                </div>
              </div>
              
              <div class="warning-box">
                <strong>Reality Check:</strong> After 6+ months and 2500+ prompts, vibe coding requires discipline and strategy. It's not magic—it's a skill that needs practice and the right approach.
              </div>
            `
          },
          {
            title: 'Step 1: Define Your Vision Clearly',
            content: `
              <h4>Start with Crystal Clear Vision</h4>
              <p><strong>Rule #1:</strong> If your input is vague or messy, the output will be too. Remember: garbage in, garbage out.</p>
              
              <div class="principle-section">
                <h5>Vision Planning Process:</h5>
                <ol>
                  <li><strong>Product Perspective:</strong> What problem does this solve?</li>
                  <li><strong>User Perspective:</strong> Who uses this and why?</li>
                  <li><strong>Technical Perspective:</strong> How will it work?</li>
                  <li><strong>Business Perspective:</strong> How does it make money?</li>
                </ol>
                
                <div class="ai-tools">
                  <h6>💡 Pro Tip: Use Gemini 2.0 Flash</h6>
                  <p>Use Google AI Studio with Gemini 2.0 Flash (free) to help structure your thoughts:</p>
                  <ul>
                    <li>Outline product goals comprehensively</li>
                    <li>Map out user journeys</li>
                    <li>Create technical architecture</li>
                    <li>Generate detailed prompts for Cursor</li>
                  </ul>
                </div>
              </div>
              
              <h4>Plan Your UI/UX First</h4>
              <div class="principle-section">
                <p><strong>Before writing any code:</strong> Design your interface and user experience completely.</p>
                
                <h5>UI Planning Tools:</h5>
                <ul>
                  <li><strong>v0.dev:</strong> AI-powered UI component generation</li>
                  <li><strong>21st.dev:</strong> Massive component library with AI prompts</li>
                  <li><strong>Figma:</strong> Professional mockups (has free tier)</li>
                  <li><strong>Excalidraw:</strong> Quick wireframes and flows</li>
                </ul>
                
                <div class="warning-box">
                  <strong>Critical:</strong> Create reusable components (buttons, cards, modals) from day one. This saves massive time later.
                </div>
              </div>
            `
          },
          {
            title: 'Step 2: Master Your Tech Stack',
            content: `
              <h4>Choose a Popular, Well-Documented Stack</h4>
              <p>AI models are trained on public data. The more common the stack, the better the AI assistance.</p>
              
              <div class="principle-section">
                <h5>Recommended Stack for Beginners:</h5>
                <ul>
                  <li><strong>Next.js 14:</strong> Full-stack React framework</li>
                  <li><strong>Supabase:</strong> Database + Authentication</li>
                  <li><strong>Tailwind CSS:</strong> Utility-first styling</li>
                  <li><strong>Vercel:</strong> One-click deployment</li>
                </ul>
                
                <div class="example-box">
                  <h6>Why This Stack?</h6>
                  <ul>
                    <li>Massive community and documentation</li>
                    <li>AI knows these tools extremely well</li>
                    <li>Minimal configuration needed</li>
                    <li>Free tiers for everything</li>
                  </ul>
                </div>
              </div>
              
              <h4>Essential Tool Setup</h4>
              <div class="principle-section">
                <h5>1. Cursor Configuration</h5>
                <ul>
                  <li>Create comprehensive .cursorrules file</li>
                  <li>Include your tech stack details</li>
                  <li>Add coding patterns and conventions</li>
                  <li>List common mistakes to avoid</li>
                </ul>
                
                <h5>2. Instructions Folder</h5>
                <ul>
                  <li>Create /instructions directory</li>
                  <li>Add markdown files with examples</li>
                  <li>Document component patterns</li>
                  <li>Include API documentation</li>
                </ul>
                
                <div class="ai-tools">
                  <h6>Resource: cursor.directory</h6>
                  <p>Find pre-made Cursor rules for your tech stack at cursor.directory</p>
                </div>
              </div>
            `
          },
          {
            title: 'Step 3: Git & Version Control',
            content: `
              <h4>Git Will Save Your Life</h4>
              <p><strong>Non-negotiable:</strong> You MUST use Git. AI will mess things up. Without Git, your codebase can be destroyed.</p>
              
              <div class="principle-section">
                <h5>Essential Git Workflow:</h5>
                <ol>
                  <li><strong>Initialize:</strong> git init at project start</li>
                  <li><strong>Commit Often:</strong> After EVERY working feature</li>
                  <li><strong>Branch:</strong> New branch for each major feature</li>
                  <li><strong>Push:</strong> To GitHub after every session</li>
                </ol>
                
                <div class="example-box">
                  <h6>Git Commands You Need:</h6>
                  <pre>
git init                    # Start version control
git add .                   # Stage all changes
git commit -m "Add login"   # Save checkpoint
git push                    # Backup to GitHub
git checkout -b feature     # New feature branch
git checkout main          # Return to main
git reset --hard HEAD~1    # Undo last commit
</pre>
                </div>
                
                <div class="warning-box">
                  <strong>Golden Rule:</strong> If AI breaks something and you don't have Git, you're starting over. Don't learn this the hard way.
                </div>
              </div>
            `
          },
          {
            title: 'Step 4: Master AI Prompting',
            content: `
              <h4>Craft Detailed Prompts</h4>
              <p><strong>Remember:</strong> Garbage in, garbage out. Vague prompts = bad code.</p>
              
              <div class="principle-section">
                <h5>The Anatomy of a Perfect Prompt:</h5>
                <ol>
                  <li><strong>Context:</strong> What feature are you building?</li>
                  <li><strong>Specifics:</strong> Exact requirements and constraints</li>
                  <li><strong>Tech Stack:</strong> Mention specific versions and libraries</li>
                  <li><strong>Patterns:</strong> Reference existing code patterns</li>
                  <li><strong>Edge Cases:</strong> What could go wrong?</li>
                </ol>
                
                <div class="prompt-comparison">
                  <div class="bad-prompt">
                    <h6>❌ Bad Prompt:</h6>
                    <pre>"Build me a dashboard"</pre>
                  </div>
                  
                  <div class="good-prompt">
                    <h6>✅ Good Prompt:</h6>
                    <pre>"Create a dashboard page for authenticated users showing:
- Welcome message with user's name from Supabase auth
- 3 metric cards: total revenue, active users, conversion rate
- Line chart showing revenue over last 30 days using Recharts
- Recent activity table with pagination (10 items per page)
- Mobile responsive using Tailwind grid
- Loading skeletons while data fetches
- Error states if API calls fail
- Follow the card component pattern in /components/ui/Card.tsx
- Use the existing useSupabase hook for data fetching"</pre>
                  </div>
                </div>
                
                <div class="ai-tools">
                  <h6>💡 Pro Tip: Use Gemini for Prompt Enhancement</h6>
                  <p>Can't write detailed prompts? Ask Gemini: "Make this prompt more detailed and specific for Claude/Cursor: [your basic prompt]"</p>
                </div>
              </div>
              
              <h4>Break Down Complex Features</h4>
              <div class="principle-section">
                <p><strong>Critical Rule:</strong> Never give huge prompts like "build me this whole feature." Break it down!</p>
                
                <div class="example-box">
                  <h6>Example: Building a Messaging System</h6>
                  <p>Instead of one massive prompt, break into phases:</p>
                  <ol>
                    <li><strong>Phase 1:</strong> Database schema and Supabase setup</li>
                    <li><strong>Phase 2:</strong> Message list UI component</li>
                    <li><strong>Phase 3:</strong> Send message functionality</li>
                    <li><strong>Phase 4:</strong> Real-time updates</li>
                    <li><strong>Phase 5:</strong> Notifications and unread counts</li>
                  </ol>
                </div>
                
                <div class="warning-box">
                  <strong>Why This Matters:</strong> AI starts hallucinating and producing garbage with huge prompts. 3-5 focused prompts > 1 massive prompt.
                </div>
              </div>
            `
          },
          {
            title: 'Step 5: Context Management',
            content: `
              <h4>Manage Chat Context Wisely</h4>
              <p><strong>Golden Rule:</strong> When the chat gets long, start a new one. AI has limited memory.</p>
              
              <div class="principle-section">
                <h5>When to Start New Chat:</h5>
                <ul>
                  <li>After 20-30 messages in one chat</li>
                  <li>When switching to different feature</li>
                  <li>When AI starts forgetting earlier context</li>
                  <li>When responses become inconsistent</li>
                </ul>
                
                <h5>Starting Fresh Effectively:</h5>
                <ol>
                  <li>Open new chat window</li>
                  <li>Provide brief context: "Working on user authentication feature"</li>
                  <li>Mention relevant files: "Using /components/auth/*, /api/auth/*"</li>
                  <li>State current goal: "Need to add password reset functionality"</li>
                </ol>
              </div>
              
              <h4>Provide Precise Context</h4>
              <div class="principle-section">
                <p><strong>Most Important Skill:</strong> Knowing which files to include in context.</p>
                
                <h5>Context Best Practices:</h5>
                <ul>
                  <li><strong>Be Specific:</strong> Include only relevant files</li>
                  <li><strong>Don't Overwhelm:</strong> Too much context confuses AI</li>
                  <li><strong>Reference Patterns:</strong> "Follow pattern in UserCard component"</li>
                  <li><strong>Include Types:</strong> Always include TypeScript interfaces</li>
                </ul>
                
                <div class="example-box">
                  <h6>Good Context Example:</h6>
                  <pre>"Adding comment system to blog posts.
Relevant files:
- /components/blog/BlogPost.tsx (where comments will display)
- /types/blog.ts (need to extend Post interface)
- /api/comments/route.ts (will create this)
- /components/ui/Card.tsx (use this component style)"</pre>
                </div>
              </div>
            `
          },
          {
            title: 'Step 6: Error Handling & Debugging',
            content: `
              <h4>When Things Go Wrong</h4>
              <p><strong>Rule:</strong> If AI doesn't fix error in 3 attempts, you're doing it wrong.</p>
              
              <div class="principle-section">
                <h5>Error Resolution Strategy:</h5>
                <ol>
                  <li><strong>First Attempt:</strong> Copy exact error message to AI</li>
                  <li><strong>Second Attempt:</strong> Add more context about what you were doing</li>
                  <li><strong>Third Attempt:</strong> Include relevant code snippets</li>
                  <li><strong>If Still Failing:</strong> STOP! Go back to previous working version</li>
                </ol>
                
                <div class="example-box">
                  <h6>Smart Debugging Approach:</h6>
                  <pre>"This error keeps happening. Please:
1. Review these components: [list files]
2. List top 3 suspects causing the error
3. Add console.logs to trace the issue
4. Explain your debugging strategy"</pre>
                </div>
              </div>
              
              <h4>Prevent AI from Breaking Things</h4>
              <div class="principle-section">
                <p><strong>AI's Worst Habit:</strong> Changing things you didn't ask for!</p>
                
                <div class="warning-box">
                  <h6>Magic Phrase That Works:</h6>
                  <p>"Do NOT change anything I didn't ask for. Only do exactly what I requested."</p>
                  <p>Add this to EVERY prompt. Seriously.</p>
                </div>
                
                <h5>Create "Common Mistakes" File:</h5>
                <ul>
                  <li>Track every time AI does something annoying</li>
                  <li>Add to /instructions/common-mistakes.md</li>
                  <li>Reference this file in complex prompts</li>
                  <li>Update your .cursorrules with these patterns</li>
                </ul>
              </div>
            `
          },
          {
            title: 'Step 7: Security Best Practices',
            content: `
              <h4>Security Patterns You MUST Follow</h4>
              <p><strong>Reality:</strong> AI often generates insecure code. You must know what to look for.</p>
              
              <div class="principle-section">
                <h5>Common Security Flaws & Fixes:</h5>
                
                <div class="security-issue">
                  <h6>1. Trusting Client Data</h6>
                  <p><strong>Problem:</strong> Using form/URL input directly</p>
                  <p><strong>Fix:</strong> Always validate & sanitize on server; escape output</p>
                </div>
                
                <div class="security-issue">
                  <h6>2. Secrets in Frontend</h6>
                  <p><strong>Problem:</strong> API keys in React/Next.js client code</p>
                  <p><strong>Fix:</strong> Keep secrets server-side only (.env, check .gitignore)</p>
                </div>
                
                <div class="security-issue">
                  <h6>3. Weak Authorization</h6>
                  <p><strong>Problem:</strong> Only checking if logged in, not permissions</p>
                  <p><strong>Fix:</strong> Server must verify permissions for every action</p>
                </div>
                
                <div class="security-issue">
                  <h6>4. IDOR (Insecure Direct Object Reference)</h6>
                  <p><strong>Problem:</strong> User X can access User Y's data via ID</p>
                  <p><strong>Fix:</strong> Always verify ownership before data access</p>
                </div>
              </div>
              
              <h4>Security Review Process</h4>
              <div class="principle-section">
                <p><strong>After Each Feature:</strong> Use Gemini for security audit</p>
                
                <div class="example-box">
                  <h6>Security Review Prompt:</h6>
                  <pre>"Act as a security expert. Review this code for:
- Authentication/authorization flaws
- Data exposure risks  
- Input validation issues
- API security problems
- Any other vulnerabilities

[Paste your feature code]"</pre>
                </div>
                
                <p>Then give Gemini's findings to Claude to fix issues. Repeat until clean.</p>
              </div>
            `
          },
          {
            title: 'Advanced Tips & Tricks',
            content: `
              <h4>Leverage Existing Components</h4>
              <div class="principle-section">
                <p><strong>Smart Pattern:</strong> Reference existing components when building new ones.</p>
                
                <div class="example-box">
                  <h6>Pattern Matching Example:</h6>
                  <pre>"Create a ProductCard component similar to UserCard but:
- Display product image instead of avatar
- Show price instead of email
- Add 'Add to Cart' button
- Keep the same hover effects and styling patterns"</pre>
                </div>
              </div>
              
              <h4>Handle Stubborn Errors</h4>
              <div class="principle-section">
                <h5>When AI Goes in Circles:</h5>
                <ol>
                  <li>Stop the current approach</li>
                  <li>Git reset to last working commit</li>
                  <li>Try completely different approach</li>
                  <li>Break problem into smaller pieces</li>
                </ol>
                
                <div class="ai-tools">
                  <h6>Context MCP Tool</h6>
                  <p>Use context7 MCP for updated documentation when working with newer library versions</p>
                </div>
              </div>
              
              <h4>Production-Ready Checklist</h4>
              <div class="checklist-grid">
                <div class="checklist-column">
                  <h5>Before Launch:</h5>
                  <ul>
                    <li>✓ All secrets in .env (not in code)</li>
                    <li>✓ Error boundaries implemented</li>
                    <li>✓ Loading states everywhere</li>
                    <li>✓ Mobile responsive tested</li>
                    <li>✓ Analytics configured</li>
                  </ul>
                </div>
                
                <div class="checklist-column">
                  <h5>Security Check:</h5>
                  <ul>
                    <li>✓ Authentication on all routes</li>
                    <li>✓ Authorization for data access</li>
                    <li>✓ Input validation</li>
                    <li>✓ Rate limiting on APIs</li>
                    <li>✓ HTTPS everywhere</li>
                  </ul>
                </div>
              </div>
              
              <div class="action-box">
                <p><strong>Remember:</strong> Vibe coding isn't about being lazy—it's about being efficient. You still need to understand what's being built and ensure it's secure, scalable, and user-friendly.</p>
              </div>
            `
          }
        ]
          }
        ]
      },
      {
        id: 'idea-to-launch',
        name: 'From Idea to Launch',
        icon: '🌱',
        description: 'Comprehensive guide from ideation through early growth',
        priority: 2,
        cards: [
          {
            id: 'ideation-philosophy',
            title: 'The Philosophy of Ideation',
            icon: '💡',
            tags: ['ideation', 'ideas', 'brainstorming', 'creativity'],
            intro: 'Great businesses solve real problems. Learn how to identify and validate ideas worth pursuing.',
            sections: [
              {
                title: 'Where Great Ideas Come From',
                content: `
                  <h4>The Myth of the "Eureka" Moment</h4>
                  <p>Most successful businesses don't come from sudden inspiration—they come from systematic observation of problems and inefficiencies.</p>
                  
                  <h5>Problem-First Approach:</h5>
                  <ul>
                    <li><strong>Personal Pain Points:</strong> What frustrates you daily?</li>
                    <li><strong>Industry Experience:</strong> What inefficiencies have you seen at work?</li>
                    <li><strong>Community Needs:</strong> What are people constantly complaining about?</li>
                    <li><strong>Technology Gaps:</strong> Where is tech not serving people well?</li>
                  </ul>
                  
                  <h5>Idea Generation Frameworks:</h5>
                  <div class="framework-grid">
                    <div class="framework-card">
                      <h6>The "Jobs to be Done" Framework</h6>
                      <p>People don't buy products; they hire them to do jobs. What job needs doing?</p>
                    </div>
                    <div class="framework-card">
                      <h6>The "10x Better" Rule</h6>
                      <p>To displace existing solutions, you need to be dramatically better, not marginally.</p>
                    </div>
                  </div>
                `
              },
              {
                title: 'Evaluating Ideas Objectively',
                content: `
                  <h4>The Idea Scorecard</h4>
                  <p>Rate each idea on these criteria (1-5 scale):</p>
                  
                  <ol>
                    <li><strong>Problem Severity:</strong> How painful is this problem?</li>
                    <li><strong>Market Size:</strong> How many people have this problem?</li>
                    <li><strong>Solution Feasibility:</strong> Can you actually build this?</li>
                    <li><strong>Revenue Potential:</strong> Will people pay for the solution?</li>
                    <li><strong>Competitive Advantage:</strong> Why you, why now?</li>
                    <li><strong>Personal Fit:</strong> Do you care enough to work on this for years?</li>
                  </ol>
                  
                  <div class="scoring-guide">
                    <p><strong>20-30 points:</strong> Strong candidate</p>
                    <p><strong>15-19 points:</strong> Needs refinement</p>
                    <p><strong>Below 15:</strong> Keep looking</p>
                  </div>
                `
              }
            ]
          },
          {
            id: 'business-formation',
            title: 'Business Formation & Legal',
            icon: '⚖️',
            tags: ['legal', 'formation', 'llc', 'contracts'],
            intro: 'Set up your business correctly from day one. Legal structure, contracts, and protection.',
            sections: [
              {
                title: 'The Complete Business Formation Guide',
                content: `
                  <h4>From Idea to Legal Entity in 7 Days</h4>
                  <p>Setting up your business structure isn't sexy, but it's the foundation everything else builds on. Get it right now, avoid expensive fixes later.</p>
                  
                  <div class="decision-tree">
                    <h5>🌳 The Business Structure Decision Tree</h5>
                    
                    <div class="decision-flow">
                      <div class="question-node">
                        <p><strong>Q1: Will you have co-founders or investors?</strong></p>
                        <div class="answer-branch">
                          <p>✅ <strong>YES:</strong> Go to Q2</p>
                          <p>❌ <strong>NO:</strong> Consider LLC or Sole Prop</p>
                        </div>
                      </div>
                      
                      <div class="question-node">
                        <p><strong>Q2: Do you plan to raise VC funding?</strong></p>
                        <div class="answer-branch">
                          <p>✅ <strong>YES:</strong> Delaware C-Corp is your answer</p>
                          <p>❌ <strong>NO:</strong> LLC gives most flexibility</p>
                        </div>
                      </div>
                      
                      <div class="question-node">
                        <p><strong>Q3: Is limiting personal liability critical?</strong></p>
                        <div class="answer-branch">
                          <p>✅ <strong>YES:</strong> LLC minimum, never sole prop</p>
                          <p>❌ <strong>NO:</strong> Sole prop is cheapest to start</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="structure-deep-dive">
                    <h5>🏢 Complete Structure Comparison</h5>
                    
                    <div class="structure-card expanded">
                      <h6>Sole Proprietorship - The Starter</h6>
                      <div class="structure-details">
                        <div class="pros-cons">
                          <div class="pros">
                            <h6>✅ Pros:</h6>
                            <ul>
                              <li>$0-50 to start (just local permits)</li>
                              <li>File taxes on personal return (Schedule C)</li>
                              <li>No state annual fees</li>
                              <li>Can convert to LLC later</li>
                              <li>Perfect for testing ideas</li>
                            </ul>
                          </div>
                          <div class="cons">
                            <h6>❌ Cons:</h6>
                            <ul>
                              <li>Personal assets at risk (house, car, savings)</li>
                              <li>Can't sell equity</li>
                              <li>No business credit separate from you</li>
                              <li>Some clients won't work with sole props</li>
                            </ul>
                          </div>
                        </div>
                        <p><strong>Best for:</strong> Consultants, freelancers, testing MVPs</p>
                        <p><strong>Real Example:</strong> "I ran my design consultancy as sole prop for 2 years, saved $3k in fees, then converted to LLC when I hit $100k revenue."</p>
                      </div>
                    </div>
                    
                    <div class="structure-card expanded">
                      <h6>LLC - The Sweet Spot</h6>
                      <div class="structure-details">
                        <div class="pros-cons">
                          <div class="pros">
                            <h6>✅ Pros:</h6>
                            <ul>
                              <li>Personal assets protected</li>
                              <li>Pass-through taxation (avoid double tax)</li>
                              <li>Flexible management structure</li>
                              <li>Can elect S-Corp tax status later</li>
                              <li>Professional credibility</li>
                              <li>Can have multiple owners</li>
                            </ul>
                          </div>
                          <div class="cons">
                            <h6>❌ Cons:</h6>
                            <ul>
                              <li>$100-800 formation (varies by state)</li>
                              <li>Annual state fees ($50-800)</li>
                              <li>Self-employment taxes on profits</li>
                              <li>VCs prefer C-Corps</li>
                            </ul>
                          </div>
                        </div>
                        <p><strong>State Costs Breakdown:</strong></p>
                        <ul>
                          <li>Wyoming: $100 formation, $60/year (popular for privacy)</li>
                          <li>Delaware: $90 formation, $300/year</li>
                          <li>California: $70 formation, $800/year minimum</li>
                          <li>New York: $200 formation, $9 biennial</li>
                        </ul>
                        <p><strong>Pro Tip:</strong> Form in your home state unless you have a specific reason not to.</p>
                      </div>
                    </div>
                    
                    <div class="structure-card expanded">
                      <h6>C-Corporation - The Scalable</h6>
                      <div class="structure-details">
                        <div class="pros-cons">
                          <div class="pros">
                            <h6>✅ Pros:</h6>
                            <ul>
                              <li>Unlimited investors</li>
                              <li>Stock options for employees</li>
                              <li>VCs require this structure</li>
                              <li>Easiest to sell/go public</li>
                              <li>Perpetual existence</li>
                            </ul>
                          </div>
                          <div class="cons">
                            <h6>❌ Cons:</h6>
                            <ul>
                              <li>Double taxation (corporate + personal)</li>
                              <li>$500+ formation costs</li>
                              <li>Complex compliance (board, minutes, etc.)</li>
                              <li>Expensive to maintain</li>
                            </ul>
                          </div>
                        </div>
                        <p><strong>Delaware C-Corp Package:</strong></p>
                        <ul>
                          <li>Stripe Atlas: $500 (includes everything)</li>
                          <li>Clerky: $799 (DIY with guidance)</li>
                          <li>LegalZoom: $79 + state fees</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div class="formation-timeline">
                    <h5>📅 Your 7-Day Formation Sprint</h5>
                    
                    <div class="day-by-day">
                      <div class="day-card">
                        <h6>Day 1-2: Decision & Research</h6>
                        <ul>
                          <li>Choose structure based on decision tree</li>
                          <li>Check name availability (state database)</li>
                          <li>Research state-specific requirements</li>
                          <li>Get co-founder agreements signed</li>
                        </ul>
                      </div>
                      
                      <div class="day-card">
                        <h6>Day 3-4: Formation Filing</h6>
                        <ul>
                          <li>File Articles of Organization (LLC) or Incorporation (Corp)</li>
                          <li>Get EIN from IRS (free, takes 5 minutes online)</li>
                          <li>Create Operating Agreement or Bylaws</li>
                          <li>Issue membership interests or stock</li>
                        </ul>
                      </div>
                      
                      <div class="day-card">
                        <h6>Day 5-6: Banking & Compliance</h6>
                        <ul>
                          <li>Open business bank account (bring EIN, formation docs)</li>
                          <li>Get business credit card</li>
                          <li>Register for state/local taxes</li>
                          <li>Apply for necessary licenses</li>
                        </ul>
                      </div>
                      
                      <div class="day-card">
                        <h6>Day 7: Operational Setup</h6>
                        <ul>
                          <li>Set up accounting system</li>
                          <li>Get business insurance quotes</li>
                          <li>Create document storage system</li>
                          <li>Calendar tax deadlines</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div class="state-specific">
                    <h5>🗺️ State-Specific Gotchas</h5>
                    <ul>
                      <li><strong>California:</strong> $800 minimum annual tax (even with $0 revenue)</li>
                      <li><strong>New York:</strong> Publication requirement for LLCs (can cost $1000+)</li>
                      <li><strong>Delaware:</strong> Need registered agent ($50-300/year)</li>
                      <li><strong>Texas:</strong> No state income tax but franchise tax on LLCs</li>
                    </ul>
                  </div>
                `
              },
              {
                title: 'Essential Legal Documents',
                content: `
                  <h4>Documents Every Business Needs</h4>
                  
                  <h5>1. Operating Agreement (LLC) / Bylaws (Corp)</h5>
                  <ul>
                    <li>Ownership percentages</li>
                    <li>Roles and responsibilities</li>
                    <li>Decision-making process</li>
                    <li>What happens if someone leaves</li>
                  </ul>
                  
                  <h5>2. Terms of Service & Privacy Policy</h5>
                  <ul>
                    <li>Required for any website/app</li>
                    <li>Limits your liability</li>
                    <li>GDPR/CCPA compliance</li>
                    <li>Use generators like Termly for basics</li>
                  </ul>
                  
                  <h5>3. Client/Customer Contracts</h5>
                  <ul>
                    <li>Scope of work</li>
                    <li>Payment terms</li>
                    <li>Intellectual property rights</li>
                    <li>Dispute resolution</li>
                  </ul>
                  
                  <h5>4. Non-Disclosure Agreements (NDAs)</h5>
                  <ul>
                    <li>Protect confidential information</li>
                    <li>Use when discussing ideas with potential partners</li>
                    <li>Keep them simple and reasonable</li>
                  </ul>
                  
                  <div class="legal-resources">
                    <h6>Affordable Legal Resources:</h6>
                    <ul>
                      <li>LegalZoom - Basic formation</li>
                      <li>Clerky - Startup documents</li>
                      <li>Nolo - Legal guides and forms</li>
                      <li>Local SCORE mentors - Free advice</li>
                    </ul>
                  </div>
                `
              }
            ]
          },
          {
            id: 'early-operations',
            title: 'Early-Stage Operations',
            icon: '⚙️',
            tags: ['operations', 'processes', 'systems', 'productivity'],
            intro: 'Build efficient operations from the start. Systems and processes that scale.',
            sections: [
              {
                title: 'Setting Up Core Systems',
                content: `
                  <h4>Essential Business Systems</h4>
                  
                  <h5>1. Financial Management</h5>
                  <ul>
                    <li><strong>Accounting:</strong> QuickBooks, Wave (free), or Xero</li>
                    <li><strong>Expense Tracking:</strong> Expensify or built into accounting</li>
                    <li><strong>Invoicing:</strong> Stripe, Square, or PayPal</li>
                    <li><strong>Banking:</strong> Business checking + high-yield savings</li>
                  </ul>
                  
                  <h5>2. Customer Management</h5>
                  <ul>
                    <li><strong>CRM:</strong> HubSpot (free tier), Airtable, or Notion</li>
                    <li><strong>Support:</strong> Intercom, Crisp, or email</li>
                    <li><strong>Feedback:</strong> Typeform, Google Forms</li>
                  </ul>
                  
                  <h5>3. Project Management</h5>
                  <ul>
                    <li><strong>Tasks:</strong> Trello, Asana, or Linear</li>
                    <li><strong>Documentation:</strong> Notion, Confluence, or Google Docs</li>
                    <li><strong>Communication:</strong> Slack, Discord, or Teams</li>
                  </ul>
                  
                  <h5>4. Marketing & Analytics</h5>
                  <ul>
                    <li><strong>Email:</strong> ConvertKit, Mailchimp, or Substack</li>
                    <li><strong>Analytics:</strong> Google Analytics, Mixpanel</li>
                    <li><strong>Social Media:</strong> Buffer, Hootsuite</li>
                  </ul>
                `
              },
              {
                title: 'Building Efficient Processes',
                content: `
                  <h4>Process Design Principles</h4>
                  
                  <h5>1. Document Everything</h5>
                  <ul>
                    <li>Create SOPs (Standard Operating Procedures)</li>
                    <li>Use Loom for video walkthroughs</li>
                    <li>Build a company wiki in Notion</li>
                    <li>Update docs as processes evolve</li>
                  </ul>
                  
                  <h5>2. Automate Repetitive Tasks</h5>
                  <ul>
                    <li><strong>Zapier/Make:</strong> Connect apps without code</li>
                    <li><strong>Email Templates:</strong> For common responses</li>
                    <li><strong>Scheduling:</strong> Calendly for meetings</li>
                    <li><strong>Social Posts:</strong> Buffer for scheduling</li>
                  </ul>
                  
                  <h5>3. Measure What Matters</h5>
                  <div class="metrics-framework">
                    <h6>Weekly Metrics Dashboard:</h6>
                    <ul>
                      <li>Revenue/Sales</li>
                      <li>Customer Acquisition Cost</li>
                      <li>Churn Rate</li>
                      <li>Customer Satisfaction (NPS)</li>
                      <li>Cash Runway</li>
                    </ul>
                  </div>
                  
                  <h5>4. Build for Scale</h5>
                  <ul>
                    <li>Choose tools that grow with you</li>
                    <li>Avoid custom solutions early on</li>
                    <li>Prioritize integration capabilities</li>
                    <li>Plan for 10x growth in every system</li>
                  </ul>
                `
              }
            ]
          }
        ]
      },
      {
        id: 'growth-strategies',
        name: 'Growth & Marketing',
        icon: '📈',
        description: 'Proven strategies for customer acquisition and business growth',
        priority: 3,
        cards: [
          {
            id: 'go-to-market',
            title: 'Go-to-Market Strategy',
            icon: '🎯',
            tags: ['marketing', 'launch', 'strategy', 'gtm'],
            intro: 'Launch successfully with a comprehensive go-to-market strategy.',
            sections: [
              {
                title: 'Defining Your GTM Strategy',
                content: `
                  <h4>Core Components of GTM</h4>
                  
                  <h5>1. Target Market Definition</h5>
                  <ul>
                    <li><strong>ICP (Ideal Customer Profile):</strong> Demographics, psychographics, behaviors</li>
                    <li><strong>Market Segmentation:</strong> Primary, secondary, tertiary markets</li>
                    <li><strong>Persona Development:</strong> 3-5 detailed buyer personas</li>
                  </ul>
                  
                  <h5>2. Value Proposition Canvas</h5>
                  <div class="canvas-grid">
                    <div class="canvas-section">
                      <h6>Customer Jobs</h6>
                      <ul>
                        <li>Functional jobs</li>
                        <li>Social jobs</li>
                        <li>Emotional jobs</li>
                      </ul>
                    </div>
                    <div class="canvas-section">
                      <h6>Pain Points</h6>
                      <ul>
                        <li>Obstacles</li>
                        <li>Risks</li>
                        <li>Undesired outcomes</li>
                      </ul>
                    </div>
                  </div>
                  
                  <h5>3. Pricing Strategy</h5>
                  <ul>
                    <li><strong>Cost-Plus:</strong> Your costs + margin</li>
                    <li><strong>Value-Based:</strong> What customers will pay</li>
                    <li><strong>Competitive:</strong> Market positioning</li>
                    <li><strong>Freemium:</strong> Free tier to paid conversion</li>
                  </ul>
                `
              },
              {
                title: 'Launch Playbook',
                content: `
                  <h4>The 30-60-90 Day Launch Plan</h4>
                  
                  <h5>Pre-Launch (Day -30 to 0)</h5>
                  <ul>
                    <li>Build landing page with email capture</li>
                    <li>Create social media accounts</li>
                    <li>Reach out to 50 potential early adopters</li>
                    <li>Prepare launch content (blog posts, videos)</li>
                    <li>Set up analytics and tracking</li>
                  </ul>
                  
                  <h5>Launch Week (Day 1-7)</h5>
                  <ul>
                    <li>Announce on all channels simultaneously</li>
                    <li>Reach out to your email list</li>
                    <li>Post in relevant communities (with value, not spam)</li>
                    <li>Launch on Product Hunt or similar</li>
                    <li>Offer limited-time launch pricing</li>
                  </ul>
                  
                  <h5>Post-Launch (Day 8-90)</h5>
                  <ul>
                    <li>Gather and implement user feedback rapidly</li>
                    <li>Double down on channels that work</li>
                    <li>Start content marketing engine</li>
                    <li>Build case studies from early users</li>
                    <li>Optimize conversion funnel</li>
                  </ul>
                `
              }
            ]
          },
          {
            id: 'growth-channels',
            title: 'Growth Channel Mastery',
            icon: '🚀',
            tags: ['growth', 'marketing', 'channels', 'acquisition'],
            intro: 'Master the 19 traction channels and find your growth engine.',
            sections: [
              {
                title: 'The 19 Traction Channels',
                content: `
                  <h4>Bullseye Framework for Channel Selection</h4>
                  
                  <h5>Outer Ring: Brainstorm All Channels</h5>
                  <ol>
                    <li><strong>Viral Marketing:</strong> Built-in sharing mechanics</li>
                    <li><strong>Public Relations:</strong> Press coverage</li>
                    <li><strong>Unconventional PR:</strong> Stunts and publicity</li>
                    <li><strong>Search Engine Marketing:</strong> Google/Bing Ads</li>
                    <li><strong>Social & Display Ads:</strong> Facebook, Instagram, LinkedIn</li>
                    <li><strong>Offline Ads:</strong> Billboards, radio, print</li>
                    <li><strong>SEO:</strong> Organic search traffic</li>
                    <li><strong>Content Marketing:</strong> Blogs, videos, podcasts</li>
                    <li><strong>Email Marketing:</strong> Newsletters and campaigns</li>
                    <li><strong>Engineering as Marketing:</strong> Free tools</li>
                    <li><strong>Business Development:</strong> Partnerships</li>
                    <li><strong>Sales:</strong> Direct outreach</li>
                    <li><strong>Affiliate Programs:</strong> Commission-based promotion</li>
                    <li><strong>Existing Platforms:</strong> App stores, marketplaces</li>
                    <li><strong>Trade Shows:</strong> Industry events</li>
                    <li><strong>Offline Events:</strong> Meetups, workshops</li>
                    <li><strong>Speaking Engagements:</strong> Conferences, podcasts</li>
                    <li><strong>Community Building:</strong> Forums, groups</li>
                    <li><strong>Influencer Marketing:</strong> Leverage others' audiences</li>
                  </ol>
                  
                  <h5>Middle Ring: Test 3-5 Channels</h5>
                  <ul>
                    <li>Run small experiments ($100-500 each)</li>
                    <li>Measure CAC (Customer Acquisition Cost)</li>
                    <li>Track conversion rates at each funnel stage</li>
                    <li>Document what works and what doesn't</li>
                  </ul>
                  
                  <h5>Inner Ring: Focus on 1-2 Channels</h5>
                  <ul>
                    <li>Double down on what's working</li>
                    <li>Optimize relentlessly</li>
                    <li>Scale until diminishing returns</li>
                    <li>Then add next channel</li>
                  </ul>
                `
              },
              {
                title: 'Channel Deep Dives',
                content: `
                  <h4>Mastering Top Channels for Startups</h4>
                  
                  <h5>Content Marketing</h5>
                  <ul>
                    <li><strong>Blog Strategy:</strong> Answer customer questions</li>
                    <li><strong>SEO Focus:</strong> Long-tail keywords first</li>
                    <li><strong>Distribution:</strong> Reddit, Hacker News, niche forums</li>
                    <li><strong>Repurposing:</strong> Blog → Twitter thread → LinkedIn post</li>
                  </ul>
                  
                  <h5>Community Building</h5>
                  <ul>
                    <li><strong>Platform Choice:</strong> Discord, Slack, or Circle</li>
                    <li><strong>Engagement:</strong> Regular active presence helps</li>
                    <li><strong>Value First:</strong> 90% help, 10% promotion</li>
                    <li><strong>Scaling:</strong> Recruit community moderators</li>
                  </ul>
                  
                  <h5>Engineering as Marketing</h5>
                  <ul>
                    <li><strong>Free Tools:</strong> Calculators, analyzers, generators</li>
                    <li><strong>Data Plays:</strong> Industry reports, benchmarks</li>
                    <li><strong>Open Source:</strong> Build developer mindshare</li>
                    <li><strong>API/Integrations:</strong> Embed in other products</li>
                  </ul>
                  
                  <h5>Sales (for B2B)</h5>
                  <ul>
                    <li><strong>Cold Outreach:</strong> Personalized, value-first</li>
                    <li><strong>Warm Intros:</strong> Leverage your network</li>
                    <li><strong>Sales Process:</strong> Discovery → Demo → Trial → Close</li>
                    <li><strong>Tools:</strong> Apollo.io, Hunter.io, Lemlist</li>
                  </ul>
                `
              }
            ]
          },
          {
            id: 'conversion-optimization',
            title: 'Conversion & Retention',
            icon: '💎',
            tags: ['conversion', 'retention', 'optimization', 'metrics'],
            intro: 'Turn visitors into customers and customers into advocates.',
            sections: [
              {
                title: 'Conversion Rate Optimization',
                content: `
                  <h4>The CRO Framework</h4>
                  
                  <h5>1. Funnel Analysis</h5>
                  <div class="funnel-stages">
                    <div class="stage">
                      <h6>Awareness (Top)</h6>
                      <p>Visitors → Email Subscribers</p>
                      <p>Target: 2-5% conversion</p>
                    </div>
                    <div class="stage">
                      <h6>Interest (Middle)</h6>
                      <p>Subscribers → Trial Users</p>
                      <p>Target: 20-30% conversion</p>
                    </div>
                    <div class="stage">
                      <h6>Decision (Bottom)</h6>
                      <p>Trial → Paying Customers</p>
                      <p>Target: 10-15% conversion</p>
                    </div>
                  </div>
                  
                  <h5>2. Landing Page Optimization</h5>
                  <ul>
                    <li><strong>Above the Fold:</strong> Value prop + CTA in 5 seconds</li>
                    <li><strong>Social Proof:</strong> Testimonials, logos, numbers</li>
                    <li><strong>Urgency:</strong> Limited time offers, scarcity</li>
                    <li><strong>Risk Reversal:</strong> Free trial, money-back guarantee</li>
                  </ul>
                  
                  <h5>3. A/B Testing Priority</h5>
                  <ol>
                    <li>Headlines and value propositions</li>
                    <li>Call-to-action buttons (text, color, placement)</li>
                    <li>Pricing and packages</li>
                    <li>Images and videos</li>
                    <li>Form fields and length</li>
                  </ol>
                `
              },
              {
                title: 'Retention & Engagement',
                content: `
                  <h4>Building Sticky Products</h4>
                  
                  <h5>Onboarding Excellence</h5>
                  <ul>
                    <li><strong>First Value:</strong> User achieves success in <5 minutes</li>
                    <li><strong>Progress Indicators:</strong> Show completion %</li>
                    <li><strong>Personalization:</strong> Tailor to user goals</li>
                    <li><strong>Support:</strong> Proactive help at friction points</li>
                  </ul>
                  
                  <h5>Engagement Loops</h5>
                  <div class="loop-examples">
                    <div class="loop">
                      <h6>Habit Loop</h6>
                      <p>Trigger → Action → Reward → Investment</p>
                    </div>
                    <div class="loop">
                      <h6>Social Loop</h6>
                      <p>Create → Share → Engage → Create More</p>
                    </div>
                  </div>
                  
                  <h5>Retention Tactics</h5>
                  <ul>
                    <li><strong>Email Campaigns:</strong> Onboarding series, feature announcements</li>
                    <li><strong>In-App Messages:</strong> Tips, achievements, milestones</li>
                    <li><strong>Community:</strong> User forums, success stories</li>
                    <li><strong>Education:</strong> Webinars, tutorials, certification</li>
                  </ul>
                  
                  <h5>Churn Prevention</h5>
                  <ul>
                    <li>Monitor usage patterns for at-risk users</li>
                    <li>Proactive outreach before cancellation</li>
                    <li>Exit surveys to understand why</li>
                    <li>Win-back campaigns for churned users</li>
                  </ul>
                `
              }
            ]
          }
        ]
      },
      {
        id: 'funding-finance',
        name: 'Funding & Finance',
        icon: '💰',
        description: 'Master startup finance, from bootstrapping to raising capital',
        priority: 4,
        cards: [
          {
            id: 'startup-finance-basics',
            title: 'Startup Finance Fundamentals',
            icon: '📊',
            tags: ['finance', 'accounting', 'metrics', 'cash-flow'],
            intro: 'Master the financial foundations every founder needs to know.',
            sections: [
              {
                title: 'Essential Financial Statements',
                content: `
                  <h4>The Three Core Statements</h4>
                  
                  <h5>1. Profit & Loss (P&L)</h5>
                  <ul>
                    <li><strong>Revenue:</strong> All money coming in</li>
                    <li><strong>COGS:</strong> Direct costs of delivering product/service</li>
                    <li><strong>Gross Profit:</strong> Revenue - COGS</li>
                    <li><strong>Operating Expenses:</strong> Rent, salaries, marketing</li>
                    <li><strong>Net Profit:</strong> What's left after all expenses</li>
                  </ul>
                  
                  <h5>2. Cash Flow Statement</h5>
                  <ul>
                    <li><strong>Operating Activities:</strong> Cash from core business</li>
                    <li><strong>Investing Activities:</strong> Equipment, acquisitions</li>
                    <li><strong>Financing Activities:</strong> Loans, investments</li>
                    <li><strong>Key Insight:</strong> Profitable ≠ Cash Flow Positive</li>
                  </ul>
                  
                  <h5>3. Balance Sheet</h5>
                  <ul>
                    <li><strong>Assets:</strong> What you own (cash, equipment, IP)</li>
                    <li><strong>Liabilities:</strong> What you owe (loans, payables)</li>
                    <li><strong>Equity:</strong> Owner's stake (Assets - Liabilities)</li>
                  </ul>
                  
                  <div class="financial-tips">
                    <h6>Monthly Financial Routine:</h6>
                    <ol>
                      <li>Review P&L vs. budget</li>
                      <li>Check cash runway (months of cash left)</li>
                      <li>Monitor key metrics trends</li>
                      <li>Update financial projections</li>
                    </ol>
                  </div>
                `
              },
              {
                title: 'Key Startup Metrics',
                content: `
                  <h4>Metrics That Matter</h4>
                  
                  <h5>Revenue Metrics</h5>
                  <ul>
                    <li><strong>MRR/ARR:</strong> Monthly/Annual Recurring Revenue</li>
                    <li><strong>Growth Rate:</strong> Month-over-month %</li>
                    <li><strong>Net Revenue Retention:</strong> Expansion - Churn</li>
                    <li><strong>Average Contract Value:</strong> Revenue per customer</li>
                  </ul>
                  
                  <h5>Unit Economics</h5>
                  <ul>
                    <li><strong>CAC:</strong> Customer Acquisition Cost</li>
                    <li><strong>LTV:</strong> Customer Lifetime Value</li>
                    <li><strong>LTV:CAC Ratio:</strong> Should be >3:1</li>
                    <li><strong>Payback Period:</strong> Months to recover CAC</li>
                  </ul>
                  
                  <h5>Operational Metrics</h5>
                  <ul>
                    <li><strong>Burn Rate:</strong> Monthly cash spent</li>
                    <li><strong>Runway:</strong> Cash ÷ Burn Rate</li>
                    <li><strong>Gross Margin:</strong> (Revenue - COGS) ÷ Revenue</li>
                    <li><strong>Operating Margin:</strong> Include all expenses</li>
                  </ul>
                  
                  <div class="metric-benchmarks">
                    <h6>SaaS Benchmarks:</h6>
                    <ul>
                      <li>Gross Margin: 70-80%</li>
                      <li>Growth Rate: 20%+ monthly (early stage)</li>
                      <li>Churn: <5% monthly</li>
                      <li>CAC Payback: <12 months</li>
                    </ul>
                  </div>
                `
              }
            ]
          },
          {
            id: 'fundraising-guide',
            title: 'The Fundraising Journey',
            icon: '🎯',
            tags: ['fundraising', 'investors', 'pitch-deck', 'venture-capital'],
            intro: 'Navigate the fundraising process from friends & family to Series A.',
            sections: [
              {
                title: 'Funding Stages Explained',
                content: `
                  <h4>The Funding Ladder</h4>
                  
                  <h5>1. Pre-Seed ($0-500K)</h5>
                  <ul>
                    <li><strong>Sources:</strong> Personal savings, F&F, accelerators</li>
                    <li><strong>Use:</strong> Build MVP, initial validation</li>
                    <li><strong>Valuation:</strong> $1-3M typically</li>
                    <li><strong>What you need:</strong> Idea, team, basic prototype</li>
                  </ul>
                  
                  <h5>2. Seed ($500K-2M)</h5>
                  <ul>
                    <li><strong>Sources:</strong> Angel investors, seed funds</li>
                    <li><strong>Use:</strong> Product-market fit, early traction</li>
                    <li><strong>Valuation:</strong> $3-6M typically</li>
                    <li><strong>What you need:</strong> MVP, early customers, growth metrics</li>
                  </ul>
                  
                  <h5>3. Series A ($2-15M)</h5>
                  <ul>
                    <li><strong>Sources:</strong> VCs, institutional investors</li>
                    <li><strong>Use:</strong> Scale proven model</li>
                    <li><strong>Valuation:</strong> $10-30M typically</li>
                    <li><strong>What you need:</strong> PMF, $1M+ ARR, clear growth path</li>
                  </ul>
                  
                  <div class="funding-alternatives">
                    <h6>Alternative Funding Sources:</h6>
                    <ul>
                      <li><strong>Revenue-Based Financing:</strong> % of revenue, no equity</li>
                      <li><strong>Crowdfunding:</strong> Kickstarter, Republic</li>
                      <li><strong>Grants:</strong> Government, foundation money</li>
                      <li><strong>Debt:</strong> Venture debt, SBA loans</li>
                    </ul>
                  </div>
                `
              },
              {
                title: 'Crafting Your Pitch',
                content: `
                  <h4>The Perfect Pitch Deck</h4>
                  
                  <h5>Essential Slides (10-12 total)</h5>
                  <ol>
                    <li><strong>Title:</strong> Company name, tagline, contact</li>
                    <li><strong>Problem:</strong> Pain point with evidence</li>
                    <li><strong>Solution:</strong> Your unique approach</li>
                    <li><strong>Market:</strong> TAM, SAM, SOM</li>
                    <li><strong>Product:</strong> Demo or screenshots</li>
                    <li><strong>Business Model:</strong> How you make money</li>
                    <li><strong>Traction:</strong> Metrics, customers, growth</li>
                    <li><strong>Competition:</strong> Landscape and differentiation</li>
                    <li><strong>Team:</strong> Why you'll win</li>
                    <li><strong>Financials:</strong> Projections, unit economics</li>
                    <li><strong>Ask:</strong> Amount, use of funds, milestones</li>
                  </ol>
                  
                  <h5>Pitch Deck Best Practices</h5>
                  <ul>
                    <li>One message per slide</li>
                    <li>More visuals, less text</li>
                    <li>Tell a compelling story</li>
                    <li>Back up claims with data</li>
                    <li>Practice 2-minute and 10-minute versions</li>
                  </ul>
                  
                  <h5>Common Investor Questions</h5>
                  <ul>
                    <li>"What's your unfair advantage?"</li>
                    <li>"How big can this really get?"</li>
                    <li>"What's your customer acquisition strategy?"</li>
                    <li>"Who's your first key hire?"</li>
                    <li>"What keeps you up at night?"</li>
                  </ul>
                `
              }
            ]
          },
          {
            id: 'non-traditional-funding',
            title: 'Alternative Funding Paths',
            icon: '🔄',
            tags: ['bootstrapping', 'grants', 'crowdfunding', 'revenue-based'],
            intro: 'Explore funding options beyond traditional venture capital.',
            sections: [
              {
                title: 'Bootstrapping Strategies',
                content: `
                  <h4>Building Without External Funding</h4>
                  
                  <h5>Revenue-First Approach</h5>
                  <ul>
                    <li><strong>Services to Product:</strong> Consulting → Productized service → SaaS</li>
                    <li><strong>Pre-Sales:</strong> Sell before you build</li>
                    <li><strong>Lifetime Deals:</strong> AppSumo and similar platforms</li>
                    <li><strong>Side Hustle:</strong> Keep day job while building</li>
                  </ul>
                  
                  <h5>Cost Optimization</h5>
                  <ul>
                    <li>Use free tiers of all tools initially</li>
                    <li>Hire contractors vs. full-time</li>
                    <li>Equity for services (carefully)</li>
                    <li>Remote-first to save on office</li>
                    <li>Open source alternatives</li>
                  </ul>
                  
                  <h5>Bootstrap-Friendly Models</h5>
                  <ul>
                    <li><strong>Info Products:</strong> Courses, ebooks, templates</li>
                    <li><strong>Marketplaces:</strong> Take commission, low initial cost</li>
                    <li><strong>Communities:</strong> Paid memberships</li>
                    <li><strong>Micro-SaaS:</strong> Solve one problem well</li>
                  </ul>
                `
              },
              {
                title: 'Grants and Competitions',
                content: `
                  <h4>Free Money for Startups</h4>
                  
                  <h5>Government Grants</h5>
                  <ul>
                    <li><strong>SBIR/STTR:</strong> R&D focused, up to $1M+</li>
                    <li><strong>NSF Grants:</strong> Deep tech and research</li>
                    <li><strong>State Programs:</strong> Local economic development</li>
                    <li><strong>SBA Grants:</strong> Various programs for small business</li>
                  </ul>
                  
                  <h5>Foundation & Corporate Grants</h5>
                  <ul>
                    <li>Google for Startups</li>
                    <li>Amazon Web Services credits</li>
                    <li>Microsoft for Startups</li>
                    <li>Specific industry foundations</li>
                  </ul>
                  
                  <h5>Pitch Competitions</h5>
                  <ul>
                    <li>TechCrunch Disrupt</li>
                    <li>Local startup weeks</li>
                    <li>University competitions</li>
                    <li>Industry-specific contests</li>
                  </ul>
                  
                  <div class="grant-tips">
                    <h6>Grant Application Tips:</h6>
                    <ul>
                      <li>Start applications early (months ahead)</li>
                      <li>Follow instructions exactly</li>
                      <li>Focus on impact and innovation</li>
                      <li>Get help from past winners</li>
                      <li>Don't rely solely on grants</li>
                    </ul>
                  </div>
                `
              }
            ]
          }
        ]
      },
      {
        id: 'advanced-topics',
        name: 'Advanced Strategies',
        icon: '🧠',
        description: 'Level up with advanced topics in AI, mindset, and exits',
        priority: 5,
        cards: [
          {
            id: 'ai-ml-integration',
            title: 'AI & ML for Startups',
            icon: '🤖',
            tags: ['ai', 'machine-learning', 'automation', 'innovation'],
            intro: 'Leverage AI and machine learning to build competitive advantages.',
            sections: [
              {
                title: 'AI Integration Strategies',
                content: `
                  <h4>Where AI Creates Real Value</h4>
                  
                  <h5>1. Automation Opportunities</h5>
                  <ul>
                    <li><strong>Customer Support:</strong> Chatbots, ticket routing</li>
                    <li><strong>Content Creation:</strong> Blog posts, social media</li>
                    <li><strong>Data Entry:</strong> OCR, form processing</li>
                    <li><strong>Quality Control:</strong> Anomaly detection</li>
                  </ul>
                  
                  <h5>2. Enhancement Use Cases</h5>
                  <ul>
                    <li><strong>Personalization:</strong> Recommendations, dynamic pricing</li>
                    <li><strong>Search:</strong> Semantic search, image recognition</li>
                    <li><strong>Analytics:</strong> Predictive insights, forecasting</li>
                    <li><strong>Creation Tools:</strong> Design assistance, code generation</li>
                  </ul>
                  
                  <h5>3. Implementation Approach</h5>
                  <ol>
                    <li>Start with existing APIs (OpenAI, Claude, Gemini)</li>
                    <li>Fine-tune on your specific data</li>
                    <li>Build custom models only when necessary</li>
                    <li>Always maintain human oversight</li>
                  </ol>
                  
                  <div class="ai-tools">
                    <h6>Starter AI Stack:</h6>
                    <ul>
                      <li><strong>LLMs:</strong> OpenAI API, Anthropic Claude</li>
                      <li><strong>Vector DB:</strong> Pinecone, Weaviate</li>
                      <li><strong>Frameworks:</strong> LangChain, LlamaIndex</li>
                      <li><strong>Monitoring:</strong> Weights & Biases, Galileo</li>
                    </ul>
                  </div>
                `
              },
              {
                title: 'Building AI-First Products',
                content: `
                  <h4>AI Product Development</h4>
                  
                  <h5>Design Principles</h5>
                  <ul>
                    <li><strong>Augment, Don't Replace:</strong> Enhance human capabilities</li>
                    <li><strong>Transparency:</strong> Show AI confidence levels</li>
                    <li><strong>Control:</strong> Let users adjust AI behavior</li>
                    <li><strong>Feedback Loops:</strong> Improve with usage</li>
                  </ul>
                  
                  <h5>Common Pitfalls</h5>
                  <ul>
                    <li>Over-promising AI capabilities</li>
                    <li>Ignoring edge cases and failures</li>
                    <li>Lack of data privacy consideration</li>
                    <li>No fallback for AI failures</li>
                    <li>Expensive API costs at scale</li>
                  </ul>
                  
                  <h5>Cost Optimization</h5>
                  <ul>
                    <li>Cache common queries</li>
                    <li>Use smaller models when possible</li>
                    <li>Implement usage limits</li>
                    <li>Batch process when real-time isn't needed</li>
                    <li>Consider open-source alternatives</li>
                  </ul>
                `
              }
            ]
          },
          {
            id: 'founder-mindset',
            title: 'The Founder Mindset',
            icon: '🧘',
            tags: ['mindset', 'resilience', 'mental-health', 'leadership'],
            intro: 'Develop the mental framework and resilience needed for the startup journey.',
            sections: [
              {
                title: 'Building Mental Resilience',
                content: `
                  <h4>The Psychological Challenges</h4>
                  
                  <h5>Common Founder Struggles</h5>
                  <ul>
                    <li><strong>Imposter Syndrome:</strong> "I don't belong here"</li>
                    <li><strong>Decision Fatigue:</strong> Constant critical choices</li>
                    <li><strong>Isolation:</strong> Lonely at the top</li>
                    <li><strong>Uncertainty:</strong> No clear path forward</li>
                    <li><strong>Rejection:</strong> Constant "no"s</li>
                  </ul>
                  
                  <h5>Resilience Strategies</h5>
                  <ul>
                    <li><strong>Growth Mindset:</strong> Failures are learning opportunities</li>
                    <li><strong>Support Network:</strong> Mentors, peers, therapist</li>
                    <li><strong>Physical Health:</strong> Exercise, sleep, nutrition</li>
                    <li><strong>Boundaries:</strong> Work-life integration, not balance</li>
                    <li><strong>Celebration:</strong> Acknowledge small wins</li>
                  </ul>
                  
                  <h5>Daily Practices</h5>
                  <ul>
                    <li>Morning routine (meditation, journaling, exercise)</li>
                    <li>Time blocking for deep work</li>
                    <li>Regular breaks and walks</li>
                    <li>Weekly reflection and planning</li>
                    <li>Monthly mental health check-ins</li>
                  </ul>
                `
              },
              {
                title: 'Leadership Development',
                content: `
                  <h4>From Founder to Leader</h4>
                  
                  <h5>Key Leadership Transitions</h5>
                  <ul>
                    <li><strong>Doer → Delegator:</strong> Trust others with critical tasks</li>
                    <li><strong>Specialist → Generalist:</strong> Understand all functions</li>
                    <li><strong>Perfectionist → Optimizer:</strong> Good enough, shipped</li>
                    <li><strong>Individual → Team Builder:</strong> Success through others</li>
                  </ul>
                  
                  <h5>Communication Excellence</h5>
                  <ul>
                    <li><strong>Vision:</strong> Paint a compelling future</li>
                    <li><strong>Transparency:</strong> Share good and bad news</li>
                    <li><strong>Feedback:</strong> Give and receive constructively</li>
                    <li><strong>Recognition:</strong> Celebrate team achievements</li>
                  </ul>
                  
                  <h5>Building Culture</h5>
                  <ul>
                    <li>Define core values early and live them</li>
                    <li>Hire for culture add, not just culture fit</li>
                    <li>Create rituals and traditions</li>
                    <li>Document the "how we work" playbook</li>
                    <li>Lead by example in all things</li>
                  </ul>
                `
              }
            ]
          },
          {
            id: 'exit-strategies',
            title: 'Exit Strategies',
            icon: '🚪',
            tags: ['exit', 'acquisition', 'ipo', 'succession'],
            intro: 'Plan your eventual exit from day one to maximize value.',
            sections: [
              {
                title: 'Types of Exits',
                content: `
                  <h4>Exit Options Explained</h4>
                  
                  <h5>1. Acquisition</h5>
                  <ul>
                    <li><strong>Strategic:</strong> Competitor or adjacent company</li>
                    <li><strong>Financial:</strong> Private equity purchase</li>
                    <li><strong>Acquihire:</strong> Team more valuable than product</li>
                    <li><strong>Typical Timeline:</strong> 3-7 years</li>
                    <li><strong>Multiples:</strong> 2-10x revenue (varies widely)</li>
                  </ul>
                  
                  <h5>2. IPO (Going Public)</h5>
                  <ul>
                    <li><strong>Requirements:</strong> Usually $100M+ revenue</li>
                    <li><strong>Timeline:</strong> 7-10+ years</li>
                    <li><strong>Pros:</strong> Liquidity, currency for acquisitions</li>
                    <li><strong>Cons:</strong> Scrutiny, quarterly pressure</li>
                  </ul>
                  
                  <h5>3. Secondary Sales</h5>
                  <ul>
                    <li>Sell portion of equity to investors</li>
                    <li>Founder liquidity without full exit</li>
                    <li>Common in later funding rounds</li>
                  </ul>
                  
                  <h5>4. Management Buyout</h5>
                  <ul>
                    <li>Sell to existing team</li>
                    <li>Often with external financing</li>
                    <li>Preserves company culture</li>
                  </ul>
                `
              },
              {
                title: 'Maximizing Exit Value',
                content: `
                  <h4>Building to Sell</h4>
                  
                  <h5>Value Drivers</h5>
                  <ul>
                    <li><strong>Recurring Revenue:</strong> Predictable > one-time</li>
                    <li><strong>Growth Rate:</strong> Sustainable 30%+ annually</li>
                    <li><strong>Gross Margins:</strong> Higher is always better</li>
                    <li><strong>Market Position:</strong> Leader in growing market</li>
                    <li><strong>Team:</strong> Can run without founder</li>
                  </ul>
                  
                  <h5>Exit Preparation (12-18 months)</h5>
                  <ol>
                    <li>Clean up financials and legal</li>
                    <li>Document all processes</li>
                    <li>Diversify customer base</li>
                    <li>Lock in key employees</li>
                    <li>Build relationships with potential buyers</li>
                    <li>Hire experienced advisors</li>
                  </ol>
                  
                  <h5>Common Mistakes</h5>
                  <ul>
                    <li>Waiting too long (or selling too early)</li>
                    <li>Single point of failure (usually founder)</li>
                    <li>Poor financial records</li>
                    <li>Customer concentration risk</li>
                    <li>No competitive tension</li>
                  </ul>
                  
                  <div class="exit-tip">
                    <p><strong>Golden Rule:</strong> Build a business you'd never want to sell, and buyers will want it most.</p>
                  </div>
                `
              }
            ]
          }
        ]
      },
      {
        id: 'team-culture',
        name: 'Team & Culture',
        icon: '👥',
        description: 'Build and lead high-performing teams that scale',
        priority: 6,
        cards: [
          {
            id: 'hiring-playbook',
            title: 'The Complete Hiring Playbook',
            icon: '🎯',
            tags: ['hiring', 'recruiting', 'team', 'hr'],
            intro: 'Hire your first 10 employees without breaking the bank or making costly mistakes.',
            sections: [
              {
                title: 'When to Make Your First Hire',
                content: `
                  <h4>The Hiring Readiness Checklist</h4>
                  <p>Don't hire too early (waste money) or too late (burnout). Here's exactly when to pull the trigger.</p>
                  
                  <div class="hiring-signals">
                    <h5>🔴 Red Flags (Don't Hire Yet):</h5>
                    <ul>
                      <li>Less than 3 months of runway</li>
                      <li>No product-market fit signals</li>
                      <li>Can't clearly define the role</li>
                      <li>Hoping they'll "figure it out"</li>
                      <li>Just raised money and feel pressure</li>
                    </ul>
                    
                    <h5>✅ Green Lights (Time to Hire):</h5>
                    <ul>
                      <li>Turning down revenue due to capacity</li>
                      <li>Founder spending 50%+ time on repeatable tasks</li>
                      <li>Clear ROI: They'll generate or save 3x their cost</li>
                      <li>6+ months runway after hire</li>
                      <li>Written playbook for their responsibilities</li>
                    </ul>
                  </div>
                  
                  <div class="first-hire-matrix">
                    <h5>Who to Hire First (By Business Type)</h5>
                    <table class="hire-matrix">
                      <tr>
                        <th>Business Type</th>
                        <th>Typical First Hire</th>
                        <th>Why</th>
                        <th>Cost Range</th>
                      </tr>
                      <tr>
                        <td>B2B SaaS</td>
                        <td>Customer Success</td>
                        <td>Reduce churn, free up founder for sales</td>
                        <td>$40-60k</td>
                      </tr>
                      <tr>
                        <td>E-commerce</td>
                        <td>Operations/Fulfillment</td>
                        <td>Scale without quality drops</td>
                        <td>$35-45k</td>
                      </tr>
                      <tr>
                        <td>Marketplace</td>
                        <td>Community Manager</td>
                        <td>Both sides need attention</td>
                        <td>$40-55k</td>
                      </tr>
                      <tr>
                        <td>Content/Media</td>
                        <td>Editor/Producer</td>
                        <td>Maintain publishing schedule</td>
                        <td>$35-50k</td>
                      </tr>
                    </table>
                  </div>
                `
              },
              {
                title: 'Finding A+ Players on a Budget',
                content: `
                  <h4>The Scrappy Recruiting Playbook</h4>
                  <p>You can't compete with Google salaries. Here's how to win anyway.</p>
                  
                  <div class="talent-sources">
                    <h5>🎣 Where to Fish for Talent</h5>
                    
                    <div class="source-strategy">
                      <h6>1. The Boomerang Strategy</h6>
                      <p>Former colleagues who know your work style</p>
                      <ul>
                        <li>Success rate: 60%+ (vs 5% cold outreach)</li>
                        <li>Message: "Building something special, thought of you"</li>
                        <li>Sell: Impact + equity + culture</li>
                      </ul>
                    </div>
                    
                    <div class="source-strategy">
                      <h6>2. The Side Project Hunter</h6>
                      <p>Find builders already building</p>
                      <ul>
                        <li>ProductHunt makers</li>
                        <li>GitHub contributors</li>
                        <li>Indie Hackers community</li>
                        <li>Twitter builders (#buildinpublic)</li>
                      </ul>
                    </div>
                    
                    <div class="source-strategy">
                      <h6>3. The Career Changer</h6>
                      <p>High potential looking for their break</p>
                      <ul>
                        <li>Bootcamp graduates (hungry + lower cost)</li>
                        <li>Big company → startup transition</li>
                        <li>Industry switchers with transferable skills</li>
                      </ul>
                    </div>
                    
                    <div class="source-strategy">
                      <h6>4. The Global Talent Pool</h6>
                      <p>Great talent at 40-60% US costs</p>
                      <ul>
                        <li>Eastern Europe (engineering)</li>
                        <li>Latin America (similar time zones)</li>
                        <li>Philippines (customer service)</li>
                        <li>Use: Deel, Remote, Upwork</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="recruiting-hacks">
                    <h5>🎯 Recruiting Hacks That Work</h5>
                    <ul>
                      <li><strong>The Portfolio Review:</strong> "Send 3 things you're proud of" beats resumes</li>
                      <li><strong>The Paid Project:</strong> $500 test project reveals everything</li>
                      <li><strong>The Referral Bonus:</strong> $1-2k for successful hires from team</li>
                      <li><strong>The Content Strategy:</strong> Blog about your culture, attract aligned people</li>
                      <li><strong>The Transparency Play:</strong> Share salary ranges upfront</li>
                    </ul>
                  </div>
                `
              },
              {
                title: 'The Interview Process That Works',
                content: `
                  <h4>Predict Success Without 10 Rounds</h4>
                  <p>Most interview processes are broken. Here's a 3-step system that actually predicts performance.</p>
                  
                  <div class="interview-framework">
                    <h5>🎭 The 3-Stage Framework</h5>
                    
                    <div class="interview-stage">
                      <h6>Stage 1: Culture Screen (30 min)</h6>
                      <p><strong>Goal:</strong> Would I want to work with them daily?</p>
                      <ul>
                        <li>Tell me about a time you disagreed with a decision</li>
                        <li>What does work-life balance mean to you?</li>
                        <li>Describe your ideal work environment</li>
                        <li>What are you optimizing for in your next role?</li>
                      </ul>
                      <p><strong>Red flags:</strong> Badmouths former employers, no questions, misaligned values</p>
                    </div>
                    
                    <div class="interview-stage">
                      <h6>Stage 2: Skills Assessment (Paid Project)</h6>
                      <p><strong>Goal:</strong> Can they actually do the work?</p>
                      <ul>
                        <li>Real problem from your business</li>
                        <li>4-8 hours of work</li>
                        <li>Pay $200-500</li>
                        <li>Judge: Quality, speed, communication</li>
                      </ul>
                      <div class="example-box">
                        <strong>Examples by Role:</strong>
                        <ul>
                          <li><strong>Marketing:</strong> Create 1-week social campaign</li>
                          <li><strong>Engineering:</strong> Build simple feature</li>
                          <li><strong>Sales:</strong> Mock discovery call + follow-up</li>
                          <li><strong>Design:</strong> Redesign one page/flow</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div class="interview-stage">
                      <h6>Stage 3: Team Fit + Reference (45 min)</h6>
                      <p><strong>Goal:</strong> Will they thrive here specifically?</p>
                      <ul>
                        <li>Meet 2-3 team members informally</li>
                        <li>Discuss actual current challenges</li>
                        <li>Get their ideas and approach</li>
                        <li>Call 2 references with specific questions</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="reference-check">
                    <h5>🔍 Reference Check Questions That Reveal Truth</h5>
                    <ol>
                      <li>"On a scale of 1-10, how would you rate their performance?"<br>
                        <em>Follow-up: "What would it take to make them a 10?"</em></li>
                      <li>"What type of environment do they thrive in?"</li>
                      <li>"Would you hire them again?" <em>(Listen for hesitation)</em></li>
                      <li>"Who else should I talk to about their work?"</li>
                    </ol>
                  </div>
                `
              },
              {
                title: 'Compensation & Equity for Startups',
                content: `
                  <h4>Pay Less Cash, Give More Ownership</h4>
                  <p>You can't match big company salaries. Here's how to build packages that attract top talent anyway.</p>
                  
                  <div class="compensation-framework">
                    <h5>💰 The Startup Compensation Formula</h5>
                    
                    <div class="comp-components">
                      <h6>Total Compensation = Base + Equity + Benefits + Growth</h6>
                      
                      <div class="comp-breakdown">
                        <h6>Base Salary Guidelines</h6>
                        <ul>
                          <li>Pay 70-85% of market rate</li>
                          <li>Use AngelList salary tool for benchmarks</li>
                          <li>Adjust for location (or go location-agnostic)</li>
                          <li>Be transparent about runway implications</li>
                        </ul>
                        
                        <h6>Equity Allocation (First 10 Hires)</h6>
                        <table class="equity-table">
                          <tr>
                            <th>Employee #</th>
                            <th>Role Level</th>
                            <th>Equity Range</th>
                            <th>4-Year Vest</th>
                          </tr>
                          <tr>
                            <td>1-2</td>
                            <td>Senior/Lead</td>
                            <td>1.0-2.0%</td>
                            <td>1-year cliff</td>
                          </tr>
                          <tr>
                            <td>3-5</td>
                            <td>Senior IC</td>
                            <td>0.5-1.0%</td>
                            <td>Standard</td>
                          </tr>
                          <tr>
                            <td>6-10</td>
                            <td>Mid-level</td>
                            <td>0.25-0.5%</td>
                            <td>Standard</td>
                          </tr>
                          <tr>
                            <td>11-20</td>
                            <td>Junior/Mid</td>
                            <td>0.1-0.25%</td>
                            <td>Standard</td>
                          </tr>
                        </table>
                      </div>
                    </div>
                    
                    <div class="creative-benefits">
                      <h5>🎁 Low-Cost, High-Value Benefits</h5>
                      <ul>
                        <li><strong>Unlimited PTO:</strong> Costs nothing, valued highly</li>
                        <li><strong>Remote Work:</strong> Save on office, expand talent pool</li>
                        <li><strong>Learning Budget:</strong> $1k/year for courses/books</li>
                        <li><strong>Equipment:</strong> They keep laptop after 2 years</li>
                        <li><strong>Health Stipend:</strong> $200-400/month if no group plan</li>
                        <li><strong>Coworking Access:</strong> $200-300/month</li>
                        <li><strong>Equity Refresh:</strong> Additional grants for performance</li>
                      </ul>
                    </div>
                    
                    <div class="negotiation-tips">
                      <h5>🤝 Negotiation Tactics</h5>
                      <ul>
                        <li><strong>The Growth Story:</strong> "Join at $X, be VP at $10X"</li>
                        <li><strong>The Equity Upside:</strong> Show realistic exit scenarios</li>
                        <li><strong>The Impact Pitch:</strong> "Own entire product area"</li>
                        <li><strong>The Flexibility:</strong> "Design your own role"</li>
                        <li><strong>The Timing:</strong> "Ground floor opportunity"</li>
                      </ul>
                    </div>
                  </div>
                `
              }
            ]
          },
          {
            id: 'remote-culture',
            title: 'Building Remote-First Culture',
            icon: '🌐',
            tags: ['remote', 'culture', 'team', 'communication'],
            intro: 'Create a thriving distributed team that outperforms co-located companies.',
            sections: [
              {
                title: 'Remote Work Foundations',
                content: `
                  <h4>The Remote-First Mindset</h4>
                  <p>Remote isn't just "work from home" - it's a completely different operating system for your company.</p>
                  
                  <div class="remote-principles">
                    <h5>🎯 Core Remote Principles</h5>
                    <ol>
                      <li><strong>Asynchronous by Default:</strong> Meetings are the exception</li>
                      <li><strong>Documentation Over Verbal:</strong> If it's not written, it didn't happen</li>
                      <li><strong>Trust Over Surveillance:</strong> Measure outputs, not hours</li>
                      <li><strong>Intentional Culture:</strong> You must actively build connections</li>
                      <li><strong>Equal Playing Field:</strong> No "second-class" remote employees</li>
                    </ol>
                  </div>
                  
                  <div class="remote-toolkit">
                    <h5>🔧 Essential Remote Stack</h5>
                    <div class="tool-categories">
                      <div class="tool-category">
                        <h6>Communication</h6>
                        <ul>
                          <li><strong>Async:</strong> Slack, Discord, or Teams</li>
                          <li><strong>Video:</strong> Zoom, Meet, or Around</li>
                          <li><strong>Loom:</strong> Async video updates</li>
                        </ul>
                      </div>
                      <div class="tool-category">
                        <h6>Collaboration</h6>
                        <ul>
                          <li><strong>Docs:</strong> Notion, Confluence</li>
                          <li><strong>Whiteboard:</strong> Miro, FigJam</li>
                          <li><strong>Project:</strong> Linear, Asana</li>
                        </ul>
                      </div>
                      <div class="tool-category">
                        <h6>Culture</h6>
                        <ul>
                          <li><strong>Social:</strong> Donut, Gather</li>
                          <li><strong>Recognition:</strong> Bonusly</li>
                          <li><strong>Feedback:</strong> 15Five</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                `
              },
              {
                title: 'Async Communication Mastery',
                content: `
                  <h4>Write Once, Inform Many</h4>
                  <p>Great async communication is a superpower. Master it and watch productivity soar.</p>
                  
                  <div class="async-rules">
                    <h5>📝 The Async Communication Playbook</h5>
                    
                    <div class="communication-format">
                      <h6>The Perfect Async Update Format</h6>
                      <div class="template-box">
                        <p><strong>Subject:</strong> [Type] Brief, specific subject</p>
                        <p><strong>TL;DR:</strong> 1-2 sentence summary</p>
                        <p><strong>Context:</strong> Why this matters now</p>
                        <p><strong>Details:</strong> The full information</p>
                        <p><strong>Action Items:</strong> Who needs to do what by when</p>
                        <p><strong>Questions:</strong> Specific input needed</p>
                      </div>
                    </div>
                    
                    <div class="response-times">
                      <h6>Setting Response Expectations</h6>
                      <table class="response-sla">
                        <tr>
                          <th>Channel</th>
                          <th>Response Time</th>
                          <th>Use For</th>
                        </tr>
                        <tr>
                          <td>🔴 Urgent</td>
                          <td>2 hours</td>
                          <td>Blocking issues, emergencies</td>
                        </tr>
                        <tr>
                          <td>🟡 Normal</td>
                          <td>24 hours</td>
                          <td>Regular updates, questions</td>
                        </tr>
                        <tr>
                          <td>🟢 FYI</td>
                          <td>No response needed</td>
                          <td>Updates, documentation</td>
                        </tr>
                      </table>
                    </div>
                    
                    <div class="meeting-reduction">
                      <h5>🚅 Replace Meetings With Async</h5>
                      <ul>
                        <li><strong>Status Updates:</strong> Weekly Loom videos</li>
                        <li><strong>Brainstorming:</strong> Collaborative docs with comments</li>
                        <li><strong>Decision Making:</strong> RFC documents with async voting</li>
                        <li><strong>Onboarding:</strong> Recorded walkthroughs + Q&A doc</li>
                        <li><strong>Feedback:</strong> Written reviews with video follow-up</li>
                      </ul>
                    </div>
                  </div>
                `
              },
              {
                title: 'Building Connection Remotely',
                content: `
                  <h4>Combat Isolation, Build Belonging</h4>
                  <p>The biggest remote challenge isn't productivity - it's connection. Here's how to build a tight-knit distributed team.</p>
                  
                  <div class="connection-strategies">
                    <h5>🤝 Virtual Culture Building</h5>
                    
                    <div class="culture-activity">
                      <h6>Daily Rituals</h6>
                      <ul>
                        <li><strong>Standup Alternative:</strong> Async daily check-ins in Slack</li>
                        <li><strong>Coffee Chats:</strong> Random 15-min pair calls</li>
                        <li><strong>Wins Channel:</strong> Celebrate everything</li>
                        <li><strong>Music Monday:</strong> Team playlist sharing</li>
                      </ul>
                    </div>
                    
                    <div class="culture-activity">
                      <h6>Weekly Events</h6>
                      <ul>
                        <li><strong>Demo Friday:</strong> Show what you built</li>
                        <li><strong>Learning Lunch:</strong> Someone teaches something</li>
                        <li><strong>Game Time:</strong> Among Us, Codenames, etc.</li>
                        <li><strong>Coworking Hours:</strong> Cameras on, muted, working</li>
                      </ul>
                    </div>
                    
                    <div class="culture-activity">
                      <h6>Monthly Initiatives</h6>
                      <ul>
                        <li><strong>Culture Survey:</strong> Pulse check + improvements</li>
                        <li><strong>Spotlight Series:</strong> Deep dive on team members</li>
                        <li><strong>Hackathon:</strong> Build something fun together</li>
                        <li><strong>Book Club:</strong> Read and discuss</li>
                      </ul>
                    </div>
                    
                    <div class="culture-activity">
                      <h6>Quarterly Gatherings</h6>
                      <ul>
                        <li><strong>Virtual Retreat:</strong> 2 days of bonding + planning</li>
                        <li><strong>IRL Meetup:</strong> If budget allows (even regional)</li>
                        <li><strong>Celebration:</strong> Mark milestones together</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="remote-onboarding">
                    <h5>🚀 Remote Onboarding That Works</h5>
                    <div class="onboarding-week">
                      <h6>Week 1 Blueprint</h6>
                      <ul>
                        <li><strong>Day 1:</strong> Welcome package delivered, team intros</li>
                        <li><strong>Day 2-3:</strong> Tool setup, documentation dive</li>
                        <li><strong>Day 4-5:</strong> Shadow team members, first small task</li>
                        <li><strong>Week 2:</strong> Own first project with mentor</li>
                        <li><strong>Week 4:</strong> Present learnings to team</li>
                      </ul>
                    </div>
                  </div>
                `
              }
            ]
          },
          {
            id: 'performance-management',
            title: 'Performance & Growth Management',
            icon: '📈',
            tags: ['performance', 'feedback', 'growth', 'management'],
            intro: 'Build a culture of continuous improvement and growth without corporate BS.',
            sections: [
              {
                title: 'Startup-Friendly Performance Systems',
                content: `
                  <h4>Ditch Annual Reviews, Embrace Continuous Growth</h4>
                  <p>Traditional performance management kills startups. Here's a system that actually works.</p>
                  
                  <div class="performance-framework">
                    <h5>🎯 The 30-60-90 Framework</h5>
                    
                    <div class="review-cycle">
                      <h6>Monthly 1-on-1s (30 min)</h6>
                      <ul>
                        <li>What's going well?</li>
                        <li>What's challenging?</li>
                        <li>What support do you need?</li>
                        <li>Quick feedback both ways</li>
                      </ul>
                      
                      <h6>Quarterly Reviews (60 min)</h6>
                      <ul>
                        <li>Goal progress check</li>
                        <li>Skills development</li>
                        <li>Career conversation</li>
                        <li>Compensation adjustment if needed</li>
                      </ul>
                      
                      <h6>Annual Planning (90 min)</h6>
                      <ul>
                        <li>Major career milestones</li>
                        <li>Long-term growth path</li>
                        <li>Equity refresh discussion</li>
                        <li>Role evolution planning</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="feedback-culture">
                    <h5>🗣️ Building a Feedback Culture</h5>
                    
                    <div class="feedback-types">
                      <h6>The SBI Model</h6>
                      <ul>
                        <li><strong>Situation:</strong> When and where it happened</li>
                        <li><strong>Behavior:</strong> What specifically was done</li>
                        <li><strong>Impact:</strong> The effect it had</li>
                      </ul>
                      
                      <div class="example-box">
                        <p><strong>Example:</strong> "In yesterday's client call (S), when you jumped in to clarify the technical requirements (B), it helped them understand immediately and we closed the deal (I)."</p>
                      </div>
                    </div>
                    
                    <div class="growth-planning">
                      <h6>Individual Growth Plans</h6>
                      <ul>
                        <li><strong>Current Strengths:</strong> What to leverage</li>
                        <li><strong>Growth Areas:</strong> 1-2 focus areas max</li>
                        <li><strong>Learning Path:</strong> Courses, mentors, projects</li>
                        <li><strong>Success Metrics:</strong> How we'll measure progress</li>
                        <li><strong>Timeline:</strong> 90-day sprints</li>
                      </ul>
                    </div>
                  </div>
                `
              }
            ]
          }
        ]
      },
      {
        id: 'sales-success',
        name: 'Sales & Customer Success',
        icon: '📣',
        description: 'Master the art of selling and keeping customers happy',
        priority: 7,
        cards: [
          {
            id: 'founder-sales',
            title: 'Founder-Led Sales Mastery',
            icon: '🎯',
            tags: ['sales', 'founder-sales', 'b2b', 'closing'],
            intro: 'You\'re the best salesperson for your product. Learn to sell without feeling salesy.',
            sections: [
              {
                title: 'The Founder Sales Advantage',
                content: `
                  <h4>Why Founders Outsell Everyone</h4>
                  <p>You have superpowers that no sales rep can match. Use them.</p>
                  
                  <div class="founder-advantages">
                    <h5>💪 Your Unfair Advantages</h5>
                    <ul>
                      <li><strong>Passion:</strong> Genuine excitement is contagious</li>
                      <li><strong>Authority:</strong> "Let me build that for you" carries weight</li>
                      <li><strong>Speed:</strong> Make decisions on the spot</li>
                      <li><strong>Vision:</strong> Paint the future they'll be part of</li>
                      <li><strong>Flexibility:</strong> Customize solutions in real-time</li>
                    </ul>
                  </div>
                  
                  <div class="sales-mindset">
                    <h5>🧠 The Mindset Shift</h5>
                    <div class="mindset-comparison">
                      <div class="old-mindset">
                        <h6>❌ Old Thinking</h6>
                        <ul>
                          <li>"I'm bothering them"</li>
                          <li>"I hate selling"</li>
                          <li>"They probably won't buy"</li>
                          <li>"I need to convince them"</li>
                        </ul>
                      </div>
                      <div class="new-mindset">
                        <h6>✅ New Thinking</h6>
                        <ul>
                          <li>"I'm solving their problem"</li>
                          <li>"I'm helping them succeed"</li>
                          <li>"I'm qualifying them"</li>
                          <li>"We're exploring fit together"</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                `
              },
              {
                title: 'The Modern Sales Process',
                content: `
                  <h4>From First Touch to Closed Deal</h4>
                  <p>A repeatable process that doesn't feel like a process.</p>
                  
                  <div class="sales-stages">
                    <h5>🗺️ The 5-Stage Journey</h5>
                    
                    <div class="stage-detail">
                      <h6>Stage 1: Prospecting (Find Pain)</h6>
                      <ul>
                        <li><strong>Goal:</strong> Identify companies with the problem you solve</li>
                        <li><strong>Activities:</strong> Research, outreach, qualifying</li>
                        <li><strong>Success Metric:</strong> Meetings booked</li>
                        <li><strong>Tools:</strong> LinkedIn Sales Navigator, Apollo.io</li>
                      </ul>
                      
                      <div class="outreach-templates">
                        <h6>Cold Email That Works</h6>
                        <div class="template-box">
                          <p>Subject: Quick question about [specific challenge]</p>
                          <p>Hi [Name],</p>
                          <p>I noticed [specific observation about their company]. </p>
                          <p>We help companies like [similar customer] [specific result].</p>
                          <p>Worth a quick chat to see if we could help [their company] too?</p>
                          <p>- [Your name]</p>
                        </div>
                      </div>
                    </div>
                    
                    <div class="stage-detail">
                      <h6>Stage 2: Discovery (Diagnose Problem)</h6>
                      <ul>
                        <li><strong>Goal:</strong> Understand their situation deeply</li>
                        <li><strong>Activities:</strong> Ask questions, listen, take notes</li>
                        <li><strong>Success Metric:</strong> Clear problem definition</li>
                        <li><strong>Key Questions:</strong></li>
                      </ul>
                      
                      <div class="discovery-questions">
                        <ol>
                          <li>Walk me through your current process for [area]</li>
                          <li>What's the biggest frustration with that?</li>
                          <li>How much time/money does this cost you?</li>
                          <li>What have you tried to fix it?</li>
                          <li>What happens if you don't solve this?</li>
                          <li>What would success look like?</li>
                          <li>Who else is involved in this decision?</li>
                          <li>What's your timeline for solving this?</li>
                        </ol>
                      </div>
                    </div>
                    
                    <div class="stage-detail">
                      <h6>Stage 3: Solution Design (Prescribe Cure)</h6>
                      <ul>
                        <li><strong>Goal:</strong> Show how you solve their specific problem</li>
                        <li><strong>Activities:</strong> Demo, proposal, ROI calculation</li>
                        <li><strong>Success Metric:</strong> "This is exactly what we need"</li>
                        <li><strong>Demo Best Practices:</strong></li>
                      </ul>
                      
                      <div class="demo-framework">
                        <ul>
                          <li>Confirm the problem before showing anything</li>
                          <li>Show the workflow, not features</li>
                          <li>Use their data/examples when possible</li>
                          <li>Let them drive (give them control)</li>
                          <li>Stop frequently for questions</li>
                          <li>End with clear next steps</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div class="stage-detail">
                      <h6>Stage 4: Negotiation (Align Terms)</h6>
                      <ul>
                        <li><strong>Goal:</strong> Find a win-win arrangement</li>
                        <li><strong>Activities:</strong> Pricing discussion, contract terms</li>
                        <li><strong>Success Metric:</strong> Verbal agreement</li>
                        <li><strong>Negotiation Tactics:</strong></li>
                      </ul>
                      
                      <div class="negotiation-tips">
                        <ul>
                          <li>Always anchor high then come down</li>
                          <li>Trade concessions ("If I do X, can you do Y?")</li>
                          <li>Create urgency with limited-time offers</li>
                          <li>Offer payment terms vs. price reductions</li>
                          <li>Bundle vs. discount</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div class="stage-detail">
                      <h6>Stage 5: Closing (Seal Deal)</h6>
                      <ul>
                        <li><strong>Goal:</strong> Get signature and payment</li>
                        <li><strong>Activities:</strong> Handle objections, get signature</li>
                        <li><strong>Success Metric:</strong> Money in bank</li>
                        <li><strong>Closing Techniques:</strong></li>
                      </ul>
                      
                      <div class="closing-tactics">
                        <ul>
                          <li><strong>Assumptive Close:</strong> "When should we start your onboarding?"</li>
                          <li><strong>Alternative Close:</strong> "Do you prefer monthly or annual?"</li>
                          <li><strong>Urgency Close:</strong> "This price is valid until Friday"</li>
                          <li><strong>Summary Close:</strong> Recap value, ask for business</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                `
              },
              {
                title: 'Objection Handling Playbook',
                content: `
                  <h4>Turn "No" into "Not Yet" into "Yes"</h4>
                  <p>Every objection is just a request for more information. Here's how to handle the most common ones.</p>
                  
                  <div class="objection-responses">
                    <h5>🚫 Common Objections & Responses</h5>
                    
                    <div class="objection-item">
                      <h6>"It's too expensive"</h6>
                      <div class="response-framework">
                        <p><strong>First:</strong> "I understand price is important. Help me understand - too expensive compared to what?"</p>
                        <p><strong>Then:</strong> Reframe as investment vs. cost</p>
                        <p><strong>Show:</strong> ROI calculation with their numbers</p>
                        <p><strong>Options:</strong></p>
                        <ul>
                          <li>Smaller starter package</li>
                          <li>Extended payment terms</li>
                          <li>Success-based pricing</li>
                          <li>Remove features they don't need</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div class="objection-item">
                      <h6>"We need to think about it"</h6>
                      <div class="response-framework">
                        <p><strong>First:</strong> "Of course! What specifically would you like to think through?"</p>
                        <p><strong>Uncover:</strong> The real concern hiding behind delay</p>
                        <p><strong>Address:</strong> That specific concern directly</p>
                        <p><strong>Create Timeline:</strong> "When would be a good time to reconnect?"</p>
                      </div>
                    </div>
                    
                    <div class="objection-item">
                      <h6>"We're building this internally"</h6>
                      <div class="response-framework">
                        <p><strong>First:</strong> "That's great! How's that project going?"</p>
                        <p><strong>Explore:</strong> Timeline, resources, opportunity cost</p>
                        <p><strong>Position:</strong> "Buy vs. build" analysis</p>
                        <p><strong>Suggest:</strong> "What if you could launch 6 months sooner?"</p>
                      </div>
                    </div>
                    
                    <div class="objection-item">
                      <h6>"I need to check with my boss"</h6>
                      <div class="response-framework">
                        <p><strong>First:</strong> "Makes sense! What do you think they'll want to know?"</p>
                        <p><strong>Prepare:</strong> Arm them with materials</p>
                        <p><strong>Offer:</strong> "Would it help if I joined that conversation?"</p>
                        <p><strong>Coach:</strong> Help them sell internally</p>
                      </div>
                    </div>
                  </div>
                `
              }
            ]
          },
          {
            id: 'customer-success',
            title: 'Customer Success Fundamentals',
            icon: '🌟',
            tags: ['customer-success', 'retention', 'support', 'churn'],
            intro: 'Keeping customers is cheaper than finding new ones. Build a CS function that drives growth.',
            sections: [
              {
                title: 'Building Your CS Foundation',
                content: `
                  <h4>Customer Success = Your Success</h4>
                  <p>Great CS is the difference between 5% and 50% annual churn. Here's how to build it right.</p>
                  
                  <div class="cs-principles">
                    <h5>🎯 Core CS Principles</h5>
                    <ol>
                      <li><strong>Proactive > Reactive:</strong> Solve problems before they arise</li>
                      <li><strong>Success > Support:</strong> Help them win, not just use</li>
                      <li><strong>Data-Driven:</strong> Track usage, spot risks early</li>
                      <li><strong>Scalable:</strong> Build systems that grow with you</li>
                      <li><strong>Revenue-Focused:</strong> CS should drive expansion</li>
                    </ol>
                  </div>
                  
                  <div class="cs-metrics">
                    <h5>📊 Key CS Metrics to Track</h5>
                    <div class="metrics-grid">
                      <div class="metric-card">
                        <h6>Churn Rate</h6>
                        <p>Lost customers ÷ Total customers</p>
                        <p><strong>Target:</strong> <5% monthly</p>
                      </div>
                      <div class="metric-card">
                        <h6>Net Revenue Retention</h6>
                        <p>(Retained + Expansion) ÷ Starting</p>
                        <p><strong>Target:</strong> >100%</p>
                      </div>
                      <div class="metric-card">
                        <h6>Time to Value</h6>
                        <p>Signup → First success</p>
                        <p><strong>Target:</strong> <7 days</p>
                      </div>
                      <div class="metric-card">
                        <h6>Health Score</h6>
                        <p>Composite engagement metric</p>
                        <p><strong>Target:</strong> 80%+ healthy</p>
                      </div>
                    </div>
                  </div>
                `
              },
              {
                title: 'The Customer Journey Map',
                content: `
                  <h4>From Signup to Advocate</h4>
                  <p>Design intentional experiences at every stage of the customer lifecycle.</p>
                  
                  <div class="journey-stages">
                    <h5>🗺️ The 6-Stage Journey</h5>
                    
                    <div class="journey-stage">
                      <h6>1. Onboarding (Days 0-30)</h6>
                      <p><strong>Goal:</strong> First value achievement</p>
                      <ul>
                        <li>Welcome sequence (email + in-app)</li>
                        <li>Setup assistance (call or self-serve)</li>
                        <li>Quick wins identification</li>
                        <li>Success milestone tracking</li>
                      </ul>
                      <div class="pro-tip">
                        <strong>Pro Tip:</strong> 80% of churn happens in first 90 days. Nail onboarding.
                      </div>
                    </div>
                    
                    <div class="journey-stage">
                      <h6>2. Adoption (Days 30-90)</h6>
                      <p><strong>Goal:</strong> Habit formation</p>
                      <ul>
                        <li>Feature discovery campaigns</li>
                        <li>Use case expansion</li>
                        <li>Team invites/seats</li>
                        <li>Initial ROI demonstration</li>
                      </ul>
                    </div>
                    
                    <div class="journey-stage">
                      <h6>3. Growth (Months 3-12)</h6>
                      <p><strong>Goal:</strong> Increasing usage/spend</p>
                      <ul>
                        <li>Quarterly business reviews</li>
                        <li>Upsell opportunities</li>
                        <li>Advanced feature training</li>
                        <li>Integration recommendations</li>
                      </ul>
                    </div>
                    
                    <div class="journey-stage">
                      <h6>4. Renewal (Annual)</h6>
                      <p><strong>Goal:</strong> Smooth continuation</p>
                      <ul>
                        <li>90-day renewal planning</li>
                        <li>Value recap presentation</li>
                        <li>Negotiation if needed</li>
                        <li>Multi-year incentives</li>
                      </ul>
                    </div>
                    
                    <div class="journey-stage">
                      <h6>5. Expansion (Ongoing)</h6>
                      <p><strong>Goal:</strong> Land and expand</p>
                      <ul>
                        <li>Additional seats/usage</li>
                        <li>New departments/use cases</li>
                        <li>Premium features</li>
                        <li>Professional services</li>
                      </ul>
                    </div>
                    
                    <div class="journey-stage">
                      <h6>6. Advocacy (Earned)</h6>
                      <p><strong>Goal:</strong> Turn customers into salespeople</p>
                      <ul>
                        <li>Case study development</li>
                        <li>Reference calls</li>
                        <li>Review sites</li>
                        <li>Referral programs</li>
                      </ul>
                    </div>
                  </div>
                `
              },
              {
                title: 'Preventing & Reducing Churn',
                content: `
                  <h4>Keep the Customers You Worked So Hard to Get</h4>
                  <p>Every saved customer is worth 5-25x a new acquisition. Here's how to plug the leaky bucket.</p>
                  
                  <div class="churn-prevention">
                    <h5>🚨 Early Warning Signals</h5>
                    
                    <div class="warning-signals">
                      <h6>Behavioral Red Flags</h6>
                      <ul>
                        <li>🔴 Login frequency dropping (down 50%+)</li>
                        <li>🔴 Key feature usage declining</li>
                        <li>🔴 Support tickets increasing</li>
                        <li>🔴 Billing issues or disputes</li>
                        <li>🔴 Champion leaves company</li>
                        <li>🔴 Competitor evaluation signals</li>
                      </ul>
                    </div>
                    
                    <div class="health-score">
                      <h6>Building a Health Score</h6>
                      <div class="score-formula">
                        <p><strong>Health Score = </strong></p>
                        <ul>
                          <li>40% - Feature adoption (using core features)</li>
                          <li>30% - Engagement (logins, actions)</li>
                          <li>20% - Outcomes (achieving their goals)</li>
                          <li>10% - Relationship (NPS, support)</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div class="save-playbook">
                      <h5>🛡️ The Save Playbook</h5>
                      
                      <div class="save-steps">
                        <h6>When At-Risk Signal Detected:</h6>
                        <ol>
                          <li><strong>Immediate Outreach (24 hrs)</strong>
                            <ul>
                              <li>"Noticed you haven't logged in recently"</li>
                              <li>"Want to make sure you're getting value"</li>
                              <li>Offer help, not sales pitch</li>
                            </ul>
                          </li>
                          <li><strong>Diagnose Root Cause</strong>
                            <ul>
                              <li>Technical issues?</li>
                              <li>Didn't see value?</li>
                              <li>Changed priorities?</li>
                              <li>Budget constraints?</li>
                            </ul>
                          </li>
                          <li><strong>Create Recovery Plan</strong>
                            <ul>
                              <li>Additional training</li>
                              <li>Different use case</li>
                              <li>Downgrade options</li>
                              <li>Pause subscription</li>
                            </ul>
                          </li>
                          <li><strong>Executive Escalation</strong>
                            <ul>
                              <li>Founder reaches out</li>
                              <li>Special attention</li>
                              <li>Custom solutions</li>
                            </ul>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                `
              }
            ]
          }
        ]
      },
      {
        id: 'product-development',
        name: 'Product Development',
        icon: '🔨',
        description: 'Build products people love, faster and cheaper',
        priority: 8,
        cards: [
          {
            id: 'mvp-mastery',
            title: 'MVP Development Mastery',
            icon: '🚀',
            tags: ['mvp', 'product', 'development', 'lean'],
            intro: 'Build the right thing, not everything. Master the art of the minimum viable product.',
            sections: [
              {
                title: 'Defining Your True MVP',
                content: `
                  <h4>Minimum Viable ≠ Crappy</h4>
                  <p>An MVP is the smallest thing that delivers value and learning. Most "MVPs" are way too big.</p>
                  
                  <div class="mvp-framework">
                    <h5>🎯 The MVP Decision Framework</h5>
                    
                    <div class="mvp-types">
                      <h6>Choose Your MVP Type</h6>
                      
                      <div class="mvp-type">
                        <h6>1. Concierge MVP</h6>
                        <p><strong>What:</strong> Manually deliver the service</p>
                        <p><strong>Example:</strong> Zappos started by buying shoes from stores after orders</p>
                        <p><strong>Best for:</strong> Service businesses, marketplaces</p>
                        <p><strong>Timeline:</strong> 1 week</p>
                      </div>
                      
                      <div class="mvp-type">
                        <h6>2. Wizard of Oz MVP</h6>
                        <p><strong>What:</strong> Looks automated, but manual behind scenes</p>
                        <p><strong>Example:</strong> Early AI companies with humans responding</p>
                        <p><strong>Best for:</strong> Complex automation</p>
                        <p><strong>Timeline:</strong> 2-3 weeks</p>
                      </div>
                      
                      <div class="mvp-type">
                        <h6>3. Landing Page MVP</h6>
                        <p><strong>What:</strong> Describe solution, collect emails</p>
                        <p><strong>Example:</strong> Buffer's initial page</p>
                        <p><strong>Best for:</strong> Testing demand</p>
                        <p><strong>Timeline:</strong> 2-3 days</p>
                      </div>
                      
                      <div class="mvp-type">
                        <h6>4. Single Feature MVP</h6>
                        <p><strong>What:</strong> One core feature, done well</p>
                        <p><strong>Example:</strong> Twitter's 140-char posts</p>
                        <p><strong>Best for:</strong> Clear value prop</p>
                        <p><strong>Timeline:</strong> 2-4 weeks</p>
                      </div>
                    </div>
                  </div>
                  
                  <div class="mvp-scoping">
                    <h5>✂️ The Feature Cutting Exercise</h5>
                    <p>List every feature you think you need. Now:</p>
                    <ol>
                      <li>Mark features customers explicitly asked for (⭐)</li>
                      <li>Mark features that directly solve the core problem (🎯)</li>
                      <li>Mark features competitors have (👥)</li>
                      <li>Build ONLY ⭐ + 🎯 features</li>
                      <li>Save the rest for v2</li>
                    </ol>
                  </div>
                `
              },
              {
                title: 'Rapid Prototyping Techniques',
                content: `
                  <h4>From Idea to Testable Prototype in Days</h4>
                  <p>Stop talking about building. Start building to learn.</p>
                  
                  <div class="prototyping-ladder">
                    <h5>🦄 The Fidelity Ladder</h5>
                    
                    <div class="prototype-level">
                      <h6>Level 1: Paper Sketches (2 hours)</h6>
                      <ul>
                        <li>Draw key screens on paper</li>
                        <li>Test with 5 people</li>
                        <li>Tools: Pen, paper, phone camera</li>
                        <li>Learn: Basic flow understanding</li>
                      </ul>
                    </div>
                    
                    <div class="prototype-level">
                      <h6>Level 2: Clickable Mockup (1 day)</h6>
                      <ul>
                        <li>Link static screens together</li>
                        <li>Add basic interactions</li>
                        <li>Tools: Figma, Canva, Marvel</li>
                        <li>Learn: Navigation and layout</li>
                      </ul>
                    </div>
                    
                    <div class="prototype-level">
                      <h6>Level 3: No-Code Functional (1 week)</h6>
                      <ul>
                        <li>Working features, real data</li>
                        <li>Basic user accounts</li>
                        <li>Tools: Bubble, Webflow, Glide</li>
                        <li>Learn: Core value delivery</li>
                      </ul>
                    </div>
                    
                    <div class="prototype-level">
                      <h6>Level 4: Code MVP (2-4 weeks)</h6>
                      <ul>
                        <li>Custom functionality</li>
                        <li>Scalable architecture</li>
                        <li>Tools: Your tech stack</li>
                        <li>Learn: Technical feasibility</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="testing-framework">
                    <h5>🧪 User Testing Protocol</h5>
                    <div class="testing-steps">
                      <ol>
                        <li><strong>Recruit:</strong> 5 target users (90% of issues found)</li>
                        <li><strong>Task:</strong> "Try to [core action]" (no hints!)</li>
                        <li><strong>Observe:</strong> Watch, don't help</li>
                        <li><strong>Note:</strong> Where they struggle</li>
                        <li><strong>Ask:</strong> "What did you expect to happen?"</li>
                        <li><strong>Iterate:</strong> Fix biggest issues, test again</li>
                      </ol>
                    </div>
                  </div>
                `
              },
              {
                title: 'Product-Market Fit Signals',
                content: `
                  <h4>How to Know When You've Found It</h4>
                  <p>PMF isn't a feeling - it's measurable. Here's how to know you're there.</p>
                  
                  <div class="pmf-signals">
                    <h5>🎯 Quantitative PMF Signals</h5>
                    
                    <div class="signal-card">
                      <h6>The Sean Ellis Test</h6>
                      <p>Ask: "How would you feel if you could no longer use [product]?"</p>
                      <ul>
                        <li>🔴 <strong>Very disappointed:</strong> 40%+ = PMF</li>
                        <li>🟡 <strong>Somewhat disappointed:</strong> 25-40% = Close</li>
                        <li>🟢 <strong>Not disappointed:</strong> <25% = Not there</li>
                      </ul>
                    </div>
                    
                    <div class="signal-card">
                      <h6>The Growth Metrics</h6>
                      <ul>
                        <li><strong>Organic growth:</strong> 20%+ monthly without marketing</li>
                        <li><strong>Retention:</strong> 6-month retention >20%</li>
                        <li><strong>NPS:</strong> Score >50</li>
                        <li><strong>Payback:</strong> CAC payback <12 months</li>
                      </ul>
                    </div>
                    
                    <div class="signal-card">
                      <h6>The Usage Patterns</h6>
                      <ul>
                        <li>Daily/weekly active use</li>
                        <li>Growing time in product</li>
                        <li>Multiple features adopted</li>
                        <li>Inviting team members</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="pmf-qualitative">
                    <h5>🗣️ Qualitative PMF Signals</h5>
                    <ul>
                      <li>Customers describe it to others enthusiastically</li>
                      <li>They complain when it's down</li>
                      <li>They ask for more features (not different product)</li>
                      <li>They're willing to pay more</li>
                      <li>Sales cycles get shorter</li>
                      <li>Word of mouth becomes primary channel</li>
                    </ul>
                  </div>
                  
                  <div class="pre-pmf-strategy">
                    <h5>🔄 What to Do Pre-PMF</h5>
                    <div class="strategy-box">
                      <p><strong>DO:</strong></p>
                      <ul>
                        <li>Talk to users every single day</li>
                        <li>Ship improvements weekly</li>
                        <li>Focus on one use case</li>
                        <li>Say no to everything else</li>
                      </ul>
                      <p><strong>DON'T:</strong></p>
                      <ul>
                        <li>Scale marketing spend</li>
                        <li>Hire sales team</li>
                        <li>Add lots of features</li>
                        <li>Expand to new segments</li>
                      </ul>
                    </div>
                  </div>
                `
              }
            ]
          },
          {
            id: 'agile-for-startups',
            title: 'Agile Development for Startups',
            icon: '🎯',
            tags: ['agile', 'scrum', 'development', 'process'],
            intro: 'Agile without the corporate BS. A practical approach for small teams.',
            sections: [
              {
                title: 'Startup-Friendly Agile',
                content: `
                  <h4>Agile That Actually Works</h4>
                  <p>Forget 2-week sprints and story points. Here's agile for teams that need to move fast.</p>
                  
                  <div class="agile-principles">
                    <h5>🎯 The Only Rules You Need</h5>
                    <ol>
                      <li><strong>Ship daily:</strong> Something goes live every day</li>
                      <li><strong>Talk to users:</strong> Feedback drives priorities</li>
                      <li><strong>Limit WIP:</strong> Finish before starting new</li>
                      <li><strong>Reflect weekly:</strong> What worked? What didn't?</li>
                    </ol>
                  </div>
                  
                  <div class="development-cycle">
                    <h5>🔄 The 1-Week Cycle</h5>
                    
                    <div class="weekly-rhythm">
                      <h6>Monday: Planning (1 hour)</h6>
                      <ul>
                        <li>Review last week's metrics</li>
                        <li>Pick 3-5 things to ship this week</li>
                        <li>Assign owners (not committees)</li>
                        <li>Define "done" for each</li>
                      </ul>
                      
                      <h6>Tuesday-Thursday: Building</h6>
                      <ul>
                        <li>Daily standup (5 min, async is fine)</li>
                        <li>Focus blocks (no meetings)</li>
                        <li>Ship as you finish</li>
                        <li>Quick user feedback loops</li>
                      </ul>
                      
                      <h6>Friday: Demo & Retro (1 hour)</h6>
                      <ul>
                        <li>Everyone demos what they shipped</li>
                        <li>Celebrate wins</li>
                        <li>Discuss what to improve</li>
                        <li>Plan next week roughly</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="tools-process">
                    <h5>🔧 Minimal Tool Stack</h5>
                    <ul>
                      <li><strong>Task Tracking:</strong> Linear, GitHub Issues, or Notion</li>
                      <li><strong>Communication:</strong> Slack/Discord + Loom</li>
                      <li><strong>Documentation:</strong> Notion or GitHub Wiki</li>
                      <li><strong>Deployment:</strong> Vercel/Netlify (auto-deploy)</li>
                    </ul>
                  </div>
                `
              }
            ]
          },
          {
            id: 'user-research',
            title: 'User Research on a Budget',
            icon: '🔍',
            tags: ['research', 'user-testing', 'feedback', 'product'],
            intro: 'Great products come from deep user understanding. Learn how to do research without a research team.',
            sections: [
              {
                title: 'Continuous Discovery Habits',
                content: `
                  <h4>Make User Research a Habit, Not a Project</h4>
                  <p>The best companies talk to users constantly. Here's how to build the habit.</p>
                  
                  <div class="discovery-habits">
                    <h5>📅 Weekly Discovery Rituals</h5>
                    
                    <div class="habit-framework">
                      <h6>The 3-Touch Rule</h6>
                      <p>Every week, every team member should:</p>
                      <ol>
                        <li><strong>1 User Interview:</strong> 30-min call with customer</li>
                        <li><strong>1 Support Ticket:</strong> Read and respond personally</li>
                        <li><strong>1 Usage Session:</strong> Watch someone use your product</li>
                      </ol>
                    </div>
                    
                    <div class="research-methods">
                      <h5>🔬 Research Methods by Stage</h5>
                      
                      <div class="method-card">
                        <h6>Pre-Launch: Problem Discovery</h6>
                        <ul>
                          <li><strong>Method:</strong> Problem interviews</li>
                          <li><strong>Goal:</strong> Validate problem exists</li>
                          <li><strong>Sample size:</strong> 20-30 people</li>
                          <li><strong>Time:</strong> 30 min each</li>
                        </ul>
                      </div>
                      
                      <div class="method-card">
                        <h6>MVP Stage: Solution Testing</h6>
                        <ul>
                          <li><strong>Method:</strong> Usability testing</li>
                          <li><strong>Goal:</strong> Can they use it?</li>
                          <li><strong>Sample size:</strong> 5-8 people</li>
                          <li><strong>Time:</strong> 45 min each</li>
                        </ul>
                      </div>
                      
                      <div class="method-card">
                        <h6>Growth Stage: Optimization</h6>
                        <ul>
                          <li><strong>Method:</strong> A/B tests + surveys</li>
                          <li><strong>Goal:</strong> Improve metrics</li>
                          <li><strong>Sample size:</strong> Statistical significance</li>
                          <li><strong>Time:</strong> 1-2 week tests</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div class="research-tools">
                    <h5>💰 Budget-Friendly Research Tools</h5>
                    <ul>
                      <li><strong>Calendly:</strong> Let users book research slots</li>
                      <li><strong>Loom:</strong> Record usability sessions</li>
                      <li><strong>Hotjar:</strong> See how users navigate</li>
                      <li><strong>Typeform:</strong> Beautiful surveys</li>
                      <li><strong>Maze:</strong> Unmoderated testing</li>
                      <li><strong>Notion:</strong> Research repository</li>
                    </ul>
                  </div>
                `
              }
            ]
          }
        ]
      }

    ];
    
    // Broader topic categories for filtering
    const topicCategories = [
      { id: 'getting-started', name: '🚀 Getting Started', tags: ['ideation', 'ideas', 'validation', 'mvp', 'pitch', 'contest'] },
      { id: 'business-basics', name: '💼 Business Basics', tags: ['legal', 'formation', 'llc', 'contracts', 'finance', 'accounting', 'budgeting'] },
      { id: 'marketing-sales', name: '📣 Marketing & Sales', tags: ['marketing', 'sales', 'growth', 'pricing', 'conversion', 'branding', 'advertising'] },
      { id: 'product-tech', name: '🛠️ Product & Tech', tags: ['product', 'mvp', 'technical', 'vibe-coding', 'ai', 'development'] },
      { id: 'operations', name: '⚙️ Operations', tags: ['operations', 'lean', 'remote', 'metrics', 'productivity', 'team', 'hiring'] },
      { id: 'funding', name: '💰 Funding', tags: ['funding', 'investors', 'grants', 'bootstrapping', 'venture-capital', 'crowdfunding'] }
    ];
    
    // Filter learning content
    const filteredCategories = learningCategories.map(category => ({
      ...category,
      cards: category.cards.filter(card => {
        // Search filter
        if (learningSearchTerm) {
          const searchLower = learningSearchTerm.toLowerCase();
          const matchesSearch = 
            card.title.toLowerCase().includes(searchLower) ||
            card.intro.toLowerCase().includes(searchLower) ||
            card.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
            card.sections.some(section => 
              section.title.toLowerCase().includes(searchLower) ||
              section.content.toLowerCase().includes(searchLower)
            );
          if (!matchesSearch) return false;
        }
        
        // Topic filter - check if any of the card's tags match any tags in the selected category
        if (selectedTopic !== 'all') {
          const selectedCategory = topicCategories.find(cat => cat.id === selectedTopic);
          if (selectedCategory && !card.tags.some(tag => selectedCategory.tags.includes(tag))) {
            return false;
          }
        }
        
        return true;
      })
    })).filter(category => category.cards.length > 0);
    
    const toggleCardExpansion = (cardId, sectionIndex) => {
      const key = `${cardId}-${sectionIndex}`;
      const newExpanded = new Set(expandedCards);
      if (newExpanded.has(key)) {
        newExpanded.delete(key);
      } else {
        newExpanded.add(key);
      }
      setExpandedCards(newExpanded);
    };
    

    return (
      <div className="learning-section">
        <h2 className="page-title">📚 Learning Center</h2>
        <p className="section-intro">
          From idea to exit: comprehensive guides for building a successful business.
        </p>
        
        {/* Learning Controls */}
        <div className="resource-controls">
          <div className="resource-search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search guides, topics, or keywords..."
              value={learningSearchTerm}
              onChange={(e) => setLearningSearchTerm(e.target.value)}
              className="resource-search-input"
            />
          </div>
          
          <div className="resource-filters">
            <div className="category-filters">
              <button
                className={`category-filter-btn ${selectedTopic === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedTopic('all')}
              >
                All Topics
              </button>
              {topicCategories.map(category => (
                <button
                  key={category.id}
                  className={`category-filter-btn ${selectedTopic === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedTopic(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Learning Categories */}
        {filteredCategories
          .sort((a, b) => a.priority - b.priority)
          .map(category => (
            <div key={category.id} className="resource-category-section">
              <div className="category-header">
                <h3>{category.icon} {category.name}</h3>
                <p className="category-description">{category.description}</p>
              </div>
              
              <div className="tools-grid">
                {category.cards.map(card => (
                  <div 
                    key={card.id} 
                    className="learning-card"
                    onClick={() => openGuideModal(card)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="card-header">
                      <div className="card-title-section">
                        <span className="card-icon">{card.icon}</span>
                        <h4>{card.title}</h4>
                      </div>
                      {category.priority === 1 && (
                        <div className="recommended-badge">🏆 Contest Essential</div>
                      )}
                    </div>
                    
                    <p className="card-intro">{card.intro}</p>
                    
                    <div className="card-tags">
                      {card.tags.slice(0, 3).map(tag => (
                        <span 
                          key={tag} 
                          className="tag"
                        >
                          {tag}
                        </span>
                      ))}
                      {card.tags.length > 3 && (
                        <span className="tag more-tags">+{card.tags.length - 3} more</span>
                      )}
                    </div>
                    
                    <div className="view-more">
                      <button className="view-btn">View Guide →</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        
        {/* No Results */}
        {filteredCategories.length === 0 && (
          <div className="no-results">
            No guides match your current search or filters. Try adjusting your criteria.
          </div>
        )}
        
        <div className="resource-footer">
          <p>🎯 <strong>Start Here:</strong> Focus on the Contest Preparation guides if you're applying for the $1,000 Business Challenge!</p>
          <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
            Have suggestions for new guides? Email us at founders@neighborhoods.space
          </p>
        </div>
      </div>
    );
  });

  return (
    <div className="community-showcase">
      {/* Hero Section */}
      <header className="hero-section" style={{
        backgroundImage: 'url("/assets/gnf-fat-daddys.webp")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(255,228,241,0.95) 0%, rgba(255,214,236,0.95) 50%, rgba(232,240,255,0.95) 100%)'
        }}></div>
        <div className="hero-content" style={{ position: 'relative', zIndex: 1 }}>
          <h1 className="hero-title">🏆 The $1,000 Business Challenge</h1>
          <p className="hero-subtitle">Open to Western New York Founders</p>
          <p className="hero-question">What would you build with $1,000? Show us your plan. Win funding to make it happen.</p>
          
          {/* Dynamic Countdown Timer - Phase Aware */}
          {!timeLeft.expired && (
            <div className="submission-countdown-banner">
              <h3>
                {currentPhase === 'submission' && '⏰ Submissions Close In:'}
                {currentPhase === 'submission-and-voting' && '⏰ Submissions & Voting End In:'}
                {currentPhase === 'voting' && '🗳️ Voting Ends In:'}
                {currentPhase === 'lp-review' && '🔍 LP Review Ends In:'}
              </h3>
              <CountdownTimer timeLeft={timeLeft} large={true} />
              {currentPhase === 'submission-and-voting' && (
                <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                  Both submissions and voting are now open!
                </p>
              )}
            </div>
          )}
          
          {/* Real-time Counter */}
          <div className="submission-counter">
            <div className="counter-item">
              <span className="counter-number animated-number">{pitches.length}</span>
              <span className="counter-label">ideas submitted</span>
            </div>
            <span className="counter-separator">•</span>
            <div className="counter-item">
              <span className="counter-number">{pitches.reduce((sum, p) => sum + (p.votes || 0), 0)}</span>
              <span className="counter-label">total votes cast</span>
            </div>
            {!votingTimeLeft.votingOpen && votingTimeLeft.days !== undefined && (
              <>
                <span className="counter-separator">•</span>
                <div className="counter-item">
                  <span className="counter-number">{votingTimeLeft.days || 0}</span>
                  <span className="counter-label">days until voting opens</span>
                </div>
              </>
            )}
          </div>

          <button 
            className="hero-cta" 
            onClick={() => {
              const now = new Date();
              if (now > SUBMISSION_END_DATE) {
                alert('Submissions have closed. The contest ended on June 30th at 11:59 PM ET.');
                return;
              }
              setShowSubmitForm(true);
            }}
            disabled={new Date() > SUBMISSION_END_DATE}
          >
            {new Date() > SUBMISSION_END_DATE ? 'Submissions Closed' : 'Submit Your $1,000 Plan →'}
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="tab-navigation">
        <button 
          className={`tab ${activeTab === 'showcase' ? 'active' : ''}`}
          onClick={() => setActiveTab('showcase')}
        >
          🏠 Showcase
        </button>
        <button 
          className={`tab ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          🛠️ Resources
        </button>
        <button 
          className={`tab ${activeTab === 'learning' ? 'active' : ''}`}
          onClick={() => setActiveTab('learning')}
        >
          📚 Learning
        </button>
        <button 
          className={`tab ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          ℹ️ About GNF
        </button>
      </nav>

      {/* Winners Ticker */}
      <div className="winners-ticker">
        <div className="ticker-content">
          <div className="ticker-track">
            {[
              "Sport of Life",
              "Beloved",
              "Rosia B. Mobile Phlebotomy Services",
              "Plant Soul Vegan",
              "KidocateRX",
              "Buffalo Fashion Runway",
              "Signing Is Art",
              "Parrti",
              "Makery Art Cafe",
              "Muuvya",
              "Ernie's Pop Shop",
              "Afterglow Books",
              "Trina's Speedy Cleaning Service",
              "Read It & Eat",
              "Fat Daddy's",
              "Marigold Flower Farm",
              "Molly Brown Cookie Co.",
              "DecorationSphere",
              "Sweet Home Photography",
              "RareShot"
            ].map((winner, idx) => (
              <div key={idx} className="ticker-item">
                <span className="ticker-star">⭐</span>
                <span className="ticker-business">{winner}</span>
                <span className="ticker-amount">$1,000</span>
              </div>
            ))}
            {/* Duplicate for seamless scrolling */}
            {[
              "Sport of Life",
              "Beloved",
              "Rosia B. Mobile Phlebotomy Services",
              "Plant Soul Vegan",
              "KidocateRX",
              "Buffalo Fashion Runway",
              "Signing Is Art",
              "Parrti",
              "Makery Art Cafe",
              "Muuvya",
              "Ernie's Pop Shop",
              "Afterglow Books",
              "Trina's Speedy Cleaning Service",
              "Read It & Eat",
              "Fat Daddy's",
              "Marigold Flower Farm",
              "Molly Brown Cookie Co.",
              "DecorationSphere",
              "Sweet Home Photography",
              "RareShot"
            ].map((winner, idx) => (
              <div key={`dup-${idx}`} className="ticker-item">
                <span className="ticker-star">⭐</span>
                <span className="ticker-business">{winner}</span>
                <span className="ticker-amount">$1,000</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'showcase' && (
          <>
            {/* Info Section - Moved to top */}
            <div className="info-section">
              <div className="info-grid">
                <div className="info-card entrepreneurs">
                  <h3>🚀 For Entrepreneurs</h3>
                  <ul>
                    <li>Submit your real business idea + detailed $1,000 budget</li>
                    <li>Get community validation and expert feedback</li>
                    <li>Win $1,000 funding to launch</li>
                    <li>Join a network of scrappy founders</li>
                  </ul>
                  <button 
                    className="info-cta" 
                    onClick={() => {
                      const now = new Date();
                      if (now > SUBMISSION_END_DATE) {
                        alert('Submissions have closed. The contest ended on June 30th at 11:59 PM ET.');
                        return;
                      }
                      setShowSubmitForm(true);
                    }}
                    disabled={new Date() > SUBMISSION_END_DATE}
                  >
                    {new Date() > SUBMISSION_END_DATE ? 'Submissions Closed' : 'Submit Your Plan →'}
                  </button>
                </div>
                
                <div className="info-card community">
                  <h3>🤝 For the Community</h3>
                  <ul>
                    <li>Discover innovative local businesses before they launch</li>
                    <li>Vote for ideas you'd personally support</li>
                    <li>Help promising entrepreneurs get started</li>
                    <li>See detailed budgets and plans from real founders</li>
                  </ul>
                  <button className="info-cta" onClick={() => document.querySelector('.pitch-grid').scrollIntoView({ behavior: 'smooth' })}>
                    Browse Ideas →
                  </button>
                </div>

                <div className="info-card how-to-win">
                  <h3>🏆 Contest Timeline</h3>
                  <div className="visual-timeline">
                    <div className={`timeline-item ${(currentPhase === 'submission' || currentPhase === 'submission-and-voting') ? 'active' : (new Date() > SUBMISSION_END_DATE ? 'completed' : '')}`}>
                      <div className="timeline-icon">📝</div>
                      <div className="timeline-content">
                        <h4>Phase 1</h4>
                        <p>Submissions Open</p>
                        <span className="timeline-date">Now - June 30</span>
                        {currentPhase === 'submission' && <span className="live-badge">LIVE NOW</span>}
                      </div>
                    </div>
                    <div className={`timeline-item ${(currentPhase === 'voting' || currentPhase === 'submission-and-voting') ? 'active' : (new Date() > VOTING_END_DATE ? 'completed' : '')}`}>
                      <div className="timeline-icon">🗳️</div>
                      <div className="timeline-content">
                        <h4>Phase 2</h4>
                        <p>Community Voting</p>
                        <span className="timeline-date">June 22 - July 6</span>
                        {(currentPhase === 'voting' || currentPhase === 'submission-and-voting') && <span className="live-badge">LIVE NOW</span>}
                      </div>
                    </div>
                    <div className={`timeline-item ${currentPhase === 'lp-review' ? 'active' : (new Date() > LP_REVIEW_END_DATE ? 'completed' : '')}`}>
                      <div className="timeline-icon">🔍</div>
                      <div className="timeline-content">
                        <h4>Phase 3</h4>
                        <p>LP Review</p>
                        <span className="timeline-date">July 7-11</span>
                        {currentPhase === 'lp-review' && <span className="live-badge">LIVE NOW</span>}
                      </div>
                    </div>
                    <div className={`timeline-item ${currentPhase === 'winner-announced' ? 'active' : ''}`}>
                      <div className="timeline-icon">🎆</div>
                      <div className="timeline-content">
                        <h4>Phase 4</h4>
                        <p>Winner Announced</p>
                        <span className="timeline-date">July 11</span>
                        {currentPhase === 'winner-announced' && <span className="live-badge">COMPLETED</span>}
                      </div>
                    </div>
                  </div>
                  <p style={{ marginTop: '15px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                    <strong>Note:</strong> Must be a Western New York resident (8 counties)
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonial and Why Section - Side by Side */}
            <div className="testimonial-why-section">
              <div className="testimonial-why-grid">
                <div className="testimonial-card">
                  <blockquote>
                    <p>"The Good Neighbor Fund grant that I received was far more than a financial contribution to jump starting my business. It provided validation for an idea & passion that I have had for some time and support and encouragement to realize a dream of entrepreneurship after a 22 year teaching career. The grant money, resources and connections have been invaluable to help the seeds of my business grow and I feel blessed to be a part of this community of Good Neighbors."</p>
                    <cite>
                      <strong>Tracy Csavina</strong>
                      <span>Founder @ Sustainably Rooted LLC</span>
                    </cite>
                  </blockquote>
                </div>
                
                <div className="why-section">
                  <h3>💭 Why $1,000?</h3>
                  <p>
                    Traditional funding requires proof of concept, traction, and endless paperwork. We believe the best ideas start with passionate people who just need a small push to get started.
                  </p>
                  <ul>
                    <li><strong>$1,000</strong> tests your first product batch</li>
                    <li><strong>$1,000</strong> builds your MVP website</li>
                    <li><strong>$1,000</strong> covers 3 months of software tools</li>
                    <li><strong>$1,000</strong> funds your market research</li>
                  </ul>
                  <p className="why-emphasis">
                    Sometimes all you need is your neighborhood to believe in you. We're that neighborhood.
                  </p>
                </div>
              </div>
            </div>

            {/* Evaluation Section */}
            <div className="evaluation-section">
              <h2>🔍 What We'll Be Looking At</h2>
              <div className="evaluation-criteria">
                <div className="criterion">
                  <div className="criterion-icon">💡</div>
                  <h4>Clear Business Idea</h4>
                  <p>A specific problem you're solving and who you're solving it for</p>
                </div>
                <div className="criterion">
                  <div className="criterion-icon">📊</div>
                  <h4>Detailed $1,000 Budget</h4>
                  <p>Show us exactly how you'll use the money to launch or grow</p>
                </div>
                <div className="criterion">
                  <div className="criterion-icon">🚀</div>
                  <h4>Founder Commitment</h4>
                  <p>Your passion, experience, and readiness to execute</p>
                </div>
                <div className="criterion">
                  <div className="criterion-icon">🌱</div>
                  <h4>Community Impact</h4>
                  <p>How your business will benefit your local community</p>
                </div>
              </div>
            </div>

            {/* Submitted Ideas Section */}
            <div className="featured-section">
              <h2>📝 Submitted Ideas</h2>
              <p className="section-subtitle">Browse all contest submissions</p>
            </div>

            {/* Search and Filter Controls */}
            <div className="controls-section">
              <div className="search-bar">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search businesses, founders, or industries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="filter-controls">
                <div className="industry-filter">
                  <label>Filter by industry:</label>
                  <select 
                    value={selectedIndustry} 
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    className="industry-select"
                  >
                    <option value="all">All Industries</option>
                    {industries.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div className="sort-controls">
                  <span className="sort-label">Sort by:</span>
                  <button 
                    className={`sort-btn ${sortBy === 'votes' ? 'active' : ''}`}
                    onClick={() => setSortBy('votes')}
                  >
                    ❤️ Most Votes
                  </button>
                  <button 
                    className={`sort-btn ${sortBy === 'newest' ? 'active' : ''}`}
                    onClick={() => setSortBy('newest')}
                  >
                    ✨ Newest
                  </button>
                  <button 
                    className={`sort-btn ${sortBy === 'random' ? 'active' : ''}`}
                    onClick={() => setSortBy('random')}
                  >
                    🎲 Random
                  </button>
                </div>
              </div>
            </div>

            {/* Pitch Grid */}
            <div className="pitch-grid">
              {loading ? (
                <div className="loading">Loading amazing ideas...</div>
              ) : filteredPitches.length === 0 ? (
                <div className="no-results">
                  {searchTerm ? 'No ideas match your search. Try different keywords!' : 'No ideas submitted yet. Be the first!'}
                </div>
              ) : (
                currentPitches.map(pitch => (
                  <div 
                    key={pitch.id} 
                    className={`pitch-card ${votedPitches.has(pitch.id) ? 'voted' : ''}`}
                    onClick={() => setSelectedPitch(pitch)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="card-header">
                      <span className="industry-tag">
                        {getIndustryEmoji(pitch.industry)} {pitch.industry}
                      </span>
                      <div className="card-actions">
                        <button
                          className={`save-btn ${savedPitches.has(pitch.id) ? 'saved' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSavePitch(pitch.id);
                          }}
                          title={savedPitches.has(pitch.id) ? 'Remove from saved' : 'Save for later'}
                        >
                          {savedPitches.has(pitch.id) ? '🔖' : '📌'}
                        </button>
                        <div className="vote-display">
                          <span className="vote-heart">❤️</span>
                          <span className="vote-count">{pitch.votes || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="business-name">{pitch.businessName}</h3>
                    <p className="founder-name">by {pitch.founderName}</p>
                    <p className="value-prop">
                      {pitch.valueProp}
                    </p>
                    
                    {pitch.grantUsePlan && (
                      <div className="budget-preview">
                        <span className="budget-label">💰 Budget preview:</span>
                        <p className="budget-text">{pitch.grantUsePlan.substring(0, 80)}...</p>
                      </div>
                    )}
                    
                    {/* Voting Progress Bar */}
                    {new Date() >= VOTING_START_DATE && (
                      <div className="voting-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${Math.min((pitch.votes || 0) * 10, 100)}%` }}
                          />
                        </div>
                        <span className="progress-label">{pitch.votes || 0} votes</span>
                      </div>
                    )}
                    
                    <div className="card-footer" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="details-btn"
                        onClick={() => setSelectedPitch(pitch)}
                      >
                        View Details
                      </button>
                      <button 
                        className={`vote-btn ${votedPitches.has(pitch.id) ? 'voted' : ''}`}
                        onClick={() => handleVote(pitch)}
                        disabled={votedPitches.has(pitch.id)}
                      >
                        {new Date() < VOTING_START_DATE 
                          ? '🔔 Get Notified' 
                          : (votedPitches.has(pitch.id) ? '✓ Voted' : '❤️ Vote')
                        }
                      </button>
                      <button
                        className="share-card-btn"
                        onClick={async (e) => {
                          e.stopPropagation();
                          const text = `Check out "${pitch.businessName}" in the $1,000 Business Challenge!`;
                          const url = window.location.href;
                          if (navigator.share) {
                            try {
                              await navigator.share({ title: text, url });
                            } catch (err) {
                              // User cancelled share or share failed - this is normal, ignore it
                              if (err.name !== 'AbortError') {
                                console.log('Share failed:', err);
                              }
                            }
                          } else {
                            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
                          }
                        }}
                        title="Share this idea"
                      >
                        📤
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  ← Previous
                </button>
                
                <div className="page-numbers">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      className={`page-num ${currentPage === i + 1 ? 'active' : ''}`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            )}

            {/* FAQ Section */}
            <div className="faq-section">
              <div className="faq-content">
                <h2>❓ Frequently Asked Questions</h2>
                <div className="faq-grid">
                  <div className="faq-item">
                    <h4>Who can apply?</h4>
                    <p>Western New York residents only (8 counties). Must reside in WNY. Open to any business idea stage!</p>
                  </div>
                  <div className="faq-item">
                    <h4>What's the catch?</h4>
                    <p>No catch! We don't take equity or require repayment. Winners must agree to a public meetup & photo op.</p>
                  </div>
                  <div className="faq-item">
                    <h4>How are winners selected?</h4>
                    <p>Community votes narrow to top 3, then LP review selects winner. We monitor voting for irregularities.</p>
                  </div>
                  <div className="faq-item">
                    <h4>Is this replacing regular grants?</h4>
                    <p>No! This is IN ADDITION to our standard quarterly micro-grants. Q2 applications also due June 30.</p>
                  </div>
                  <div className="faq-item">
                    <h4>Is my pitch reviewed before posting?</h4>
                    <p>No! Pitches appear immediately after submission. However, GNF reserves the right to remove any content deemed inappropriate, spam, or harmful without notice.</p>
                  </div>
                  <div className="faq-item">
                    <h4>Can I apply if I've applied for a GNF micro-grant before?</h4>
                    <p>Yes! Previous applicants are welcome to apply for this challenge. This is a separate contest from our regular quarterly micro-grants program.</p>
                  </div>
                  <div className="faq-item">
                    <h4>When do submissions close and voting begin?</h4>
                    <p>Submissions close June 30th at 11:59 PM ET. Voting opens June 22nd, so there's an overlap period where both submissions and voting are active!</p>
                  </div>
                </div>
                <button className="faq-more-btn" onClick={() => setActiveTab('about')}>
                  View all FAQs →
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'resources' && (
          <div className="resources-section">
            <div className="resources-content-wrapper">
              <h2 className="page-title">🛠️ Startup Resources</h2>
              <p className="section-intro">
                Curated tools to help you build your $1,000 idea into a real business. All tools personally tested.
              </p>
              
              {/* Resource Controls */}
              <div className="resource-controls">
              <div className="resource-search-bar">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search tools, categories, or use cases..."
                  value={resourceSearchTerm}
                  onChange={(e) => setResourceSearchTerm(e.target.value)}
                  className="resource-search-input"
                />
              </div>
              
              <div className="resource-filters">
                <div className="category-filters">
                  <button
                    className={`category-filter-btn ${selectedResourceCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedResourceCategory('all')}
                  >
                    All Tools
                  </button>
                  {resourceCategories.map(cat => (
                    <button
                      key={cat.id}
                      className={`category-filter-btn ${selectedResourceCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setSelectedResourceCategory(cat.id)}
                    >
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>
                
                <div className="toggle-filters">
                  <label className="filter-toggle">
                    <input
                      type="checkbox"
                      checked={showFreeOnly}
                      onChange={(e) => setShowFreeOnly(e.target.checked)}
                    />
                    <span>Free Tools Only</span>
                  </label>
                  <label className="filter-toggle">
                    <input
                      type="checkbox"
                      checked={showBeginnerFriendly}
                      onChange={(e) => setShowBeginnerFriendly(e.target.checked)}
                    />
                    <span>Beginner Friendly</span>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Resource Categories */}
            {resourceCategories
              .filter(cat => selectedResourceCategory === 'all' || selectedResourceCategory === cat.id)
              .map(category => {
                const filteredTools = category.tools.filter(tool => {
                  // Search filter
                  if (resourceSearchTerm && !(
                    tool.name.toLowerCase().includes(resourceSearchTerm.toLowerCase()) ||
                    tool.description.toLowerCase().includes(resourceSearchTerm.toLowerCase()) ||
                    tool.ourTake.toLowerCase().includes(resourceSearchTerm.toLowerCase()) ||
                    tool.bestFor.some(bf => bf.toLowerCase().includes(resourceSearchTerm.toLowerCase()))
                  )) {
                    return false;
                  }
                  
                  // Free tools filter
                  if (showFreeOnly && !tool.pricing.toLowerCase().includes('free')) {
                    return false;
                  }
                  
                  // Beginner friendly filter
                  if (showBeginnerFriendly && !tool.bestFor.some(bf => 
                    bf.toLowerCase().includes('beginner') || 
                    bf.toLowerCase().includes('simple') ||
                    bf.toLowerCase().includes('quick')
                  )) {
                    return false;
                  }
                  
                  return true;
                });
                
                if (filteredTools.length === 0) return null;
                
                return (
                  <div key={category.id} className="resource-category-section">
                    <div className="category-header">
                      <h3>{category.icon} {category.name}</h3>
                      <p className="category-description">{category.description}</p>
                    </div>
                    
                    <div className="tools-grid">
                      {filteredTools.map(tool => (
                        <div key={tool.name} className={`tool-card ${tool.recommended ? 'recommended' : ''}`}>
                          {tool.recommended && (
                            <div className="recommended-badge">⭐ GNF Recommended</div>
                          )}
                          
                          <h4>{tool.name}</h4>
                          <p className="tool-description">{tool.description}</p>
                          
                          <div className="tool-meta">
                            <span className="pricing">{tool.pricing}</span>
                          </div>
                          
                          <div className="best-for">
                            <strong>Best for:</strong>
                            <div className="tags">
                              {tool.bestFor.map(tag => (
                                <span key={tag} className="tag">{tag}</span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="our-take-section">
                            <button
                              className="expand-btn"
                              onClick={() => {
                                const newExpanded = new Set(expandedTools);
                                if (newExpanded.has(tool.name)) {
                                  newExpanded.delete(tool.name);
                                } else {
                                  newExpanded.add(tool.name);
                                }
                                setExpandedTools(newExpanded);
                              }}
                            >
                              {expandedTools.has(tool.name) ? '▼' : '▶'} Our Take
                            </button>
                            
                            {expandedTools.has(tool.name) && (
                              <p className="our-take">{tool.ourTake}</p>
                            )}
                          </div>
                          
                          <a 
                            href={tool.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="tool-link"
                            onClick={() => {
                              // Track external link click
                              console.log('Resource clicked:', tool.name);
                            }}
                          >
                            Visit {tool.name} →
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            
            {/* No Results */}
            {resourceCategories.every(cat => {
              const filteredTools = cat.tools.filter(tool => {
                if (resourceSearchTerm && !(
                  tool.name.toLowerCase().includes(resourceSearchTerm.toLowerCase()) ||
                  tool.description.toLowerCase().includes(resourceSearchTerm.toLowerCase()) ||
                  tool.ourTake.toLowerCase().includes(resourceSearchTerm.toLowerCase()) ||
                  tool.bestFor.some(bf => bf.toLowerCase().includes(resourceSearchTerm.toLowerCase()))
                )) {
                  return false;
                }
                if (showFreeOnly && !tool.pricing.toLowerCase().includes('free')) {
                  return false;
                }
                if (showBeginnerFriendly && !tool.bestFor.some(bf => 
                  bf.toLowerCase().includes('beginner') || 
                  bf.toLowerCase().includes('simple') ||
                  bf.toLowerCase().includes('quick')
                )) {
                  return false;
                }
                return true;
              });
              return selectedResourceCategory !== 'all' && selectedResourceCategory !== cat.id || filteredTools.length === 0;
            }) && (
              <div className="no-results">
                No tools match your current filters. Try adjusting your search or filters.
              </div>
            )}
            
            <div className="resource-footer">
              <p>💡 <strong>Pro Tip:</strong> Start with one tool from each category you need. You can always upgrade later!</p>
              <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
                Have a tool recommendation? Email us at jason@goodneighbor.fund
              </p>
            </div>
            </div>
          </div>
        )}

        {activeTab === 'learning' && (
          <LearningGuides 
            openGuideModal={(card) => {
              setSelectedGuide(card);
              setShowGuideModal(true);
            }}
          />
        )}

        {activeTab === 'about' && (
          <div className="about-section">
            <h2 className="page-title">$1,000 Micro-Grants for Bold Business Ideas 💫</h2>
            <p className="about-tagline">
              We back brilliant ideas before they're "ready." No pitch deck required. No equity taken. Just belief in your vision and potential.
            </p>
            
            <div className="about-content">
              <div className="about-intro">
                <h3>✨ Our Mission</h3>
                <p>
                  Good Neighbor Fund is a micro-grant program that gives $1,000 in belief capital to under-resourced founders with bold new business ideas.
                </p>
                <p style={{ marginTop: '15px' }}>
                  We don't expect a pitch deck. We don't want equity. We fund you: your idea, your energy, your potential.
                </p>
                <p style={{ marginTop: '15px', fontStyle: 'italic' }}>
                  Born in Buffalo, built for neighborhoods everywhere.
                </p>
              </div>

              {/* Impact Stats */}
              <div className="impact-stats">
                <h3>Our Impact Since 2023</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-number">25</div>
                    <div className="stat-label">New Business Ideas Funded</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">80%</div>
                    <div className="stat-label">Women-Owned Businesses</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">52%</div>
                    <div className="stat-label">BIPOC-Owned Businesses</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">$25,000+</div>
                    <div className="stat-label">In Micro-Grants Awarded</div>
                  </div>
                </div>
              </div>

              {/* How it Works */}
              <div className="how-it-works-section">
                <h3>🤝 Powered by People, Not Institutions</h3>
                <p>
                  Good Neighbor Fund is a collective giving organization. That means our funding doesn't come from banks, VCs, or foundations—it comes from neighbors. Our LPs (Limited Partners) chip in their own funds, meet quarterly to review applications, and help award $1,000 micro-grants to the ideas they believe in most.
                </p>
                <p style={{ marginTop: '15px' }}>
                  No staff. No overhead. Just good people pooling belief capital to support the next wave of neighborhood builders.
                </p>
              </div>

              <div className="process-section">
                <h3>💡 How It Works</h3>
                <div className="process-grid">
                  <div className="process-step">
                    <div className="step-icon">📝</div>
                    <h4>1. Submit</h4>
                    <p>Complete our simple online form and upload a 60-second pitch video</p>
                  </div>
                  <div className="process-step">
                    <div className="step-icon">👀</div>
                    <h4>2. Review</h4>
                    <p>Our LP teams review all submissions at the end of each quarter</p>
                  </div>
                  <div className="process-step">
                    <div className="step-icon">💸</div>
                    <h4>3. Award</h4>
                    <p>Selected founders receive a $1,000 micro-grant with no strings attached</p>
                  </div>
                </div>
                <p style={{ marginTop: '20px', textAlign: 'center', fontStyle: 'italic' }}>
                  This is not venture capital—we expect no return on investment. This is belief capital: an endorsement of your potential.
                </p>
              </div>

              {/* Press Section */}
              <div className="press-section">
                <h3>As Featured In</h3>
                <div className="press-logos">
                  <a href="https://buffalonews.com/news/local/business/good-neighbor-fund-will-give-1-000-grants-to-entrepreneurs/article_b7c4f284-a900-11ed-ad61-8f0cb76d8c3e.html" target="_blank" rel="noopener noreferrer">
                    <img src="/assets/press/buffalo-news.webp" alt="Buffalo News" />
                  </a>
                  <a href="https://www.buffalorising.com/2023/01/the-good-neighbor-fund-micro-grants-for-start-ups/" target="_blank" rel="noopener noreferrer">
                    <img src="/assets/press/buffalo-rising.webp" alt="Buffalo Rising" />
                  </a>
                  <a href="https://www.bizjournals.com/buffalo/inno/stories/news/2023/01/20/good-neighbor-fund-micro-grant-program-launches.html" target="_blank" rel="noopener noreferrer">
                    <img src="/assets/press/buffalo-business.webp" alt="Buffalo Business First" />
                  </a>
                  <a href="https://podcasts.apple.com/us/podcast/jason-bartz-on-good-neighbor-fund/id1260713044?i=1000618789834" target="_blank" rel="noopener noreferrer">
                    <img src="/assets/press/invest-buffalo.webp" alt="Invest Buffalo Podcast" />
                  </a>
                </div>
              </div>

              <div className="about-cta">
                <p>Want to learn more or get involved?</p>
                <a href="https://neighborhoods.space" className="gnf-link">
                  Visit neighborhoods.space →
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Pitch Modal */}
      {selectedPitch && true && (
        <div className="modal-overlay" onClick={() => setSelectedPitch(null)}>
          <div className="pitch-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedPitch(null)}>×</button>
            
            <div className="modal-content" style={{ display: 'block', width: '100%' }}>
              <div className="modal-header">
                <h2>{selectedPitch.businessName}</h2>
              </div>
              <div className="modal-meta">
                <span className="industry-badge">
                  {getIndustryEmoji(selectedPitch.industry)} {selectedPitch.industry}
                </span>
                <div className="vote-stat">
                  ❤️ {selectedPitch.votes || 0} votes
                </div>
              </div>

              <div className="modal-info">
                <p>
                  <strong>Founder:</strong> <span>{selectedPitch.founderName}</span>
                </p>
                <p>
                  <strong>Location:</strong> <span>{selectedPitch.zipCode}</span>
                </p>
                {selectedPitch.website && (
                  <p>
                    <strong>Website:</strong> <a href={selectedPitch.website} target="_blank" rel="noopener noreferrer">{selectedPitch.website}</a>
                  </p>
                )}
              </div>

              {selectedPitch.bio && (
                <div className="modal-section" style={{ display: 'block', width: '100%' }}>
                  <h3 style={{ display: 'block', marginBottom: '15px' }}>About the Founder</h3>
                  <p style={{ display: 'block' }}>{selectedPitch.bio}</p>
                </div>
              )}

              <div className="modal-section" style={{ 
                display: 'block', 
                width: '100%',
                gridTemplateColumns: '1fr',
                flexDirection: 'column',
                flexWrap: 'nowrap'
              }}>
                <h3 style={{ display: 'block', marginBottom: '15px', width: '100%' }}>Value Proposition</h3>
                <p style={{ display: 'block', width: '100%' }}>{selectedPitch.valueProp}</p>
              </div>

              <div className="modal-section" style={{ display: 'block', width: '100%' }}>
                <div style={{ display: 'block', width: '100%' }}>
                  <h3 style={{ display: 'block', marginBottom: '15px' }}>Problem</h3>
                  <p style={{ display: 'block' }}>{selectedPitch.problem}</p>
                </div>
              </div>

              <div className="modal-section" style={{ display: 'block', width: '100%' }}>
                <h3 style={{ display: 'block', marginBottom: '15px' }}>Solution</h3>
                <p style={{ display: 'block' }}>{selectedPitch.solution}</p>
              </div>

              <div className="modal-section" style={{ display: 'block', width: '100%' }}>
                <h3 style={{ display: 'block', marginBottom: '15px' }}>Business Model</h3>
                <p style={{ display: 'block' }}>{selectedPitch.businessModel}</p>
              </div>

              <div className="modal-section" style={{ display: 'block', width: '100%' }}>
                <h3 style={{ display: 'block', marginBottom: '15px' }}>Use of Funds</h3>
                <p style={{ display: 'block' }}>{selectedPitch.grantUsePlan}</p>
              </div>


              {selectedPitch.pitchVideoUrl && (
                <div className="modal-section">
                  <h3>Pitch Video</h3>
                  <div className="video-wrapper">
                    <iframe 
                      src={selectedPitch.pitchVideoUrl}
                      width="100%"
                      height="315"
                      frameBorder="0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      title={`${selectedPitch.businessName} Pitch Video`}
                    />
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button 
                  className={`vote-btn-large ${votedPitches.has(selectedPitch.id) ? 'voted' : ''} ${new Date() > VOTING_END_DATE ? 'disabled' : ''}`}
                  onClick={() => handleVote(selectedPitch)}
                  disabled={votedPitches.has(selectedPitch.id) || new Date() > VOTING_END_DATE}
                >
                  {votedPitches.has(selectedPitch.id) ? '✓ Already Voted' : 
                   new Date() > VOTING_END_DATE ? '🔒 Voting Ended' :
                   new Date() < VOTING_START_DATE ? '🔔 Get Notified' : 
                   '❤️ Vote for This Idea'}
                </button>
                
                <button 
                  className="share-btn"
                  onClick={async () => {
                    const text = `Check out "${selectedPitch.businessName}" in the $1,000 Business Idea Challenge!`;
                    const url = window.location.href;
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: text, url });
                      } catch (err) {
                        // User cancelled share or share failed - this is normal, ignore it
                        if (err.name !== 'AbortError') {
                          console.log('Share failed:', err);
                        }
                      }
                    } else {
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
                    }
                  }}
                >
                  📤 Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vote Modal */}
      {showVoteModal && (
        <div className="modal-overlay">
          <div className="vote-modal">
            <h2>Cast Your Vote!</h2>
            <p>Vote for "{selectedPitch?.businessName}"</p>
            
            {!sentCode ? (
              <div className="email-step">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={voterEmail}
                  onChange={(e) => setVoterEmail(e.target.value)}
                  className="email-input"
                />
                <label className="newsletter-check">
                  <input type="checkbox" defaultChecked />
                  <span>Subscribe to updates about the contest</span>
                </label>
                <button 
                  className="send-code-btn"
                  onClick={sendVerificationCode}
                  disabled={!voterEmail.includes('@')}
                >
                  Send Verification Code
                </button>
              </div>
            ) : !emailVerified ? (
              <div className="code-step">
                <p>Enter the 6-digit code sent to {voterEmail}</p>
                <input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="code-input"
                  maxLength="6"
                />
                <button 
                  className="verify-btn"
                  onClick={verifyAndVote}
                  disabled={verificationCode.length !== 6}
                >
                  Confirm Vote
                </button>
              </div>
            ) : (
              <div className="success-step">
                <div className="success-icon">🎉</div>
                <h3>Vote Submitted!</h3>
                <p>Thank you for participating!</p>
              </div>
            )}
            
            <button 
              className="cancel-btn"
              onClick={() => {
                setShowVoteModal(false);
                resetVoteModal();
              }}
            >
              {emailVerified ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Email Capture Modal removed - using Tally form instead */}
      {false && (
        <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="email-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowEmailModal(false)}>×</button>
            
            <div className="modal-content">
              <h2>🔔 Get Notified When Voting Opens!</h2>
              <p>Voting for "{selectedPitch?.businessName}" opens on June 16th.</p>
              
              <div className="countdown-display">
                <span className="countdown-label">Voting opens in:</span>
                <div className="countdown-units">
                  <span>{votingTimeLeft.days || 0}d</span>
                  <span>{votingTimeLeft.hours || 0}h</span>
                  <span>{votingTimeLeft.minutes || 0}m</span>
                </div>
              </div>
              
              <button 
                data-tally-open="31y6VM" 
                data-tally-layout="modal" 
                data-tally-hide-title="1" 
                data-tally-emoji-animation="none"
                style={{
                  background: 'linear-gradient(135deg, #FFB6D9, #FFC0E0)',
                  border: '2px solid #FF69B4',
                  borderRadius: '6px',
                  padding: '12px 25px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#D1006C',
                  cursor: 'pointer',
                  marginTop: '15px'
                }}
              >
                Notify Me When Voting Opens
              </button>
              
              <div className="share-prompt">
                <p>Share this pitch with your network:</p>
                <div className="share-buttons">
                  <button onClick={() => {
                    const text = `I'm planning to vote for "${selectedPitch.businessName}" in the $1,000 Business Challenge when voting opens June 16!`;
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`);
                  }}>
                    🐦 Twitter
                  </button>
                  <button onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
                    alert('Link copied to clipboard!');
                  }}>
                    📋 Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Learning Guide Modal */}
      {showGuideModal && selectedGuide && (
        <div className="modal-overlay" onClick={() => {
          setShowGuideModal(false);
          setSelectedGuide(null);
        }}>
          <div className="guide-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => {
              setShowGuideModal(false);
              setSelectedGuide(null);
            }}>×</button>
            
            <div className="modal-content">
              <div className="modal-header">
                <div className="guide-header">
                  <span className="guide-icon">{selectedGuide.icon}</span>
                  <h2>{selectedGuide.title}</h2>
                </div>
              </div>
              
              <p className="guide-intro-modal">{selectedGuide.intro}</p>
              
              <div className="guide-tags-modal">
                {selectedGuide.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
              
              <div className="guide-sections-modal">
                {selectedGuide.sections.map((section, index) => (
                  <div key={index} className="guide-section-modal">
                    <h3>{section.title}</h3>
                    <div 
                      className="guide-section-content"
                      dangerouslySetInnerHTML={{ __html: createSafeHTML(section.content) }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contest Submission Form */}
      {showSubmitForm && (
        <ContestSubmissionForm 
          onClose={() => {
            setShowSubmitForm(false);
            fetchContestPitches(); // Refresh the list
          }}
        />
      )}
      
      {/* Hidden Tally button for triggering popup programmatically */}
      <button 
        id="tally-notify-button"
        data-tally-open="31y6VM" 
        data-tally-layout="modal" 
        data-tally-hide-title="1" 
        data-tally-emoji-animation="none"
        style={{ display: 'none' }}
      >
        Hidden Tally Trigger
      </button>
    </div>
  );
};

export default CommunityShowcase;