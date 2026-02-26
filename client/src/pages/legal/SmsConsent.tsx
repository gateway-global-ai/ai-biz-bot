/**
 * SMS Messaging Consent — A2P 10DLC Compliance
 *
 * Public page documenting how users opt in to receive SMS from Gateway Global AI.
 * Submit this URL to Twilio's messaging service registration as proof of consent:
 * https://aibizbot.gatewayglobal.ai/sms-consent
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export default function SmsConsent() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <Card className="bg-slate-800/50 border-slate-700 max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-xl text-white">
            Gateway Global AI — SMS Messaging Consent
          </CardTitle>
          <p className="text-slate-400 text-sm">
            This page describes how we collect consent for text messages and how you can opt out.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 text-slate-300 text-sm">
          <section>
            <h2 className="text-white font-semibold mb-2">What You're Signing Up For</h2>
            <p className="leading-relaxed">
              Gateway Global AI may send you automated text messages (SMS) for: task progress
              updates (e.g., 1-hour, 12-hour, and 24-hour checkpoints when you use our AI agent
              task features), site claim or invitation links when a business assigns a site to
              your phone number, low balance alerts when your prepaid voice minutes are running
              low, and other AI agent–related notifications you have requested.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">How Opt-In Works</h2>
            <p className="leading-relaxed">
              You provide your phone number when interacting with an AI Biz Bot agent, submitting
              a contact or inquiry form, or activating a site claim or rescue link sent to you.
              By providing your phone number and proceeding with the action (e.g., submitting
              the form or clicking the link), you consent to receive automated text messages
              from Gateway Global AI and its messaging service at the number you provided.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Message Frequency</h2>
            <p className="leading-relaxed">
              Message frequency varies. You may receive up to 3–5 messages per active session
              or task (e.g., task updates). Site claim and rescue links are typically one-time
              messages. Low balance and system alerts are sent only when applicable.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">How to Opt Out</h2>
            <p className="leading-relaxed">
              Reply <strong className="text-white">STOP</strong> to any message to unsubscribe
              immediately. Reply <strong className="text-white">HELP</strong> for assistance or
              to get this consent page link.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Carrier Disclaimer</h2>
            <p className="leading-relaxed">
              Message and data rates may apply. Check with your carrier for details.
            </p>
          </section>

          <section>
            <h2 className="text-white font-semibold mb-2">Contact</h2>
            <p className="leading-relaxed">
              For questions about these messages or your consent, contact{" "}
              <a
                href="mailto:support@gatewayglobal.ai"
                className="text-indigo-400 hover:underline"
              >
                support@gatewayglobal.ai
              </a>{" "}
              or visit{" "}
              <a
                href="https://aibizbot.gatewayglobal.ai"
                className="text-indigo-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                aibizbot.gatewayglobal.ai
              </a>
              .
            </p>
          </section>

          <footer className="pt-4 border-t border-slate-700">
            <Link href="/privacy" className="text-indigo-400 hover:underline text-sm">
              Privacy Policy
            </Link>
            <span className="text-slate-500 text-xs ml-2">(if available)</span>
          </footer>
        </CardContent>
      </Card>
    </div>
  );
}
