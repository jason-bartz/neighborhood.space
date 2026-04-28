import React from 'react';

export default function LPRecruiting() {
  return (
    <>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        lineHeight: 1.4,
        margin: '0 0 32px',
      }}>
        A chapter lives or dies by its LPs. This is how you talk about GNF,
        who you should invite, and how to turn "sounds cool" into a signed
        check.
      </p>

      <h2>Why LPs Say Yes</h2>
      <p>
        LPs don't join for ROI. There isn't one. They join for a feeling:
        that they're doing something unambiguously good, that they're
        connected to the most interesting people in town, and that the
        money actually reaches a founder who needed it. Lead with that.
      </p>
      <div className="resource-callout">
        <p className="resource-callout__label">The One-Liner</p>
        <p style={{ margin: 0 }}>
          "It's $500 a year. We pool it with 8 to 10 LPs, give $1,000
          grants to local founders we pick together, and it's the most fun
          quarterly meeting on your calendar."
        </p>
      </div>

      <h2>Who to Invite</h2>
      <p>Target people who are already doing the thing, not people looking for an excuse to be seen.</p>

      <h3>Good fits</h3>
      <ul>
        <li><strong>Past or present entrepreneurs.</strong> They know how much $1,000 meant at the beginning.</li>
        <li><strong>Active community builders.</strong> Chambers of commerce, incubator staff, local org leaders.</li>
        <li><strong>Creatives with networks.</strong> Designers, photographers, writers who know every founder in town.</li>
        <li><strong>Operators at growth-stage companies.</strong> Directors, VPs, founder-adjacent folks with $500 to spend and taste to lend.</li>
        <li><strong>Retired founders / angels.</strong> They've done the real thing; this is pure joy for them.</li>
      </ul>

      <h3>Avoid</h3>
      <ul>
        <li>Career networkers who want a title, not a role.</li>
        <li>Anyone pitching you their own thing within the first 10 minutes.</li>
        <li>Disengaged funders looking for another logo on their LinkedIn.</li>
        <li>Folks who'd be uncomfortable in a dive bar with a pitch deck on a TV.</li>
      </ul>

      <h2>The Outreach Playbook</h2>

      <h3>Step 1. Start with 10 warm asks</h3>
      <p>
        Your first LPs should be people you'd text about dinner, not people
        you cold-DM on LinkedIn. Make a list of 20 and aim to close 10.
        Start there.
      </p>

      <h3>Step 2. Coffee, not pitch deck</h3>
      <p>
        Meet in person if you can. 20 minutes. Tell them the story: why GNF
        exists, why you're starting a chapter, why <em>they</em> specifically
        came to mind. Don't send them a deck first. The magic is the
        conversation.
      </p>

      <h3>Step 3. Name the ask clearly</h3>
      <p>
        Don't soft-pedal. "I'd love to have you as a founding LP. It's $500
        a year, four meetings, and you get to give away $4,000 in grants to
        founders you pick. Want in?" Clear beats clever.
      </p>

      <h3>Step 4. Send the one-pager within 24 hours</h3>
      <p>
        Attach the Chapter Handbook PDF and a link to the chapter landing
        page. Don't overload. One email, two links, a Venmo/Stripe link
        when they're ready.
      </p>

      <h3>Step 5. Close fast</h3>
      <p>
        Momentum matters. If someone says yes, get them paid and in the
        Slack channel within a week. Waiting makes a casual yes into a
        polite no.
      </p>

      <h2>Common Objections</h2>

      <h3>"I don't really know enough about startups."</h3>
      <p>
        Good. LPs aren't supposed to be investors. They're supposed to be
        people with local knowledge and taste. You rate pitches on gut,
        kindness, and what your city needs, not term sheets.
      </p>

      <h3>"Is this tax-deductible?"</h3>
      <p>
        Yes. GNF operates under a 501(c)(3) fiscal sponsor, so LP
        contributions are tax-deductible. You'll get a receipt for your
        records. It's still a gift, not an investment, and there's no
        equity or expected return.
      </p>

      <h3>"Why only $500? Why not more?"</h3>
      <p>
        $500 keeps the door wide open. We want LPs from every income level.
        The point is community, not capital. If they want to give more,
        they can sponsor a quarter or support a grantee directly.
      </p>

      <h3>"I'm too busy."</h3>
      <p>
        One hour a month of async pitch review. Four in-person meetings a
        year, two-hour minimum. That's it. No Slack FOMO required.
      </p>

      <h2>The First Meeting Pitch</h2>
      <p>
        Here's a script you can adapt when you host your first all-hands
        LP dinner. Don't read it verbatim. It's a skeleton.
      </p>
      <blockquote className="resource-callout" style={{ background: 'var(--mb-paper)' }}>
        <p className="resource-callout__label">Opening · 3 minutes</p>
        <p style={{ margin: 0 }}>
          "Thanks for being here. In Buffalo in 2023, two people had a
          weird idea. Pool $500 from 10 friends and give $1,000 to a local
          founder every quarter. No paperwork, no equity, just belief
          capital. Two years later there are [N] chapters doing the same
          thing. Tonight we start ours."
        </p>
      </blockquote>
      <blockquote className="resource-callout" style={{ background: 'var(--mb-paper)' }}>
        <p className="resource-callout__label">The Ask · 2 minutes</p>
        <p style={{ margin: 0 }}>
          "What I'm asking is $500 a year, one hour a month to rate
          pitches, and four dinners like this one. In return you'll hear
          from the most interesting founders in [city] before anyone else
          does. And four times a year, one of them walks out with $1,000
          because of us."
        </p>
      </blockquote>
      <blockquote className="resource-callout" style={{ background: 'var(--mb-paper)' }}>
        <p className="resource-callout__label">The Close · 1 minute</p>
        <p style={{ margin: 0 }}>
          "I'll send a short follow-up tomorrow with the payment link and
          the handbook. If you're in, I'd love to have you as one of our
          founding LPs."
        </p>
      </blockquote>

      <h2>Email Templates</h2>

      <h3>The first outreach</h3>
      <div className="resource-callout" style={{ background: 'var(--mb-paper)' }}>
        <p style={{ margin: 0 }}>
          Subject: <strong>A weird little thing I'm starting in [city]</strong><br /><br />
          Hey [name],<br /><br />
          I'm starting a local chapter of Good Neighbor Fund. It's a
          community group of ~10 people who pool $500/year and give out
          $1,000 grants to early-stage founders every quarter. No equity,
          no paperwork, just belief capital for people taking their first
          swing.<br /><br />
          You came to mind because of [specific reason: their network,
          their past company, their eye for talent]. I'd love to tell you
          more over coffee. 20 minutes, on me. This Thursday or next?<br /><br />
          [signature]
        </p>
      </div>

      <h3>The follow-up after coffee</h3>
      <div className="resource-callout" style={{ background: 'var(--mb-paper)' }}>
        <p style={{ margin: 0 }}>
          Subject: <strong>Official ask: GNF [city]</strong><br /><br />
          [name],<br /><br />
          Great catching up yesterday. As promised, the Chapter Handbook
          is attached and the chapter page is live at [link].<br /><br />
          Formal ask: would you come on as a founding LP? $500 for the
          first year, four meetings, ~1 hour/month of pitch review.
          Payment link: [link]. If you're in, reply here and I'll send
          you the Slack invite and first meeting date.<br /><br />
          No pressure either way, and thanks for hearing me out.<br /><br />
          [signature]
        </p>
      </div>

      <h2>Retention: Keeping LPs for Year Two</h2>
      <p>
        Year one is exciting. Year two is the cliff. Here's what keeps
        people around:
      </p>
      <ul>
        <li><strong>In-person meetings that feel like a dinner party.</strong> Not a Zoom call. Not a conference room.</li>
        <li><strong>Shoutouts.</strong> Name each LP publicly when you announce grantees. People love seeing their name.</li>
        <li><strong>Grantee updates.</strong> Six months after the grant, share what the founder did with it. This is the whole point.</li>
        <li><strong>Make renewal stupid easy.</strong> One-click Stripe, email in January, done.</li>
        <li><strong>Ask them to bring a friend.</strong> The best LPs recruit the next LPs.</li>
      </ul>

      <div className="resource-callout">
        <p className="resource-callout__label">Stuck?</p>
        <p style={{ margin: 0 }}>
          If recruiting stalls, ping the national Slack. Other Chapter
          Directors have been through the same wall, and you don't have to
          figure it out alone.
        </p>
      </div>
    </>
  );
}
