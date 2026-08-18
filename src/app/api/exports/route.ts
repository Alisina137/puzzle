import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExportService } from '@/modules/export/export.service.js';

// GET /api/exports - Get all exports for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const bookId = url.searchParams.get('bookId');

    let exports;
    if (bookId) {
      // Verify book ownership
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        select: { userId: true },
      });

      if (!book || book.userId !== session.user.id) {
        return Response.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      exports = await ExportService.getExportHistory(bookId);
    } else {
      // Get all exports for the user
      exports = await prisma.export.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
      });
    }

    return Response.json({ success: true, data: exports });
  } catch (error: any) {
    console.error('Error fetching exports:', error);
    return Response.json(
      { error: error.message || 'Failed to fetch exports' },
      { status: 500 }
    );
  }
}

// POST /api/exports - Create a new export
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { bookId, pageSize = 'A4', includeSolutions = true, solutionPlacement = 'back' } = body;

    if (!bookId) {
      return Response.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    // Verify book ownership
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { userId: true, title: true, status: true },
    });

    if (!book) {
      return Response.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    if (book.userId !== session.user.id) {
      return Response.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (book.status !== 'ready') {
      return Response.json(
        { error: 'Book must be ready before exporting' },
        { status: 400 }
      );
    }

    // Create export record
    const exportRecord = await ExportService.createExport(bookId, session.user.id, {
      pageSize,
      includeSolutions,
      solutionPlacement,
    });

    // Start generation in background (fire and forget)
    ExportService.generateExport(exportRecord.id)
      .then((result) => {
        console.log('Export completed:', result.id);
      })
      .catch((error) => {
        console.error('Export failed:', error);
      });

    return Response.json({
      success: true,
      data: exportRecord,
      message: 'Export started',
    }, { status: 202 });
  } catch (error: any) {
    console.error('Error creating export:', error);
    return Response.json(
      { error: error.message || 'Failed to create export' },
      { status: 500 }
    );
  }
}