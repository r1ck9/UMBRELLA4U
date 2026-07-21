import Link from 'next/link'
import TopBar from '@/components/TopBar'

export const metadata = { title: 'Terms of Use, Umbrella' }

export default function Terms() {
  return (
    <>
      <TopBar />
      <main className="container legal">
        <p className="legal-eyebrow">Umbrella</p>
        <h1>Terms of Use</h1>
        <p className="legal-date">Last updated: July 7, 2026</p>

        <div className="legal-tldr">
          <strong>The short version:</strong> Be 13 or older. Be kind, no hate, harassment, or sharing anyone's private info. Umbrella is peer support, not a crisis or medical service. We can remove content or accounts that break the rules.
        </div>

        <h2>1. Accepting these terms</h2>
        <p>By creating an account or using Umbrella, you agree to these Terms and to our <Link href="/privacy">Privacy Policy</Link>. If you don't agree, please don't use Umbrella.</p>

        <h2>2. Who can use Umbrella</h2>
        <p>You must be <strong>13 years or older</strong> to use Umbrella. If you're under the age of majority where you live, we ask that a parent or guardian is aware you're using it.</p>

        <h2>3. What Umbrella is, and isn't</h2>
        <p>Umbrella is an anonymous space for peer support and community connection. It is <strong>not</strong> a counseling, medical, or emergency service, and it is not a substitute for professional help. <strong>If you or someone else may be in danger, contact local emergency services or a crisis line right away</strong> (Canada: <strong>988</strong>; Kids Help Phone: <strong>text CONNECT to 686868</strong>).</p>

        <h2>4. Your account</h2>
        <ul>
          <li>Keep your login details secure; you're responsible for activity on your account.</li>
          <li>One account per person. Don't impersonate others or evade a ban with new accounts.</li>
          <li>Provide accurate age information.</li>
        </ul>

        <h2>5. Community rules</h2>
        <p>You agree to follow our <Link href="/guidelines">Community Guidelines</Link>. In short: respect every identity, criticize ideas not people, and <strong>no hate speech, harassment, personal attacks, doxxing, threats, sexual content involving minors, or illegal content</strong>. Don't share anyone's private or identifying information, including your own if it could put you at risk.</p>

        <h2>6. Your content</h2>
        <p>What you share stays yours. By posting, you give Umbrella permission to display it within the service so the community can see and support it. You're responsible for what you post, and you confirm you have the right to share it.</p>

        <h2>7. Moderation &amp; enforcement</h2>
        <p>To keep everyone safe, we may screen, hide, or remove content, and we may warn, suspend, or remove accounts that break these Terms or the Guidelines. If you think a moderation decision was a mistake, you can appeal by contacting us.</p>

        <h2>8. Privacy</h2>
        <p>Your use of Umbrella is also covered by our <Link href="/privacy">Privacy Policy</Link>.</p>

        <h2>9. Disclaimers</h2>
        <p>Umbrella is provided "as is," by a small volunteer team, and we can't guarantee it will always be available or error-free. Support shared here comes from peers, not professionals, and shouldn't be treated as professional advice.</p>

        <h2>10. Limitation of liability</h2>
        <p>To the extent allowed by law, Umbrella and its volunteers aren't liable for indirect or unexpected damages arising from your use of the service. Nothing here limits rights you have that can't be limited by law.</p>

        <h2>11. Ending use</h2>
        <p>You can stop using Umbrella and delete your account anytime. We may suspend or end access if these Terms are broken or to protect the community.</p>

        <h2>12. Changes</h2>
        <p>We may update these Terms; we'll update the date above and note significant changes in the app. Continuing to use Umbrella means you accept the updated Terms.</p>

        <h2>13. Governing law</h2>
        <p>These Terms are governed by the laws of British Columbia, Canada, without regard to conflict-of-law rules.</p>

        <h2>14. Contact</h2>
        <p>Questions or appeals: <strong>hello@yourdomain.com</strong>.</p>

        <p className="legal-note">This is plain-language starter text for a youth community project, not legal advice. Please review it with a trusted adult before public launch.</p>

        <p className="legal-back"><Link href="/feed">← Back to Haven</Link> · <Link href="/privacy">Privacy Policy</Link></p>
      </main>
    </>
  )
}
