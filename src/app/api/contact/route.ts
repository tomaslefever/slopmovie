import { NextResponse } from 'next/server';
import { 
  persistContactMessage, 
  loadContactMessages, 
  updateContactMessageStatus, 
  deleteContactMessage 
} from '@/lib/supabase/db';

export const maxDuration = 30;

/**
 * POST /api/contact
 * Save contact submission directly to database and optionally relay to webhook if configured.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validation
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

    // 1. Primary storage: Persist in Supabase contact_messages table
    const dbResult = await persistContactMessage({
      name: cleanName,
      email: cleanEmail,
      subject: cleanSubject,
      message: cleanMessage
    });

    if (!dbResult.success) {
      console.warn('[Contact API] Failed saving to Supabase, continuing with fallback:', dbResult.error);
    } else {
      console.log(`[Contact API] Message saved to Supabase (ID: ${dbResult.data?.id}) from ${cleanEmail}`);
    }

    // 2. Secondary relay: Send to webhook if configured (non-blocking)
    const webhookUrl = process.env.CONTACT_WEBHOOK_URL?.trim();
    if (webhookUrl) {
      const webhookPayload = {
        id: dbResult.data?.id,
        name: cleanName,
        email: cleanEmail,
        subject: cleanSubject,
        message: cleanMessage,
        timestamp,
        source: 'SlopMovie Interactive Cinema',
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
            footer: { text: 'SlopMovie Contact Inbox' },
            timestamp
          }
        ]
      };

      fetch(webhookUrl, {
        signal: AbortSignal.timeout(10000),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      })
        .then(res => {
          if (!res.ok) console.warn(`[Contact Webhook] Status: ${res.status}`);
        })
        .catch(err => {
          console.warn('[Contact Webhook] Webhook ping failed (non-critical):', err?.message || err);
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully!',
      data: dbResult.data
    });
  } catch (err: any) {
    console.error('[Contact API] Error handling contact form request:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process contact submission' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contact
 * Retrieve contact messages for admin dashboard
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    const messages = await loadContactMessages({ status, limit });
    return NextResponse.json({
      success: true,
      messages
    });
  } catch (err: any) {
    console.error('[Contact API] Error loading contact messages:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch contact messages' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contact
 * Update contact message status (read / unread / archived)
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    if (!['unread', 'read', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const success = await updateContactMessageStatus(id, status);
    if (!success) {
      return NextResponse.json({ error: 'Failed to update message status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status });
  } catch (err: any) {
    console.error('[Contact API] Error updating contact message:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update message' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contact
 * Remove a contact message
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    const id = body.id || searchParams.get('id');

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    const success = await deleteContactMessage(id);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('[Contact API] Error deleting contact message:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to delete message' },
      { status: 500 }
    );
  }
}
