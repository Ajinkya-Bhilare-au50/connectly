'use client';

import { RiFileTextLine } from 'react-icons/ri';
import { Doc } from '@/components/DocPage';
import { PageHeader } from '@/components/ui';

export default function TermsPage() {
  return (
    <>
      <PageHeader title="Terms of Service" icon={RiFileTextLine} />
      <Doc>
        <p className="note">
          This is a starter template for a self-hosted Connectly site. Replace it with terms reviewed for your own service
          before launching publicly.
        </p>
        <h2>1. Using Connectly</h2>
        <p>You must provide accurate account information and keep your password secure. You are responsible for activity on your account.</p>
        <h2>2. Your content</h2>
        <p>
          You keep ownership of what you post. By posting, you allow this site to store and display your content to other people
          as needed to run the service. Only post content you have the right to share.
        </p>
        <h2>3. Acceptable use</h2>
        <ul>
          <li>No harassment, threats, or hateful content.</li>
          <li>No spam, scams, or impersonation.</li>
          <li>No illegal content or attempts to break the service.</li>
        </ul>
        <h2>4. Ending your account</h2>
        <p>You can delete your account at any time in Settings. Administrators may suspend accounts that break these terms.</p>
        <h2>5. Changes</h2>
        <p>These terms may be updated. Continued use after changes means you accept the new terms.</p>
      </Doc>
    </>
  );
}
