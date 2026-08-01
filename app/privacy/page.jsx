import Link from 'next/link'
import TopBar from '@/components/TopBar'

export const metadata = { title: 'Privacy Policy, Umbrella' }

export default function Privacy() {
  return (
    <>
      <TopBar />
      <main className="container legal">
        <p className="legal-eyebrow">Umbrella</p>
        <h1>Privacy Policy</h1>
        <p className="legal-date">Last updated: July 31, 2026</p>

        <div className="legal-tldr">
          <strong>The short version:</strong> You're anonymous here. We only ask for an email so you can log in, it's never shown to anyone. We don't sell your data or run ads. You can edit or delete what you share. Umbrella is peer support, not a crisis service, if you're in danger, contact the lines in our <Link href="/resources">Resource Hub</Link>.
        </div>

        <h2>Who we are</h2>
        <p>Umbrella is an anonymous peer-support community for young people. It began as a student project and is run by a small volunteer team with adult guidance. It is <strong>not</strong> a counseling, medical, or crisis service.</p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Your email</strong>, used only to log you in, confirm your account, and reset your password. It is stored securely by our provider and is <strong>never shown to other users</strong>.</li>
          <li><strong>Your password</strong>, stored encrypted/hashed by our authentication provider; we never see it in plain text.</li>
          <li><strong>Profile details you choose to add</strong>, username, display name, pronouns, status, bio, interest tags, and a chosen emoji avatar. Share as little or as much as you want.</li>
          <li><strong>What you post</strong>, your stories, the umbrellas you open, and any short notes you send.</li>
          <li><strong>GIF choices</strong>, if you attach a GIPHY GIF, we store its GIPHY identifier with your story.</li>
          <li><strong>Basic technical data</strong>, standard information (like general device/browser info) that our hosting provider records to keep the service running and secure.</li>
        </ul>

        <h2>What we do <em>not</em> collect</h2>
        <p>We don't ask for your real name, home address, phone number, or precise location. We don't use advertising trackers, and we don't build advertising profiles about you.</p>

        <h2>How we use your information</h2>
        <ul>
          <li>To run Umbrella, show your stories, count umbrellas, and let you customize your profile.</li>
          <li>To keep the community safe, screen content, review reports, and act on anything harmful.</li>
          <li>To let you know when someone opens an umbrella on your story.</li>
        </ul>

        <h2>Staying anonymous</h2>
        <p>Your account isn't tied to your real identity, and you can post <strong>fully anonymously</strong> so a story isn't linked to your profile at all. One caution: things <em>you</em> choose to write in your bio, tags, or stories could reveal who you are. Please don't share details that identify you or anyone else.</p>

        <h2>Who can see what</h2>
        <ul>
          <li><strong>Stories</strong> are visible to everyone (including logged-out visitors), shown under your username, or as "Anonymous" if you posted anonymously.</li>
          <li><strong>Your profile</strong> is public, unless you turn off "Show me in search" in Settings.</li>
          <li><strong>Moderators</strong> can review reported content to keep everyone safe.</li>
        </ul>

        <h2>Sharing with others</h2>
        <p>We do <strong>not</strong> sell your data. We use trusted providers to run the service (secure hosting and email delivery), and they only process data on our behalf. If you search for, view, or attach a GIF, GIPHY delivers that content and may receive standard technical information such as your IP address, browser details, and the GIF or search you requested. We may disclose information if the law requires it, or if we genuinely believe it's needed to prevent serious harm to someone.</p>

        <h2>Safety &amp; crisis</h2>
        <p>If content suggests someone may be in danger, we may show crisis resources and take protective action. Umbrella is peer support, <strong>not a substitute for professional counseling or emergency services</strong>. In an emergency, contact local emergency services or a crisis line (Canada: <strong>988</strong>; Kids Help Phone: <strong>text CONNECT to 686868</strong>).</p>

        <h2>Your choices &amp; keeping your data</h2>
        <p>You can edit or delete your profile details and delete your own stories anytime. To delete your whole account and associated data, contact us (below). We keep information only as long as needed to run and protect the community.</p>

        <h2>Age</h2>
        <p>Umbrella is for people <strong>13 and older</strong>. If you're under 13, please don't create an account. If we learn an account belongs to someone under 13, we'll remove it.</p>

        <h2>Your rights</h2>
        <p>Depending on where you live (for example, under Canada's PIPEDA), you can ask to access, correct, or delete the personal information we hold about you. Contact us and we'll help.</p>

        <h2>Changes</h2>
        <p>If we update this policy, we'll change the date at the top and, for big changes, let you know in the app.</p>

        <h2>Contact</h2>
        <p>Questions or requests: <strong>hello@yourdomain.com</strong>.</p>

        <p className="legal-note">This is a plain-language policy for a youth community project. It isn't legal advice, it should be reviewed with a trusted adult (and, where possible, someone familiar with youth-privacy law) before public launch.</p>

        <p className="legal-back"><Link href="/feed">← Back to Haven</Link> · <Link href="/terms">Terms of Use</Link></p>
      </main>
    </>
  )
}
