'use client';

import Link from 'next/link';
import styled, { keyframes } from 'styled-components';
import { RiHeart3Fill, RiImage2Fill, RiLockPasswordLine, RiTeamFill, RiThumbUpFill } from 'react-icons/ri';
import { media } from '@/lib/theme';
import { Card } from './ui';

const Page = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  background: var(--page);

  ${media.mobile} {
    padding: 0;
    align-items: stretch;
  }
`;

const Panel = styled(Card)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  width: 100%;
  max-width: 980px;
  min-height: 600px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: var(--shadow-dialog);

  ${media.belowDesktop} {
    grid-template-columns: 1fr;
    max-width: 480px;
    min-height: 0;
  }

  ${media.mobile} {
    border-radius: 0;
    border: none;
    box-shadow: none;
  }
`;

const FormSide = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px;

  .inner {
    width: 100%;
    max-width: 420px;
    margin: 0 auto;
  }

  ${media.mobile} {
    padding: 24px 20px;
  }
`;

const Brand = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;

  svg {
    font-size: 30px;
    color: var(--primary);
  }
`;

export const AuthTitle = styled.h1`
  margin-top: 28px;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
`;

export const AuthSubtitle = styled.p`
  margin: 6px 0 24px;
  color: var(--text-muted);
`;

export const AuthFooter = styled.p`
  margin-top: 24px;
  text-align: center;
  color: var(--text-muted);

  a {
    color: var(--primary);
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export const AuthError = styled.div`
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  color: var(--danger);
  background: var(--danger-soft);
  font-size: 13px;
`;

export const AuthNotice = styled.div`
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  color: var(--text);
  background: var(--primary-soft);
  font-size: 13px;
  overflow-wrap: anywhere;

  a {
    color: var(--primary);
    font-weight: 600;
    text-decoration: underline;
  }
`;

// ------------------------------------------------------------------ decorative artwork

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const ArtSide = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 48px;
  background: var(--auth-gradient);
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    right: -120px;
    bottom: -140px;
    width: 420px;
    height: 320px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.35);
  }

  h2 {
    position: relative;
    z-index: 1;
    font-size: 34px;
    font-weight: 700;
    line-height: 1.15;
    color: #0f2a6b;
  }

  p {
    position: relative;
    z-index: 1;
    margin-top: 8px;
    max-width: 320px;
    color: #31508f;
  }

  :root[data-theme='dark'] & h2,
  :root[data-theme='dark'] & p {
    color: #e0e7ff;
  }

  ${media.belowDesktop} {
    display: none;
  }
`;

const Scene = styled.div`
  position: relative;
  flex: 1;
  min-height: 300px;
  margin-bottom: 24px;

  > * {
    position: absolute;
  }

  .bubble {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    border: 5px solid #fff;
    box-shadow: 0 12px 30px rgba(37, 99, 235, 0.25);
    color: #fff;
    font-weight: 700;
  }

  .chip {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    color: #fff;
    font-size: 22px;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
    animation: ${float} 4s ease-in-out infinite;
  }

  .photo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 170px;
    height: 130px;
    border-radius: 18px;
    border: 6px solid #fff;
    background: linear-gradient(160deg, #93c5fd, #2563eb);
    color: rgba(255, 255, 255, 0.9);
    font-size: 56px;
    box-shadow: 0 16px 36px rgba(37, 99, 235, 0.25);
  }
`;

const people = [
  { initial: 'A', size: 150, top: '22%', left: '10%', bg: 'linear-gradient(135deg,#2563eb,#60a5fa)' },
  { initial: 'N', size: 104, top: '0%', left: '52%', bg: 'linear-gradient(135deg,#ec4899,#f9a8d4)' },
  { initial: 'V', size: 96, top: '58%', left: '50%', bg: 'linear-gradient(135deg,#0ea5e9,#67e8f9)' },
];

function Artwork({ variant }) {
  if (variant === 'signup') {
    return (
      <Scene aria-hidden>
        <div className="photo" style={{ top: '18%', left: '12%', transform: 'rotate(-8deg)' }}>
          <RiImage2Fill />
        </div>
        <div className="photo" style={{ top: '30%', left: '38%', transform: 'rotate(6deg)' }}>
          <RiImage2Fill />
        </div>
        <div className="chip" style={{ top: '62%', left: '58%', background: '#ef4444', borderRadius: 9999 }}>
          <RiHeart3Fill />
        </div>
      </Scene>
    );
  }
  if (variant === 'recover') {
    return (
      <Scene aria-hidden>
        <div className="bubble" style={{ width: 160, height: 160, top: '20%', left: '22%', background: 'linear-gradient(135deg,#2563eb,#60a5fa)', fontSize: 72 }}>
          <RiLockPasswordLine />
        </div>
      </Scene>
    );
  }
  return (
    <Scene aria-hidden>
      {people.map((p) => (
        <div
          key={p.initial}
          className="bubble"
          style={{ width: p.size, height: p.size, top: p.top, left: p.left, background: p.bg, fontSize: p.size * 0.4 }}
        >
          {p.initial}
        </div>
      ))}
      <div className="chip" style={{ top: '14%', left: '8%', background: '#2563eb' }}>
        <RiThumbUpFill />
      </div>
      <div className="chip" style={{ top: '34%', left: '78%', background: '#ef4444', animationDelay: '1.2s' }}>
        <RiHeart3Fill />
      </div>
    </Scene>
  );
}

const COPY = {
  signin: ['Connect, Share & Grow', 'A place to share ideas, moments, and what matters to you.'],
  signup: ['Share Your World', 'Post photos, thoughts, and updates with your network.'],
  recover: ['We’ve got you', 'Reset your password securely and get back to your conversations.'],
};

/** Split authentication layout: form on the left, decorative panel on the right (desktop only). */
export default function AuthLayout({ variant = 'signin', children }) {
  const [headline, text] = COPY[variant];
  return (
    <Page>
      <Panel>
        <FormSide>
          <div className="inner">
            <Brand href="/" aria-label="Connectly home">
              <RiTeamFill aria-hidden />
              <span>Connectly</span>
            </Brand>
            {children}
          </div>
        </FormSide>
        <ArtSide>
          <Artwork variant={variant} />
          <h2>{headline}</h2>
          <p>{text}</p>
        </ArtSide>
      </Panel>
    </Page>
  );
}
