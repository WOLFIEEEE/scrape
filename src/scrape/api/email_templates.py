"""Transactional email templates.

Each function returns a fully-formed `EmailMessage` ready to hand to
`email.send`. Templates are kept in Python (not separate HTML files) so
they get the same review process as code, are typed end-to-end, and don't
require a template-engine dependency.

All templates render BOTH plain text and HTML. The text version is what
text-only email clients (and many filtering systems) actually display, so
it's the one to keep readable rather than treating it as an afterthought.

Design choices:
  - Plain HTML, no <img> — image proxies (Gmail's especially) cache them
    indefinitely and break verification flows. Branding is text-only.
  - Inline styles only. Most email clients strip <style>.
  - Buttons are anchor tags styled to look like buttons; we never assume
    the user clicks them — every email also shows the raw URL.
  - max-width 580 — common rendering width on most clients.
"""
from __future__ import annotations

from scrape.api.email import EmailMessage

# Centralized brand bits. Wired at runtime from settings (the
# templates module imports these via `_brand` to avoid an import cycle
# with config; configure() updates them at app startup).
_brand = {
    "name": "Scrape",
    "support_email": "support@scrape.dev",
}


def configure_brand(name: str, support_email: str) -> None:
    """Override defaults at app startup so prod and dev show the right
    contact addresses."""
    _brand["name"] = name or "Scrape"
    _brand["support_email"] = support_email or "support@scrape.dev"


def _shell(title: str, body_html: str) -> str:
    """Common HTML wrapper. Inline styles only — most email clients
    strip <style> blocks."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f7f4ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0a0908;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f4ed;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#ffffff;border:1px solid #e5dfd1;">
          <tr>
            <td style="padding:32px 40px 16px;border-bottom:1px solid #e5dfd1;">
              <div style="font-family:Georgia,serif;font-size:20px;letter-spacing:-0.5px;color:#0a0908;">
                Scrape <span style="color:#c14a1a;">·</span>
                <span style="color:#7a7368;font-size:13px;font-family:ui-monospace,Menlo,monospace;letter-spacing:0.05em;text-transform:uppercase;">The bureau</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;font-size:15px;line-height:1.6;color:#27241e;">
              {body_html}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e5dfd1;font-size:12px;color:#7a7368;line-height:1.5;">
              You&apos;re receiving this because you have an account at {_brand['name']}.
              Questions? <a href="mailto:{_brand['support_email']}" style="color:#c14a1a;text-decoration:underline;">{_brand['support_email']}</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _btn(href: str, label: str) -> str:
    """Inline-styled button. Anchor + table is the only reliable
    cross-client shape."""
    return f"""<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
  <tr>
    <td style="background:#0a0908;border:1px solid #0a0908;">
      <a href="{href}" target="_blank" style="display:inline-block;padding:12px 24px;color:#f7f4ed;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.02em;">{label}</a>
    </td>
  </tr>
</table>"""


# ---------------------------------------------------------------------------
# Verify your email
# ---------------------------------------------------------------------------

def verification_email(
    *, recipient: str, recipient_name: str, verify_url: str,
    expires_in_hours: int = 168,
) -> EmailMessage:
    name_line = f"Hi {recipient_name}," if recipient_name else "Welcome,"
    text = f"""\
{name_line}

Thanks for signing up for {_brand['name']}. To finish creating your account,
verify your email address by visiting:

  {verify_url}

This link is valid for {expires_in_hours} hours. If you didn't create an
account, you can ignore this message and no account will be created.

— The Bureau
"""
    body_html = f"""\
<h2 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:400;letter-spacing:-0.4px;color:#0a0908;">Verify your email</h2>
<p style="margin:0 0 16px;">{name_line.replace('Hi ', 'Hi <strong>').replace(',', '</strong>,')}</p>
<p style="margin:0 0 16px;">Thanks for signing up for <strong>{_brand['name']}</strong>. To finish creating your account, click the button below.</p>
{_btn(verify_url, 'Verify email')}
<p style="margin:0 0 16px;color:#7a7368;font-size:13px;">If the button doesn&apos;t work, paste this URL into your browser:</p>
<p style="margin:0 0 24px;word-break:break-all;font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#27241e;background:#f7f4ed;padding:12px;border:1px solid #e5dfd1;">{verify_url}</p>
<p style="margin:0;color:#7a7368;font-size:13px;">This link is valid for {expires_in_hours} hours. If you didn&apos;t sign up, you can ignore this message — no account will be created.</p>
"""
    return EmailMessage(
        to=recipient,
        subject=f"Verify your {_brand['name']} email",
        text=text,
        html=_shell(f"Verify your {_brand['name']} email", body_html),
        tags=[("type", "verify")],
    )


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------

def password_reset_email(
    *, recipient: str, recipient_name: str, reset_url: str,
    expires_in_minutes: int = 30,
) -> EmailMessage:
    name_line = f"Hi {recipient_name}," if recipient_name else "Hello,"
    text = f"""\
{name_line}

Someone (hopefully you) requested a password reset for your {_brand['name']}
account. To choose a new password, visit:

  {reset_url}

This link is valid for {expires_in_minutes} minutes and can be used once.
If you didn't request this, you can safely ignore this email — your
password won't be changed.

— The Bureau
"""
    body_html = f"""\
<h2 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:400;letter-spacing:-0.4px;color:#0a0908;">Reset your password</h2>
<p style="margin:0 0 16px;">{name_line.replace('Hi ', 'Hi <strong>').replace(',', '</strong>,')}</p>
<p style="margin:0 0 16px;">Someone (hopefully you) requested a password reset for your <strong>{_brand['name']}</strong> account.</p>
{_btn(reset_url, 'Choose a new password')}
<p style="margin:0 0 16px;color:#7a7368;font-size:13px;">If the button doesn&apos;t work, paste this URL into your browser:</p>
<p style="margin:0 0 24px;word-break:break-all;font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#27241e;background:#f7f4ed;padding:12px;border:1px solid #e5dfd1;">{reset_url}</p>
<p style="margin:0 0 8px;color:#7a7368;font-size:13px;">This link is valid for {expires_in_minutes} minutes and can be used once.</p>
<p style="margin:0;color:#7a7368;font-size:13px;">If you didn&apos;t request this, ignore this email — your password won&apos;t be changed.</p>
"""
    return EmailMessage(
        to=recipient,
        subject=f"Reset your {_brand['name']} password",
        text=text,
        html=_shell(f"Reset your {_brand['name']} password", body_html),
        tags=[("type", "reset")],
    )


# ---------------------------------------------------------------------------
# Welcome — sent after the user verifies their email
# ---------------------------------------------------------------------------

def welcome_email(
    *, recipient: str, recipient_name: str, app_url: str, docs_url: str,
) -> EmailMessage:
    name_line = f"Welcome, {recipient_name}!" if recipient_name else "Welcome!"
    text = f"""\
{name_line}

Your {_brand['name']} account is now active. A few starting points:

  · Dashboard ......... {app_url}
  · Quickstart ........ {docs_url}/quickstart
  · API reference ..... {docs_url}/api

If you bump into anything that's broken or unclear, just reply to this email.

— The Bureau
"""
    body_html = f"""\
<h2 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;font-weight:400;letter-spacing:-0.4px;color:#0a0908;">{name_line}</h2>
<p style="margin:0 0 16px;">Your <strong>{_brand['name']}</strong> account is now active. A few starting points:</p>
<ul style="margin:0 0 24px;padding-left:18px;line-height:1.8;">
  <li><a href="{app_url}" style="color:#c14a1a;text-decoration:underline;">Dashboard</a></li>
  <li><a href="{docs_url}/quickstart" style="color:#c14a1a;text-decoration:underline;">Quickstart</a></li>
  <li><a href="{docs_url}/api" style="color:#c14a1a;text-decoration:underline;">API reference</a></li>
</ul>
<p style="margin:0;color:#7a7368;font-size:13px;">If you bump into anything that&apos;s broken or unclear, just reply to this email — it goes to a real engineer.</p>
"""
    return EmailMessage(
        to=recipient,
        subject=f"Welcome to {_brand['name']}",
        text=text,
        html=_shell(f"Welcome to {_brand['name']}", body_html),
        tags=[("type", "welcome")],
    )
