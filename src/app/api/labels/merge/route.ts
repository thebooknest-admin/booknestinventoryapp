import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const labelUrls: string[] = body.labelUrls || [];

    if (!labelUrls.length) {
      return NextResponse.json(
        { error: 'No label URLs provided.' },
        { status: 400 }
      );
    }

    // Create a new PDF document to merge into
    const mergedPdf = await PDFDocument.create();

    // Fetch and merge each label
    for (const url of labelUrls) {
      try {
        const response = await fetch(url);
        const contentType = response.headers.get('content-type') || '';
        const bytes = await response.arrayBuffer();

        if (contentType.includes('pdf')) {
          // PDF label — copy pages directly
          const labelPdf = await PDFDocument.load(bytes);
          const pages = await mergedPdf.copyPages(labelPdf, labelPdf.getPageIndices());
          for (const page of pages) {
            mergedPdf.addPage(page);
          }
        } else if (contentType.includes('image/png') || contentType.includes('image/jpeg')) {
          // Image label — embed as a 4x6 page
          const image = contentType.includes('png')
            ? await mergedPdf.embedPng(bytes)
            : await mergedPdf.embedJpg(bytes);

          // 4x6 inches at 72 DPI
          const pageWidth = 4 * 72;
          const pageHeight = 6 * 72;
          const page = mergedPdf.addPage([pageWidth, pageHeight]);

          // Scale image to fit the page
          const scaled = image.scaleToFit(pageWidth, pageHeight);
          page.drawImage(image, {
            x: (pageWidth - scaled.width) / 2,
            y: (pageHeight - scaled.height) / 2,
            width: scaled.width,
            height: scaled.height,
          });
        } else {
          console.warn(`Unsupported label format: ${contentType} for ${url}`);
        }
      } catch (err) {
        console.error(`Failed to fetch/process label: ${url}`, err);
      }
    }

    if (mergedPdf.getPageCount() === 0) {
      return NextResponse.json(
        { error: 'No labels could be processed.' },
        { status: 400 }
      );
    }

    const pdfBytes = await mergedPdf.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="labels-${Date.now()}.pdf"`,
      },
    });
  } catch (error: unknown) {
    console.error('Merge labels error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to merge labels.' },
      { status: 500 }
    );
  }
}