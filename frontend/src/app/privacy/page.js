'use client';

import { RiShieldCheckLine } from 'react-icons/ri';
import { Doc } from '@/components/DocPage';
import { PageHeader } from '@/components/ui';

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="Privacy Policy" icon={RiShieldCheckLine} />
      <Doc>
        <p className="note">
          This is a starter template describing how this codebase handles data. Review and adapt it for your own deployment.
        </p>
        <h2>What we store</h2>
        <ul>
          <li>Account details: name, username, email and a securely hashed password (never the password itself).</li>
          <li>What you create: profile details, posts, images, videos, polls, events, messages, lists and bookmarks.</li>
          <li>Activity needed for features: follows, likes, reposts, poll votes and notifications.</li>
        </ul>
        <h2>Who can see it</h2>
        <ul>
          <li>Posts, profiles, follows and public lists are visible to everyone.</li>
          <li>Bookmarks and private lists are visible only to you.</li>
          <li>Messages are visible only to the people in the conversation.</li>
          <li>Poll votes are anonymous: others only see totals.</li>
        </ul>
        <h2>Photos</h2>
        <p>Images are resized in your browser before upload, which also removes hidden camera data such as GPS location.</p>
        <h2>On your device</h2>
        <p>
          Your sign-in token is kept in your browser. With &quot;Remember me&quot; it stays until you sign out; otherwise it ends when you
          close the browser. Your theme choice is also stored locally.
        </p>
        <h2>Deleting your data</h2>
        <p>Deleting your account in Settings permanently removes your profile, posts, uploads, messages, lists and notifications.</p>
      </Doc>
    </>
  );
}
