This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Invitation Email

Invitation emails are sent server-side through Resend. Set these values in `.env.local` for local development and in your deployment's server environment:

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=MindLab <invites@your-verified-domain.com>
```

Verify the sender domain in Resend before sending from it. Keep `RESEND_API_KEY` server-only; do not prefix it with `NEXT_PUBLIC_` or commit it. The invitation email links to the existing `/invite/[token]` acceptance page.

## Google Sign-In and Gmail Identity

Apply `supabase/migrations/20261004000000_gmail_identity_guard.sql` after the existing migrations. It prevents a second Auth account from using the same Gmail identity, including dotted addresses, `+tag` aliases, and `googlemail.com` variants. If the migration reports existing duplicate identities, resolve those accounts before retrying; it does not merge accounts or their data.

To enable Google sign-in, enable the Google provider in Supabase Auth and add the Supabase Auth callback URL shown in its provider settings to the Google Cloud OAuth client's authorized redirect URIs. Add both local and production app callback URLs (`http://localhost:3000/auth/callback` and `https://your-domain.example/auth/callback`) to Supabase Auth's redirect URL allow list. Keep Google client secrets in Supabase, not in browser code.

## Stripe Billing

Paid tiers use monthly USD Stripe subscriptions: Student at USD 12 and Research at USD 29. Create recurring monthly Stripe Prices for both plans. Configure test-mode keys and Price IDs locally, then use matching live-mode settings in production:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STUDENT_PRICE_ID=price_...
STRIPE_RESEARCH_PRICE_ID=price_...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Use `sk_live_...` and live Price IDs only in production; local development rejects live secret keys. Configure the Stripe webhook endpoint as `https://your-domain.example/api/payments/webhook` and subscribe it to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. For local webhook testing, run `stripe listen --forward-to localhost:3000/api/payments/webhook` and use the printed signing secret as `STRIPE_WEBHOOK_SECRET`. Keep Stripe and Supabase service-role secrets server-only; never prefix them with `NEXT_PUBLIC_` or commit them.

Apply `supabase/migrations/20261002000000_paywall_mvp.sql`, `supabase/migrations/20261003000000_paystack_live_billing.sql`, and `supabase/migrations/20261005000000_stripe_billing.sql` to the Supabase project. The Stripe checkout route verifies configured Price IDs are active monthly USD prices matching the displayed amounts before creating a subscription Checkout Session.

For existing Paystack subscribers only, keep `PAYSTACK_SECRET_KEY` configured and point the old Paystack webhook to `https://your-domain.example/api/payments/paystack-webhook` until those subscriptions have ended or been migrated. New checkouts use Stripe exclusively.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# MindLab
