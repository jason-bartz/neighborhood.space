import React from 'react';

export default function ChapterHandbook() {
  return (
    <>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 22,
        lineHeight: 1.4,
        margin: '0 0 32px',
      }}>
        Welcome. You're here because you're interested in launching a Good
        Neighbor Fund chapter, or as we call it, a Neighborhood. We're glad
        you found us.
      </p>

      <h2>Introduction</h2>
      <p>
        GNF started in Buffalo, NY, with a simple idea. Bold, early-stage
        entrepreneurs, especially those from underrepresented backgrounds,
        deserve belief, not the <em>bureaucracy</em> they typically
        encounter with early-stage business organizations. So we give out
        $1,000 micro-grants (belief capital) to help founders take that
        first step.
      </p>
      <p>
        Since 2023, we've backed dozens of founders, built a grassroots LP
        (Limited Partner) community, and put together a replicable model
        that blends funding, mentorship, and local pride. Now we're opening
        up the playbook. Whether you're a founder, community builder, or
        startup cheerleader, this handbook is your roadmap to bringing GNF
        to your city.
      </p>

      <h2>Our Mission</h2>
      <p>We level the playing field for entrepreneurship by:</p>
      <ul>
        <li>Awarding no-strings-attached $1,000 micro-grants</li>
        <li>Supporting underrepresented and under-resourced founders</li>
        <li>Building local chapters powered by community-driven LPs</li>
      </ul>
      <p>
        GNF is proudly national, proudly weird, and deeply committed to
        doing good in the neighborhoods we serve.
      </p>

      <h2>What's a GNF Neighborhood?</h2>
      <p>A GNF Neighborhood is a local group of Limited Partners (LPs) who:</p>
      <ul>
        <li>Pool their money to fund quarterly $1,000 micro-grants</li>
        <li>Meet to review pitches and vote on winners</li>
        <li>Support local founders through connections, mentorship, and visibility</li>
      </ul>
      <p>
        Each chapter is led by a Chapter Director, supported by GNF HQ, and
        connected to a national community of neighborhoods.
      </p>

      <h2>Starting a Chapter</h2>

      <h3>Step 1. Say Hi</h3>
      <p>
        Fill out our short <a href="https://goodneighbor.fund/start-a-chapter" target="_blank" rel="noopener noreferrer">new chapter interest form</a>.
      </p>

      <h3>Step 2. Recruit Your LPs</h3>
      <p>
        You'll need roughly 6–10 founding LPs (that number is up to you).
        Typically, LPs are:
      </p>
      <ul>
        <li>Founders, executives, creatives, or active community leaders</li>
        <li>Actively involved in the local entrepreneurial ecosystem</li>
        <li>Excited to fund and support early-stage businesses</li>
      </ul>
      <p>
        Each LP contributes $500/year, ideally upfront. Some chapters add a
        small margin to cover admin fees (e.g., $525/year).
      </p>

      <div className="resource-callout">
        <p className="resource-callout__label">Your Chapter, Your Numbers</p>
        <p style={{ margin: 0 }}>
          The LP membership amount and the micro-grant amount issued is
          determined by your specific chapter's needs. We don't dictate that
          $1,000 must be the standard. We're always open to a conversation
          to help you determine the right fit for your area.
        </p>
      </div>

      <h3>Step 3. Host Your First Meeting</h3>
      <p>Plan your inaugural LP meetup to:</p>
      <ul>
        <li>Get to know each other</li>
        <li>Review early pitch submissions</li>
        <li>Select your first grantee (or plan when you'll open your first cycle)</li>
      </ul>
      <p>
        Make it fun. We recommend restaurants, cafes, rooftops, or
        breweries. Somewhere casual, inspiring, and local.
      </p>
      <div className="resource-callout">
        <p className="resource-callout__label">Best Practice</p>
        <p style={{ margin: 0 }}>
          Use an online poll to align on dates, pick a restaurant, and be
          mindful of your LPs' dietary restrictions or alcohol preferences.
        </p>
      </div>

      <h2>Y2K Energy</h2>
      <p>
        The aesthetic is on purpose. We're inspired by a time when people
        just <em>started</em>. The early internet era was raw, open, and
        full of possibility. That's how we want our founders to feel.
      </p>
      <p>
        More importantly: we back ideas before they're buttoned up. We
        fund courage, not polish.
      </p>

      <h2>How Chapters Operate</h2>

      <h3>Grant Timeline</h3>
      <ul>
        <li>Most chapters operate quarterly, but monthly or biannual is fine too.</li>
        <li>LPs vote on grant winners based on pitch applications and 60-second videos.</li>
        <li>The Chapter Director facilitates meetings and follows up with grantees.</li>
      </ul>

      <h3>Grant Criteria</h3>
      <h4>What we look for</h4>
      <ul>
        <li>Passionate, ideation or early-stage founders</li>
        <li>Clear problem/solution articulation</li>
        <li>Specific, high-impact use of the $1,000 grant</li>
      </ul>
      <h4>What we avoid</h4>
      <ul>
        <li>Personal expenses (e.g., rent, bills)</li>
        <li>Established companies with significant revenue or funding</li>
        <li>One-off events or other charities</li>
        <li>Unclear deliverables</li>
      </ul>

      <h2>LP Responsibilities</h2>
      <p>Being an LP is light-lift, high-impact. LPs:</p>
      <ol>
        <li><strong>Join quarterly meetings.</strong> Fun, social gatherings where we vote on winners.</li>
        <li><strong>Review pitches.</strong> Spend ~1 hour per month reading and rating applicants.</li>
        <li><strong>Pay $500/year.</strong> Directly funds our grants (may be increased slightly to cover chapter dues).</li>
        <li><strong>Engage on Slack.</strong> Stay active in our private channel and support founders.</li>
        <li><strong>Optional committees.</strong> Events, founder support, or social media, if desired.</li>
      </ol>
      <p>
        LPs are not investors. GNF is not a fund. There is no ROI. Only
        impact, community, and belief.
      </p>

      <h2>Setting Up Your Chapter</h2>
      <p>We'll support you with:</p>
      <ul>
        <li>A chapter landing page on <a href="https://goodneighbor.fund" target="_blank" rel="noopener noreferrer">goodneighbor.fund</a></li>
        <li>Access to our LP Portal (submission + review tool)</li>
        <li>A <code style={{ fontFamily: 'var(--font-numeral)' }}>@goodneighbor.fund</code> email address for the Chapter Director</li>
        <li>A private Slack community with a private chapter channel</li>
        <li>Canva graphics kit + social media starter copy and assets (continuously updated)</li>
        <li>Knowledge base with event ideas, LP onboarding, and templates</li>
      </ul>

      <h3>Optional support services (additional cost per item)</h3>
      <ul>
        <li>Additional email address provisions</li>
        <li>Banking services. Online banking to manage LP funds and distribute grant checks directly to awardees via mail, plus Stripe integration for recurring LP memberships</li>
        <li>Custom <a href="https://firebasestorage.googleapis.com/v0/b/gnf-app-9d7e3.firebasestorage.app/o/Misc%20Images%2FSansi-Oxford%20Pennant.webp?alt=media&token=35cfff2d-869d-45c9-b9f6-1b6b7550c5ea" target="_blank" rel="noopener noreferrer">GNF Oxford Pennant</a> ordering</li>
        <li>Custom <a href="https://firebasestorage.googleapis.com/v0/b/gnf-app-9d7e3.firebasestorage.app/o/Misc%20Images%2Ffat-daddys.webp?alt=media&token=5474728d-52e3-4775-aed3-a828b1470a74" target="_blank" rel="noopener noreferrer">GNF novelty check</a> ordering</li>
      </ul>

      <div className="resource-callout">
        <p className="resource-callout__label">Chapter Dues</p>
        <p style={{ margin: 0 }}>
          <strong>$25/month or $275/year.</strong> Covers hosting,
          maintenance, email, platform tools, and more.
        </p>
      </div>

      <h2>Running a Meeting</h2>
      <ul>
        <li><strong>Pre-meeting.</strong> LPs review and rate pitches asynchronously.</li>
        <li><strong>During meeting.</strong> Director facilitates; LPs share top picks, discuss, and vote.</li>
        <li><strong>Post-meeting.</strong> Director announces winner, coordinates disbursement, and shares publicly.</li>
      </ul>
      <div className="resource-callout">
        <p className="resource-callout__label">In person when possible</p>
        <p style={{ margin: 0 }}>
          Host in person when possible. Zoom is a suitable fallback if
          you're unable to align schedules.
        </p>
      </div>

      <h3>How Pitches Are Ranked</h3>
      <p>
        Each LP gives a pitch one of four ratings. Behind the scenes, every
        rating carries a weight:
      </p>
      <ul>
        <li><strong>Favorite</strong> = +2</li>
        <li><strong>Consideration</strong> = +1</li>
        <li><strong>Pass</strong> = 0</li>
        <li><strong>Ineligible</strong> = −2</li>
      </ul>
      <p>
        When you sort pitches in the LP Portal, two numbers do the work.
        <strong> Total Score</strong> is the raw sum of those weights — it
        rewards volume of favorable reviews. <strong>Weighted Avg</strong>{' '}
        (the default sort, shown as <em>avg</em> on each card) is the
        smarter ranking, and it's the one we recommend leaning on.
      </p>
      <p>
        The Weighted Avg blends a pitch's actual rating average with the
        chapter-wide average, weighted by how many reviews it has. Pitches
        with lots of reviews stick close to their real average. Pitches
        with only one or two reviews get pulled toward the middle of the
        pack until more LPs weigh in. This stops a single five-star rave
        from outranking a pitch that's earned five Favorites and a
        Consideration, which would otherwise look worse on paper.
      </p>
      <div className="resource-callout">
        <p className="resource-callout__label">What you'll see</p>
        <p style={{ margin: 0 }}>
          On the live review screen, each pitch shows three numbers:{' '}
          <strong>Score</strong> (the raw sum), <strong>Avg</strong> (the
          Weighted Avg used for sorting), and <strong>Raw</strong> (the
          unweighted average). Hover any of them for a quick refresher.
        </p>
      </div>
      <p>
        Scores are a starting point for discussion, not a verdict. The
        meeting is still where the decision happens — the rankings just
        help you spend that hour on the pitches most worth talking about.
      </p>

      <h2>Events &amp; Promotion</h2>
      <p>Chapters are encouraged to:</p>
      <ul>
        <li>Host local events (pitch nights, happy hours, hackathons, founder showcases)</li>
        <li>Launch chapter-specific socials (e.g., <code style={{ fontFamily: 'var(--font-numeral)' }}>@gnf.austin</code>)</li>
        <li>Partner with incubators, schools, and civic groups</li>
      </ul>
      <p>We'll provide:</p>
      <ul>
        <li>Logos, Canva templates, and language guidelines</li>
        <li>Sample posts and outreach copy</li>
        <li>A media kit for local press</li>
      </ul>

      <h2>LP Criteria: For Directors Recruiting LPs</h2>
      <p>We suggest inviting people who are:</p>
      <ul>
        <li>Past or present entrepreneurs</li>
        <li>Actively supporting the local business community</li>
        <li>Passionate about economic development or innovation</li>
        <li>Collaborative, humble, and engaged</li>
        <li>Open to mentoring or supporting grantees beyond the money</li>
      </ul>
      <div className="resource-callout">
        <p className="resource-callout__label">Avoid</p>
        <p style={{ margin: 0 }}>Self-promotion, ego plays, or disengaged funders.</p>
      </div>

      <h2>FAQs</h2>
      <h3>What if our LPs can't attend a meeting?</h3>
      <p>
        We recommend 2 out of 4 per year minimum. Remote voting is okay in
        a pinch.
      </p>

      <h3>Can I invest in GNF grantees personally?</h3>
      <p>
        Yes. GNF is not exclusive. Feel free to follow up outside of our
        platform if you want to support further.
      </p>

      <h3>How do we handle the money?</h3>
      <p>
        Up to you. Some chapters use a shared bank account. Others just
        Venmo. Or you can leverage our services. Choose what works.
      </p>

      <h3>Can I bring a guest to a meeting?</h3>
      <p>
        Absolutely. Some chapters allow guest LPs to vote, others just
        observe. Your call.
      </p>

      <h2>Ready to Launch?</h2>
      <p>We've got everything you need. Just submit your New Chapter Form. If accepted, we will:</p>
      <ul>
        <li>Schedule an intro call</li>
        <li>Get you a starter kit + backend access</li>
        <li>Invite you to the national Slack channel</li>
      </ul>
      <p>Let's bring belief capital to your block.</p>

      <h2>From the Founders</h2>
      <p>Hey there. We're Susan and Jason, co-founders of Good Neighbor Fund.</p>
      <p>
        We launched GNF with a borrowed logo and $1,000 in belief. What we
        saw immediately was the hunger for this kind of support. For
        simple, accessible, joyful ways to help people start.
      </p>
      <p>
        Whether you start a chapter or just share this idea with a friend,
        you're a part of something that's growing bigger every day. Thanks
        for believing in others before the rest of the world catches on.
      </p>
      <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 20, marginTop: 24 }}>
        With love,<br />
        Jason and Susan<br />
        <em style={{ fontSize: 14, color: 'var(--mb-ink-60)' }}>Co-Founders, Good Neighbor Fund</em>
      </p>
    </>
  );
}
