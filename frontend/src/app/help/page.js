'use client';

import Link from 'next/link';
import { RiQuestionLine } from 'react-icons/ri';
import { Doc } from '@/components/DocPage';
import { PageHeader } from '@/components/ui';

const FAQ = [
  ['How do I create a post?', 'Use the box at the top of Home, or the "Create Post" button. You can add a photo, a video (MP4/WebM up to 50 MB), a poll or an event. Press Ctrl+Enter to post quickly.'],
  ['How do hashtags and mentions work?', 'Type #topic to add a hashtag — popular ones appear in "Trends for you". Type @username to mention someone; they get a notification.'],
  ['Who can see my bookmarks?', 'Only you. Bookmarks are never shown on your profile or to anyone else.'],
  ['How do lists work?', 'Lists show posts from a hand-picked group of people. Private lists are only visible to you.'],
  ['How do I switch between accounts?', 'Open the account menu (your avatar), choose "Switch account", then "Add another account". Accounts you sign in to with "Remember me" are saved on this device.'],
  ['I forgot my password.', 'On the sign-in screen choose "Forgot password?" and enter your email. The reset link expires after 30 minutes and works once.'],
  ['How do I delete my account?', 'Go to Settings → Delete account. This permanently removes your profile, posts, images, messages and lists.'],
];

export default function HelpPage() {
  return (
    <>
      <PageHeader title="Help & Support" icon={RiQuestionLine} />
      <Doc>
        <h2>Frequently asked questions</h2>
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}

        <h2>Keyboard shortcuts</h2>
        <ul>
          <li>
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> — publish a post or reply
          </li>
          <li>
            <kbd>Enter</kbd> — send a message (<kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line)
          </li>
          <li>
            <kbd>Esc</kbd> — close menus and dialogs
          </li>
        </ul>

        <h2>Still need help?</h2>
        <p>
          Contact the administrator of this Connectly site. You can also review the <Link href="/terms">Terms of Service</Link> and{' '}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </Doc>
    </>
  );
}
