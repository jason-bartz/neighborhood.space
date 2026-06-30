import React from 'react';

export default function ReviewingPitches() {
  return (
    <>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 22,
        lineHeight: 1.4,
        margin: '0 0 32px',
      }}>
        Rating pitches is the job. Here's how the Review tab works, what each
        button actually does, and how we think about scoring when a term
        sheet isn't the point.
      </p>

      <h2>Where Reviewing Lives</h2>
      <p>
        When you log into the portal, you land on the <strong>Review Pitches</strong>
        tab by default. Everything submitted to your chapter shows up there
        as a card until you rate it. No queue-opening, no rounds. Pitches
        flow in continuously and you work through them on your own time.
      </p>

      <h2>Reading the Pitch Cards</h2>
      <p>
        Each pitch is a card with the business name, founder, submission
        date, chapter, quarter, and a short <strong>AI-generated overview</strong>
        of what the pitch is about. The overview is meant to help you
        triage the list, not to replace the application. Anything that
        catches your eye deserves a real read.
      </p>
      <p>
        The stripe on the left edge tells you your review status at a
        glance:
      </p>
      <ul>
        <li><strong>Magenta.</strong> You haven't reviewed it yet.</li>
        <li><strong>Gold.</strong> You marked it a Favorite.</li>
        <li><strong>Aqua.</strong> You gave it a Consideration.</li>
        <li><strong>Gray.</strong> You rated it a Pass or Ineligible.</li>
      </ul>

      <h2>Opening a Pitch</h2>
      <p>
        Click any card and you'll drop into the full application the
        founder submitted, with every question they answered in their own
        words. Two buttons sit at the top of the detail panel:
      </p>
      <ul>
        <li><strong>▶ Watch Pitch Video.</strong> Opens the pitch video in a new tab.</li>
        <li><strong>↗ Visit Website.</strong> Opens the applicant's website, if they gave us one.</li>
      </ul>

      <div className="resource-callout">
        <p className="resource-callout__label">If the video won't play</p>
        <p style={{ margin: 0 }}>
          Every so often an applicant uploads to Google Drive without
          flipping the share settings to "anyone with the link." You'll
          click Watch and hit a permission wall. Don't rate the pitch yet.
          Slack your Chapter Director so they can reach out and get the
          permissions fixed. We don't want a founder penalized because
          Drive defaults bit them.
        </p>
      </div>

      <h2>Filtering the List</h2>
      <p>
        The filters along the top of the Review tab keep the queue
        manageable. A few patterns worth using:
      </p>
      <ul>
        <li><strong>Show only unreviewed.</strong> Use the Review status filter. Fastest way to work through a new batch without re-scrolling past pitches you've already rated.</li>
        <li><strong>Pick a single quarter.</strong> Useful before your quarterly meeting when you only want to see the cycle you're about to discuss.</li>
        <li><strong>Hide Passes.</strong> Flip this on after your first pass and the remaining view is your Favorites and Considerations, which is typically what you want to revisit before the meeting.</li>
        <li><strong>Search.</strong> Quickest way to find a specific pitch when someone mentions it in Slack.</li>
      </ul>
      <p style={{ fontSize: 13, color: 'var(--mb-ink-60)', marginTop: -8 }}>
        SuperAdmins also see a chapter filter. Chapter Directors and LPs
        are scoped to their own chapter automatically.
      </p>

      <h2>Submitting a Review</h2>
      <p>
        Click a pitch card and a detail view opens alongside a review form.
        The form has one required field and three optional ones.
      </p>

      <div className="resource-callout">
        <p className="resource-callout__label">The one thing you must pick</p>
        <p style={{ margin: 0 }}>
          <strong>Overall LP Recommendation.</strong> One of four ratings.
          Everything else is gravy.
        </p>
      </div>

      <h3>The four ratings</h3>
      <ul>
        <li><strong>Favorite.</strong> You'd vote for this at the quarterly meeting. Save this for the ones you really believe in. A chapter that marks everything a Favorite tells us nothing.</li>
        <li><strong>Consideration.</strong> Worth discussing; not a front-runner. The bulk of solid pitches usually land here.</li>
        <li><strong>Pass.</strong> Not the right fit this quarter. No shame in it.</li>
        <li><strong>Ineligible.</strong> The application doesn't meet our criteria: wrong geography, already well-funded, not an early-stage founder.</li>
      </ul>

      <h3>Optional signal (only if you want to give it)</h3>
      <ul>
        <li><strong>Video Clarity.</strong> Strong / Average / Poor. How well did the pitch video communicate the idea?</li>
        <li><strong>Business Model Viability.</strong> Do the economics make sense on a napkin?</li>
        <li><strong>Product Market Fit Evidence.</strong> Is there proof anyone wants this yet?</li>
      </ul>
      <p>
        These don't replace your Favorite/Consideration/Pass pick. They
        just help Chapter Directors spot patterns when two pitches are
        neck-and-neck.
      </p>

      <h3>Notes for the Team</h3>
      <p>
        The textarea below the ratings is where you leave context for
        everyone else: a tip about the founder's reputation, a local
        angle you noticed, a question worth asking at the meeting. Notes
        are shared only within your chapter and stay strictly internal.
        Founders never see them.
      </p>
      <p>
        When you read other LPs' notes, they appear anonymized as
        "LP 1", "LP 2", etc. The review view is intentionally low-ego so
        opinions land on their own merits. Your Chapter Director can
        see real names over in the admin Reviews tab when they're
        facilitating the meeting.
      </p>

      <div className="resource-callout">
        <p className="resource-callout__label">Flow tip</p>
        <p style={{ margin: 0 }}>
          After you hit <strong>Submit Review</strong>, click <strong>Next
          Unreviewed</strong> and you'll jump straight to the next pitch
          you haven't rated yet. Fastest way to clear the queue before a
          meeting.
        </p>
      </div>

      <h2>Reviewing Isn't Deciding</h2>
      <p>
        The most important thing to remember: <strong>your rating isn't
        the final word.</strong> Reviews are prep for the quarterly
        meeting. That's where the group actually picks the winner. A
        pitch you marked Pass can easily end up winning once someone
        around the table makes the case for it, and a unanimous Favorite
        can lose to a dark horse a single LP champions hard.
      </p>
      <p>
        So rate honestly, but hold your opinions loosely. The job at this
        stage is to form a real point of view and earmark the pitches
        worth talking about, not to settle anything. Leave notes. Flag
        the founders you'd want to hear more about. Show up to the
        meeting ready to argue and ready to be persuaded.
      </p>

      <h2>How to Think About Scoring</h2>
      <p>
        You are not an investment committee. You're a local with taste
        and a stake in your city. That's the whole premise.
      </p>
      <ul>
        <li><strong>Trust your gut.</strong> If the pitch makes you want to root for the founder, that counts.</li>
        <li><strong>Weight local knowledge heavily.</strong> You know who's already doing this, what your city needs, and which founders have real grit. That's signal an outsider doesn't have.</li>
        <li><strong>Founder over idea.</strong> The $1,000 goes to a person. Pick people you'd want to see win.</li>
        <li><strong>Don't optimize for "returns."</strong> There are none. Pick the founder whose life $1,000 meaningfully changes.</li>
      </ul>

      <h2>Cadence</h2>
      <p>
        Plan on ~1 hour a month of async review. Most chapters see a
        dozen-ish pitches per quarter; working through them over a few
        sittings keeps it easy. Try to clear your queue before your
        quarterly meeting so the group discussion starts with opinions,
        not reading.
      </p>

      <h2>Badges Fire on Submit</h2>
      <p>
        When you hit Submit Review, the portal checks whether you've
        unlocked any new badges (first review, review streaks, kingmaker
        accuracy, etc.). If you did, a notification pops up and the badge
        lands in your Trophy Case. Details in the <em>Using the Portal</em>
        guide.
      </p>

      <div className="resource-callout">
        <p className="resource-callout__label">Not sure how to rate something?</p>
        <p style={{ margin: 0 }}>
          Drop it in your chapter's Slack channel. Reviews aren't supposed
          to be lonely. That's what the meetings and the chat are for.
        </p>
      </div>
    </>
  );
}
