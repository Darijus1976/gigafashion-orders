// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { Readable } from 'stream';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function splitClientName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: 'unknown', lastName: 'client' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getImageUrls(imageUrl: string | null): string[] {
  if (!imageUrl) return [];
  if (imageUrl.startsWith('[')) {
    try { return JSON.parse(imageUrl); } catch { return [imageUrl]; }
  }
  return [imageUrl];
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
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  }
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
  if (!res.ok) {
    throw new Error(`Drive API error (${path}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function findOrCreateFolder(accessToken: string, parentId: string, folderName: string): Promise<string> {
  const q = `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
  const list = await driveRequest(accessToken, `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`);

  if (list.files && list.files.length > 0) {
    return list.files[0].id;
  }

  const create = await driveRequest(accessToken, '/files', {
    method: 'POST',
    body: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
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
  if (!res.ok) {
    throw new Error(`Drive upload error: ${JSON.stringify(data)}`);
  }
  return data.webViewLink || data.id;
}

async function getOrderData(supabase: ReturnType<typeof createClient>, orderId: string) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) throw new Error(`Order not found: ${orderError?.message}`);

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('sort_order', { ascending: true });

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .order('payment_date', { ascending: true });

  const { data: fittingRows } = await supabase
    .from('fitting_sessions')
    .select('*')
    .eq('order_id', orderId)
    .order('sort_order', { ascending: true });

  const fittingSessions = (fittingRows || []).map((s: any) => ({
    date: s.fitting_date,
    notes: Array.isArray(s.notes) ? s.notes : [],
    photoUrls: Array.isArray(s.photo_urls) ? s.photo_urls : [],
  }));

  return { order, items: items || [], payments: payments || [], fittingSessions };
}

function buildFullPdfHtml(data: Awaited<ReturnType<typeof getOrderData>>): string {
  const { order, items, payments, fittingSessions } = data;
  const occasionLabels: Record<string, string> = {
    christening: 'Christening',
    communion: 'Communion',
    confirmation: 'Confirmation',
    debs: 'Debs',
    wedding: 'Wedding',
    wedding_alteration: 'Wedding Alteration',
    other: 'Other',
  };

  const activeItems = items.filter((i: any) => !i.deleted);
  const totalAmount = activeItems.reduce((sum: number, i: any) => sum + Number(i.price || 0), 0);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 40px; }
  h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 16px; }
  h2 { font-size: 15px; margin-top: 24px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e0e0e0; }
  th { background: #f5f5f5; font-weight: 600; }
  .field { margin-bottom: 6px; }
  .field-label { font-weight: 600; display: inline-block; width: 160px; }
  .total-row td { font-weight: 700; border-top: 2px solid #333; }
  .note { font-style: italic; color: #555; }
  .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .photos img { width: 100%; aspect-ratio: 1; object-fit: cover; border: 1px solid #e0e0e0; border-radius: 4px; }
  .footer { margin-top: 40px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
</style></head><body>
<h1>Order #${order.order_number} — Full Archive</h1>

<h2>Client Information</h2>
<div class="field"><span class="field-label">Client Name:</span> ${order.client_name}</div>
<div class="field"><span class="field-label">Phone:</span> ${order.phone}</div>
<div class="field"><span class="field-label">Visit Date:</span> ${order.visit_date ? new Date(order.visit_date).toLocaleDateString('lt-LT') : ''}</div>
<div class="field"><span class="field-label">Occasion:</span> ${occasionLabels[order.occasion] || order.occasion}${order.occasion_custom ? ` (${order.occasion_custom})` : ''}</div>
<div class="field"><span class="field-label">Event Date:</span> ${order.event_date || ''}</div>
<div class="field"><span class="field-label">Dress Type:</span> ${order.dress_type === 'custom' ? 'Custom' : 'Catalogue'}</div>
<div class="field"><span class="field-label">Status:</span> ${order.status}</div>
<div class="field"><span class="field-label">Staff Member:</span> ${order.staff_member}</div>
${order.notes ? `<div class="field"><span class="field-label">Notes:</span> <span class="note">${order.notes}</span></div>` : ''}

<h2>Order Items</h2>
<table>
<tr><th>#</th><th>Image</th><th>Type</th><th>Description</th><th>Price (€)</th></tr>
${activeItems.map((item: any, i: number) => `
<tr>
  <td>${i + 1}</td>
  <td>${item.image_url ? getImageUrls(item.image_url).map(u => '<img src="' + u + '" style="width:60px;height:60px;object-fit:cover;border-radius:4px;margin:2px;" />').join('') : ''}</td>
  <td>${item.item_type}</td>
  <td>${item.description}</td>
  <td>€${Number(item.price || 0).toFixed(2)}</td>
</tr>`).join('')}
<tr class="total-row"><td colspan="4">Total</td><td>€${totalAmount.toFixed(2)}</td></tr>
</table>

<h2>Payments</h2>
${payments.length > 0 ? `
<table>
<tr><th>Date</th><th>Method</th><th>Amount (€)</th><th>Accepted By</th><th>Notes</th></tr>
${payments.map((p: any) => `
<tr>
  <td>${p.payment_date}</td>
  <td>${p.method}</td>
  <td>€${Number(p.amount || 0).toFixed(2)}</td>
  <td>${p.accepted_by || ''}</td>
  <td>${p.notes || ''}</td>
</tr>`).join('')}
</table>
` : '<p>No payments recorded.</p>'}

<div class="field"><span class="field-label">Total Amount:</span> €${Number(order.total_amount || 0).toFixed(2)}</div>
<div class="field"><span class="field-label">Total Paid:</span> €${Number(order.total_paid || 0).toFixed(2)}</div>
<div class="field"><span class="field-label">Balance Due:</span> €${(Number(order.total_amount || 0) - Number(order.total_paid || 0)).toFixed(2)}</div>

${fittingSessions.length > 0 ? `
<h2>Fitting Sessions</h2>
${fittingSessions.map((s: any, si: number) => `
<h3>Session ${si + 1} — ${s.date}</h3>
${s.notes && s.notes.length > 0 ? `
<table>
<tr><th>#</th><th>Description</th><th>Price (€)</th></tr>
${s.notes.map((n: any, ni: number) => `
<tr>
  <td>${ni + 1}</td>
  <td>${n.description || ''}</td>
  <td>€${Number(n.price || 0).toFixed(2)}</td>
</tr>`).join('')}
</table>
` : '<p>No notes.</p>'}
${s.photoUrls && s.photoUrls.length > 0 ? `
<div class="photos">
${s.photoUrls.map((url: string) => `<img src="${url}" alt="Fitting photo" />`).join('')}
</div>` : ''}
`).join('')}
` : ''}

<div class="footer">Generated: ${new Date().toLocaleString('lt-LT')} | Giga Fashion — Internal Archive</div>
</body></html>`;
}

function buildClientPdfHtml(data: Awaited<ReturnType<typeof getOrderData>>): string {
  const { order, items, fittingSessions } = data;
  const occasionLabels: Record<string, string> = {
    christening: 'Christening',
    communion: 'Communion',
    confirmation: 'Confirmation',
    debs: 'Debs',
    wedding: 'Wedding',
    wedding_alteration: 'Wedding Alteration',
    other: 'Other',
  };

  const activeItems = items.filter((i: any) => !i.deleted);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 40px; }
  h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 16px; }
  h2 { font-size: 15px; margin-top: 24px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e0e0e0; }
  th { background: #f5f5f5; font-weight: 600; }
  .field { margin-bottom: 6px; }
  .field-label { font-weight: 600; display: inline-block; width: 160px; }
  .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .photos img { width: 100%; aspect-ratio: 1; object-fit: cover; border: 1px solid #e0e0e0; border-radius: 4px; }
  .footer { margin-top: 40px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
</style></head><body>
<h1>Order #${order.order_number} — Client Copy</h1>

<h2>Client Information</h2>
<div class="field"><span class="field-label">Client Name:</span> ${order.client_name}</div>
<div class="field"><span class="field-label">Phone:</span> ${order.phone}</div>
<div class="field"><span class="field-label">Visit Date:</span> ${order.visit_date ? new Date(order.visit_date).toLocaleDateString('lt-LT') : ''}</div>
<div class="field"><span class="field-label">Occasion:</span> ${occasionLabels[order.occasion] || order.occasion}${order.occasion_custom ? ` (${order.occasion_custom})` : ''}</div>
<div class="field"><span class="field-label">Event Date:</span> ${order.event_date || ''}</div>
<div class="field"><span class="field-label">Dress Type:</span> ${order.dress_type === 'custom' ? 'Custom' : 'Catalogue'}</div>
<div class="field"><span class="field-label">Status:</span> ${order.status}</div>
<div class="field"><span class="field-label">Staff Member:</span> ${order.staff_member}</div>
${order.notes ? `<div class="field"><span class="field-label">Notes:</span> ${order.notes}</div>` : ''}

<h2>Order Items</h2>
<table>
<tr><th>#</th><th>Image</th><th>Type</th><th>Description</th></tr>
${activeItems.map((item: any, i: number) => `
<tr>
  <td>${i + 1}</td>
  <td>${item.image_url ? getImageUrls(item.image_url).map(u => '<img src="' + u + '" style="width:60px;height:60px;object-fit:cover;border-radius:4px;margin:2px;" />').join('') : ''}</td>
  <td>${item.item_type}</td>
  <td>${item.description}</td>
</tr>`).join('')}
</table>

${fittingSessions.length > 0 ? `
<h2>Fitting Sessions</h2>
${fittingSessions.map((s: any, si: number) => `
<h3>Session ${si + 1} — ${s.date}</h3>
${s.notes && s.notes.length > 0 ? `
<table>
<tr><th>#</th><th>Description</th></tr>
${s.notes.map((n: any, ni: number) => `
<tr>
  <td>${ni + 1}</td>
  <td>${n.description || ''}</td>
</tr>`).join('')}
</table>
` : '<p>No notes.</p>'}
${s.photoUrls && s.photoUrls.length > 0 ? `
<div class="photos">
${s.photoUrls.map((url: string) => `<img src="${url}" alt="Fitting photo" />`).join('')}
</div>` : ''}
`).join('')}
` : ''}

<div class="footer">Generated: ${new Date().toLocaleString('lt-LT')} | Giga Fashion</div>
</body></html>`;
}

function buildFittingPdfHtmlNoPrices(data: Awaited<ReturnType<typeof getOrderData>>): string {
  const { order, fittingSessions } = data;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 40px; }
  h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 16px; }
  h2 { font-size: 15px; margin-top: 24px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e0e0e0; }
  th { background: #f5f5f5; font-weight: 600; }
  .field { margin-bottom: 6px; }
  .field-label { font-weight: 600; display: inline-block; width: 160px; }
  .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .photos img { width: 100%; aspect-ratio: 1; object-fit: cover; border: 1px solid #e0e0e0; border-radius: 4px; }
  .footer { margin-top: 40px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
</style></head><body>
<h1>Fitting Sheet — ${order.client_name}</h1>
<div class="field"><span class="field-label">Order Number:</span> ${order.order_number}</div>
<div class="field"><span class="field-label">Phone:</span> ${order.phone}</div>

${fittingSessions.length > 0 ? fittingSessions.map((s: any, si: number) => `
<h2>Fitting Session ${si + 1} — ${s.date}</h2>
${s.notes && s.notes.length > 0 ? `
<table>
<tr><th>#</th><th>Measurement / Alteration Note</th></tr>
${s.notes.map((n: any, ni: number) => `
<tr>
  <td>${ni + 1}</td>
  <td>${n.description || ''}</td>
</tr>`).join('')}
</table>
` : '<p>No measurement notes recorded.</p>'}
${s.photoUrls && s.photoUrls.length > 0 ? `
<div class="photos">
${s.photoUrls.map((url: string) => `<img src="${url}" alt="Fitting photo" />`).join('')}
</div>` : ''}
`).join('') : '<p>No fitting sessions recorded.</p>'}

<div class="footer">Generated: ${new Date().toLocaleString('lt-LT')} | Giga Fashion — Fitting Sheet (Siuvėjoms)</div>
</body></html>`;
}

function buildFittingPdfHtmlWithPrices(data: Awaited<ReturnType<typeof getOrderData>>): string {
  const { order, fittingSessions } = data;

  return '<!DOCTYPE html>' +
'<html><head><meta charset="utf-8"><style>' +
'  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 40px; }' +
'  h1 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 16px; }' +
'  h2 { font-size: 15px; margin-top: 24px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }' +
'  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }' +
'  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e0e0e0; }' +
'  th { background: #f5f5f5; font-weight: 600; }' +
'  .field { margin-bottom: 6px; }' +
'  .field-label { font-weight: 600; display: inline-block; width: 160px; }' +
'  .total-row td { font-weight: 700; border-top: 2px solid #333; }' +
'  .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }' +
'  .photos img { width: 100%; aspect-ratio: 1; object-fit: cover; border: 1px solid #e0e0e0; border-radius: 4px; }' +
'  .footer { margin-top: 40px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }' +
'</style></head><body>' +
'<h1>Fitting Sheet — ' + order.client_name + '</h1>' +
'<div class="field"><span class="field-label">Order Number:</span> ' + order.order_number + '</div>' +
'<div class="field"><span class="field-label">Phone:</span> ' + order.phone + '</div>' +
(fittingSessions.length > 0 ? fittingSessions.map((s: any, si: number) => {
  const sessionTotal = s.notes.reduce((sum: number, n: any) => sum + Number(n.price || 0), 0);
  return '<h2>Fitting Session ' + (si + 1) + ' — ' + s.date + '</h2>' +
    (s.notes && s.notes.length > 0 ? '<table><tr><th>#</th><th>Measurement / Alteration Note</th><th>Price (€)</th></tr>' +
      s.notes.map((n: any, ni: number) => '<tr><td>' + (ni + 1) + '</td><td>' + (n.description || '') + '</td><td>€' + Number(n.price || 0).toFixed(2) + '</td></tr>').join('') +
      '<tr class="total-row"><td colspan="2">Session Total</td><td>€' + sessionTotal.toFixed(2) + '</td></tr></table>' : '<p>No measurement notes recorded.</p>') +
    (s.photoUrls && s.photoUrls.length > 0 ? '<div class="photos">' + s.photoUrls.map((url: string) => '<img src="' + url + '" alt="Fitting photo" />').join('') + '</div>' : '');
}).join('') : '<p>No fitting sessions recorded.</p>') +
'<div class="footer">Generated: ' + new Date().toLocaleString('lt-LT') + ' | Giga Fashion — Fitting Sheet (Pilnas)</div>' +
'</body></html>';
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
      format: 'A4',
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      printBackground: true,
    });
    const buf = Buffer.from(pdfBuffer);
    return buf;
  } finally {
    await browser.close();
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    if (req.query.test === 'auth') {
      try {
        const clientId = process.env.GOOGLE_CLIENT_ID || '';
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || '';
        const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '';

        if (!clientId || !clientSecret || !refreshToken || !rootFolderId) {
          return res.status(200).json({
            error: 'Missing env vars',
            hasClientId: !!clientId,
            hasClientSecret: !!clientSecret,
            hasRefreshToken: !!refreshToken,
            hasRootFolderId: !!rootFolderId,
          });
        }

        const accessToken = await getAccessToken();
        const list = await driveRequest(accessToken, `/files?q=${encodeURIComponent(`'${rootFolderId}' in parents and trashed=false`)}&fields=files(id,name)&pageSize=5`);
        return res.status(200).json({
          success: true,
          folderId: rootFolderId,
          files: list.files,
        });
      } catch (e: any) {
        return res.status(200).json({
          error: 'Auth failed',
          message: e.message,
          stack: e.stack,
        });
      }
    }
    return res.status(200).json({ status: 'ok', message: 'generate-pdf function is alive' });
  }

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

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const pdfType = typeof req.query.type === 'string' ? req.query.type : 'full';
    const orderId = req.body?.orderId;

    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId in request body' });
    }

    const data = await getOrderData(supabase, orderId);
    const { firstName, lastName } = splitClientName(data.order.client_name);
    const clientFolderName = `${firstName} ${lastName}`.trim();
    const safeFirst = sanitizeFilename(firstName);
    const safeLast = sanitizeFilename(lastName);
    const filePrefix = safeLast ? `${safeFirst}-${safeLast}` : safeFirst;

    const accessToken = await getAccessToken();

    const clientFolderId = await findOrCreateFolder(accessToken, rootFolderId, clientFolderName);

    let targetFolderId = clientFolderId;

    if (pdfType !== 'fiting') {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('client_name', data.order.client_name);

      const hasPreviousOrders = (count || 0) > 1;

      if (hasPreviousOrders) {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        targetFolderId = await findOrCreateFolder(accessToken, clientFolderId, yearMonth);
      }
    } else {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      targetFolderId = await findOrCreateFolder(accessToken, clientFolderId, yearMonth);
    }

    if (pdfType === 'fiting') {
      const noPricesHtml = buildFittingPdfHtmlNoPrices(data);
      const withPricesHtml = buildFittingPdfHtmlWithPrices(data);

      const [noPricesPdf, withPricesPdf] = await Promise.all([
        generatePdfBuffer(noPricesHtml),
        generatePdfBuffer(withPricesHtml),
      ]);

      const [noPricesLink, withPricesLink] = await Promise.all([
        uploadPdfToDrive(accessToken, targetFolderId, `${filePrefix}_fiting_siuvejoms.pdf`, noPricesPdf),
        uploadPdfToDrive(accessToken, targetFolderId, `${filePrefix}_fiting_pilnas.pdf`, withPricesPdf),
      ]);

      return res.status(200).json({
        success: true,
        message: 'Fitting sheet PDFs uploaded to Google Drive',
        seamstressLink: noPricesLink,
        fullLink: withPricesLink,
      });
    }

    const fullHtml = buildFullPdfHtml(data);
    const clientHtml = buildClientPdfHtml(data);

    const [fullPdf, clientPdf] = await Promise.all([
      generatePdfBuffer(fullHtml),
      generatePdfBuffer(clientHtml),
    ]);

    const [fullLink, clientLink] = await Promise.all([
      uploadPdfToDrive(accessToken, targetFolderId, `${filePrefix}_pilnas.pdf`, fullPdf),
      uploadPdfToDrive(accessToken, targetFolderId, `${filePrefix}_klientui.pdf`, clientPdf),
    ]);

    let fittingLinks = null;
    if (data.fittingSessions.length > 0) {
      const noPricesHtml = buildFittingPdfHtmlNoPrices(data);
      const withPricesHtml = buildFittingPdfHtmlWithPrices(data);
      const [noPricesPdf, withPricesPdf] = await Promise.all([
        generatePdfBuffer(noPricesHtml),
        generatePdfBuffer(withPricesHtml),
      ]);
      const [noPricesLink, withPricesLink] = await Promise.all([
        uploadPdfToDrive(accessToken, targetFolderId, `${filePrefix}_fiting_siuvejoms.pdf`, noPricesPdf),
        uploadPdfToDrive(accessToken, targetFolderId, `${filePrefix}_fiting_pilnas.pdf`, withPricesPdf),
      ]);
      fittingLinks = { seamstressLink: noPricesLink, fullLink: withPricesLink };
    }

    return res.status(200).json({
      success: true,
      message: 'PDFs generated and uploaded to Google Drive',
      fullArchiveLink: fullLink,
      clientCopyLink: clientLink,
      fittingLinks,
    });
  } catch (error) {
    console.error('generate-pdf error:', error);
    return res.status(500).json({
      error: 'Failed to generate PDFs',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
