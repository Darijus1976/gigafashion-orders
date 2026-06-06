// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function splitClientName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: 'unknown', lastName: 'client' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function driveRequest(
  accessToken: string,
  path: string,
  options: { method?: string; body?: any } = {}
): Promise<any> {
  const res = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Drive API error (${path}): ${JSON.stringify(data)}`);
  return data;
}

async function findOrCreateFolder(accessToken: string, parentId: string, folderName: string): Promise<string> {
  const q = `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  const list = await driveRequest(accessToken, `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`);
  if (list.files && list.files.length > 0) return list.files[0].id;
  const create = await driveRequest(accessToken, '/files', {
    method: 'POST',
    body: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
  });
  return create.id;
}

async function uploadPdfToDrive(
  accessToken: string,
  folderId: string,
  filename: string,
  pdfBuffer: Buffer
): Promise<string> {
  const boundary = '-------' + Date.now();
  const header = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ name: filename, mimeType: 'application/pdf', parents: [folderId] })}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`;
  const footer = `\r\n--${boundary}--`;
  const body = Buffer.concat([Buffer.from(header), pdfBuffer, Buffer.from(footer)]);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Drive upload error: ${JSON.stringify(data)}`);
  return data.webViewLink || data.id;
}

async function generatePdfBuffer(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A5',
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
      printBackground: true,
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

function buildReceiptHtml(order: any, payment: any): string {
  const paymentDate = payment.payment_date
    ? new Date(payment.payment_date).toLocaleDateString('lt-LT')
    : new Date().toLocaleDateString('lt-LT');
  const amount = Number(payment.amount || 0).toFixed(2);
  const generatedAt = new Date().toLocaleString('lt-LT');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; margin: 0; padding: 20px; }
  .header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 22px; margin: 0 0 4px 0; letter-spacing: 1px; }
  .header p { margin: 2px 0; font-size: 12px; color: #555; }
  .receipt-title { text-align: center; font-size: 16px; font-weight: bold; margin: 16px 0; text-transform: uppercase; letter-spacing: 2px; }
  .receipt-number { text-align: center; font-size: 12px; color: #777; margin-bottom: 20px; }
  .section { margin-bottom: 14px; }
  .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #ddd; }
  .row:last-child { border-bottom: none; }
  .label { color: #555; }
  .value { font-weight: 600; }
  .amount-box { background: #f5f5f5; border: 2px solid #1a1a1a; border-radius: 4px; padding: 12px; text-align: center; margin: 20px 0; }
  .amount-box .amount { font-size: 28px; font-weight: bold; }
  .method-badge { display: inline-block; background: #1a1a1a; color: #fff; padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }
  .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
  .signature-line { border-top: 1px solid #aaa; width: 180px; margin: 30px auto 4px auto; }
  .signature-label { text-align: center; font-size: 11px; color: #777; }
</style></head><body>

<div class="header">
  <h1>Giga Fashion</h1>
  <p>Cash Receipt</p>
</div>

<div class="receipt-title">Receipt</div>
<div class="receipt-number">Order: #${order.order_number} &nbsp;|&nbsp; Date: ${paymentDate}</div>

<div class="section">
  <div class="row">
    <span class="label">Client:</span>
    <span class="value">${order.client_name}</span>
  </div>
  <div class="row">
    <span class="label">Phone:</span>
    <span class="value">${order.phone || '—'}</span>
  </div>
  <div class="row">
    <span class="label">Accepted by:</span>
    <span class="value">${payment.accepted_by || '—'}</span>
  </div>
  ${payment.notes ? `<div class="row"><span class="label">Note:</span><span class="value">${payment.notes}</span></div>` : ''}
</div>

<div class="amount-box">
  <div>Amount paid:</div>
  <div class="amount">€${amount}</div>
</div>

<div style="text-align:center; margin-bottom: 8px;">
  <span class="method-badge">Cash</span>
</div>

<div class="section">
  <div class="row">
    <span class="label">Order total:</span>
    <span class="value">€${Number(order.total_amount || 0).toFixed(2)}</span>
  </div>
  <div class="row">
    <span class="label">Total paid:</span>
    <span class="value">€${Number(order.total_paid || 0).toFixed(2)}</span>
  </div>
  <div class="row">
    <span class="label">Balance due:</span>
    <span class="value">€${(Number(order.total_amount || 0) - Number(order.total_paid || 0)).toFixed(2)}</span>
  </div>
</div>

<div class="signature-line"></div>
<div class="signature-label">Signature</div>

<div class="footer">Generated: ${generatedAt} | Giga Fashion — Cash Receipt</div>
</body></html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return res.status(500).json({ error: 'Missing Supabase environment variables' });
    }

    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (!rootFolderId) {
      return res.status(500).json({ error: 'Missing GOOGLE_DRIVE_ROOT_FOLDER_ID' });
    }

    const { orderId, paymentId } = req.body || {};
    if (!orderId || !paymentId) {
      return res.status(400).json({ error: 'Missing orderId or paymentId in request body' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: `Order not found: ${orderError?.message}` });
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('order_id', orderId)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ error: `Payment not found: ${paymentError?.message}` });
    }

    if (payment.method !== 'cash') {
      return res.status(400).json({ error: 'Receipt generation is only available for cash payments' });
    }

    const { firstName, lastName } = splitClientName(order.client_name);
    const clientFolderName = `${firstName} ${lastName}`.trim();
    const safeFirst = sanitizeFilename(firstName);
    const safeLast = sanitizeFilename(lastName);
    const filePrefix = safeLast ? `${safeFirst}-${safeLast}` : safeFirst;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    const accessToken = await getAccessToken();
    const clientFolderId = await findOrCreateFolder(accessToken, rootFolderId, clientFolderName);

    let targetFolderId = clientFolderId;
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('client_name', order.client_name);

    if ((count || 0) > 1) {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      targetFolderId = await findOrCreateFolder(accessToken, clientFolderId, yearMonth);
    }

    const html = buildReceiptHtml(order, payment);
    const pdfBuffer = await generatePdfBuffer(html);
    const filename = `${filePrefix}_kvitas_${ts}.pdf`;
    const receiptLink = await uploadPdfToDrive(accessToken, targetFolderId, filename, pdfBuffer);

    return res.status(200).json({
      success: true,
      message: 'Cash receipt generated and uploaded to Google Drive',
      receiptLink,
    });
  } catch (error) {
    console.error('generate-receipt error:', error);
    return res.status(500).json({
      error: 'Failed to generate receipt',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
