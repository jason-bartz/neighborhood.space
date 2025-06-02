// Complete replacement for learning categories - focused on ideation to early-stage
const learningCategories = [
  {
    id: 'idea-generation',
    name: 'Idea Generation & Validation',
    icon: '💡',
    description: 'Turn problems into profitable business ideas',
    priority: 1,
    cards: [
      {
        id: 'opportunity-hunting',
        title: 'The Opportunity Hunting Framework',
        icon: '🎯',
        tags: ['ideation', 'opportunity', 'problem-solving', 'validation'],
        intro: 'Great businesses solve real problems. Learn the systematic approach to finding opportunities that matter.',
        sections: [
          {
            title: 'The 4-Layer Opportunity Hunt',
            content: `
              <h4>Layer 1: Personal Pain Points</h4>
              <p>Start with what you know. Your personal frustrations often reveal untapped markets.</p>
              
              <div class="framework-exercise">
                <h5>🔍 Exercise: Your Personal Pain Audit</h5>
                <ol>
                  <li><strong>Daily Frustrations:</strong> List 10 things that annoyed you this week</li>
                  <li><strong>Recurring Problems:</strong> What do you complain about regularly?</li>
                  <li><strong>Workarounds:</strong> What processes have you "hacked" or found ways around?</li>
                  <li><strong>Time Wasters:</strong> What takes longer than it should?</li>
                </ol>
                <div class="pro-tip">
                  <strong>💡 Pro Tip:</strong> If you've solved it for yourself, thousands of others have the same problem.
                </div>
              </div>

              <h4>Layer 2: Professional Inefficiencies</h4>
              <p>Your work experience is a goldmine. Industry problems are often the most lucrative.</p>
              
              <div class="validation-sprint">
                <h5>The 48-Hour Validation Sprint</h5>
                <p>Don't spend months building. Spend 48 hours validating.</p>
                
                <div class="sprint-day">
                  <h6>📅 Day 1: Problem Validation</h6>
                  <div class="time-blocks">
                    <div class="time-block">
                      <span class="time">Morning (2 hours)</span>
                      <h7>Problem Research</h7>
                      <ul>
                        <li>Google search volume check</li>
                        <li>Reddit community size and activity</li>
                        <li>Existing solutions and their reviews</li>
                        <li>LinkedIn posts about the problem</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            `
          }
        ]
      },
      {
        id: 'customer-discovery',
        title: 'Customer Discovery Masterclass',
        icon: '🕵️',
        tags: ['customer-discovery', 'interviews', 'validation', 'research'],
        intro: 'Learn to talk to customers without bias. Get honest feedback that shapes your product.',
        sections: [
          {
            title: 'The Mom Test: How to Ask Questions That Matter',
            content: `
              <h4>Why Most Customer Interviews Fail</h4>
              <p>People lie. Not intentionally - they want to be helpful. But asking "Would you use this?" gets you polite lies, not honest insights.</p>
              
              <div class="principle-section">
                <h5>The 3 Rules of The Mom Test</h5>
                <div class="rule-card">
                  <h6>Rule #1: Talk about their life, not your idea</h6>
                  <div class="comparison">
                    <div class="bad-example">
                      <span class="label">❌ Bad:</span>
                      <p>"Do you think my app idea is good?"</p>
                    </div>
                    <div class="good-example">
                      <span class="label">✅ Good:</span>
                      <p>"Walk me through the last time you tried to [do the thing]."</p>
                    </div>
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
    id: 'mvp-building',
    name: 'MVP Building & Testing',
    icon: '🚀',
    description: 'Build the minimum version that proves your concept',
    priority: 2,
    cards: [
      {
        id: 'mvp-strategy',
        title: 'The Build vs. Test Decision Framework',
        icon: '⚖️',
        tags: ['mvp', 'building', 'testing', 'strategy'],
        intro: 'Not everything needs to be built. Learn when to build, when to test, and when to pivot.',
        sections: [
          {
            title: 'The MVP Pyramid: What to Build First',
            content: `
              <h4>Start with Proof, Not Product</h4>
              <p>Most entrepreneurs build too much too early. Use this pyramid to build only what proves your hypothesis.</p>
              
              <div class="mvp-pyramid">
                <div class="pyramid-level level-1">
                  <h6>Level 1: Proof of Demand (Week 1)</h6>
                  <p><strong>Goal:</strong> Do people want this?</p>
                  <ul>
                    <li>Landing page with email signup</li>
                    <li>Social media posts describing the idea</li>
                    <li>Pre-order/waitlist signups</li>
                    <li>Manual service delivery</li>
                  </ul>
                  <div class="success-metric">
                    <strong>Success:</strong> 100+ signups or 10+ willing to pay
                  </div>
                </div>
                
                <div class="pyramid-level level-2">
                  <h6>Level 2: Proof of Solution (Week 2-4)</h6>
                  <p><strong>Goal:</strong> Can you solve the problem?</p>
                  <ul>
                    <li>Wizard of Oz testing (manual backend)</li>
                    <li>Simple prototype or demo</li>
                    <li>Beta version with core feature only</li>
                    <li>White-glove onboarding</li>
                  </ul>
                  <div class="success-metric">
                    <strong>Success:</strong> Users complete the core workflow
                  </div>
                </div>
                
                <div class="pyramid-level level-3">
                  <h6>Level 3: Proof of Business (Month 2-3)</h6>
                  <p><strong>Goal:</strong> Will people pay repeatedly?</p>
                  <ul>
                    <li>Payment processing integration</li>
                    <li>User onboarding flow</li>
                    <li>Basic customer support</li>
                    <li>Core feature set</li>
                  </ul>
                  <div class="success-metric">
                    <strong>Success:</strong> 10+ paying customers, positive unit economics
                  </div>
                </div>
              </div>

              <h4>The Build vs. Test Decision Tree</h4>
              <div class="decision-tree">
                <div class="decision-node">
                  <h6>Can you test this without building?</h6>
                  <div class="decision-branches">
                    <div class="branch yes-branch">
                      <span class="branch-label">YES</span>
                      <p><strong>TEST FIRST</strong></p>
                      <ul>
                        <li>Landing page test</li>
                        <li>Manual process</li>
                        <li>Wizard of Oz</li>
                        <li>Concierge MVP</li>
                      </ul>
                    </div>
                    <div class="branch no-branch">
                      <span class="branch-label">NO</span>
                      <p><strong>BUILD MINIMUM</strong></p>
                      <ul>
                        <li>Core workflow only</li>
                        <li>Manual admin panel</li>
                        <li>No user accounts</li>
                        <li>No scaling features</li>
                      </ul>
                    </div>
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
    id: 'first-customers',
    name: 'Getting Your First Customers',
    icon: '🎯',
    description: 'Find and convert your initial customer base',
    priority: 3,
    cards: [
      {
        id: 'customer-acquisition',
        title: 'The First 10 Customers Playbook',
        icon: '👥',
        tags: ['customers', 'acquisition', 'sales', 'early-stage'],
        intro: 'Your first customers are everything. They validate your idea, provide feedback, and become your advocates.',
        sections: [
          {
            title: 'The Personal Touch Strategy',
            content: `
              <h4>Why Your First 10 Customers Must Be Personal</h4>
              <p>Don't try to scale customer acquisition before you understand your customer. Your first 10 customers should be people you can talk to directly.</p>
              
              <div class="customer-strategy">
                <h5>The 3-Circle Customer Hunt</h5>
                
                <div class="circle-strategy">
                  <div class="customer-circle inner-circle">
                    <h6>Circle 1: People You Know</h6>
                    <p><strong>Target:</strong> 3-4 customers</p>
                    <ul>
                      <li>Friends who have this problem</li>
                      <li>Coworkers in relevant roles</li>
                      <li>Family members who fit the profile</li>
                      <li>Professional network contacts</li>
                    </ul>
                    <div class="approach">
                      <strong>Approach:</strong> "I'm starting a business and would love your feedback. Can I solve this problem for you personally?"
                    </div>
                  </div>
                  
                  <div class="customer-circle middle-circle">
                    <h6>Circle 2: Communities You're In</h6>
                    <p><strong>Target:</strong> 4-5 customers</p>
                    <ul>
                      <li>Professional associations</li>
                      <li>Local business groups</li>
                      <li>Online communities you participate in</li>
                      <li>Alumni networks</li>
                    </ul>
                    <div class="approach">
                      <strong>Approach:</strong> Share your solution in communities where you're already known and trusted.
                    </div>
                  </div>
                  
                  <div class="customer-circle outer-circle">
                    <h6>Circle 3: Targeted Outreach</h6>
                    <p><strong>Target:</strong> 2-3 customers</p>
                    <ul>
                      <li>LinkedIn searches for specific roles</li>
                      <li>Local networking events</li>
                      <li>Industry conferences</li>
                      <li>Cold outreach to ideal customers</li>
                    </ul>
                    <div class="approach">
                      <strong>Approach:</strong> Highly personalized outreach focusing on solving their specific problem.
                    </div>
                  </div>
                </div>
              </div>

              <h4>The Customer Conversation Framework</h4>
              <div class="conversation-framework">
                <div class="conversation-step">
                  <h6>Step 1: Problem Confirmation</h6>
                  <p>"I'm working on [problem area]. Is this something you deal with?"</p>
                  <div class="what-to-listen-for">
                    <strong>Listen for:</strong> Emotional response, time/money costs, current solutions
                  </div>
                </div>
                
                <div class="conversation-step">
                  <h6>Step 2: Solution Introduction</h6>
                  <p>"I'm building [simple solution description]. Would this help with your situation?"</p>
                  <div class="what-to-listen-for">
                    <strong>Listen for:</strong> Immediate interest, follow-up questions, concerns
                  </div>
                </div>
                
                <div class="conversation-step">
                  <h6>Step 3: Value Proposition Test</h6>
                  <p>"If this could [specific benefit], would that be worth [price/time investment]?"</p>
                  <div class="what-to-listen-for">
                    <strong>Listen for:</strong> Price sensitivity, value perception, buying timeline
                  </div>
                </div>
                
                <div class="conversation-step">
                  <h6>Step 4: Commitment Ask</h6>
                  <p>"I'm working with early customers to get this right. Would you be interested in trying it?"</p>
                  <div class="what-to-listen-for">
                    <strong>Listen for:</strong> Willingness to commit time, provide feedback, make referrals
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
    id: 'business-basics',
    name: 'Business Model Basics',
    icon: '💼',
    description: 'Understand the fundamentals of building a sustainable business',
    priority: 4,
    cards: [
      {
        id: 'business-model-canvas',
        title: 'Business Model Canvas for Beginners',
        icon: '📋',
        tags: ['business-model', 'strategy', 'planning', 'canvas'],
        intro: 'Map out your business model in a way that makes sense and helps you identify gaps.',
        sections: [
          {
            title: 'The One-Page Business Model',
            content: `
              <h4>Why Traditional Business Plans Fail Early-Stage Entrepreneurs</h4>
              <p>50-page business plans are fantasy fiction. You need a one-page model you can test and iterate quickly.</p>
              
              <div class="business-model-canvas">
                <h5>The Early-Stage Business Model Canvas</h5>
                
                <div class="canvas-grid">
                  <div class="canvas-section problem">
                    <h6>🎯 Problem</h6>
                    <p>What specific problem are you solving?</p>
                    <div class="canvas-questions">
                      <ul>
                        <li>Who has this problem?</li>
                        <li>How do they currently solve it?</li>
                        <li>Why is the current solution inadequate?</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="canvas-section solution">
                    <h6>💡 Solution</h6>
                    <p>How are you solving this problem?</p>
                    <div class="canvas-questions">
                      <ul>
                        <li>What's your core value proposition?</li>
                        <li>What makes your solution unique?</li>
                        <li>What's the minimum viable solution?</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="canvas-section customer">
                    <h6>👥 Customer Segments</h6>
                    <p>Who are your ideal customers?</p>
                    <div class="canvas-questions">
                      <ul>
                        <li>Who has the most pain?</li>
                        <li>Who can pay for a solution?</li>
                        <li>Who is easiest to reach?</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="canvas-section revenue">
                    <h6>💰 Revenue Streams</h6>
                    <p>How will you make money?</p>
                    <div class="canvas-questions">
                      <ul>
                        <li>What are customers willing to pay for?</li>
                        <li>How much can you charge?</li>
                        <li>One-time or recurring revenue?</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="canvas-section channels">
                    <h6>📢 Channels</h6>
                    <p>How will you reach customers?</p>
                    <div class="canvas-questions">
                      <ul>
                        <li>Where do your customers spend time?</li>
                        <li>How do they prefer to buy?</li>
                        <li>What channels can you afford?</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="canvas-section costs">
                    <h6>💸 Cost Structure</h6>
                    <p>What are your main costs?</p>
                    <div class="canvas-questions">
                      <ul>
                        <li>What are your fixed costs?</li>
                        <li>What are your variable costs?</li>
                        <li>What's your break-even point?</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <h4>Testing Your Business Model</h4>
              <div class="testing-framework">
                <h5>The 5-Question Validation Test</h5>
                <div class="validation-questions">
                  <div class="validation-question">
                    <h6>1. Problem-Solution Fit</h6>
                    <p><strong>Question:</strong> Do customers recognize they have the problem you're solving?</p>
                    <p><strong>Test:</strong> Ask 10 potential customers to describe their biggest challenges</p>
                    <p><strong>Success:</strong> 7+ mention your problem area unprompted</p>
                  </div>
                  
                  <div class="validation-question">
                    <h6>2. Solution-Market Fit</h6>
                    <p><strong>Question:</strong> Do customers want your specific solution?</p>
                    <p><strong>Test:</strong> Show mockups/demo to potential customers</p>
                    <p><strong>Success:</strong> 5+ say "I would use this" and ask when it's available</p>
                  </div>
                  
                  <div class="validation-question">
                    <h6>3. Product-Market Fit</h6>
                    <p><strong>Question:</strong> Do customers actually use and get value from your solution?</p>
                    <p><strong>Test:</strong> Get 10 people using your MVP regularly</p>
                    <p><strong>Success:</strong> 40%+ would be "very disappointed" if they could no longer use it</p>
                  </div>
                  
                  <div class="validation-question">
                    <h6>4. Business Model Fit</h6>
                    <p><strong>Question:</strong> Will customers pay enough to make this profitable?</p>
                    <p><strong>Test:</strong> Get 10 paying customers at your target price</p>
                    <p><strong>Success:</strong> Unit economics are positive (revenue > costs per customer)</p>
                  </div>
                  
                  <div class="validation-question">
                    <h6>5. Go-to-Market Fit</h6>
                    <p><strong>Question:</strong> Can you acquire customers profitably and at scale?</p>
                    <p><strong>Test:</strong> Customer acquisition cost < lifetime value</p>
                    <p><strong>Success:</strong> Repeatable, scalable customer acquisition process</p>
                  </div>
                </div>
              </div>
            `
          }
        ]
      }
    ]
  }
];