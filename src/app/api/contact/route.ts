import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Basic validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanSubject = typeof subject === 'string' && subject.trim() ? subject.trim() : 'General Inquiry';
    const cleanMessage = message.trim();
    const timestamp = new Date().toISOString();

    const webhookUrl = process.env.CONTACT_WEBHOOK_URL?.trim();

    if (webhookUrl) {
      // Formatted payload compatible with Discord, Slack, Zapier, n8n, Make, and generic webhook endpoints
      const webhookPayload = {
        name: cleanName,
        email: cleanEmail,
        subject: cleanSubject,
        message: cleanMessage,
        timestamp,
        source: 'SlopMovie Interactive Cinema',
        // Discord webhook compatibility
        content: `📬 **New Contact Submission from ${cleanName}**\n**Email:** ${cleanEmail}\n**Subject:** ${cleanSubject}\n>>> ${cleanMessage}`,
        embeds: [
          {
            title: `Contact: ${cleanSubject}`,
            color: 0x00f0ff,
            fields: [
              { name: 'Name', value: cleanName, inline: true },
              { name: 'Email', value: cleanEmail, inline: true },
              { name: 'Subject', value: cleanSubject, inline: false },
              { name: 'Message', value: cleanMessage, inline: false }
            ],
            footer: { text: 'SlopMovie Contact Form' },
            timestamp
          }
        ]
      };

      try {
        const webhookResponse = await fetch(webhookUrl, {
          signal: AbortSignal.timeout(10000),
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text().catch(() => '');
          console.warn(`[Contact Webhook] Failed with status ${webhookResponse.status}: ${errorText}`);
        } else {
          console.log(`[Contact Webhook] Successfully delivered contact message from ${cleanEmail}`);
        }
      } catch (err) {
        console.error('[Contact Webhook] Error sending payload to webhook:', err);
      }
    } else {
      console.log('[Contact Webhook] Note: CONTACT_WEBHOOK_URL environment variable is not configured yet. Form submitted payload:', {
        name: cleanName,
        email: cleanEmail,
        subject: cleanSubject,
        message: cleanMessage,
        timestamp
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully!'
    });
  } catch (err: any) {
    console.error('[Contact API] Error handling contact form request:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process contact submission' },
      { status: 500 }
    );
  }
}
