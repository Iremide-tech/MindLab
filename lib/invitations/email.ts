import "server-only";

export type InvitationEmail = {
  recipientEmail: string;
  inviterEmail: string;
  inviterName: string;
  workspaceTitle: string;
  invitationUrl: string;
  expiresAt: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function sendInvitationEmail(invitation: InvitationEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }

  const expiresAt = new Date(invitation.expiresAt);
  const expirationText = Number.isNaN(expiresAt.getTime())
    ? "This invitation expires in 7 days."
    : `This invitation expires on ${new Intl.DateTimeFormat("en", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(expiresAt)}.`;
  const inviter = invitation.inviterName || invitation.inviterEmail;
  const safeWorkspaceTitle = escapeHtml(invitation.workspaceTitle);
  const safeInviter = escapeHtml(inviter);
  const safeInvitationUrl = escapeHtml(invitation.invitationUrl);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [invitation.recipientEmail],
      subject: `You're invited to collaborate on ${invitation.workspaceTitle}`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17211b;max-width:560px;margin:0 auto;padding:24px"><p style="font-size:13px;font-weight:700;letter-spacing:1px">MindLab</p><h1 style="font-size:24px">You&apos;re invited to collaborate</h1><p>${safeInviter} invited you to collaborate on <strong>${safeWorkspaceTitle}</strong>.</p><p>Accept the invitation to access this workspace.</p><p style="margin:28px 0"><a href="${safeInvitationUrl}" style="display:inline-block;background:#b7e36a;color:#17211b;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Accept Invitation</a></p><p style="font-size:13px;color:#526057">${escapeHtml(expirationText)}</p><p style="font-size:12px;color:#68756d">If the button does not work, open this link:<br><a href="${safeInvitationUrl}">${safeInvitationUrl}</a></p></div>`,
      text: `MindLab\n\n${inviter} invited you to collaborate on ${invitation.workspaceTitle}.\n\nAccept Invitation: ${invitation.invitationUrl}\n\n${expirationText}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email provider rejected the invitation (HTTP ${response.status}).`);
  }
}