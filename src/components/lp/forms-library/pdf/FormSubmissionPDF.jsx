import React from 'react';
import {
  Page, Text, View, Document, Image, StyleSheet,
} from '@react-pdf/renderer';
import {
  PDF_COLORS, ACCENT_MAP, pdfStyles, CoverPage, PageFooter, Paragraph, Section,
} from '../../resources/pdf/PDFTheme';

const localStyles = StyleSheet.create({
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.ink15,
  },
  fieldLabel: {
    width: 140,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: PDF_COLORS.ink60,
    paddingTop: 2,
  },
  fieldValue: {
    flex: 1,
    fontSize: 11,
    lineHeight: 1.5,
    color: PDF_COLORS.ink,
  },
  photo: {
    width: 180,
    height: 180,
    objectFit: 'cover',
    borderWidth: 1,
    borderColor: PDF_COLORS.ink,
    marginVertical: 12,
  },
  agreementBlock: {
    marginTop: 12,
    padding: 12,
    backgroundColor: PDF_COLORS.paper,
    borderWidth: 1,
    borderColor: PDF_COLORS.ink,
    fontSize: 10,
    lineHeight: 1.5,
  },
});

function Field({ label, children }) {
  if (children === null || children === undefined || children === '') return null;
  return (
    <View style={localStyles.fieldRow}>
      <Text style={localStyles.fieldLabel}>{label}</Text>
      <Text style={localStyles.fieldValue}>{children}</Text>
    </View>
  );
}

function fmtTimestamp(ts) {
  if (!ts) return '';
  // Firestore Timestamp comes through as { seconds, nanoseconds } when serialized.
  const ms = ts.seconds ? ts.seconds * 1000 : (ts.toMillis ? ts.toMillis() : ts);
  try {
    return new Date(ms).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return String(ts);
  }
}

function joinAddress(s) {
  const lines = [
    s.addressStreet,
    [s.addressCity, s.addressState].filter(Boolean).join(', ') + (s.addressZip ? ` ${s.addressZip}` : ''),
  ].filter((l) => l && l.trim());
  return lines.join('\n');
}

function COMMITTEE_LABEL(value) {
  return ({
    'events': 'Events Committee',
    'selection': 'Selection Committee',
    'founders-support': 'Founders Support Committee',
    'governance': 'Governance Committee',
    'none': 'None at this time',
  })[value] || value;
}

function LPOnboardingBody({ submission }) {
  return (
    <View>
      <Section title="Submission" first>
        <Paragraph>
          LP Onboarding submission for the <Text style={pdfStyles.bold}>{submission.chapter}</Text> chapter,
          submitted {fmtTimestamp(submission.submittedAt)}.
        </Paragraph>
      </Section>

      <Section title="Personal Details">
        <Field label="Name">{submission.name}</Field>
        <Field label="Email">{submission.email}</Field>
        <Field label="Chapter">{submission.chapter}</Field>
      </Section>

      {submission.headshotUrl && (
        <Section title="Headshot">
          <Image src={submission.headshotUrl} style={localStyles.photo} />
        </Section>
      )}

      <Section title="Bio">
        <Paragraph>{submission.bio}</Paragraph>
      </Section>

      <Section title="Committee Interests">
        <Paragraph>
          {(submission.committees || []).map(COMMITTEE_LABEL).join(', ') || '—'}
        </Paragraph>
      </Section>

      {(submission.addressStreet || submission.shirtSize) && (
        <Section title="Surprise List">
          <Field label="Mailing Address">{joinAddress(submission)}</Field>
          <Field label="Shirt Size">{submission.shirtSize}</Field>
        </Section>
      )}

      <Section title="Agreements">
        <Field label="Volunteer Agreement">
          {submission.volunteerAgreement?.accepted
            ? `Accepted ${fmtTimestamp(submission.volunteerAgreement.acceptedAt)} (${submission.volunteerAgreement.version || 'v1'})`
            : 'Not accepted'}
        </Field>
        <Field label="Non-Disclosure Agreement">
          {submission.nda?.accepted
            ? `Accepted ${fmtTimestamp(submission.nda.acceptedAt)} (${submission.nda.version || 'v1'})`
            : 'Not accepted'}
        </Field>
      </Section>
    </View>
  );
}

function MicrograntAwardeeBody({ submission }) {
  return (
    <View>
      <Section title="Submission" first>
        <Paragraph>
          Microgrant Awardee submission for the <Text style={pdfStyles.bold}>{submission.chapter}</Text> chapter,
          submitted {fmtTimestamp(submission.submittedAt)}.
        </Paragraph>
      </Section>

      <Section title="Check Details">
        <Field label="Name on Check">{submission.fullName}</Field>
        <Field label="Email">{submission.email}</Field>
        <Field label="Chapter">{submission.chapter}</Field>
        <Field label="Mailing Address">{joinAddress(submission)}</Field>
      </Section>

      <Section title="Announcement">
        <Field label="Social Handles">{submission.socialHandles}</Field>
      </Section>

      {submission.photoUrl && (
        <Section title="Announcement Photo">
          <Image src={submission.photoUrl} style={localStyles.photo} />
        </Section>
      )}
    </View>
  );
}

export default function FormSubmissionPDF({ submission, formMeta }) {
  const accent = formMeta?.accent || 'magenta';
  const title = formMeta?.title || 'Form Submission';
  const docTitle = `${title} — ${submission.name || submission.fullName || 'Submission'}`;

  let body = null;
  if (submission.formType === 'lp-onboarding') {
    body = <LPOnboardingBody submission={submission} />;
  } else if (submission.formType === 'microgrant-awardee') {
    body = <MicrograntAwardeeBody submission={submission} />;
  } else {
    body = (
      <Section title="Submission" first>
        <Paragraph>Unrecognized form type: {submission.formType}</Paragraph>
      </Section>
    );
  }

  return (
    <Document title={docTitle} author="Good Neighbor Fund">
      <CoverPage
        eyebrow={`${formMeta?.category || 'Form'} · ${submission.chapter || ''}`}
        title={title}
        summary={submission.name || submission.fullName || ''}
        number={formMeta?.number || ''}
        accent={accent}
      />
      <Page size="LETTER" style={pdfStyles.page}>
        {body}
        <PageFooter docTitle={docTitle} />
      </Page>
    </Document>
  );
}
